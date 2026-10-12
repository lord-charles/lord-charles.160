const redisClient = require('../config/redisConfig');

/**
 * Requests computing a response right now, by cache key. A second request for
 * the same key waits for the first instead of re-running the same (often
 * heavy) query, so an expired key does not stampede the database.
 */
const inFlight = new Map();

const createCachingMiddleware = (method, keyFor, duration) => {
  return async (req, res, next) => {
    if (req.method !== method) return next();

    const cacheKey = keyFor(req);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }

      const pending = inFlight.get(cacheKey);
      if (pending) {
        const body = await pending.catch(() => undefined);
        if (body !== undefined) {
          res.set('X-Cache', 'SHARED');
          return res.json(body);
        }
        // The first request failed: compute this one normally
      }
    } catch (error) {
      console.error('Cache middleware error:', error);
      return next();
    }

    let settle;
    const promise = new Promise((resolve, reject) => {
      settle = { resolve, reject };
    });
    promise.catch(() => {}); // waiters handle rejection themselves
    inFlight.set(cacheKey, promise);

    const done = (body, ok) => {
      if (inFlight.get(cacheKey) !== promise) return;
      inFlight.delete(cacheKey);
      if (ok) settle.resolve(body);
      else settle.reject(new Error('not cacheable'));
    };

    const originalJson = res.json;
    res.json = function (body) {
      // Only cache successful responses so a transient error isn't
      // replayed (with a 200 status) for the whole cache duration
      const ok = this.statusCode >= 200 && this.statusCode < 300;
      if (ok) {
        redisClient
          .setex(cacheKey, duration, JSON.stringify(body))
          .catch((err) => console.error('Redis cache error:', err));
      }
      done(body, ok);
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, body);
    };
    // Responses that never reach res.json (errors, aborted requests)
    res.on('close', () => done(undefined, false));

    next();
  };
};

/**
 * Redis caching middleware for GET requests
 * @param {number} duration - Cache duration in seconds (default: 600 seconds / 10 minutes)
 */
const cacheMiddleware = (duration = 600) =>
  createCachingMiddleware('GET', (req) => `api:${req.originalUrl || req.url}`, duration);

/**
 * Redis caching middleware for specific POST requests (keyed by URL + body)
 * @param {number} duration - Cache duration in seconds (default: 600 seconds / 10 minutes)
 */
const cachePostMiddleware = (duration = 600) =>
  createCachingMiddleware(
    'POST',
    (req) => `api:post:${req.originalUrl}:${JSON.stringify(req.body)}`,
    duration
  );

// SCAN instead of KEYS: KEYS blocks Redis while it walks every key
const scanKeys = async (pattern) => {
  const found = [];
  let cursor = '0';
  do {
    const [next, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = next;
    found.push(...keys);
  } while (cursor !== '0');
  return found;
};

/**
 * Clear cache for specific routes
 * @param {string|string[]} routes - Route or array of routes to clear cache for
 * @param {boolean} includePost - Whether to clear POST request caches as well
 */
const clearCache = async (routes, includePost = false) => {
  try {
    if (!Array.isArray(routes)) {
      routes = [routes];
    }

    const keys = await Promise.all(
      routes.flatMap((route) => [
        scanKeys(`api:${route}*`),
        ...(includePost ? [scanKeys(`api:post:${route}*`)] : []),
      ])
    );

    const flatKeys = [...new Set(keys.flat())];
    if (flatKeys.length > 0) {
      await redisClient.del(...flatKeys);
      console.log(`Cleared cache for routes: ${routes.join(', ')}`);
    }
  } catch (error) {
    console.error('Clear cache error:', error);
    throw error;
  }
};

module.exports = {
  cacheMiddleware,
  cachePostMiddleware,
  clearCache,
};

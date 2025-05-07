const redisClient = require('../config/redisConfig');

/**
 * Redis caching middleware for GET requests
 * @param {number} duration - Cache duration in seconds (default: 600 seconds / 10 minutes)
 */
const cacheMiddleware = (duration = 600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a unique cache key based on the full URL and query parameters
    const cacheKey = `api:${req.originalUrl || req.url}`;

    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        // Return cached response
        const parsedResponse = JSON.parse(cachedResponse);
        return res.json(parsedResponse);
      }

      // If no cache exists, modify res.json to store the response
      const originalJson = res.json;
      res.json = function (body) {
        // Store the response in Redis with expiration
        redisClient.setex(cacheKey, duration, JSON.stringify(body))
          .catch(err => console.error('Redis cache error:', err));

        // Call the original res.json with the response body
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // If there's an error with Redis, continue without caching
      next();
    }
  };
};

/**
 * Redis caching middleware for specific POST requests
 * @param {number} duration - Cache duration in seconds (default: 600 seconds / 10 minutes)
 * @returns {Function} Express middleware
 */
const cachePostMiddleware = (duration = 600) => {
  return async (req, res, next) => {
    if (req.method !== 'POST') {
      return next();
    }

    try {
      // Generate a unique cache key based on the URL and request body
      const bodyHash = JSON.stringify(req.body);
      const cacheKey = `api:post:${req.originalUrl}:${bodyHash}`;

      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        // Return cached response
        const parsedResponse = JSON.parse(cachedResponse);
        return res.json(parsedResponse);
      }

      // If no cache exists, modify res.json to store the response
      const originalJson = res.json;
      res.json = function (body) {
        // Store the response in Redis with expiration
        redisClient.setex(cacheKey, duration, JSON.stringify(body))
          .catch(err => console.error('Redis cache error:', err));

        // Call the original res.json with the response body
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('POST Cache middleware error:', error);
      // If there's an error with Redis, continue without caching
      next();
    }
  };
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
      routes.flatMap(route => [
        redisClient.keys(`api:${route}*`),
        ...(includePost ? [redisClient.keys(`api:post:${route}*`)] : [])
      ])
    );

    const flatKeys = keys.flat();
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
  clearCache
};

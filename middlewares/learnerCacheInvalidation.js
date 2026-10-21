const SchoolData = require("../models/2023Data");
const School = require("../models/school-data");
const redisClient = require("../config/redisConfig");
const { scanKeys } = require("./cacheMiddleware");

/**
 * Clears cached learner lists and counts for the schools and areas a learner
 * change touched (registration, transfer, update, dropout, delete), so lists
 * update at once instead of after the 10-minute cache.
 *
 * Affected areas are read before the change (where the learner was) and
 * after it (where they are now), so a transfer clears both schools.
 */

// [method, path relative to /express/data-set, how to find the learners]
const LEARNER_WRITES = [
  ["POST", /^\/register-student-2024\/?$/, "body"],
  ["POST", /^\/registerLearnerDuringSync\/?$/, "body"],
  ["PATCH", /^\/2023_data\/students\/([^/]+)\/?$/, "param"],
  ["DELETE", /^\/student\/delete\/([^/]+)\/?$/, "param"],
  ["PATCH", /^\/2023_data\/update\/bulk\/?$/, "ids"],
  ["PATCH", /^\/2023_data\/update\/bulkStates\/?$/, "ids"],
  ["POST", /^\/learners\/transfer\/?$/, "transfers"],
];

const LOCATION = "code payam28 county28 state10";

const emptyAreas = () => ({
  ids: new Set(),
  codes: new Set(),
  payams: new Set(),
  counties: new Set(),
  states: new Set(),
});

const addArea = (areas, a) => {
  if (!a) return;
  if (a.code) areas.codes.add(String(a.code));
  if (a.payam28 || a.payam) areas.payams.add(String(a.payam28 || a.payam));
  if (a.county28 || a.county) areas.counties.add(String(a.county28 || a.county));
  if (a.state10 || a.state) areas.states.add(String(a.state10 || a.state));
};

const learnerIdsOf = (req, match, kind) => {
  if (kind === "param") return [match[1]];
  if (kind === "ids") return Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (kind === "transfers") {
    return (req.body?.transfers || []).map((t) => t?.learnerId).filter(Boolean);
  }
  return [];
};

const lookupLearners = async (areas, ids) => {
  const valid = ids.filter((id) => /^[a-f0-9]{24}$/i.test(String(id)));
  if (!valid.length) return;
  valid.forEach((id) => areas.ids.add(String(id)));
  const learners = await SchoolData.find({ _id: { $in: valid } }).select(LOCATION).lean();
  learners.forEach((l) => addArea(areas, l));
};

const lookupSchools = async (areas, codes) => {
  if (!codes.length) return;
  const schools = await School.find({ code: { $in: codes } }).select(LOCATION).lean();
  schools.forEach((s) => addArea(areas, s));
};

/** Deletes cached responses whose URL or body mentions any affected area. */
async function invalidateAreas(areas) {
  const needles = [];
  const q = (v) => encodeURIComponent(v);
  areas.ids.forEach((id) => needles.push(`/students/${id}`, `"${id}"`));
  areas.codes.forEach((c) => needles.push(`"code":"${c}"`, `code=${q(c)}`));
  areas.payams.forEach((p) => needles.push(`"payam28":"${p}"`, `payam28=${q(p)}`));
  areas.counties.forEach((c) =>
    needles.push(`"county28":"${c}"`, `"county":"${c}"`, `county28=${q(c)}`, `county=${q(c)}`)
  );
  areas.states.forEach((s) =>
    needles.push(`"state10":"${s}"`, `"state":"${s}"`, `state10=${q(s)}`, `state=${q(s)}`)
  );
  if (!needles.length) return 0;

  const keys = await scanKeys("api:*");
  const stale = keys.filter((k) => needles.some((n) => k.includes(n)));
  if (stale.length) await redisClient.del(...stale);
  return stale.length;
}

const learnerCacheInvalidation = (req, res, next) => {
  const rule = LEARNER_WRITES.find(([m, re]) => m === req.method && re.test(req.path));
  if (!rule) return next();
  const [, re, kind] = rule;
  const match = req.path.match(re);

  (async () => {
    const areas = emptyAreas();
    const ids = learnerIdsOf(req, match, kind);
    // Where the learners are now, and where new ones are going
    await lookupLearners(areas, ids);
    if (kind === "body") addArea(areas, req.body);
    const destCodes = [
      ...(req.body?.transfers || []).map((t) => t?.toCode),
      req.body?.updateFields?.transfer?.destinationCode,
      req.body?.code,
    ].filter(Boolean);
    await lookupSchools(areas, destCodes);

    res.on("finish", () => {
      if (res.statusCode >= 300) return;
      // Also where they are after the change (e.g. an edited location)
      lookupLearners(areas, ids)
        .then(() => invalidateAreas(areas))
        .catch((err) => console.error("[learnerCache] invalidation failed:", err.message));
    });
  })()
    .catch((err) => console.error("[learnerCache] lookup failed:", err.message))
    .finally(() => next());
};

module.exports = { learnerCacheInvalidation, invalidateAreas };

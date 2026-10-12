const CTCriteria = require("../models/CTCriteria");
const School = require("../models/school-data");

/** Year from ?year= / body.year, defaulting to the current year. */
const resolveYear = (req) =>
  parseInt(req?.query?.year ?? req?.body?.year, 10) || new Date().getFullYear();

const activeCriteria = (year, extra = {}) =>
  CTCriteria.find({ isActive: true, academicYear: year, ...extra }).lean();

const hasTargeting = (t) =>
  !!t &&
  ["ownership", "states", "counties", "payams"].some((k) => t[k]?.length);

/**
 * Learner-level filter for a criteria's targeting (fields on 2023Data).
 * Ownership lives on the school, so it becomes a list of school codes.
 */
const targetingFilter = async (t, codeCache = new Map()) => {
  if (!hasTargeting(t)) return {};
  const filter = {};
  if (t.states?.length) filter.state10 = { $in: t.states };
  if (t.counties?.length) filter.county28 = { $in: t.counties };
  if (t.payams?.length) filter.payam28 = { $in: t.payams };
  if (t.ownership?.length) {
    const key = [...t.ownership].sort().join("|");
    if (!codeCache.has(key)) {
      codeCache.set(
        key,
        await School.distinct("code", { schoolOwnerShip: { $in: t.ownership } })
      );
    }
    filter.code = { $in: codeCache.get(key) };
  }
  return filter;
};

/**
 * $or conditions selecting learners eligible under any of `criteria`:
 * education type + class, the disability rule per gender, and targeting.
 */
const eligibilityConditions = async (criteria) => {
  const codeCache = new Map();
  const conditions = [];
  for (const c of criteria) {
    const where = await targetingFilter(c.targeting, codeCache);
    for (const cls of c.classes || []) {
      for (const [gender, key] of [["M", "male"], ["F", "female"]]) {
        conditions.push({
          education: c.educationType,
          class: cls.className,
          gender,
          ...(cls.requiresDisability?.[key] ? { isWithDisability: true } : {}),
          ...where,
        });
      }
    }
  }
  return conditions;
};

/** True when a learner/school falls inside the criteria's targeting. */
const matchesTargeting = (c, { state10, county28, payam28, ownership }) => {
  const t = c.targeting;
  if (!hasTargeting(t)) return true;
  const ok = (list, value) => !list?.length || list.includes(value);
  return (
    ok(t.states, state10) &&
    ok(t.counties, county28) &&
    ok(t.payams, payam28) &&
    ok(t.ownership, ownership)
  );
};

module.exports = {
  resolveYear,
  activeCriteria,
  eligibilityConditions,
  matchesTargeting,
};

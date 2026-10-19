/**
 * Builds a MongoDB Compass pipeline (run on schooldata2023) that counts the
 * learners eligible under the active CT criteria of a year, exactly as the
 * API does: per-rule class, gender/disability and area, open schools only,
 * and school ownership.
 *
 *   node scripts/ct-eligibility-pipeline.js 2026            # write + run
 *   node scripts/ct-eligibility-pipeline.js 2026 --no-run   # write only
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const CTCriteria = require("../models/CTCriteria");

const year = parseInt(process.argv[2], 10) || new Date().getFullYear();
const run = !process.argv.includes("--no-run");

const OPEN = { $regex: "^(open|fully functional)$", $options: "i" };

const ruleFor = (c, cls, gender) => {
  const t = c.targeting || {};
  const key = gender === "M" ? "male" : "female";
  const r = { education: c.educationType, class: cls.className, gender };
  if (cls.requiresDisability?.[key]) r.isWithDisability = true;
  if (t.states?.length) r.state10 = { $in: t.states };
  if (t.counties?.length) r.county28 = { $in: t.counties };
  if (t.payams?.length) r.payam28 = { $in: t.payams };
  return { learner: r, ownership: t.ownership || [] };
};

(async () => {
  if (!process.env.MONGODB_URL) throw new Error("Set MONGODB_URL first");
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URL, { socketTimeoutMS: 0 });

  const criteria = await CTCriteria.find({ academicYear: year, isActive: true }).lean();
  if (!criteria.length) throw new Error(`No active criteria for ${year}`);

  const rules = criteria.flatMap((c) =>
    (c.classes || []).flatMap((cls) => ["M", "F"].map((g) => ruleFor(c, cls, g)))
  );

  const pipeline = [
    // 1. Enrolled learners matching any rule (uses learner indexes)
    { $match: { isDroppedOut: { $ne: true }, $or: rules.map((r) => r.learner) } },
    // 2. Their school's ownership and open/closed status
    {
      $lookup: {
        from: "schooldata",
        localField: "code",
        foreignField: "code",
        as: "sch",
        pipeline: [
          { $project: { _id: 0, schoolOwnerShip: 1, "schoolStatus.isOpen": 1 } },
          { $limit: 1 },
        ],
      },
    },
    {
      $addFields: {
        ownership: { $first: "$sch.schoolOwnerShip" },
        schoolStatus: { $first: "$sch.schoolStatus.isOpen" },
      },
    },
    // 3. Open schools only; closed or unknown status are excluded
    { $match: { schoolStatus: OPEN } },
    // 4. Each rule again, now with its ownership list
    {
      $match: {
        $or: rules.map(({ learner, ownership }) =>
          ownership.length ? { ...learner, ownership: { $in: ownership } } : learner
        ),
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              learners: { $sum: 1 },
              schools: { $addToSet: "$code" },
              male: { $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] } },
              female: { $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] } },
              withDisability: { $sum: { $cond: ["$isWithDisability", 1, 0] } },
            },
          },
          { $project: { _id: 0, learners: 1, male: 1, female: 1, withDisability: 1, schools: { $size: "$schools" } } },
        ],
        byState: [
          { $group: { _id: "$state10", learners: { $sum: 1 }, schools: { $addToSet: "$code" } } },
          { $project: { learners: 1, schools: { $size: "$schools" } } },
          { $sort: { learners: -1 } },
        ],
        byClass: [
          { $group: { _id: { education: "$education", class: "$class" }, learners: { $sum: 1 } } },
          { $sort: { "_id.education": 1, "_id.class": 1 } },
        ],
        byOwnership: [
          { $group: { _id: "$ownership", learners: { $sum: 1 }, schools: { $addToSet: "$code" } } },
          { $project: { learners: 1, schools: { $size: "$schools" } } },
          { $sort: { learners: -1 } },
        ],
      },
    },
  ];

  const out = path.join(__dirname, `ct-eligibility-${year}.compass.json`);
  fs.writeFileSync(out, JSON.stringify(pipeline, null, 1));
  console.log(`${criteria.length} active criteria for ${year} -> ${path.relative(process.cwd(), out)}`);

  if (run) {
    const [r] = await mongoose.connection.db
      .collection("schooldata2023")
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();
    console.log(JSON.stringify(r, null, 1));
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

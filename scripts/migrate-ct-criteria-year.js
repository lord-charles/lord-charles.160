/**
 * One-off: CT criteria created before criteria became year-based belong to
 * 2025. Tags every criteria without academicYear as 2025, so 2026 starts
 * empty until it is set up in System Settings.
 *
 *   node scripts/migrate-ct-criteria-year.js            # dry run
 *   node scripts/migrate-ct-criteria-year.js --apply
 */
require("dotenv").config();
const mongoose = require("mongoose");
const CTCriteria = require("../models/CTCriteria");

const YEAR = 2025;
const apply = process.argv.includes("--apply");

(async () => {
  mongoose.set("strictQuery", true);
  if (!process.env.MONGODB_URL) throw new Error("Set MONGODB_URL first");
  await mongoose.connect(process.env.MONGODB_URL);
  const filter = { academicYear: { $exists: false } };
  const count = await CTCriteria.countDocuments(filter);
  console.log(`${count} criteria without academicYear`);
  if (apply && count) {
    const res = await CTCriteria.updateMany(filter, {
      $set: {
        academicYear: YEAR,
        targeting: { ownership: [], states: [], counties: [], payams: [] },
      },
    });
    console.log(`Tagged ${res.modifiedCount} as ${YEAR}`);
  } else if (!apply) {
    console.log("Dry run. Re-run with --apply to tag them as", YEAR);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

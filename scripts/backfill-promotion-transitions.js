/**
 * One-off: promotion runs made before transitions existed left final-grade
 * learners (P8, S4, ECD3, ALP Level 4/6) in their class. This moves them to
 * the holding class (P9, S5, ECD4) with a transition record, and updates the
 * run items so Undo still restores the original class.
 *
 * Only learners still exactly as the run left them are changed (same class,
 * run's history entry present, no transition yet).
 *
 *   node scripts/backfill-promotion-transitions.js            # dry run
 *   node scripts/backfill-promotion-transitions.js --apply
 */
require("dotenv").config();
const mongoose = require("mongoose");
const SchoolData = require("../models/2023Data");
const { PromotionRun, PromotionRunItem } = require("../models/promotionRun");
const { classRule } = require("../services/classProgression");

const apply = process.argv.includes("--apply");
const BATCH = 1000;

(async () => {
  if (!process.env.MONGODB_URL) throw new Error("Set MONGODB_URL first");
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URL, { socketTimeoutMS: 0 });

  const runs = await PromotionRun.find({ status: "completed" }).lean();
  const totals = { items: 0, eligible: 0, changed: 0, byMove: {} };

  for (const run of runs) {
    const cursor = PromotionRunItem.find({ runId: run._id, finalGrade: true })
      .lean()
      .cursor({ batchSize: BATCH });
    let batch = [];

    const flush = async () => {
      const ops = [];
      const itemOps = [];
      const date = new Date();
      for (const it of batch) {
        const rule = classRule(it.fromClass);
        // Already backfilled, or the class is not a final grade any more
        if (rule.status !== "final" || it.toClass !== it.fromClass) continue;
        const key = `${it.fromClass} → ${rule.next}`;
        totals.byMove[key] = (totals.byMove[key] || 0) + 1;
        totals.eligible++;
        ops.push({
          updateOne: {
            filter: {
              _id: it.learnerId,
              class: it.fromClass,
              "academicHistory.promotionRunId": run._id,
              "transition.status": { $exists: false },
            },
            update: {
              $set: {
                class: rule.next,
                lastModifiedDate: date,
                transition: {
                  ...rule.transition,
                  fromClass: it.fromClass,
                  year: run.academicYear,
                  date: run.startedAt || date,
                  promotionRunId: run._id,
                },
              },
            },
          },
        });
        itemOps.push({
          updateOne: { filter: { _id: it._id }, update: { $set: { toClass: rule.next } } },
        });
      }
      totals.items += batch.length;
      batch = [];
      if (!apply || !ops.length) return;
      const res = await SchoolData.bulkWrite(ops, { ordered: false });
      totals.changed += res.modifiedCount;
      // Items only for learners actually moved would be ideal; moved learners
      // are the ones still matching, so re-check them before updating items
      const moved = await SchoolData.find({
        _id: { $in: ops.map((o) => o.updateOne.filter._id) },
        "transition.promotionRunId": run._id,
      })
        .select("_id")
        .lean();
      const movedIds = new Set(moved.map((m) => String(m._id)));
      const keep = itemOps.filter((op, i) =>
        movedIds.has(String(ops[i].updateOne.filter._id))
      );
      if (keep.length) await PromotionRunItem.bulkWrite(keep, { ordered: false });
    };

    for await (const it of cursor) {
      batch.push(it);
      if (batch.length >= BATCH) await flush();
    }
    if (batch.length) await flush();
    console.log(`run ${run._id} (${run.scope.states.join(",") || "custom"}) done`);
  }

  console.log(JSON.stringify(totals, null, 1));
  if (!apply) console.log("Dry run. Re-run with --apply to move them.");
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

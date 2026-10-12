const SchoolData = require("../models/2023Data");
const { PromotionRun, PromotionRunItem } = require("../models/promotionRun");
const { classRule } = require("./classProgression");
const { clearCache } = require("../middlewares/cacheMiddleware");

const BATCH_SIZE = 1000;

const clean = (list) =>
  Array.isArray(list) ? [...new Set(list.filter(Boolean).map(String))] : [];

const normalizeScope = (scope = {}) => ({
  states: clean(scope.states),
  counties: clean(scope.counties),
  payams: clean(scope.payams),
  codes: clean(scope.codes),
  education: clean(scope.education),
});

const scopeIsEmpty = (s) =>
  !s.states.length && !s.counties.length && !s.payams.length && !s.codes.length;

/** Learners inside the scope (location + education), ignoring status. */
const scopeFilter = (s) => {
  const f = {};
  if (s.codes.length) f.code = { $in: s.codes };
  if (s.payams.length) f.payam28 = { $in: s.payams };
  if (s.counties.length) f.county28 = { $in: s.counties };
  if (s.states.length) f.state10 = { $in: s.states };
  if (s.education.length) f.education = { $in: s.education };
  return f;
};

/**
 * Aggregation expression: true when the learner's history records a promotion
 * in `year` that was not later revoked or reversed by a demotion that year.
 * Same rule as isPromotedInYear in controller/dataset.js (the app's endpoint).
 */
const promotedInYearExpr = (year) => ({
  $reduce: {
    input: { $ifNull: ["$academicHistory", []] },
    initialValue: false,
    in: {
      $cond: [
        { $eq: ["$$this.year", year] },
        {
          $cond: [
            {
              $or: [
                { $eq: ["$$this.status.promotionRevoked", true] },
                { $eq: ["$$this.status.demoted", true] },
              ],
            },
            false,
            { $cond: [{ $eq: ["$$this.status.promoted", true] }, true, "$$value"] },
          ],
        },
        "$$value",
      ],
    },
  },
});

/** Has a promotion that still stands for this academic year. */
const promotedIn = (year) => ({ $expr: promotedInYearExpr(year) });

/** Not promoted this year (never, or the promotion was revoked). */
const notPromotedIn = (year) => ({ $expr: { $not: [promotedInYearExpr(year)] } });

/** Candidates for promotion: in scope, still enrolled, not yet promoted. */
const candidateFilter = (s, year) => ({
  ...scopeFilter(s),
  isDroppedOut: { $ne: true },
  ...notPromotedIn(year),
});

const validateYear = (year) => {
  const current = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2024 || year > current) {
    return `Academic year must be between 2024 and ${current}`;
  }
  return null;
};

/**
 * Dry run: what a promotion would do for this scope, without writing.
 */
async function previewPromotion(rawScope, year) {
  const scope = normalizeScope(rawScope);
  const inScope = scopeFilter(scope);

  const [byClass, droppedOut, alreadyPromoted] = await Promise.all([
    SchoolData.aggregate([
      { $match: candidateFilter(scope, year) },
      { $group: { _id: "$class", count: { $sum: 1 } } },
    ]).allowDiskUse(true),
    SchoolData.countDocuments({ ...inScope, isDroppedOut: true }),
    SchoolData.countDocuments({
      ...inScope,
      isDroppedOut: { $ne: true },
      ...promotedIn(year),
    }),
  ]);

  const transitions = {};
  const finalGrades = {};
  const unknownClasses = {};
  let toPromote = 0;
  let toComplete = 0;

  for (const { _id: cls, count } of byClass) {
    const rule = classRule(cls);
    if (rule.status === "promote") {
      const key = `${rule.standard} → ${rule.next}`;
      transitions[key] = (transitions[key] || 0) + count;
      toPromote += count;
    } else if (rule.status === "final") {
      finalGrades[rule.standard] = (finalGrades[rule.standard] || 0) + count;
      toComplete += count;
    } else {
      const key = cls || "(no class)";
      unknownClasses[key] = (unknownClasses[key] || 0) + count;
    }
  }

  const unknownTotal = Object.values(unknownClasses).reduce((a, b) => a + b, 0);

  return {
    academicYear: year,
    scope,
    toPromote,
    toComplete,
    total: toPromote + toComplete,
    transitions,
    finalGrades,
    skipped: {
      droppedOut,
      alreadyPromoted,
      unknownClass: unknownTotal,
    },
    unknownClasses,
  };
}

const historyEntry = (year, runId, date) => ({
  year,
  status: {
    promoted: true,
    droppedOut: false,
    repeated: false,
    absentDuringEnrolment: false,
    demoted: false,
    promotionRevoked: false,
    classChanged: false,
  },
  date,
  promotionRunId: runId,
});

/** Applies one batch of learners; returns counts. */
async function applyBatch(run, learners, by) {
  const date = new Date();
  const ops = [];
  const items = [];
  let promoted = 0;
  let completed = 0;
  let unknown = 0;

  for (const l of learners) {
    const rule = classRule(l.class);
    if (rule.status === "unknown") {
      unknown++;
      continue;
    }
    const isFinal = rule.status === "final";
    const toClass = isFinal ? l.class : rule.next;

    ops.push({
      updateOne: {
        // Guards: class unchanged and still not promoted this year, so a
        // concurrent edit or a second run cannot double-promote
        filter: {
          _id: l._id,
          class: l.class,
          ...notPromotedIn(run.academicYear),
        },
        update: {
          $set: {
            class: toClass,
            isPromoted: true,
            modifiedBy: by,
            lastModifiedDate: date,
          },
          $push: {
            academicHistory: historyEntry(run.academicYear, run._id, date),
            progress: {
              year: run.academicYear,
              class: toClass,
              educationLevel: l.education || "",
              code: l.code || "",
              school: l.school || "",
              status: "Promoted",
              isAwaitingTransition: isFinal,
              remarks: isFinal
                ? "Learner promoted - Ready for transition to next level"
                : "Learner promoted to next grade",
              promotionRunId: run._id,
              createdAt: date,
            },
          },
        },
      },
    });
    items.push({
      runId: run._id,
      learnerId: l._id,
      fromClass: l.class,
      toClass,
      finalGrade: isFinal,
    });
    if (isFinal) completed++;
    else promoted++;
  }

  if (ops.length) {
    // Items first: if the write fails midway, undo still knows every learner
    await PromotionRunItem.insertMany(items, { ordered: false });
    await SchoolData.bulkWrite(ops, { ordered: false });
  }
  return { promoted, completed, unknown };
}

/** Runs in the background; progress is saved on the run document. */
async function executeRun(run, by) {
  const scope = normalizeScope(run.scope);
  try {
    const cursor = SchoolData.find(candidateFilter(scope, run.academicYear))
      .select("_id class education code school")
      .lean()
      .cursor({ batchSize: BATCH_SIZE });

    let batch = [];
    const flush = async () => {
      const { promoted, completed, unknown } = await applyBatch(run, batch, by);
      await PromotionRun.updateOne(
        { _id: run._id },
        {
          $inc: {
            processed: batch.length,
            promoted,
            completedFinalGrade: completed,
            "skipped.unknownClass": unknown,
          },
        }
      );
      batch = [];
    };

    for await (const learner of cursor) {
      batch.push(learner);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    if (batch.length) await flush();

    await PromotionRun.updateOne(
      { _id: run._id },
      { $set: { status: "completed", finishedAt: new Date() } }
    );
  } catch (err) {
    console.error("[promotion] run failed:", err);
    await PromotionRun.updateOne(
      { _id: run._id },
      { $set: { status: "failed", error: err.message, finishedAt: new Date() } }
    );
  } finally {
    clearCache(["/express/data-set", "/express/ct"], true).catch(() => {});
  }
}

async function startRun(rawScope, year, user) {
  const scope = normalizeScope(rawScope);
  if (scopeIsEmpty(scope)) {
    const e = new Error("Choose at least one state, county, payam or school");
    e.status = 400;
    throw e;
  }
  if (await PromotionRun.exists({ status: { $in: ["running", "undoing"] } })) {
    const e = new Error("Another promotion is in progress. Wait for it to finish.");
    e.status = 409;
    throw e;
  }

  const preview = await previewPromotion(scope, year);
  const run = await PromotionRun.create({
    academicYear: year,
    scope,
    expected: preview.total,
    skipped: {
      droppedOut: preview.skipped.droppedOut,
      alreadyPromoted: preview.skipped.alreadyPromoted,
      unknownClass: 0, // counted while running
    },
    createdBy: user?._id,
    createdByUsername: user?.username,
  });

  // Fire and forget: the client polls the run for progress
  executeRun(run, user?.username || "promotion");
  return run;
}

/**
 * Reverts a run: restores each learner's previous class and removes the
 * history entries the run added. Learners changed since are left alone.
 */
async function undoRun(runId, user) {
  const run = await PromotionRun.findById(runId);
  if (!run) {
    const e = new Error("Promotion run not found");
    e.status = 404;
    throw e;
  }
  if (!["completed", "failed"].includes(run.status)) {
    const e = new Error(`A ${run.status} run cannot be undone`);
    e.status = 409;
    throw e;
  }
  await PromotionRun.updateOne({ _id: run._id }, { $set: { status: "undoing" } });

  (async () => {
    let reverted = 0;
    let revertSkipped = 0;
    try {
      const cursor = PromotionRunItem.find({ runId: run._id })
        .lean()
        .cursor({ batchSize: BATCH_SIZE });
      let batch = [];
      const flush = async () => {
        const res = await SchoolData.bulkWrite(
          batch.map((it) => ({
            updateOne: {
              // Only if the run's change is still what the learner has
              filter: {
                _id: it.learnerId,
                class: it.toClass,
                "academicHistory.promotionRunId": run._id,
              },
              update: {
                $set: { class: it.fromClass, lastModifiedDate: new Date() },
                $pull: {
                  academicHistory: { promotionRunId: run._id },
                  progress: { promotionRunId: run._id },
                },
              },
            },
          })),
          { ordered: false }
        );
        reverted += res.modifiedCount;
        revertSkipped += batch.length - res.matchedCount;
        batch = [];
      };
      for await (const it of cursor) {
        batch.push(it);
        if (batch.length >= BATCH_SIZE) await flush();
      }
      if (batch.length) await flush();
      await PromotionRun.updateOne(
        { _id: run._id },
        {
          $set: {
            status: "undone",
            undoneBy: user?.username,
            undoneAt: new Date(),
            reverted,
            revertSkipped,
          },
        }
      );
    } catch (err) {
      console.error("[promotion] undo failed:", err);
      await PromotionRun.updateOne(
        { _id: run._id },
        { $set: { status: "failed", error: `Undo failed: ${err.message}`, reverted, revertSkipped } }
      );
    } finally {
      clearCache(["/express/data-set", "/express/ct"], true).catch(() => {});
    }
  })();

  return run;
}

/** Runs left "running" by a server restart cannot continue in memory. */
async function markInterruptedRuns() {
  await PromotionRun.updateMany(
    { status: { $in: ["running", "undoing"] } },
    {
      $set: {
        status: "failed",
        error: "Interrupted by a server restart. Run the same scope again to finish (already promoted learners are skipped), or undo it.",
        finishedAt: new Date(),
      },
    }
  );
}

module.exports = {
  previewPromotion,
  startRun,
  undoRun,
  validateYear,
  markInterruptedRuns,
};

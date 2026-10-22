const asyncHandler = require("express-async-handler");
const School = require("../models/school-data");
const { transferLearner } = require("../services/learnerTransfer");
const { isOpenStatus } = require("../services/ctCriteriaService");
const { generateReferenceCode } = require("./dataset");
const { ENROLMENT_CLASSES } = require("../services/classProgression");

const MAX_BATCH = 200;

/**
 * POST /data-set/learners/transfer
 * { transfers: [{ clientId, learnerId, fromCode, toCode, reason, date, startNextLevel }], recordedBy }
 * Each transfer is applied on its own; the response lists the outcome of each
 * so the app can mark them synced, keep them, or show a conflict.
 */
const transferLearners = asyncHandler(async (req, res) => {
  const transfers = Array.isArray(req.body.transfers) ? req.body.transfers : [];
  if (!transfers.length) return res.status(400).json({ message: "No transfers provided" });
  if (transfers.length > MAX_BATCH) {
    return res.status(400).json({ message: `Send at most ${MAX_BATCH} transfers at a time` });
  }
  const recordedBy = req.authUser?.username || req.body.recordedBy || "mobile";

  const results = [];
  for (const t of transfers) {
    try {
      results.push({
        clientId: t.clientId,
        ...(await transferLearner(t, { recordedBy, generateReferenceCode })),
      });
    } catch (err) {
      console.error("[transfer] failed:", err);
      results.push({ clientId: t.clientId, status: "error", message: "Server error, try again" });
    }
  }
  res.json({ results });
});

/**
 * GET /school-data/directory
 * Every open school with its location, small enough for the app to keep
 * offline for picking a transfer destination.
 */
const schoolDirectory = asyncHandler(async (req, res) => {
  // Only open schools can receive learners
  const schools = await School.find({ "schoolStatus.isOpen": /^(open|fully functional)$/i })
    .select("-_id code schoolName state10 county28 payam28 schoolType schoolOwnerShip schoolStatus.isOpen")
    .lean();
  res.json({
    updatedAt: new Date().toISOString(),
    // Classes a transferred learner can be placed in
    classes: ENROLMENT_CLASSES,
    schools: schools.map((s) => ({
      code: s.code,
      name: s.schoolName,
      state10: s.state10,
      county28: s.county28,
      payam28: s.payam28,
      type: s.schoolType || "",
      ownership: s.schoolOwnerShip || "",
      isOpen: isOpenStatus(s.schoolStatus?.isOpen),
    })),
  });
});

module.exports = { transferLearners, schoolDirectory };

const asyncHandler = require("express-async-handler");
const { PromotionRun } = require("../models/promotionRun");
const {
  previewPromotion,
  startRun,
  undoRun,
  validateYear,
} = require("../services/promotionService");

const fail = (res, err) =>
  res.status(err.status || 500).json({ message: err.message || "Promotion failed" });

// POST /promotion/preview { academicYear, scope }
const preview = asyncHandler(async (req, res) => {
  const year = parseInt(req.body.academicYear, 10);
  const invalid = validateYear(year);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    res.json(await previewPromotion(req.body.scope, year));
  } catch (err) {
    fail(res, err);
  }
});

// POST /promotion/runs { academicYear, scope, confirmCount }
const createRun = asyncHandler(async (req, res) => {
  const year = parseInt(req.body.academicYear, 10);
  const invalid = validateYear(year);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    // The confirmation must match a fresh preview, so nobody promotes a
    // scope that changed since they looked at it
    const fresh = await previewPromotion(req.body.scope, year);
    if (parseInt(req.body.confirmCount, 10) !== fresh.total) {
      return res.status(409).json({
        message: `The number of learners changed to ${fresh.total}. Review the preview again.`,
        preview: fresh,
      });
    }
    const run = await startRun(req.body.scope, year, req.authUser);
    res.status(202).json(run);
  } catch (err) {
    fail(res, err);
  }
});

// GET /promotion/runs?year=
const listRuns = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10);
  const runs = await PromotionRun.find(year ? { academicYear: year } : {})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(runs);
});

// GET /promotion/runs/:id
const getRun = asyncHandler(async (req, res) => {
  const run = await PromotionRun.findById(req.params.id).lean();
  if (!run) return res.status(404).json({ message: "Promotion run not found" });
  res.json(run);
});

// POST /promotion/runs/:id/undo
const undo = asyncHandler(async (req, res) => {
  try {
    const run = await undoRun(req.params.id, req.authUser);
    res.status(202).json(run);
  } catch (err) {
    fail(res, err);
  }
});

module.exports = { preview, createRun, listRuns, getRun, undo };

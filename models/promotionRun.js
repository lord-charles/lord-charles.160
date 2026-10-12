const mongoose = require("mongoose");

const scopeSchema = new mongoose.Schema(
  {
    states: [String],
    counties: [String],
    payams: [String],
    codes: [String],
    education: [String],
  },
  { _id: false }
);

// One promotion run: what was asked, what happened, and how to undo it
const promotionRunSchema = new mongoose.Schema(
  {
    academicYear: { type: Number, required: true, index: true },
    scope: scopeSchema,
    status: {
      type: String,
      enum: ["running", "completed", "failed", "undoing", "undone"],
      default: "running",
      index: true,
    },
    expected: Number, // learners in scope when the run started
    processed: { type: Number, default: 0 },
    promoted: { type: Number, default: 0 },
    completedFinalGrade: { type: Number, default: 0 },
    skipped: { type: Map, of: Number, default: {} },
    error: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByUsername: String,
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    undoneBy: String,
    undoneAt: Date,
    reverted: Number,
    revertSkipped: Number,
  },
  { timestamps: true }
);

// Per-learner change, kept so a run can be undone exactly
const promotionRunItemSchema = new mongoose.Schema({
  runId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  learnerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fromClass: String,
  toClass: String,
  finalGrade: Boolean,
});

module.exports = {
  PromotionRun: mongoose.model("PromotionRun", promotionRunSchema),
  PromotionRunItem: mongoose.model("PromotionRunItem", promotionRunItemSchema),
};

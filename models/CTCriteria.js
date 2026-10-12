const mongoose = require("mongoose");

const ctcriteriaSchema = new mongoose.Schema(
  {
    educationType: {
      type: String,
      required: true,
    },
    classes: [
      {
        className: {
          type: String,
          required: true,
        },
        requiresDisability: {
          male: { type: Boolean, default: true },
          female: { type: Boolean, default: false },
        },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    tranche: {
      type: Number,
      required: true,
    },
    currency: { type: String, required: true, default: "SSP" },
    // Criteria apply to one academic year only; a new year starts empty
    academicYear: { type: Number, required: true, index: true },
    // Who qualifies. An empty list means "all" for that dimension.
    targeting: {
      ownership: { type: [String], default: [] },
      states: { type: [String], default: [] },
      counties: { type: [String], default: [] },
      payams: { type: [String], default: [] },
    },
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

const CTCriteria = mongoose.model("CTCriteria", ctcriteriaSchema);

module.exports = CTCriteria;

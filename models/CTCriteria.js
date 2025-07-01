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
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

const CTCriteria = mongoose.model("CTCriteria", ctcriteriaSchema);

module.exports = CTCriteria;

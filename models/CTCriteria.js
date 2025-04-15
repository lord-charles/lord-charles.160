const mongoose = require("mongoose");

const ctcriteriaSchema = new mongoose.Schema(
  {
    educationType: {
      type: String,
      required: true,
    },
    classes: [{
      className: {
        type: String,
        required: true
      },
      requiresDisability: {
        male: { type: Boolean, default: true },
        female: { type: Boolean, default: false }
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: String,
    updatedBy: String
  },
  {
    timestamps: true,
  }
);

const CTCriteria = mongoose.model("CTCriteria", ctcriteriaSchema);

module.exports = CTCriteria;

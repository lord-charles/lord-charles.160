const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const registrationPeriodSchema = new Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isOpen: { type: Boolean, default: false },
    createdBy: { type: String },
    updatedBy: { type: String },
    deletedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RegistrationPeriod", registrationPeriodSchema);

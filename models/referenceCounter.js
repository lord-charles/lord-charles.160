const mongoose = require("mongoose");

const referenceCounterSchema = new mongoose.Schema({
  schoolCode: { type: String, required: true },
  grade: { type: String, required: true },
  year: { type: Number, required: true },
  lastNumber: { type: Number, default: 0 },
});

referenceCounterSchema.index(
  { schoolCode: 1, grade: 1, year: 1 },
  { unique: true }
);

const ReferenceCounter = mongoose.model(
  "ReferenceCounter",
  referenceCounterSchema
);

module.exports = ReferenceCounter;

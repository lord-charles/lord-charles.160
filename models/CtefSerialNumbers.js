const mongoose = require("mongoose");

const CtefNumberSchema = new mongoose.Schema(
  {
    SerialNumber: { type: Number },
    isAssigned: { type: boolean },
  },
  {
    timestamps: true,
  }
);

const CtefNumber = mongoose.model("CtefNumber", CtefNumberSchema);

module.exports = CtefNumber;

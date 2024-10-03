const mongoose = require("mongoose");

const emisSchema = new mongoose.Schema(
  {
    code: { type: String },
    isOpen: { type: String },
    closeReason: { type: String },
    closedDate: { type: Date },
  },
  { timestamps: true }
);

const emis = mongoose.model("emis", emisSchema, "emis");

module.exports = emis;

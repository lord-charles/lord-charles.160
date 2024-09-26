const mongoose = require("mongoose");

const emisSchema = new mongoose.Schema(
  {
    EmisNumber: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const emis = mongoose.model("emis", emisSchema, "emis");

module.exports = emis;

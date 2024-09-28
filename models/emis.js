const mongoose = require("mongoose");

const emisSchema = new mongoose.Schema(
  {
    schoolCode: {
      type: String,
    },
    schoolName: {
      type: String,
    },
    bankName: {
      type: String,
    },
    bankAccount: {
      type: Number,
    },
    bankBranch: {
      type: String,
    },
    accountName: {
      type: String,
    },
  },
  { timestamps: true }
);

const emis = mongoose.model("emis", emisSchema, "emis");

module.exports = emis;

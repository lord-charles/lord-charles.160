const mongoose = require("mongoose");

const learnerSchema = new mongoose.Schema(
  {
    year: Number,
    state28: String,
    stateName28: String,
    county28: String,
    payam28: String,
    state10: String,
    stateName10: String,
    county10: String,
    payam10: String,
    school: String,
    class: String,
    code: String,
    education: String,
    form: Number,
    formstream: Number,
    gender: String,
    dob: String,
    age: Number,
    firstName: String,
    middleName: String,
    lastName: String,
    eieStatus: String,
    isPromoted: Boolean,
    isDroppedOut: Boolean,
    isAbsentDuringEnrolment: Boolean,
    isValidated: Boolean,
    isWithDisability: Boolean,
    invalidationReason: String,
    isDisbursed: Boolean,
    learnerUniqueID: Number,
    reference: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Update", learnerSchema);

const mongoose = require("mongoose");
const { Schema } = mongoose;

const schoolDataSchema = new Schema({
  state10: String,
  county28: String,
  payam28: String,
  school: String,
  code: String,
  education: String,
  gender: String,
  firstName: String,
  middleName: String,
  lastName: String,
  learnerUniqueID: Number,
  reference: String,
});

const SchoolDataCtCash = mongoose.model("ct", schoolDataSchema);

module.exports = SchoolDataCtCash;

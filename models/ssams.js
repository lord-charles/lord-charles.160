const mongoose = require("mongoose");

const datasetSchema = new mongoose.Schema({
  id: String,
  stateCode: String,
  countyName: String,
  payamName: String,
  educationLevel: String,
  code: String,
  schoolName: String,
  pupilCount: Number,
});

const Dataset = mongoose.model("Dataset", datasetSchema);

module.exports = Dataset;

const mongoose = require("mongoose");

const learnerSchema = new mongoose.Schema({
  isPromoted: {
    type: Boolean,
  },
  isDroppedOut: {
    type: Boolean,
  },
  learnerUniqueID: {
    type: Number,
  },
  reference: {
    type: String,
  },
});

module.exports = mongoose.model("update", learnerSchema);

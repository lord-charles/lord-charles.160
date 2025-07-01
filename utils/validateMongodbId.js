const mongoose = require("mongoose");

const validateMongodbId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid id: " + id);
    error.statusCode = 400; // set the HTTP status code to 400 Bad Request
    throw error;
  }
};

module.exports = validateMongodbId;

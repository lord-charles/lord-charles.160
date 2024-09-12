const { default: mongoose } = require("mongoose");
const dbConnect = () => {
  mongoose.set("strictQuery", true);
  mongoose
    .connect("mongodb://127.0.0.1:27017/")
    .then(() => {
      console.log("connection to db successfull...");
    })
    .catch((err) => {
      console.log("connection failed", err);
    });
};
module.exports = dbConnect;

const { default: mongoose } = require("mongoose");
const dbConnect = () => {
  //connection to db
  mongoose.set("strictQuery", true);
  mongoose
    .connect("mongodb://localhost:27017")
    .then(() => {
      console.log("connection to db sucessfully...");
    })
    .catch((err) => {
      console.log("connection failed", err);
    });
};
module.exports = dbConnect;

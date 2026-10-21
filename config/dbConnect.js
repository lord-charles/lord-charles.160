const { default: mongoose } = require("mongoose");
const dbConnect = () => {
  mongoose.set("strictQuery", true);
  const mongoUri =
    process.env.MONGODB_URL ||
    "mongodb://emis-prod01:%40emis-orgmogei21@127.0.0.1:27018/";
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("connection to db successfull...");
    })
    .catch((err) => {
      console.log("connection failed", err);
    });
};
module.exports = dbConnect;

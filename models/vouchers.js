const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const VoucherModel = new mongoose.Schema(
  {
    Voucher: {
      type: String,
    },
    Account: {
      type: String,
    },
    Amount: {
      type: String,
    },
    bandwidth: {
      type: String,
    },
    devices: {
      type: String,
    },
    Mpesa_ref: {
      type: String,
    },
    Expiry: {
      type: String,
    },
  },
  { timestamps: true }
);

//Export the model
module.exports = mongoose.model("Voucher", VoucherModel);

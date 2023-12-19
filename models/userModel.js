const mongoose = require("mongoose"); // Erase if already required
const crypto = require("crypto");

// Declare the Schema of the Mongo model
const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    username: {
      type: String,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      default: "",
    },
    userType: {
      type: String,
      enum: ["Teacher", "HeadTeacher", "Secretariate", "SuperAdmin"],
      default: null,
      required: true,
    },
    dutyAssigned: [
      {
        isAssigned: {
          type: Boolean,
          default: false,
          required: true,
        },
        schoolName: {
          type: String,
          default: null,
          required: true,
        },
      },
    ],
    statesAsigned: [
      {
        type: String,
      },
    ],
    dateJoined: {
      type: Date,
      default: Date.now,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = Math.floor(1000 + Math.random() * 9000).toString();
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; //10min
  return resetToken;
};

//Export the model
module.exports = mongoose.model("User", userSchema);

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
      required: false,
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
      enum: [
        "Teacher",
        "HeadTeacher",
        "ClassTeacher",
        "VolunteerTeacher",
        "StaffTeacher",
        "Secretariate",
        "SuperAdmin",
      ],
      default: null,
      required: true,
    },
    dutyAssigned: [
      {
        isAssigned: {
          type: Boolean,
          default: false,
          required: false,
        },
        schoolName: {
          type: String,
          default: null,
          required: false,
        },
      },
    ],

    statesAsigned: [
      {
        type: String,
      },
    ],

    activetmp: { type: String, required: false },
    year: { type: String, required: false },
    source: { type: String, required: false },
    schoolCode: { type: String, required: false },
    teacherCode: { type: String, required: false },
    teacherHrisCode: { type: String, required: false },
    position: { type: String, required: false },
    category: { type: String, required: false },
    workStatus: { type: String, required: false },
    gender: { type: String, required: false },
    dob: { type: String, required: false },
    active: { type: Boolean, default: false },
    nationalNo: { type: String, required: false },
    salaryGrade: { type: String, required: false },
    firstAppointment: { type: String, required: false },
    refugee: { type: String, required: false },
    countryOfOrigin: { type: String, required: false },
    trainingLevel: { type: String, required: false },
    professionalQual: { type: String, required: false },
    notes: { type: String, required: false },
    teacherUniqueID: { type: String, required: false },
    teachersEstNo: { type: String, required: false },
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

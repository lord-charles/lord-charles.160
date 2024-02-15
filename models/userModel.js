const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: String,
    email: String,
    username: {
      type: String,
      // unique: true,
    },
    phoneNumber: String,
    passwordHash: {
      type: String,
      // required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    address: String,
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
        },
        schoolName: String,
      },
    ],
    statesAsigned: [
      {
        type: String,
      },
    ],

    state28: String,
    county28: String,
    payam28: String,
    state10: String,
    stateName10: String,
    county10: String,
    payam10: String,
    school: String,
    code: String,
    activetmp: String,
    year: String,
    source: String,
    schoolCode: String,
    teacherCode: String,
    teacherHrisCode: String,
    position: String,
    category: String,
    workStatus: String,
    gender: String,
    dob: String,
    active: {
      type: Boolean,
      default: true,
    },
    nationalNo: String,
    salaryGrade: String,
    firstAppointment: String,
    refugee: String,
    countryOfOrigin: String,
    trainingLevel: String,
    professionalQual: String,
    notes: String,
    teacherUniqueID: String,
    teachersEstNo: String,
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
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);

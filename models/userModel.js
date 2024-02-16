const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: String,
    middleName: String,
    email: String,
    username: String,
    phoneNumber: String,
    passwordHash: String,
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
    county28: String,
    payam28: String,
    state10: String,
    stateName10: String,
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
    modifiedBy: String,
    disabilities: [
      {
        disabilities: {
          difficultyHearing: { type: Number, required: false },
          difficultyRecalling: { type: Number, required: false },
          difficultySeeing: { type: Number, required: false },
          difficultySelfCare: { type: Number, required: false },
          difficultyTalking: { type: Number, required: false },
          difficultyWalking: { type: Number, required: false },
        },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
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

// Method to create a password reset token
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

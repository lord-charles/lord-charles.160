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
    },
    phoneNumber: String,
    passwordHash: {
      type: String,
      required: false,
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

    county28: {
      type: "String",
    },
    payam28: {
      type: "String",
    },
    state10: {
      type: "String",
    },
    stateName10: {
      type: "String",
    },

    school: {
      type: "String",
    },
    code: {
      type: "String",
    },
    activetmp: {
      type: "String",
    },
    year: {
      type: "String",
    },
    source: {
      type: "String",
    },
    schoolCode: {
      type: "String",
    },
    teacherCode: {
      type: "String",
    },
    teacherHrisCode: {
      type: "String",
    },
    position: {
      type: "String",
    },
    category: {
      type: "String",
    },
    workStatus: {
      type: "String",
    },
    gender: {
      type: "String",
    },
    dob: {
      type: "String",
    },
    nationalNo: {
      type: "String",
    },
    salaryGrade: {
      type: "String",
    },
    firstAppointment: {
      type: "String",
    },
    refugee: {
      type: "String",
    },
    countryOfOrigin: {
      type: "String",
    },
    trainingLevel: {
      type: "String",
    },
    professionalQual: {
      type: "String",
    },
    notes: {
      type: "String",
    },
    teacherUniqueID: {
      type: "String",
    },
    teachersEstNo: {
      type: "String",
    },

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

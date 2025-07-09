const mongoose = require("mongoose");
const { SchoolFacilitiesSchema } = require("./school-facilities");
const { Schema } = mongoose;

const SchoolDataSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    payam28: { type: String, required: true },
    state10: { type: String, required: true },
    county28: { type: String, required: true },
    schoolName: { type: String, required: true },
    schoolOwnerShip: {
      type: String
    },
    isEnrollmentComplete: [{
      year: { type: Number },
      isComplete: { type: Boolean, default: false },
      completedBy: { type: String },
      comments: { type: String },
      percentageComplete: { type: Number },
      learnerEnrollmentComplete: { type: Boolean, default: false },
    }],
    schoolType: {
      type: String
    },
    headTeacher: {
      name: { type: String },
      phoneNumber: { type: String },
      email: { type: String },
    },
    pta: {
      name: { type: String },
      phoneNumber: { type: String },
    },
    reporter: {
      name: { type: String },
      phoneNumber: { type: String },
    },
    facilities: SchoolFacilitiesSchema,
    location: {
      gpsLng: { type: Number },
      gpsLat: { type: Number },
      gpsElev: { type: Number },
      distanceToNearestVillage: { type: Number },
      distanceToNearestSchool: { type: Number },
      distanceToBank: { type: Number },
      distanceToMarket: { type: Number },
      distanceToCamp: { type: Number },
    },

    isDisbursed: [
      {
        year: {type: Number},
        disbursed: {type: Boolean, default: false},
        paymentWitnesses: [
          {
            name: {type: String},
            role: {type: String},
          },
        ],
      },
    ],

    subjects: [String],

    mentoringProgramme: [
      {
        isAvailable: { type: Boolean, default: false },
        activities: [String],
      },
    ],

    feedingProgramme: [
      {
        name: String,
        organizationName: String,
        numberOfMeals: Number,
        kindStaff: {
          type: String,
        },
        isAvailable: { type: Boolean, default: false },
      },
    ],

    emisId: { type: String },

    radioCoverage: {
      stations: [{ name: String, isActive: Boolean }],
    },

    cellphoneCoverage: {
      vivacel: { type: Boolean, default: false },
      mtn: { type: Boolean, default: false },
      zain: { type: Boolean, default: false },
      gemtel: { type: Boolean, default: false },
      digitel: { type: Boolean, default: false },
      other: { type: Boolean, default: false },
    },

    operation: {
      boarding: { type: Boolean, default: false },
      daySchool: { type: Boolean, default: false },
      dayBoarding: { type: Boolean, default: false },
      feePaid: { type: Boolean, default: false },
      feeAmount: { type: Number, default: 0 },
    },
    schoolCategory: {
      type: String,
      enum: ["boys", "girls", "mixed"],
    },

    calendar: {
      year: { type: Number },
      terms: [
        {
          termNumber: { type: Number },
          startDate: { type: Date },
          endDate: { type: Date },
        },
      ],
      holidays: [
        {
          holidayName: { type: String },
          startDate: { type: Date },
          endDate: { type: Date },
        },
      ],
    },
    bankDetails: {
      bankName: {
        type: String,
      },
      accountName: {
        type: String,
      },
      accountNumber: {
        type: Number,
      },
      bankBranch: {
        type: String,
      },
    },
    lastVisited: [
      {
        date: { type: Date },
        byWho: { type: String },
        comments: { type: String },
      },
    ],
    schoolStatus: {
      isOpen: { type: String },
      closeReason: { type: String },
      closedDate: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("schooldata", SchoolDataSchema, "schooldata");

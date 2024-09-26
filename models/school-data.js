const mongoose = require("mongoose");
const { Schema } = mongoose;

const SchoolDataSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    payam28: { type: String, required: true },
    state10: { type: String, required: true },
    county28: { type: String, required: true },
    schoolName: { type: String, required: true },
    schoolOwnerShip: {
      type: String,
      enum: ["Community", "Private", "Faith", "Public"],
    },
    schoolType: {
      type: String,
      enum: ["PRI", "SEC", "ECD", "ALP", "ASP", "CGS"],
    },
    headTeacher: [{ type: Schema.Types.ObjectId, ref: "user" }],
    pta: {
      name: { type: String, required: true },
      phoneNumber: { type: String, required: true },
    },
    reporter: { type: Schema.Types.ObjectId, ref: "user" },
    facilities: [{ type: Schema.Types.ObjectId, ref: "SchoolFacilities" }],

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
      stations: [{ type: Schema.Types.ObjectId, ref: "RadioStation" }],
      programme: { type: Boolean, default: false },
      programmeGroup: { type: String },
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
      year: { type: Number, required: true }, // Academic year (e.g., 2024)
      terms: [
        {
          termNumber: { type: Number, required: true }, // Term number (1, 2, 3)
          startDate: { type: Date, required: true }, // Start date of the term
          endDate: { type: Date, required: true }, // End date of the term
        },
      ],
      holidays: [
        {
          holidayName: { type: String, required: true }, // Name of the holiday
          startDate: { type: Date, required: true }, // Start date of the holiday
          endDate: { type: Date, required: true }, // End date of the holiday
        },
      ],
    },
    bankDetails: {
      bankName: { type: String, required: true },
      accountName: { type: String, required: true },
      accountNumber: { type: String, required: true },
    },
    lastVisited: [
      {
        date: { type: Date, required: true },
        byWho: { type: String },
        comments: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("schooldata", SchoolDataSchema, "schooldata");

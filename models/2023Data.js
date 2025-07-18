const mongoose = require("mongoose");

const schoolDataSchema = new mongoose.Schema(
  {
    year: Number,
    state28: String,
    stateName28: String,
    county28: String,
    payam28: String,
    state10: String,
    stateName10: String,
    county10: String,
    payam10: String,
    school: String,
    class: String,
    code: String,
    education: String,
    form: Number,
    formstream: Number,
    gender: String,
    dob: String,
    age: Number,
    firstName: String,
    middleName: String,
    lastName: String,
    eieStatus: String,
    isPromoted: { type: Boolean, default: false },
    isDroppedOut: { type: Boolean, default: false },
    academicHistory: [
      {
        year: { type: Number },
        status: {
          promoted: { type: Boolean, default: false },
          droppedOut: { type: Boolean, default: false },
          repeated: { type: Boolean, default: false },
          absentDuringEnrolment: { type: Boolean, default: false },
          demoted: { type: Boolean, default: false },
          promotionRevoked: { type: Boolean, default: false },
          classChanged: { type: Boolean, default: false },
        },
        date: { type: Date, default: Date.now },
      },
    ],
    isCTValidated: [
      {
        year: { type: Number },
        validated: { type: Boolean, default: false },
        invalidationReason: { type: String },
        dateInvalidated: { type: String },
        validatedBy: { type: String },
        CTEFSerialNumber: { type: String },
      },
    ],
    isWithDisability: { type: Boolean, default: false },
    isValidatedWithDisability: [
      {
        year: { type: Number },
        validated: { type: Boolean, default: false },
      },
    ],
    isDisbursed: [
      {
        year: { type: Number },
        disbursed: { type: Boolean, default: false },
      },
    ],
    dateCTEFPaid: { type: String },
    learnerUniqueID: Number,
    reference: String,
    attendance: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attendance",
      },
    ],
    ctAttendance: { type: String },
    correctionReason: {
      type: String,
      required: false,
      default: "",
    },
    isAlpProgram: [
      {
        guardianName: {
          type: String,
          default: "",
          required: false,
        },
        Contact: {
          type: String,
          default: "",
          required: false,
        },
        relevantCode: {
          type: String,
          default: "",
          required: false,
        },
        ctefSerialNo: {
          type: String,
          default: "",
          required: false,
        },
      },
    ],
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
    houseHold: [
      {
        guardianPhone: {
          type: Number,
        },
        guardianCountryOfOrigin: {
          type: String,
          default: "",
        },
        maleAdult: {
          type: String,
          default: "",
        },
        femaleAdult: {
          type: String,
          default: "",
        },
        maleBelow18: {
          type: String,
          default: "",
        },
        femaleBelow18: {
          type: String,
          default: "",
        },
        maleWithDisability: {
          type: String,
          default: "",
        },
        femaleWithDisability: {
          type: String,
          default: "",
        },
      },
    ],
    pregnantOrNursing: {
      pregnant: {
        type: Boolean,
      },
      nursing: {
        type: Boolean,
      },
      moredetails: {
        type: String,
      },
    },
    modifiedBy: String,
    progress: [
      {
        year: {
          type: Number,
          required: true,
          validate: {
            validator: (year) =>
              year > 1980 && year <= new Date().getFullYear(),
            message:
              "Year must be a valid number between 1980 and the current year.",
          },
        },
        class: {
          type: String,
          required: false,
        },
        educationLevel: {
          type: String,
          required: false,
        },
        learnerUniqueID: {
          type: Number,
          required: false,
        },
        reference: {
          type: String,
          required: false,
        },
        code: {
          type: String,
          required: false,
        },
        school: {
          type: String,
          required: false,
        },
        attendanceRate: {
          type: Number,
          min: 0,
          max: 100,
          required: false,
        },
        status: {
          type: String,
          enum: [
            "Enrolled",
            "Promoted",
            "Repeated",
            "DroppedOut",
            "Returned",
            "Transferred",
            "Graduated",
            "Transition",
            "Demoted",
            "PromotionRevoked",
            "ClassCorrected",
          ],
          required: true,
        },
        isAwaitingTransition: {
          type: Boolean,
          required: false,
          default: false,
        },
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
        remarks: {
          type: String,
          required: false,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index to replace individual class and code indexes
schoolDataSchema.index({ code: 1, class: 1 });

// Reuse code + timestamp fields as compound indexes
schoolDataSchema.index({ code: 1, updatedAt: 1 });
schoolDataSchema.index({ code: 1, createdAt: 1 });

// Compound index for code + disability flag
schoolDataSchema.index({ code: 1, isWithDisability: 1 });

// Individual index for payam28 (assuming queried alone)
schoolDataSchema.index({ payam28: 1 });

// Compound index for academicHistory + code (drops separate sparse index)
schoolDataSchema.index({ code: 1, "academicHistory.status.droppedOut": 1 });

// Compound index on disabilities (no changes unless you query them together)
schoolDataSchema.index({
  "disabilities.disabilities.difficultyHearing": 1,
  "disabilities.disabilities.difficultyRecalling": 1,
  "disabilities.disabilities.difficultySeeing": 1,
  "disabilities.disabilities.difficultySelfCare": 1,
  "disabilities.disabilities.difficultyTalking": 1,
  "disabilities.disabilities.difficultyWalking": 1,
});

// Compound index for enrollment tracking
schoolDataSchema.index({
  "isEnrollmentComplete.year": 1,
  "isEnrollmentComplete.percentageComplete": 1,
});

const SchoolData = mongoose.model("schooldata2023", schoolDataSchema);

module.exports = SchoolData;

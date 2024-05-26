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
    isPromoted: { type: Boolean, default: false },
    isDroppedOut: { type: Boolean, default: false },
    isValidated: {
      type: Boolean,
    },
    invalidationReason: { type: String },
    isDisbursed: {
      type: Boolean,
      default: false,
    },

    CTEFSerialNumber: {
      Number: { type: String },
      DateIssued: { type: String },
    },
    dateCTEFPaid: { type: String },
    learnerUniqueID: Number,
    reference: String,
    dateCorrectedOnSSSAMS: Date,
    dateApproved: Date,
    signatureOnPaymentList: Number,
    dateCollectedAtSchool: Date,
    accountabilityCTEFReceived: Date,
    accountabilityCTEFSerialNumber: String,
    CTPaid: Number,
    uniqueReceivedP5Girls: Number,
    uniqueReceivedNewSchools: Number,
    uniqueReceived: Number,
    attendance: {
      type: String,
      required: false,
    },
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
  },
  {
    timestamps: true,
  }
);

const SchoolData = mongoose.model("schooldata2023", schoolDataSchema);

module.exports = SchoolData;

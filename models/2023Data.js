const mongoose = require("mongoose");

// Define a schema for the data
const schoolDataSchema = new mongoose.Schema({
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
  dob: Date,
  age: Number,
  "first name": String,
  "middle name": String,
  "last name": String,
  isPending: {
    type: Boolean,
    default: false,
  },

  isDisbursed: {
    type: Boolean,
    default: false,
  },
  learnerUniqueID: Number,
  reference: String,
  over18: String,
  eligible: Number,
  dateValidatedAtSchool: Date,
  CTEFReceivedAtSA: Date,
  CTEFSerialNumber: String,
  dateCorrectedOnSSSAMS: Date,
  dateApproved: Date,
  signatureOnPaymentList: Number,
  dateCollectedAtSchool: Date,
  accountabilityCTEFReceived: Date,
  accountabilityCTEFSerialNumber: String,
  CTPaid: Number,
  dateCTPaid: Date,
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
        difficultySeeing: {
          seeing: "",
          rating: 0,
        },
        difficultyHearing: {
          hearing: "",
          rating: 0,
        },
        difficultyTalking: {
          talking: "",
          rating: 0,
        },
        difficultySelfCare: {
          selfCare: "",
          rating: 0,
        },
        difficultyWalking: {
          walking: "",
          rating: 0,
        },
        difficultyRecalling: {
          recalling: "",
          rating: 0,
        },
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
});

// Create a Mongoose model based on the schema
const SchoolData = mongoose.model("schooldatas", schoolDataSchema);

module.exports = SchoolData;

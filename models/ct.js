const mongoose = require("mongoose");

const CashTransferSchema = new mongoose.Schema(
  {
    tranche: { type: Number, required: true },
    year: { type: Number, required: true },
    location: {
      state10: { type: String, required: true },
      county10: { type: String, required: true },
      payam10: { type: String, required: true },
    },
    school: {
      name: { type: String, required: true },
      code: { type: String, required: true },
      type: { type: String, required: true },
      ownership: {
        type: String,
        enum: ["Public", "Private", "Faith-based", "Community"],
        required: true,
      },
    },
    learner: {
      dob: { type: Date, required: true },
      name: {
        firstName: { type: String, required: true },
        middleName: { type: String },
        lastName: { type: String, required: true },
      },
      learnerUniqueID: { type: Number, required: true },
      reference: { type: String, required: true },
      classInfo: {
        class: { type: String, required: true },
        classStream: { type: String, required: true },
      },
      gender: {
        type: String,
        enum: ["M", "F"],
        required: true,
      },
      attendance: { type: String },
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
      collectedBy: { type: String },
    },
    validation: {
      isValidated: { type: Boolean, default: false },
      invalidationReason: { type: String },
      dateFormsReviewedSigned: { type: Date },
      formsSignedBy: { type: String },
      dateCtefSerialEnteredBySA: { type: Date },
      dateCorrected: { type: Date },
      finalSerialCtefNumber: { type: Number },
      dateValidatedAtSchool: { type: Date },
      // validationWitnessedBy: [
      //   {
      //     name: { type: String },
      //     role: { type: String },
      //   },
      // ],
      validatedBy: { type: String },
    },
    amounts: {
      approved: {
        amount: { type: Number, min: 0 },
        currency: { type: String, default: "SSP" },
      },
      paid: {
        amount: { type: Number, min: 0 },
        currency: { type: String, default: "SSP" },
      },
    },
    approval: {
      dateApprovedByETMC: { type: Date },
      paymentMethod: {
        type: String,
        enum: ["Bank", "Pay Agent", "Mobile Money"],
      },
      paymentThroughDetails: {
        bankName: { type: String },
        payAgentName: { type: String },
        mobileMoneyName: { type: String },
        contactAtBank: { type: String },
      },
    },
    heldBy: {
      fundsHeldBy: { type: String },
      fundsHeldAmount: { type: Number, min: 0 },
      dateReturnedHeldFunds: { type: Date },
      commentsReturnedHeldFunds: { type: String },
    },
    paymentWitnesses: [
      {
        name: { type: String },
        role: { type: String },
      },
    ],
    accountability: {
      dateReceivedBySA: { type: Date },
      signedCtef: { type: Boolean, default: false },
      serialCtefEntered: { type: Number },
      amountAccounted: { type: Number, min: 0 },
      dateAccounted: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CashTransfer", CashTransferSchema);

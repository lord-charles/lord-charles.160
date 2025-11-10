const mongoose = require("mongoose");

const CashTransferSchema = new mongoose.Schema(
  {
    tranche: { type: Number, required: true },
    year: { type: Number, required: true },
    location: {
      state10: { type: String, required: true },
      county28: { type: String, required: true },
      payam28: { type: String, required: true },
    },
    school: {
      name: { type: String },
      code: { type: String },
      type: { type: String },
      ownership: {
        type: String,
      },
    },
    learner: {
      dob: { type: String },
      name: {
        firstName: { type: String },
        middleName: { type: String },
        lastName: { type: String },
      },
      learnerUniqueID: { type: Number },
      reference: { type: String },
      classInfo: {
        class: { type: String, required: true },
        classStream: { type: String },
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
            difficultyHearing: { type: Number },
            difficultyRecalling: { type: Number },
            difficultySeeing: { type: Number },
            difficultySelfCare: { type: Number },
            difficultyTalking: { type: Number },
            difficultyWalking: { type: Number },
          },
        },
      ],
      collectedBy: { type: String },
    },
    validation: {
      isValidated: { type: Boolean, default: false },
      invalidationReason: { type: String },
      dateFormsReviewedSigned: { type: String },
      formsSignedBy: { type: String },
      dateCtefSerialEnteredBySA: { type: String },
      dateCorrected: { type: String },
      finalSerialCtefNumber: { type: Number },
      dateValidatedAtSchool: { type: String },
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
        isDisbursed: { type: Boolean, default: false },
        dateDisbursed: { type: String },
        disbursedBy: { type: String },
      },
    },
    approval: {
      dateApprovedByETMC: { type: String },
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
      dateReturnedHeldFunds: { type: String },
      commentsReturnedHeldFunds: { type: String },
    },
    paymentWitnesses: [
      {
        name: { type: String },
        role: { type: String },
      },
    ],
    accountability: {
      dateReceivedBySA: { type: String },
      signedCtef: { type: Boolean, default: false },
      serialCtefEntered: { type: Number },
      amountAccounted: { type: Number, min: 0 },
      dateAccounted: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CashTransfer", CashTransferSchema);

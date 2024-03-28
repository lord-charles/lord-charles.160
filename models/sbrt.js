const mongoose = require("mongoose");

const SbrtSchema = new mongoose.Schema({
  physicalInput: [
    {
      activityName: {
        type: String,
        required: true,
      },
      date: {
        type: String,
      },
      // subCommitteeName: {
      //   type: String,
      //   required: false,
      // },
      estimatedCost: {
        type: Number,
        required: true,
      },
      pwd: {
        type: String,
        required: true,
      },
      code: {
        type: String,
        required: true,
      },
      budget: [
        {
          itemName: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
          cost: {
            type: Number,
            required: true,
          },
          fundSorce: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],
  leaningInclusion: [
    {
      activityName: {
        type: String,
        required: true,
      },
      date: {
        type: String,
      },
      // subCommitteeName: {
      //   type: String,
      //   required: false,
      // },
      estimatedCost: {
        type: Number,
        required: true,
      },
      pwd: {
        type: String,
        required: true,
      },
      code: {
        type: String,
        required: true,
      },
      budget: [
        {
          itemName: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
          cost: {
            type: Number,
            required: true,
          },
          fundSorce: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],
  generalSupport: [
    {
      activityName: {
        type: String,
        required: true,
      },
      date: {
        type: String,
      },
      // subCommitteeName: {
      //   type: String,
      //   required: false,
      // },
      estimatedCost: {
        type: Number,
        required: true,
      },
      pwd: {
        type: String,
        required: true,
      },
      code: {
        type: String,
        required: true,
      },
      budget: [
        {
          itemName: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
          cost: {
            type: Number,
            required: true,
          },
          fundSorce: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],
  schoolCode: String,
  year: Number,
  approved: [
    {
      isApproved: {
        type: Boolean,
        default: false,
      },
      rejectionReason: {
        type: String,
      },
      userName: String,
    },
  ],
  income: [
    {
      sourceType: {
        type: String,
      },
      sourceName: {
        type: String,
      },
      amount: {
        type: Number,
      },
      transactionNumber: {
        type: Number,
      },
      date: {
        type: String,
      },
    },
  ],
  ledger: [
    {
      expenditure: {
        type: String,
      },
      cost: {
        type: Number,
      },
      quantity: {
        type: Number,
      },
    },
  ],
});

const Sbrt = mongoose.model("Sbrt", SbrtSchema);

module.exports = Sbrt;

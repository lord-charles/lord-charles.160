const mongoose = require("mongoose");

const SdpSchema = new mongoose.Schema({
  physicalInput: [
    {
      activityCategory: {
        type: String,
        required: true,
      },
      activitySubCategory: {
        type: String,
        required: true,
      },
      activityName: {
        type: String,
        required: true,
      },
      date: {
        type: String,
      },
      estimatedCost: {
        type: Number,
        required: true,
      },
      // pwd: {
      //   type: String,
      //   required: true,
      // },
      // code: {
      //   type: String,
      //   required: true,
      // },
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
          // fundSorce: {
          //   type: String,
          //   required: true,
          // },
        },
      ],
    },
  ],

  leaningInclusion: [
    {
      activityCategory: {
        type: String,
        required: true,
      },
      activitySubCategory: {
        type: String,
        required: true,
      },
      activityName: {
        type: String,
        required: true,
      },
      date: {
        type: String,
      },

      estimatedCost: {
        type: Number,
        required: true,
      },
      // pwd: {
      //   type: String,
      //   required: true,
      // },
      // code: {
      //   type: String,
      //   required: true,
      // },
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
          // fundSorce: {
          //   type: String,
          //   required: true,
          // },
        },
      ],
    },
  ],

  generalSupport: [
    {
      activityCategory: {
        type: String,
        required: true,
      },
      activitySubCategory: {
        type: String,
        required: true,
      },
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
      // pwd: {
      //   type: String,
      //   required: true,
      // },
      // code: {
      //   type: String,
      //   required: true,
      // },
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
          // fundSorce: {
          //   type: String,
          //   required: true,
          // },
        },
      ],
    },
  ],

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

  schoolCode: String,
  year: Number,
});

const Sdp = mongoose.model("Sdp", SdpSchema);

module.exports = Sdp;

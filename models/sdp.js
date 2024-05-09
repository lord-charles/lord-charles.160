const mongoose = require("mongoose");

const sdpInputchema = new mongoose.Schema(
  {
    Sdp: [
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
    category: String,
    schoolCode: String,
    schoolName: String,
    year: Number,
    approved: {
      isApproved: {
        type: String,
        enum: ["approved", "pending", "rejected"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: null,
      },
      userName: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

const SdpInputs = mongoose.model("SdpInputs", sdpInputchema);

module.exports = SdpInputs;

const mongoose = require("mongoose");

const physicalInputchema = new mongoose.Schema(
  {
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
    schoolCode: String,
    schoolName: String,
    year: Number,
    approved: [
      {
        isApproved: {
          type: Boolean,
        },
        rejectionReason: {
          type: String,
        },
        userName: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const physicalInputs = mongoose.model("physicalInputs", physicalInputchema);

module.exports = physicalInputs;

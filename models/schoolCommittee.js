const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const committeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    HeadTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    DeputyHeadTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    SchoolOfficer: [
      {
        firstName: {
          type: String,
        },
        middleName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        dob: {
          type: String,
        },
      },
    ],
    FemaleTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    MaleTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    FemaleParentRepresentative: [
      {
        firstName: {
          type: String,
        },
        middleName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        dob: {
          type: String,
        },
      },
    ],
    MaleParentRepresentative: [
      {
        firstName: {
          type: String,
        },
        middleName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        dob: {
          type: String,
        },
      },
    ],
    HeadGirl: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "schooldata2023",
      required: true,
    },
    HeadBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "schooldata2023",
      required: true,
    },
    MaleParentRepresentativelearnerWithDisability: [
      {
        firstName: {
          type: String,
        },
        middleName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        dob: {
          type: String,
        },
      },
    ],
    FemaleParentRepresentativelearnerWithDisability: [
      {
        firstName: {
          type: String,
        },
        middleName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        dob: {
          type: String,
        },
      },
    ],
    FoundingBody: [
      {
        firstName: {
          type: String,
        },
        middleName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        dob: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("SchoolCommitte", committeSchema);

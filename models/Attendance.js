const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "schooldata2023",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    absenceReason: {
      type: String,
    },
    absent: {
      type: Boolean,
      default: false,
    },
    // Student information fields
    county28: String,
    payam28: String,
    state10: String,
    school: String,
    code: String,
    education: String,
    gender: String,
    firstName: String,
    middleName: String,
    lastName: String,
    learnerUniqueID: String,
    reference: String,
    isWithDisability: Boolean
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient querying
attendanceSchema.index({ year: 1, state10: 1, county28: 1, payam28: 1 });
attendanceSchema.index({ date: 1, student: 1 }, { unique: true }); // Prevent duplicate attendance records

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;

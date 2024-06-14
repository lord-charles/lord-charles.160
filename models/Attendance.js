const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;

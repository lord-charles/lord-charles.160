const express = require("express");
const router = express.Router();
const {
  markAttendanceBulk,
  getStudentsAttendance,
  deleteAttendanceForDay,
} = require("../controller/attendance");

router.post("/markAttendanceBulk", markAttendanceBulk);
router.post("/getStudentsAttendance", getStudentsAttendance);
router.delete("/deleteAttendanceForDay", deleteAttendanceForDay);

module.exports = router;

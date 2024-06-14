const express = require("express");
const router = express.Router();
const {
  markAttendanceBulk,
  getStudentsAttendance,
  deleteAttendanceForDay,
} = require("../controller/attendance");

router.post("/markAttendanceBulk", markAttendanceBulk);
router.post("/getStudentsAttendance", getStudentsAttendance);
router.post("/deleteAttendanceForDay", deleteAttendanceForDay);

module.exports = router;

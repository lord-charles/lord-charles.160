const express = require("express");
const router = express.Router();
const {
  markAttendanceBulk,
  getStudentsAttendance,
  deleteAttendanceForDay,
} = require("../controller/attendance");

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: API endpoints for managing student attendance
 */

/**
 * @swagger
 * /attendance/markAttendanceBulk:
 *   post:
 *     summary: Mark attendance for multiple students
 *     tags: [Attendance]
 *     description: This endpoint is used to mark attendance for a bulk of students for a specific day.
 *     requestBody:
 *       description: List of students with their attendance data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-17"
 *               students:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: string
 *                       example: "64a3c2efb27dca29b1a1f3f8"
 *                     status:
 *                       type: string
 *                       enum: [Present, Absent, Late]
 *                       example: "Present"
 *     responses:
 *       200:
 *         description: Attendance marked successfully for bulk students
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post("/markAttendanceBulk", markAttendanceBulk);

/**
 * @swagger
 * /attendance/getStudentsAttendance:
 *   post:
 *     summary: Get attendance for specific students
 *     tags: [Attendance]
 *     description: This endpoint retrieves the attendance for a set of students on a specific date.
 *     requestBody:
 *       description: List of student IDs and the date for which attendance is to be fetched
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-17"
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "64a3c2efb27dca29b1a1f3f8"
 *     responses:
 *       200:
 *         description: Successfully retrieved students' attendance for the specified date
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Students' attendance not found for the given date
 *       500:
 *         description: Internal server error
 */
router.post("/getStudentsAttendance", getStudentsAttendance);

/**
 * @swagger
 * /attendance/deleteAttendanceForDay:
 *   post:
 *     summary: Delete attendance for a specific day
 *     tags: [Attendance]
 *     description: This endpoint allows deleting all attendance records for a specific date.
 *     requestBody:
 *       description: Date for which attendance records should be deleted
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-17"
 *     responses:
 *       200:
 *         description: Successfully deleted attendance for the specified day
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Attendance not found for the given day
 *       500:
 *         description: Internal server error
 */
router.post("/deleteAttendanceForDay", deleteAttendanceForDay);

module.exports = router;

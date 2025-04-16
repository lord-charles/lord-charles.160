const express = require("express");
const router = express.Router();
const {
  markAttendanceBulk,
  getStudentsAttendance,
  deleteAttendanceForDay,
  getLearnersWithAbsenceStatus
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

/**
 * @swagger
 * /attendance/getLearnersWithAbsenceStatus:
 *   post:
 *     summary: Get learners with absence status
 *     tags: [Attendance]
 *     description: This endpoint retrieves learners with their absence status for a specific date.
 *     requestBody:
 *       description: School code and attendance date
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "1234567890"
 *               attendanceDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-17"
 *     responses:
 *       200:
 *         description: Successfully retrieved learners with absence status
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: No learners found
 *       500:
 *         description: Internal server error
 */
router.post("/getLearnersWithAbsenceStatus", getLearnersWithAbsenceStatus);

/**
 * @swagger
 * /attendance/statistics:
 *   post:
 *     summary: Get attendance statistics with breakdowns
 *     tags: [Attendance]
 *     description: Get comprehensive attendance statistics including total learners, gender distribution, disability status, and attendance breakdown
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *             properties:
 *               year:
 *                 type: number
 *                 description: Academic year
 *                 example: 2024
 *               state10:
 *                 type: string
 *                 description: Optional state filter
 *               county28:
 *                 type: string
 *                 description: Optional county filter
 *               payam28:
 *                 type: string
 *                 description: Optional payam filter
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: Total number of learners
 *                 male:
 *                   type: number
 *                   description: Total male learners
 *                 female:
 *                   type: number
 *                   description: Total female learners
 *                 withDisability:
 *                   type: number
 *                   description: Total learners with disability
 *                 maleWithDisability:
 *                   type: number
 *                   description: Male learners with disability
 *                 femaleWithDisability:
 *                   type: number
 *                   description: Female learners with disability
 *                 absent:
 *                   type: number
 *                   description: Total absent learners
 *                 absentMale:
 *                   type: number
 *                   description: Absent male learners
 *                 absentFemale:
 *                   type: number
 *                   description: Absent female learners
 *                 absentWithDisability:
 *                   type: number
 *                   description: Absent learners with disability
 *                 present:
 *                   type: number
 *                   description: Total present learners
 *                 presentMale:
 *                   type: number
 *                   description: Present male learners
 *                 presentFemale:
 *                   type: number
 *                   description: Present female learners
 *                 presentWithDisability:
 *                   type: number
 *                   description: Present learners with disability
 *       400:
 *         description: Invalid input - year is required
 *       404:
 *         description: No learners found for the specified filters
 *       500:
 *         description: Internal server error
 */
// router.post("/statistics", getAttendanceStatistics);

module.exports = router;

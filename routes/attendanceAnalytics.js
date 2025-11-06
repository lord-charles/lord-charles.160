const router = require("express").Router();
const attendanceAnalyticsController = require("../controller/attendanceAnalytics");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

/**
 * Main Attendance Analytics Endpoint
 * GET /attendance-analytics
 *
 * Provides comprehensive attendance analytics with dynamic geographic grouping
 * Query Parameters:
 * - year (required): Year to analyze
 * - state10 (optional): Filter by state
 * - county28 (optional): Filter by county
 * - payam28 (optional): Filter by payam
 * - code (optional): Filter by school code
 */
router.get(
  "/",
  cacheMiddleware(600), // 10 minutes cache
  attendanceAnalyticsController.getAttendanceAnalytics
);

/**
 * Attendance Trends Over Time
 * GET /attendance-analytics/trends
 *
 * Shows attendance trends grouped by time periods
 * Additional Query Parameters:
 * - groupBy (optional): "day", "week", or "month" (default: "month")
 */
router.get(
  "/trends",
  cacheMiddleware(900), // 15 minutes cache
  attendanceAnalyticsController.getAttendanceTrends
);

/**
 * Top Absence Reasons
 * GET /attendance-analytics/absence-reasons
 *
 * Shows most common absence reasons
 * Additional Query Parameters:
 * - limit (optional): Number of top reasons to return (default: 10)
 */
router.get(
  "/absence-reasons",
  cacheMiddleware(1200), // 20 minutes cache
  attendanceAnalyticsController.getAbsenceReasons
);

module.exports = router;

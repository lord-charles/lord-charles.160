const express = require("express");
const router = express.Router();
const capitationReportsController = require("../controller/capitationReportsController");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

// Get comprehensive capitation reports with 24-hour cache
// 86400 seconds = 24 hours
router.get(
  "/",
  cacheMiddleware(86400),
  capitationReportsController.getCapitationReports,
);

module.exports = router;

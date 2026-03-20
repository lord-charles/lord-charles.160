const express = require("express");
const router = express.Router();
const capitationReportsController = require("../controller/capitationReportsController");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

// Get all funding groups for a year
router.get(
  "/funding-groups",
  cacheMiddleware(86400),
  capitationReportsController.getFundingGroups,
);

// Get comprehensive capitation reports with 24-hour cache
// 86400 seconds = 24 hours
router.get(
  "/",
  cacheMiddleware(86400),
  capitationReportsController.getCapitationReports,
);

module.exports = router;

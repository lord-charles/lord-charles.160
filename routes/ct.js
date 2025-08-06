const express = require("express");
const router = express.Router();
const cashTransferController = require("../controller/ct");
const ctEligibleController = require("../controller/ct-eligible");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const ctCriteriaController = require("../controller/ctcriteria");

// CRUD routes
router.post("/", cashTransferController.createCashTransfer);
router.get("/", cacheMiddleware(600));
router.get("/:id", cashTransferController.getCashTransferById);
router.patch("/:id", cashTransferController.updateCashTransfer);
router.delete("/:id", cashTransferController.deleteCashTransfer);
router.get(
  "/stat-card/data",
  cacheMiddleware(600),
  cashTransferController.getStatCardData
);
router.get(
  "/get/unique-schools",
  cacheMiddleware(600),
  cashTransferController.getUniqueCtSchools
);
router.get(
  "/get/learners",
  cacheMiddleware(600),
  cashTransferController.getLearnerByCode
);

// Eligible learners for cash transfer
router.get(
  "/eligible/learners",
  cacheMiddleware(600),
  ctEligibleController.getEligibleLearners
);
router.get(
  "/eligible/learners/stats",
  cacheMiddleware(600),
  ctEligibleController.getEligibleLearnersStats
);

// Eligible schools for cash transfer
router.get(
  "/eligible/schools",
  cacheMiddleware(600),
  ctEligibleController.schoolWithEligibleLearners
);

// CTCriteria CRUD routes
router.post("/criteria", ctCriteriaController.createCTCriteria);
router.get("/get/criteria", ctCriteriaController.getAllCTCriteria);
router.get("/get/criteria/:id", ctCriteriaController.getCTCriteriaById);
router.patch("/criteria/:id", ctCriteriaController.updateCTCriteria);
router.delete("/criteria/:id", ctCriteriaController.deleteCTCriteria);

// Disbursement route by year
router.get(
  "/disbursements/by-year",
  cacheMiddleware(600),
  cashTransferController.getDisbursementByYear
);

// Disburse cash to a learner
router.post("/disburse/:learnerId", cashTransferController.disburseCash);

module.exports = router;

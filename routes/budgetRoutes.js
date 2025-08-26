const express = require("express");
const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getEligibility,
  getBudgetByCode,
  reviewBudget,
  unreviewBudget,
} = require("../controller/budgetController");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

const router = express.Router();

router.post("/", createBudget);

router.get("/", cacheMiddleware(600), getBudgets);

router.get("/:id", cacheMiddleware(600), getBudgetById);

router.get("/code/:code/:year", getBudgetByCode);

router.patch("/:id", updateBudget);

router.delete("/:id", deleteBudget);

router.get("/get/eligibility", cacheMiddleware(600), getEligibility);

// Review a budget and create an Accountability record
router.post("/:id/review", reviewBudget);

// Unreview a budget and delete linked Accountability record
router.patch("/:id/unreview", unreviewBudget);

module.exports = router;

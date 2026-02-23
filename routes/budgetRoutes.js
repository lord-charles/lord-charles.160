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
  getFundingGroups,
  getBudgetDocuments,
  addBudgetDocument,
} = require("../controller/budgetController");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

const router = express.Router();

router.post("/", createBudget);

router.get("/", cacheMiddleware(600), getBudgets);

// Specific routes must come before parameterized routes
router.get("/code/:code/:year", getBudgetByCode);

// Get funding groups for a specific year
router.get("/funding-groups/:year", cacheMiddleware(300), getFundingGroups);

// Budget documents per budget (optionally filtered by fundingGroup)
router.get("/:id/documents", getBudgetDocuments);
router.post("/:id/documents", addBudgetDocument);

router.get("/get/eligibility", cacheMiddleware(600), getEligibility);

// Review a budget and create an Accountability record
router.post("/:id/review", reviewBudget);

// Unreview a budget and delete linked Accountability record
router.patch("/:id/unreview", unreviewBudget);

// Parameterized routes should come last
router.get("/:id", cacheMiddleware(600), getBudgetById);

router.patch("/:id", updateBudget);

router.delete("/:id", deleteBudget);

module.exports = router;

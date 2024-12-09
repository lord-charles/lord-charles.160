const express = require("express");
const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
} = require("../controller/budgetController");

const router = express.Router();

// Create a new budget
router.post("/", createBudget);

// Get all budgets
router.get("/", getBudgets);

// Get a single budget by ID
router.get("/:id", getBudgetById);

// Update a budget by ID
router.put("/:id", updateBudget);

// Delete a budget by ID
router.delete("/:id", deleteBudget);

module.exports = router;

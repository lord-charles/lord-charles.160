const express = require("express");
const router = express.Router();
const budgetCodeController = require("../controller/budgetCodes");

// Routes for budget codes
router.get("/", budgetCodeController.getAllBudgetCodes);
router.get("/:id", budgetCodeController.getBudgetCodeById);
router.post("/", budgetCodeController.createBudgetCode);
router.put("/:id", budgetCodeController.updateBudgetCode);
router.delete("/:id", budgetCodeController.deleteBudgetCode);

module.exports = router;

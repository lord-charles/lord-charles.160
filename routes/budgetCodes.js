const express = require("express");
const router = express.Router();
const budgetCodeController = require("../controller/budgetCodes");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

// Routes for budget codes
router.get("/", cacheMiddleware(600), budgetCodeController.getAllBudgetCodes);
router.get("/:id", cacheMiddleware(600), budgetCodeController.getBudgetCodeById);
router.post("/", budgetCodeController.createBudgetCode);
router.put("/:id", budgetCodeController.updateBudgetCode);
router.delete("/:id", budgetCodeController.deleteBudgetCode);

module.exports = router;

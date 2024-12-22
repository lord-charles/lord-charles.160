// routes/accountabilityRoutes.js
const express = require("express");
const router = express.Router();
const accountabilityController = require("../controller/accountabilityController");

// Routes for accountability
router.get("/", accountabilityController.getAllAccountabilityEntries);
router.get("/:id", accountabilityController.getAccountabilityById);
router.post("/", accountabilityController.createAccountabilityEntry);
router.put("/:id", accountabilityController.updateAccountabilityEntry);
router.delete("/:id", accountabilityController.deleteAccountabilityEntry);

//APPROVALS
router.get(
  "/approvals/get-all",
  accountabilityController.getAllApprovalEntries
);

module.exports = router;

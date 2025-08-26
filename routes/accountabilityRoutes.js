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

// Approve a specific tranche on an accountability entry
router.patch(
  "/approvals/:id/approve",
  accountabilityController.approveTranche
);

// Route for fetching school-specific disbursement details
router.get("/disbursements/by-school", accountabilityController.getSchoolDisbursements);

module.exports = router;

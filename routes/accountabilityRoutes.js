// routes/accountabilityRoutes.js
const express = require("express");
const router = express.Router();
const accountabilityController = require("../controller/accountabilityController");

// STATS ENDPOINT - Must be before /:id route to avoid conflicts
router.get("/stats/dashboard", accountabilityController.getDashboardStats);

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
router.patch("/approvals/:id/approve", accountabilityController.approveTranche);

// Route for fetching school-specific disbursement details
router.get(
  "/disbursements/by-school",
  accountabilityController.getSchoolDisbursements
);

// NEW ROUTES FOR DISBURSEMENT AND ACCOUNTING
// Disburse funds for a tranche
router.patch("/:id/disburse", accountabilityController.disburseTranche);

// Record returned and held funds
router.patch(
  "/:id/returned-funds",
  accountabilityController.recordReturnedFunds
);
router.patch("/:id/held-funds", accountabilityController.recordHeldFunds);

// Suppliers (State Anchor disbursements)
router.post("/:id/suppliers", accountabilityController.addSupplier);
router.delete("/:id/suppliers", accountabilityController.removeSupplier);

// Accounting entries management
router.post("/:id/accounting", accountabilityController.addAccountingEntry);
router.patch(
  "/:id/accounting/:entryId",
  accountabilityController.updateAccountingEntry
);
router.delete(
  "/:id/accounting/:entryId",
  accountabilityController.deleteAccountingEntry
);

// Financial summary with real-time calculations
router.get(
  "/:id/financial-summary",
  accountabilityController.getFinancialSummary
);

module.exports = router;

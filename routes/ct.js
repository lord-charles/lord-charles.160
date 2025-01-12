const express = require("express");
const router = express.Router();
const cashTransferController = require("../controller/ct");

// CRUD routes
router.post("/", cashTransferController.createCashTransfer);
router.get("/", cashTransferController.getAllCashTransfers);
router.get("/:id", cashTransferController.getCashTransferById);
router.put("/:id", cashTransferController.updateCashTransfer);
router.delete("/:id", cashTransferController.deleteCashTransfer);

// Advanced routes
router.get(
  "/school/type/:type",
  cashTransferController.getTransfersBySchoolType
);
router.get("/totals/approved", cashTransferController.getTotalApprovedByState);
router.post(
  "/validate-approve/:id",
  cashTransferController.validateAndApproveTransfer
);

module.exports = router;

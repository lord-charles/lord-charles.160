const express = require("express");
const router = express.Router();
const cashTransferController = require("../controller/ct");

// CRUD routes
router.post("/", cashTransferController.createCashTransfer);
router.get("/", cashTransferController.getAllCashTransfers);
router.get("/:id", cashTransferController.getCashTransferById);
router.put("/:id", cashTransferController.updateCashTransfer);
router.delete("/:id", cashTransferController.deleteCashTransfer);
router.get("/stat-card/data", cashTransferController.getStatCardData);
router.get("/get/unique-schools", cashTransferController.getUniqueCtSchools);

module.exports = router;

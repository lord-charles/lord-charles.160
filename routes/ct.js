const express = require("express");
const router = express.Router();
const cashTransferController = require("../controller/ct");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

// CRUD routes
router.post("/", cashTransferController.createCashTransfer);
router.get("/", cacheMiddleware(600), cashTransferController.getAllCashTransfers);
router.get("/:id", cashTransferController.getCashTransferById);
router.put("/:id", cashTransferController.updateCashTransfer);
router.delete("/:id", cashTransferController.deleteCashTransfer);
router.get("/stat-card/data", cacheMiddleware(600), cashTransferController.getStatCardData);
router.get("/get/unique-schools", cacheMiddleware(600), cashTransferController.getUniqueCtSchools);
router.get("/get/learners", cacheMiddleware(600), cashTransferController.getLearnerByCode);

module.exports = router;

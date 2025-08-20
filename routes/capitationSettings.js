const express = require("express");
const router = express.Router();
const controller = require("../controller/capitationSettingsController");

// List / query
router.get("/", controller.getAllSettings);
// Get by id
router.get("/:id", controller.getSettingsById);
// Get by year
router.get("/by-year/:year", controller.getSettingsByYear);
// Create
router.post("/", controller.createSettings);
// Update by id
router.put("/:id", controller.updateSettingsById);
// Upsert by year
router.put("/upsert-by-year/:year", controller.upsertByYear);
// Delete by id
router.delete("/:id", controller.deleteSettingsById);

module.exports = router;

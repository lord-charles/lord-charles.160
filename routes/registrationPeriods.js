const express = require("express");
const router = express.Router();
const {
  createRegistrationPeriod,
  updateRegistrationPeriod,
  getCurrentRegistrationPeriod,
  deleteRegistrationPeriod,
  restoreRegistrationPeriod,
} = require("../controller/registrationPeriodController");

// Create a new registration period
router.post("/create", createRegistrationPeriod);

// Update an existing registration period
router.put("/update/:id", updateRegistrationPeriod);

// Get the current registration period status
router.get("/current", getCurrentRegistrationPeriod);

// Route for deleting a registration period
router.delete("/period/:id", deleteRegistrationPeriod);

// Route for restoring a registration period (soft delete)
router.patch("/period/:id/restore", restoreRegistrationPeriod);

module.exports = router;

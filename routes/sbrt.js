const express = require("express");
const router = express.Router();
const {
  createPhysicalInput,
  updatePhysicalInput,
  getAllPhysicalInputsBySchoolAndYear,
} = require("../controller/sbrt");

router.post("/", createPhysicalInput);
router.post(
  "/getAllPhysicalInputsBySchoolAndYear",
  getAllPhysicalInputsBySchoolAndYear
);
router.patch("/:id", updatePhysicalInput);

module.exports = router;

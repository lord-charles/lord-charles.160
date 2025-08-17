const express = require("express");
const router = express.Router();
const {
  createCensus,
  getAllCensus,
  getCensusById,
  getCensusBySchoolAndYear,
  updateCensus,
  deleteCensus,
  submitCensus,
  validateCensus,
  getCensusStatistics,
  getRegionalStatistics
} = require("../controller/censusController");


router.post("/", createCensus);

router.get("/", getAllCensus);

router.get("/school/:schoolCode/year/:year", getCensusBySchoolAndYear);

router.get("/:id", getCensusById);

router.put("/:id", updateCensus);

router.delete("/:id", deleteCensus);

// WORKFLOW ROUTES


router.post("/:id/submit", submitCensus);

router.post("/:id/validate", validateCensus);

// ANALYTICS & REPORTING ROUTES

router.get("/statistics/:year", getCensusStatistics);

router.get("/regional/:year", getRegionalStatistics);

module.exports = router;

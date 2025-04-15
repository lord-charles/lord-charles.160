const express = require("express");
const router = express.Router();
const { cachePostMiddleware } = require("../middlewares/cacheMiddleware");

const {
  getEligibleCountiesWithDisability,
  getEligiblePayamsWithDisability,
  getEligibleSchoolsWithDisability,
  getEligibleStudentsInSchool
} = require("../controller/disabilityEligibility");


router.post("/counties", cachePostMiddleware(600), getEligibleCountiesWithDisability);
router.post("/payams", cachePostMiddleware(600), getEligiblePayamsWithDisability);
router.post("/schools", cachePostMiddleware(600), getEligibleSchoolsWithDisability);
router.post("/students", getEligibleStudentsInSchool);

module.exports = router;

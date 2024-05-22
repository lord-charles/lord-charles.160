const express = require("express");
const router = express.Router();
const { getEnrollmentReport } = require("../controller/report");

router.get("/", getEnrollmentReport);

module.exports = router;

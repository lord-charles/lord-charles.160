const express = require("express");
const router = express.Router();
const { getEnrollmentReport } = require("../controller/report");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

router.get("/", cacheMiddleware(6000), getEnrollmentReport);

module.exports = router;

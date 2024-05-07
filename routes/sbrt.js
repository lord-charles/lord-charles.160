const express = require("express");
const router = express.Router();
const {
  createSdp,
  updateSdp,
  getAllSdpsBySchoolAndYear,
} = require("../controller/sdp");

router.post("/", createSdp);
router.post("/getAllSdpsBySchoolAndYear", updateSdp);
router.patch("/:id", getAllSdpsBySchoolAndYear);

module.exports = router;

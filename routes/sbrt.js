const express = require("express");
const router = express.Router();
const {
  createSdp,
  updateSdp,
  getAllSdpsBySchoolAndYear,
} = require("../controller/sdp");

router.post("/", createSdp);
router.post("/getAllSdpsBySchoolAndYear", getAllSdpsBySchoolAndYear);
router.patch("/:id", updateSdp);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  createSdp,
  updateSdp,
  getAllSdpsBySchoolAndYear,
  getSchoolsWithAllDocuments,
} = require("../controller/sdp");

router.post("/", createSdp);
router.post("/getAllSdpsBySchoolAndYear", getAllSdpsBySchoolAndYear);
router.patch("/:id", updateSdp);

router.post("/getSchoolsWithAllDocuments", getSchoolsWithAllDocuments);


module.exports = router;

const express = require("express");
const router = express.Router();
const {
  createSdp,
  updateSdp,
  getAllSdpsBySchoolAndYear,
  getSchoolsWithAllDocuments,
  getSchoolCountsPerStateMetReq,
  getSchoolCountsPerStateByBudgetStatus,
  getLatestSchoolsWithAnyDocuments,
} = require("../controller/sdp");

router.post("/", createSdp);
router.post("/getAllSdpsBySchoolAndYear", getAllSdpsBySchoolAndYear);
router.patch("/:id", updateSdp);

router.post("/getSchoolsWithAllDocuments", getSchoolsWithAllDocuments);
router.post("/getSchoolCountsPerStateMetReq", getSchoolCountsPerStateMetReq);
router.post(
  "/getSchoolCountsPerStateByBudgetStatus",
  getSchoolCountsPerStateByBudgetStatus
);
router.post(
  "/getLatestSchoolsWithAnyDocuments",
  getLatestSchoolsWithAnyDocuments
);


module.exports = router;

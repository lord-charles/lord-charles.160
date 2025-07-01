const router = require("express").Router();

const {
  createOrUpdateSchoolCommitte,
  getSchoolCommitte,
} = require("../controller/committe");

router.post("/createOrUpdateSchoolCommitte", createOrUpdateSchoolCommitte);
router.get("/getSchoolCommitte/:code", getSchoolCommitte);

module.exports = router;

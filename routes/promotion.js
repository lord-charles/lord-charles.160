const express = require("express");
const router = express.Router();
const ctrl = require("../controller/promotionCtrl");

// Super Admin only (enforced in middlewares/accessControl.js)
router.post("/preview", ctrl.preview);
router.get("/runs", ctrl.listRuns);
router.post("/runs", ctrl.createRun);
router.get("/runs/:id", ctrl.getRun);
router.post("/runs/:id/undo", ctrl.undo);

module.exports = router;

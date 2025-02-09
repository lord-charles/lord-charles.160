const express = require("express");
const {
  createRole,
  getRoles,
  deleteRole,
} = require("../controller/roleCtrl");

const router = express.Router();

router.post("/", createRole);
router.get("/", getRoles);
router.delete("/:id", deleteRole);

module.exports = router;

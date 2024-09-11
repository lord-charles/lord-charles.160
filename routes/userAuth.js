const router = require("express").Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");

const {
  createUser,
  logIn,
  getUsers,
  getUserById,
  getUserByEmail,
  deleteUser,
  verifyToken,
  getUserCount,
  updateUser,
  blockUser,
  unblockUser,
  updateUserDetails,
  forgotPassword,
  resetPassword,
  saveAddress,
  getUsersBySchool,
  payamSchoolDownload,
  updateUsersFieldsBulk,
  fetchUsersPerState,
  stateMaleFemaleStat,
  getUserByCriteria,

  // sept 2024
  getTeacherCountByLocation,
  getTeachersStatusCountByLocation,
  getTeachersPerState,
  getActiveTeachersPerState,
  getDroppedOutTeachersPerState,
} = require("../controller/userCtrl");

// User endpoints
router.post("/register-user", createUser);
router.post("/login", logIn);
router.get("/users/get-all", getUsers);
router.get("/users/get/:id", getUserById);
router.get("/users/get-email/", getUserByEmail);
router.get("/getUserByCriteria", getUserByCriteria);
router.get("/users/school/", getUsersBySchool);
router.post("/verifyToken", verifyToken);
router.delete("/users/delete-user/:id", deleteUser);
router.get("/users/get/all/count", getUserCount);
router.patch("/users/update/:id", updateUser);
router.post("/download/payams/schools", payamSchoolDownload);
router.patch("/update/bulk", updateUsersFieldsBulk);

//for Admin
router.put("/users/update-user-details", authMiddleware, updateUserDetails); //for loggedin user
router.put("/users/:id/block", blockUser);
router.put("/users/:id/unblock", unblockUser);
router.post("/users/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.put("/address", authMiddleware, saveAddress);

//dashboard

router.post("/fetchUsersPerState", fetchUsersPerState);
router.post("/stateMaleFemaleStat", stateMaleFemaleStat);

// apis sept 2024
router.post("/getTeacherCountByLocation", getTeacherCountByLocation);
router.post(
  "/getTeachersStatusCountByLocation",
  getTeachersStatusCountByLocation
);
router.post("/getTeachersPerState", getTeachersPerState);
router.post("/getActiveTeachersPerState", getActiveTeachersPerState);
router.post("/getDroppedOutTeachersPerState", getDroppedOutTeachersPerState);

module.exports = router;

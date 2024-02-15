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
} = require("../controller/userCtrl");

// User endpoints
router.post("/register", createUser);
router.post("/login", logIn);
router.get("/users/get-all", getUsers);
router.get("/users/get/:id", getUserById);
router.get("/users/get-email/", getUserByEmail);
router.get("/users/school/", getUsersBySchool);
router.post("/verifyToken", verifyToken);
router.delete("/users/delete-user/:id", deleteUser);
router.get("/users/get/all/count", getUserCount);
router.patch("/users/update/:id", updateUser);
router.post("/download/payams/schools", payamSchoolDownload);


//for Admin
router.put("/users/update-user-details", authMiddleware, updateUserDetails); //for loggedin user
router.put("/users/:id/block", blockUser);
router.put("/users/:id/unblock", unblockUser);
router.post("/users/forgot-password", authMiddleware, forgotPassword);
router.put("/reset-password/:token", authMiddleware, resetPassword);
router.put("/address", authMiddleware, saveAddress);

module.exports = router;

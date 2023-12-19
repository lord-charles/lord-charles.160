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
} = require("../controller/userCtrl");

// User endpoints
router.post("/register", createUser);
router.post("/login", logIn);
router.get("/users/get-all", authMiddleware, isAdmin, getUsers);
router.get("/users/get/:id", authMiddleware, isAdmin, getUserById);
router.get("/users/get-email/", authMiddleware, isAdmin, getUserByEmail);
router.get("/verifyToken", verifyToken);
router.delete("/users/delete-user/:id", authMiddleware, isAdmin, deleteUser);
router.get("/users/get/all/count", authMiddleware, isAdmin, getUserCount);
router.put(
  "/users/update-user-details/:id",
  authMiddleware,
  isAdmin,
  updateUser
);

//for Admin
router.put("/users/update-user-details", authMiddleware, updateUserDetails); //for loggedin user
router.put("/users/:id/block", authMiddleware, isAdmin, blockUser);
router.put("/users/:id/unblock", authMiddleware, isAdmin, unblockUser);
router.post("/users/forgot-password", authMiddleware, forgotPassword);
router.put("/reset-password/:token", authMiddleware, resetPassword);
router.put("/address", authMiddleware, saveAddress);

module.exports = router;

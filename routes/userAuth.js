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
  getTeachersByCode,
  overallMaleFemaleStat,
} = require("../controller/userCtrl");

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account in the system
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User successfully created
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: User already exists
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate user
 *     description: Login with email and password to receive access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 */

/**
 * @swagger
 * /users/get-all:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all users in the system
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   email:
 *                     type: string
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 */

/**
 * @swagger
 * /users/get/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves user information by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users/get-email:
 *   get:
 *     summary: Get user by email
 *     description: Retrieves user information by their email address
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: User email address
 *     responses:
 *       200:
 *         description: User found successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users/delete-user/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Deletes a user from the system by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User successfully deleted
 *       404:
 *         description: User not found
 *       403:
 *         description: Unauthorized to delete user
 */

/**
 * @swagger
 * /users/get/all/count:
 *   get:
 *     summary: Get total user count
 *     description: Retrieves the total number of users in the system
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved user count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Total number of users
 */

/**
 * @swagger
 * /users/update/{id}:
 *   patch:
 *     summary: Update user
 *     description: Update user information by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User successfully updated
 *       404:
 *         description: User not found
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /download/payams/schools:
 *   post:
 *     summary: Download payams schools data
 *     description: Downloads information about schools in payams
 *     tags: [Schools]
 *     responses:
 *       200:
 *         description: Successfully downloaded payams schools data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Error downloading data
 */

/**
 * @swagger
 * /update/bulk:
 *   patch:
 *     summary: Bulk update users
 *     description: Update multiple users' fields in a single request
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fields:
 *                       type: object
 *     responses:
 *       200:
 *         description: Users successfully updated
 *       400:
 *         description: Error updating users
 */

// User endpoints
router.post("/register", createUser);
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
router.post("/getTeachersByCode", getTeachersByCode);
router.post("/overallMaleFemaleStat", overallMaleFemaleStat);
module.exports = router;

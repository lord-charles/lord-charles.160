const router = require("express").Router();
const schoolController = require("../controller/school-data");
const {
  cachePostMiddleware,
  cacheMiddleware,
} = require("../middlewares/cacheMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     SchoolData:
 *       type: object
 *       required:
 *         - code
 *         - payam28
 *         - state10
 *         - county28
 *         - schoolNamek0
 *         - schoolOwnerShip
 *         - schoolType
 *       properties:
 *         code:
 *           type: string
 *           description: Unique school code.
 *         payam28:
 *           type: string
 *           description: Administrative division of the school.
 *         state10:
 *           type: string
 *           description: State where the school is located.
 *         county28:
 *           type: string
 *           description: County name.
 *         schoolName:
 *           type: string
 *           description: Name of the school.
 *         schoolOwnerShip:
 *           type: string
 *           enum: [Community, Private, Faith, Public]
 *           description: Ownership type of the school.
 *         schoolType:
 *           type: string
 *           enum: [PRI, SEC, ECD, ALP, ASP, CGS]
 *           description: Type of the school.
 *         headTeacher:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Name of the head teacher.
 *             phoneNumber:
 *               type: string
 *               description: Phone number of the head teacher.
 *             email:
 *               type: string
 *               description: Email of the head teacher.
 *       example:
 *         code: "SCH12345"
 *         payam28: "Juba Payam"
 *         state10: "Central Equatoria"
 *         county28: "Juba County"
 *         schoolName: "Juba Primary School"
 *         schoolOwnerShip: "Public"
 *         schoolType: "PRI"
 *         headTeacher:
 *           name: "John Doe"
 *           phoneNumber: "+211912345678"
 *           email: "johndoe@example.com"
 */

/**
 * @swagger
 * /school:
 *   post:
 *     summary: Create a new school
 *     tags: [School]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchoolData'
 *     responses:
 *       201:
 *         description: School created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchoolData'
 *       400:
 *         description: Bad request. Missing required fields.
 */
router.post("/school", schoolController.createSchool);

/**
 * @swagger
 * /preview-code:
 *   post:
 *     summary: Preview generated school code
 *     tags: [School]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schoolName:
 *                 type: string
 *                 description: Name of the school
 *             required:
 *               - schoolName
 *     responses:
 *       200:
 *         description: School code generated successfully
 *       400:
 *         description: Bad request
 */
router.post("/preview-code", schoolController.previewSchoolCode);

/**
 * @swagger
 * /check-code/{code}:
 *   get:
 *     summary: Check if school code is available
 *     tags: [School]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: The school code to check
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Code availability status
 *       400:
 *         description: Bad request
 */
router.get("/check-code/:code", schoolController.checkCodeAvailability);

/**
 * @swagger
 * /schools:
 *   get:
 *     summary: Get all schools
 *     tags: [School]
 *     responses:
 *       200:
 *         description: A list of schools.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SchoolData'
 *       500:
 *         description: Server error.
 */
router.get("/schools", cacheMiddleware(600), schoolController.getAllSchools);

/**
 * @swagger
 * /school/{id}:
 *   get:
 *     summary: Get a single school by ID
 *     tags: [School]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the school.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: School data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchoolData'
 *       404:
 *         description: School not found.
 *       500:
 *         description: Server error.
 */
router.get("/school/:id", schoolController.getSchoolById);

router.get("/school/code/:code", schoolController.getSchoolByCode);

/**
 * @swagger
 * /school/{id}:
 *   put:
 *     summary: Update a school by ID
 *     tags: [School]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the school.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchoolData'
 *     responses:
 *       200:
 *         description: School updated successfully.
 *       400:
 *         description: Bad request.
 *       404:
 *         description: School not found.
 *       500:
 *         description: Server error.
 */
router.patch("/school/:id", schoolController.updateSchool);

/**
 * @swagger
 * /school/{id}:
 *   delete:
 *     summary: Delete a school by ID
 *     tags: [School]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the school.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: School deleted successfully.
 *       404:
 *         description: School not found.
 *       500:
 *         description: Server error.
 */
router.delete("/school/:id", schoolController.deleteSchool);

/**
 * @swagger
 * /schools/criteria:
 *   get:
 *     summary: Get schools based on specific criteria
 *     tags: [School]
 *     responses:
 *       200:
 *         description: Filtered list of schools.
 *       500:
 *         description: Server error.
 */
router.get("/schools/criteria", schoolController.getSchoolsByCriteria);

/**
 * @swagger
 * /schools/count-by-type:
 *   get:
 *     summary: Count schools grouped by their type
 *     tags: [School]
 *     responses:
 *       200:
 *         description: Count of schools grouped by type.
 *       500:
 *         description: Server error.
 */
router.get(
  "/schools/count-by-type",
  cacheMiddleware(600),
  schoolController.countSchoolsByType
);

router.post(
  "/:id/enrollment/complete",
  cachePostMiddleware(600),
  schoolController.markEnrollmentComplete
);
/**
 * @swagger
 * /enrollment/completed:
 *   get:
 *     summary: Get schools with completed enrollment
 *     tags: [School]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to filter enrollment data (defaults to current year)
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: payam
 *         schema:
 *           type: string
 *         description: Filter by payam
 *       - in: query
 *         name: county
 *         schema:
 *           type: string
 *         description: Filter by county
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Filter by school code
 *     responses:
 *       200:
 *         description: Schools with completed enrollment retrieved successfully
 *       500:
 *         description: Server error
 */
router.get(
  "/enrollment/completed",
  cacheMiddleware(300000),
  schoolController.getSchoolsWithCompletedEnrollment
);

//dashboard stats
/**
 * @swagger
 * /learner-stats-by-state:
 *   get:
 *     summary: Get learner statistics grouped by state
 *     tags: [School]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to filter learner data (defaults to current year)
 *     responses:
 *       200:
 *         description: Learner statistics by state retrieved successfully
 *       500:
 *         description: Server error
 */
router.get(
  "/learner-stats-by-state",
  cacheMiddleware(600),
  schoolController.getLearnerStatsByState
);
router.get(
  "/school-types-by-state",
  cacheMiddleware(600),
  schoolController.getSchoolTypesByState
);

//school module statcards
/**
 * @swagger
 * /overall-learner-stats:
 *   get:
 *     summary: Get overall learner statistics
 *     tags: [School]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to filter learner data (defaults to current year)
 *     responses:
 *       200:
 *         description: Overall learner statistics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get(
  "/overall-learner-stats",
  cacheMiddleware(600),
  schoolController.getOverallLearnerStats
);

module.exports = router;

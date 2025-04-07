const router = require("express").Router();
const schoolController = require("../controller/school-data");
const { cachePostMiddleware } = require("../middlewares/cacheMiddleware");

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
 *         - schoolName
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
router.get("/schools", schoolController.getAllSchools);

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
router.put("/school/:id", schoolController.updateSchool);

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
router.get("/schools/count-by-type", schoolController.countSchoolsByType);

router.post("/:id/enrollment/complete",cachePostMiddleware(600), schoolController.markEnrollmentComplete);
router.get("/enrollment/completed",cachePostMiddleware(600), schoolController.getSchoolsWithCompletedEnrollment);

//dashboard stats
router.get("/learner-stats-by-state", schoolController.getLearnerStatsByState);
router.get("/school-types-by-state", schoolController.getSchoolTypesByState);

//school module statcards
router.get("/overall-learner-stats", schoolController.getOverallLearnerStats);

module.exports = router;

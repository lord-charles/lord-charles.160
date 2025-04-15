const router = require("express").Router();
const { cachePostMiddleware } = require("../middlewares/cacheMiddleware");

const {
  dataSet,
  countyPupilTotal,
  countyPayamPupilTotals,
  payamSchoolPupilTotals,
  dataSet_2023,
  statePupilTotal_2023,
  countyPupilTotal_2023,
  countyPayamPupilTotals_2023,
  payamSchoolPupilTotals_2023,
  getStudentsInSchool_2023,
  getStudentsInClass_2023,
  updateSchoolDataFields_2023,
  getSingleStudents_2023,
  registerStudent2024,
  deleteStudentById,
  updateSchoolDataFieldsBulk,
  payamSchoolDownload,
  bulkUpdateStateFields,
  trackOverall,
  trackState,
  trackCounty,
  trackPayam,
  trackSchool,
  stateMaleFemaleStat,
  findEnrolledSchools,
  findNotEnrolledSchools,
  fetchSchoolsPerState,
  totalNewStudentsPerState,
  totalNewStudentsPerStateDroppedOut,
  totalNewStudentsPerStateDisabled,
  totalStudentsPerStatePromoted,
  fetchSchoolsEnrollmentToday,
  getUniqueSchoolsPerState10,
  fetchState10EnrollmentSummary,
  getUniqueSchoolsDetailsPayam,
  updateSchoolDataLearnerUniqueID,
  // apis sep 2024
  getLearnerCountByLocation,
  getPromotedLearnersCountByLocation,
  getDisabledLearnersCountByLocation,
  registerLearnerDuringSync,
  overallMaleFemaleStat,
  getLearnersV2,
} = require("../controller/dataset");
const {
  updateDocuments,
  updateSchoolData,
  updateSchoolsDocuments,
} = require("../controller/update");


router.get("/", dataSet);
router.get("/get/county", countyPupilTotal);
router.post("/get/county/payam", cachePostMiddleware(600), countyPayamPupilTotals);
router.post("/get/county/payam/schools",cachePostMiddleware(600), payamSchoolPupilTotals);
router.post("/get/county/payam/schools/students",cachePostMiddleware(600), getStudentsInClass_2023);

// 2023 dataset
router.get("/get/2023_data", dataSet_2023);
router.get("/get/2023_data/state", statePupilTotal_2023);
router.post("/get/2023_data/county",cachePostMiddleware(600), countyPupilTotal_2023);
router.post("/get/2023_data/county/payam",cachePostMiddleware(600), countyPayamPupilTotals_2023);
router.post("/get/2023_data/county/payam/schools",cachePostMiddleware(600), payamSchoolPupilTotals_2023);
router.post(
  "/get/2023_data/county/payam/school/class/students",
  cachePostMiddleware(600),
  getStudentsInClass_2023
); // all students in each class/form
router.post(
  "/get/2023_data/county/payam/schools/students",
  cachePostMiddleware(600),
  getStudentsInSchool_2023
); // all students in school
router.get("/2023_data/students/:id", getSingleStudents_2023);
router.post("/2023_data/get/learnersv2",cachePostMiddleware(600), getLearnersV2);
router.patch("/2023_data/students/:id", updateSchoolDataFields_2023);
router.patch("/2023_data/update/bulk", updateSchoolDataFieldsBulk);
router.patch("/2023_data/update/bulkStates", bulkUpdateStateFields);

//2024 student registration
/**
 * @swagger
 * /api/dataset/register-student-2024:
 *   post:
 *     summary: Register a new student for 2024
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *               - gender
 *               - grade
 *               - school
 *               - state
 *               - county
 *               - payam
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [Male, Female]
 *               grade:
 *                 type: string
 *               school:
 *                 type: string
 *               state:
 *                 type: string
 *               county:
 *                 type: string
 *               payam:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student successfully registered
 *       400:
 *         description: Invalid input data
 */
router.post("/register-student-2024", registerStudent2024);

/**
 * @swagger
 * /api/dataset/student/delete/{id}:
 *   delete:
 *     summary: Delete a student by ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student successfully deleted
 *       404:
 *         description: Student not found
 */
router.delete("/student/delete/:id", deleteStudentById);

//downloads
// Cache the payam schools download for 10 minutes
router.post("/download/payams/schools", cachePostMiddleware(600), payamSchoolDownload);

//track new students
router.post("/track/overall",cachePostMiddleware(600), trackOverall);
router.post("/track/state",cachePostMiddleware(600), trackState);
router.post("/track/state/county",cachePostMiddleware(600), trackCounty);
router.post("/track/state/county/payam",cachePostMiddleware(600), trackPayam);
router.post("/track/state/county/payam/school",cachePostMiddleware(600), trackSchool);

// dashboard
router.post("/state/gender",cachePostMiddleware(600), stateMaleFemaleStat);
router.post("/findEnrolledSchools",cachePostMiddleware(600), findEnrolledSchools);
router.post("/findNotEnrolledSchools",cachePostMiddleware(600), findNotEnrolledSchools);
router.post("/fetchSchoolsPerState",cachePostMiddleware(600), fetchSchoolsPerState); //enrolled students

router.post("/totalNewStudentsPerState",cachePostMiddleware(600), totalNewStudentsPerState);
router.post(
  "/totalNewStudentsPerStateDroppedOut",
  cachePostMiddleware(600),
  totalNewStudentsPerStateDroppedOut
);
router.post(
  "/totalNewStudentsPerStateDisabled",
  cachePostMiddleware(600),
  totalNewStudentsPerStateDisabled
);

router.post("/fetchSchoolsEnrollmentToday",cachePostMiddleware(600), fetchSchoolsEnrollmentToday);
router.post("/getUniqueSchoolsPerState10",cachePostMiddleware(600), getUniqueSchoolsPerState10);
router.post("/fetchState10EnrollmentSummary",cachePostMiddleware(600), fetchState10EnrollmentSummary);
router.post("/getUniqueSchoolsDetailsPayam",cachePostMiddleware(600), getUniqueSchoolsDetailsPayam);
router.post("/totalStudentsPerStatePromoted",cachePostMiddleware(600), totalStudentsPerStatePromoted);

// update learnerUniquesID AND REFERENCE
router.patch(
  "/updateSchoolDataLearnerUniqueID",
  updateSchoolDataLearnerUniqueID
);

// apis sept 2024
/**
 * @swagger
 * /api/dataset/getLearnerCountByLocation:
 *   post:
 *     summary: Get learner count statistics by location
 *     tags: [Statistics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *               county:
 *                 type: string
 *               payam:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved learner counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCount:
 *                   type: integer
 *                 maleCount:
 *                   type: integer
 *                 femaleCount:
 *                   type: integer
 */
router.post("/getLearnerCountByLocation",cachePostMiddleware(600), getLearnerCountByLocation);
router.post(
  "/getPromotedLearnersCountByLocation",
  cachePostMiddleware(600),
  getPromotedLearnersCountByLocation
);
router.post(
  "/getDisabledLearnersCountByLocation",
  cachePostMiddleware(600),
  getDisabledLearnersCountByLocation
);

router.post("/updateDocuments", updateDocuments);
router.post("/updateSchoolData", updateSchoolData);
router.post("/updateSchoolsDocuments", updateSchoolsDocuments);

router.post("/registerLearnerDuringSync", registerLearnerDuringSync);
/**
 * @swagger
 * /api/dataset/overallMaleFemaleStat:
 *   post:
 *     summary: Retrieve gender distribution analytics
 *     description: Returns comprehensive gender-based enrollment statistics including total counts and gender ratio analysis
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Analytics successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEnrollment:
 *                   type: integer
 *                   description: Total number of enrolled students
 *                   example: 1500
 *                 maleCount:
 *                   type: integer
 *                   description: Number of male students
 *                   example: 800
 *                 femaleCount:
 *                   type: integer
 *                   description: Number of female students
 *                   example: 700
 *                 genderRatio:
 *                   type: number
 *                   description: Ratio of male to female students
 *                   example: 1.14
 *                 percentageMale:
 *                   type: number
 *                   description: Percentage of male students
 *                   example: 53.33
 *                 percentageFemale:
 *                   type: number
 *                   description: Percentage of female students
 *                   example: 46.67
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error occurred"
 */
router.post("/overallMaleFemaleStat",cachePostMiddleware(600), overallMaleFemaleStat);

/**
 * @swagger
 * /api/dataset/fetchSchoolsEnrollmentToday:
 *   post:
 *     summary: Get today's school enrollment data
 *     description: Retrieves enrollment statistics for all schools that have registered new students today
 *     tags: [Enrollment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 description: State name to filter results
 *                 example: "Central Equatoria"
 *     responses:
 *       200:
 *         description: Successfully retrieved today's enrollment data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSchools:
 *                   type: integer
 *                 enrollmentData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       schoolName:
 *                         type: string
 *                       newEnrollments:
 *                         type: integer
 *                       location:
 *                         type: object
 *                         properties:
 *                           county:
 *                             type: string
 *                           payam:
 *                             type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post("/fetchSchoolsEnrollmentToday",cachePostMiddleware(600), fetchSchoolsEnrollmentToday);

/**
 * @swagger
 * /api/dataset/totalStudentsPerStatePromoted:
 *   post:
 *     summary: Get student promotion statistics by state
 *     description: Retrieves detailed statistics about student promotions within a state
 *     tags: [Academic Progress]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 description: State name to analyze
 *                 example: "Central Equatoria"
 *               academicYear:
 *                 type: string
 *                 description: Academic year for promotion data
 *                 example: "2023-2024"
 *     responses:
 *       200:
 *         description: Successfully retrieved promotion statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPromoted:
 *                   type: integer
 *                   description: Total number of promoted students
 *                 promotionsByGrade:
 *                   type: object
 *                   properties:
 *                     P1:
 *                       type: integer
 *                     P2:
 *                       type: integer
 *                     P3:
 *                       type: integer
 *                     P4:
 *                       type: integer
 *                   description: Number of promotions broken down by grade
 *                 promotionRate:
 *                   type: number
 *                   description: Overall promotion rate as a percentage
 *                 genderDistribution:
 *                   type: object
 *                   properties:
 *                     male:
 *                       type: integer
 *                     female:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post("/totalStudentsPerStatePromoted",cachePostMiddleware(600), totalStudentsPerStatePromoted);

/**
 * @swagger
 * /api/dataset/findEnrolledSchools:
 *   post:
 *     summary: Retrieve enrolled schools statistics
 *     description: Provides detailed information about schools with active enrollments
 *     tags: [School Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 description: State name for filtering results
 *               academicYear:
 *                 type: string
 *                 description: Academic year for enrollment data
 *     responses:
 *       200:
 *         description: Successfully retrieved school enrollment data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSchools:
 *                   type: integer
 *                 enrolledSchools:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       schoolName:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           state:
 *                             type: string
 *                           county:
 *                             type: string
 *                           payam:
 *                             type: string
 *                       enrollmentCount:
 *                         type: integer
 */
router.post("/findEnrolledSchools",cachePostMiddleware(600), findEnrolledSchools);

/**
 * @swagger
 * /api/dataset/2023_data/students/{id}:
 *   get:
 *     summary: Retrieve a single student's data from 2023
 *     description: Fetches detailed information for a specific student using their ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the student
 *     responses:
 *       200:
 *         description: Student data successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     # Add other student properties
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /api/dataset/2023_data/students/{id}:
 *   patch:
 *     summary: Update a student's data from 2023
 *     description: Modify specific fields of a student's record
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add updateable fields
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               grade:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student data successfully updated
 *       404:
 *         description: Student not found
 */

/**
 * @swagger
 * /api/dataset/2023_data/update/bulk:
 *   patch:
 *     summary: Bulk update multiple students' data
 *     description: Update multiple student records simultaneously
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               students:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     # Add other updateable fields
 *     responses:
 *       200:
 *         description: Students data successfully updated in bulk
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /api/dataset/2023_data/update/bulkStates:
 *   patch:
 *     summary: Bulk update state-level data
 *     description: Update multiple state records simultaneously
 *     tags: [States]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               states:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     stateId:
 *                       type: string
 *                     # Add other state-level fields
 *     responses:
 *       200:
 *         description: State data successfully updated in bulk
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /api/dataset/getUniqueSchoolsPerState10:
 *   post:
 *     summary: Retrieve top 10 unique schools per state
 *     description: Returns a list of the top 10 schools in a specified state based on certain criteria
 *     tags: [Schools]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 description: Name of the state to query
 *                 example: "Central Equatoria"
 *     responses:
 *       200:
 *         description: Successfully retrieved schools list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   schoolName:
 *                     type: string
 *                   enrollmentCount:
 *                     type: integer
 *                   location:
 *                     type: object
 *                     properties:
 *                       county:
 *                         type: string
 *                       payam:
 *                         type: string
 */

/**
 * @swagger
 * /api/dataset/fetchState10EnrollmentSummary:
 *   post:
 *     summary: Fetch enrollment summary for state's top 10 schools
 *     description: Provides detailed enrollment statistics for the top 10 schools in a state
 *     tags: [Enrollment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 description: State name for the summary
 *                 example: "Central Equatoria"
 *     responses:
 *       200:
 *         description: Successfully retrieved enrollment summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEnrollment:
 *                   type: integer
 *                 schoolsSummary:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       schoolName:
 *                         type: string
 *                       enrollmentCount:
 *                         type: integer
 *                       percentageOfTotal:
 *                         type: number
 */

/**
 * @swagger
 * /api/dataset/getUniqueSchoolsDetailsPayam:
 *   post:
 *     summary: Get detailed school information by payam
 *     description: Retrieves comprehensive details about schools within a specific payam
 *     tags: [Schools]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *               county:
 *                 type: string
 *               payam:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved school details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   schoolName:
 *                     type: string
 *                   enrollmentData:
 *                     type: object
 *                     properties:
 *                       totalStudents:
 *                         type: integer
 *                       maleCount:
 *                         type: integer
 *                       femaleCount:
 *                         type: integer
 *                   location:
 *                     type: object
 *                     properties:
 *                       coordinates:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 */

module.exports = router;

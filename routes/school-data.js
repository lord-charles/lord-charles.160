const router = require("express").Router();
const schoolController = require("../controller/school-data");
// Create a new school
router.post("/school", schoolController.createSchool);

// Get all schools (with optional filtering)
router.get("/schools", schoolController.getAllSchools);

// Get a single school by ID
router.get("/school/:id", schoolController.getSchoolById);

// Update a school by ID
router.put("/school/:id", schoolController.updateSchool);

// Delete a school by ID
router.delete("/school/:id", schoolController.deleteSchool);

// Advanced querying based on specific criteria
router.get("/schools/criteria", schoolController.getSchoolsByCriteria);

// Aggregate data: Count schools by type
router.get("/schools/count-by-type", schoolController.countSchoolsByType);

module.exports = router;

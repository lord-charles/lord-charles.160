const schoolData = require("../models/school-data");
const SchoolData2023 = require('../models/2023Data');


// Create a new school entry
exports.createSchool = async (req, res) => {
  try {
    // Check if a school with the same code or emisId exists
    const existingSchool = await schoolData.findOne({
      $or: [{ code: req.body.code }, { emisId: req.body.emisId }]
    });

    if (existingSchool) {
      return res.status(400).json({ message: "School with the same code or emisId already exists." });
    }

    const newSchool = new schoolData(req.body);
    const savedSchool = await newSchool.save();

    const testLearner = new SchoolData2023({
      year: new Date().getFullYear(),
      state28: savedSchool.state10,
      county28: savedSchool.county28,
      payam28: savedSchool.payam28,
      state10: savedSchool.state10,
      county10: savedSchool.county28,
      payam10: savedSchool.payam28,
      school: savedSchool.schoolName,
      class: "P1",
      code: savedSchool.code,
      education: "PRI",
      form: 1,
      formstream: 1,
      gender: "M",
      dob: "2015-01-01",
      age: 10,
      firstName: "Test",
      middleName: "Student",
      lastName: "Learner",

    });

    await testLearner.save();

    res.status(201).json({
      message: "School and test learner created successfully",
      data: {
        school: savedSchool,
        testLearner: testLearner
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating school and test learner", error: error.message });
  }
};

// Get all schools with optional filtering
exports.getAllSchools = async (req, res) => {
  try {

    const { schoolType, state10, county10, payam10 } = req.query;
    const filter = {};

    if (schoolType) filter.schoolType = schoolType;
    if (state10) filter.state10 = state10;
    if (county10) filter.county10 = county10;
    if (payam10) filter.payam10 = payam10;

    const projection = {
      code: 1,
      schoolName: 1,
      schoolType: 1,
      state10: 1,
      county28: 1,
      payam28: 1,
      schoolOwnerShip: 1,
      schoolType: 1,
      emisId: 1,
    };

    const schools = await schoolData.find(filter, projection);

    res
      .status(200)
      .json({ message: "Schools retrieved successfully", data: schools });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving schools", error: error.message });
  }
};

// Fetch schools whose enrollment is complete
exports.getSchoolsWithCompletedEnrollment = async (req, res) => {
  try {
    const projection = {
      code: 1,
      schoolName: 1,
      schoolType: 1,
      state10: 1,
      county28: 1,
      payam28: 1,
      schoolOwnerShip: 1,
      schoolType: 1,
      emisId: 1,
      isEnrollmentComplete: 1
    };
    const completedSchools = await schoolData.find({
      "isEnrollmentComplete.isComplete": true
    }, projection);

    res.json(completedSchools);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Mark enrollment as complete
exports.markEnrollmentComplete = async (req, res) => {
  try {
    const { year, completedBy } = req.body;
    const schoolId = req.params.id;

    const school = await schoolData.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Check if enrollment for the given year exists, if not, create it
    const enrollmentIndex = school.isEnrollmentComplete.findIndex(e => e.year === year);

    if (enrollmentIndex !== -1) {
      // Update existing entry
      school.isEnrollmentComplete[enrollmentIndex].isComplete = true;
      school.isEnrollmentComplete[enrollmentIndex].completedBy = completedBy;
      school.isEnrollmentComplete[enrollmentIndex].year = year;


    } else {
      // Create new entry
      school.isEnrollmentComplete.push({ year, isComplete: true, completedBy });
    }

    await school.save();
    res.json({ message: "Enrollment marked as complete", school });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get a single school by ID
exports.getSchoolById = async (req, res) => {
  try {
    const school = await schoolData.findById(req.params.id);
    // .populate("headTeacher reporter facilities radioCoverage.stations");
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    res
      .status(200)
      .json({ message: "School retrieved successfully", data: school });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving school", error: error.message });
  }
};

// Get a single school by ID
exports.getSchoolByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: "school code is required!" });
    }

    const school = await schoolData.findOne({ code });
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    res
      .status(200)
      .json({ message: "School retrieved successfully", data: school });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving school", error: error.message });
  }
};

// Update a school by ID
exports.updateSchool = async (req, res) => {
  try {
    const updatedSchool = await schoolData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedSchool) {
      return res.status(404).json({ message: "School not found" });
    }
    res
      .status(200)
      .json({ message: "School updated successfully", data: updatedSchool });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating school", error: error.message });
  }
};

// Delete a school by ID
exports.deleteSchool = async (req, res) => {
  try {
    const deletedSchool = await schoolData.findByIdAndDelete(req.params.id);
    if (!deletedSchool) {
      return res.status(404).json({ message: "School not found" });
    }
    res.status(200).json({ message: "School deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting school", error: error.message });
  }
};

// Get schools with advanced querying (e.g., schools with specific facilities or programs)
exports.getSchoolsByCriteria = async (req, res) => {
  try {
    const { facilities, mentoringProgramme, feedingProgramme } = req.query;
    const filter = {};

    if (facilities) filter.facilities = { $in: facilities.split(",") };
    if (mentoringProgramme)
      filter["mentoringProgramme.isAvailable"] = mentoringProgramme === "true";
    if (feedingProgramme)
      filter["feedingProgramme.isAvailable"] = feedingProgramme === "true";

    const schools = await schoolData
      .find(filter)
      .populate("facilities radioCoverage.stations");
    res
      .status(200)
      .json({ message: "Schools retrieved successfully", data: schools });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving schools", error: error.message });
  }
};

// Aggregate data (e.g., count schools by type)
exports.countSchoolsByType = async (req, res) => {
  try {
    const result = await schoolData.aggregate([
      { $group: { _id: "$schoolType", count: { $sum: 1 } } },
    ]);
    res.status(200).json({ message: "School count by type", data: result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error aggregating school data", error: error.message });
  }
};

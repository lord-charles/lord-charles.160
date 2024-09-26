const schoolData = require("../models/school-data");

// Create a new school entry
exports.createSchool = async (req, res) => {
  try {
    const newSchool = new schoolData(req.body);
    const savedSchool = await newSchool.save();
    res
      .status(201)
      .json({ message: "School created successfully", data: savedSchool });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating school", error: error.message });
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
      // schoolOwnerShip: 1,
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

// Get a single school by ID
exports.getSchoolById = async (req, res) => {
  try {
    const school = await schoolData
      .findById(req.params.id)
      .populate("headTeacher reporter facilities radioCoverage.stations");
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

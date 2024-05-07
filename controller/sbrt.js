const PhysicalInputs = require("../models/physicalInput");

const createPhysicalInput = async (req, res) => {
  try {
    const { physicalInput, schoolCode, year, schoolName } = req.body;

    // Check if required inputs are provided
    if (!physicalInput || !schoolCode || !schoolName) {
      return res.status(400).json({
        message: "physicalInput, schoolCode, and schoolName are required",
      });
    }

    // Create a new instance of the PhysicalInputs model
    const newPhysicalInput = new PhysicalInputs({
      physicalInput,
      schoolCode,
      schoolName,
      year,
    });

    // Save the new physical input to the database
    const savedPhysicalInput = await newPhysicalInput.save();

    res.status(201).json({ success: true, savedPhysicalInput });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePhysicalInput = async (req, res) => {
  try {
    const { id } = req.params; // Assuming the ID of the document to update is passed in the URL params
    const { physicalInput, schoolCode, year } = req.body;

    // Update the physical input in the database
    const result = await PhysicalInputs.updateOne(
      { _id: id }, // Filter by document ID
      { physicalInput, schoolCode, year } // New data to update
    );

    if (result.nModified === 0) {
      return res.status(404).json({ message: "Physical input not found" });
    }

    res.status(200).json({ message: "Physical input updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllPhysicalInputsBySchoolAndYear = async (req, res) => {
  try {
    const { schoolCode } = req.body;
    let { year } = req.body;

    // Validate if schoolCode is provided
    if (!schoolCode) {
      return res.status(400).json({ message: "schoolCode is required" });
    }

    // Query conditions based on schoolCode and year
    const query = { schoolCode };
    if (year) {
      query.year = year;
    }

    // Retrieve physical inputs based on the query conditions
    const physicalInputs = await PhysicalInputs.find(query);

    res.status(200).json(physicalInputs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPhysicalInput,
  updatePhysicalInput,
  getAllPhysicalInputsBySchoolAndYear,
};

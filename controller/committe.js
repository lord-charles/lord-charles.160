const SchoolCommitte = require("../models/schoolCommittee");

// Controller to create or update a SchoolCommitte document
const createOrUpdateSchoolCommitte = async (req, res) => {
  const requestData = req.body;

  try {
    // Check if the code already exists in the database
    const existingCommitte = await SchoolCommitte.findOne({
      code: requestData.code,
    });

    if (existingCommitte) {
      // Update existing document with new values
      const updatedCommitte = await SchoolCommitte.findOneAndUpdate(
        { code: requestData.code },
        { $set: requestData },
        { new: true }
      );
      return res.status(200).json(updatedCommitte);
    } else {
      // Create new document if code doesn't exist
      const newCommitte = await SchoolCommitte.create(requestData);
      return res.status(201).json(newCommitte);
    }
  } catch (error) {
    console.error("Error creating or updating SchoolCommitte:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// get and populate SchoolCommitte data
const getSchoolCommitte = async (req, res) => {
  const { code } = req.params;

  try {
    // Find the SchoolCommitte document based on the provided code
    const committe = await SchoolCommitte.findOne({ code })
      .populate("HeadTeacher")
      .populate("DeputyHeadTeacher")
      .populate("FemaleTeacher")
      .populate("MaleTeacher")
      .populate("HeadGirl")
      .populate("HeadBoy")
      .select("-__v");

    if (!committe) {
      return res.status(404).json({ message: "SchoolCommitte not found" });
    }

    return res.status(200).json(committe);
  } catch (error) {
    console.error("Error retrieving SchoolCommitte:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  createOrUpdateSchoolCommitte,
  getSchoolCommitte,
};

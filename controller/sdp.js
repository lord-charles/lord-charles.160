const SdpInputs = require("../models/sdp");

const createSdp = async (req, res) => {
  try {
    const { Sdp, schoolCode, year, schoolName, category } = req.body;

    // Check if required inputs are provided
    if (!Sdp || !schoolCode || !schoolName) {
      return res.status(400).json({
        message: "Sdp, schoolCode, and schoolName are required",
      });
    }

    // Create a new instance of the Sdps model
    const newSdp = new SdpInputs({
      Sdp,
      schoolCode,
      schoolName,
      year,
      category,
    });

    // Save the new physical input to the database
    const savedSdp = await newSdp.save();

    res.status(201).json({ success: true, savedSdp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSdp = async (req, res) => {
  try {
    const { id } = req.params;
    const { Sdp, schoolCode, year, approved } = req.body;

    // Update the physical input in the database
    const result = await SdpInputs.updateOne(
      { _id: id },
      { Sdp, schoolCode, year, approved },
      { new: true }
    );

    if (result.nModified === 0) {
      return res.status(404).json({ message: "Physical input not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSdpsBySchoolAndYear = async (req, res) => {
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
    const Sdps = await SdpInputs.find(query);

    res.status(200).json(Sdps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSdp,
  updateSdp,
  getAllSdpsBySchoolAndYear,
};

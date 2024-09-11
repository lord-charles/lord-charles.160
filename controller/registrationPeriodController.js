const RegistrationPeriod = require("../models/RegistrationPeriod");

// Create a new registration period
const createRegistrationPeriod = async (req, res) => {
  try {
    const { startDate, endDate, createdBy } = req.body;

    const newPeriod = new RegistrationPeriod({
      startDate,
      endDate,
      isOpen: false,
      createdBy,
    });

    const savedPeriod = await newPeriod.save();
    res.status(201).json({ success: true, data: savedPeriod });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Update an existing registration period
const updateRegistrationPeriod = async (req, res) => {
  try {
    const { startDate, endDate, isOpen, updatedBy } = req.body;
    const { id } = req.params;

    const updatedPeriod = await RegistrationPeriod.findByIdAndUpdate(
      id,
      { startDate, endDate, isOpen, updatedBy, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedPeriod) {
      return res
        .status(404)
        .json({ success: false, message: "Registration period not found." });
    }

    res.status(200).json({ success: true, data: updatedPeriod });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Get the current registration period status
const getCurrentRegistrationPeriod = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentPeriod = await RegistrationPeriod.findOne({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    if (currentPeriod) {
      res.status(200).json({ success: true, data: currentPeriod });
    } else {
      res.status(404).json({
        success: false,
        message: "No current registration period found.",
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const deleteRegistrationPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId; // Assuming the user ID is available in req.user

    const period = await RegistrationPeriod.findByIdAndUpdate(
      id,
      { deletedBy: userId, deletedAt: new Date(), isOpen: false },
      { new: true }
    );

    if (!period) {
      return res
        .status(404)
        .json({ success: false, message: "Registration period not found" });
    }

    res.status(200).json({
      success: true,
      message: "Registration period deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Controller to handle restoring a registration period
const restoreRegistrationPeriod = async (req, res) => {
  try {
    const { id } = req.params;

    const period = await RegistrationPeriod.findByIdAndUpdate(
      id,
      { deletedBy: null, deletedAt: null, isOpen: true },
      { new: true }
    );

    if (!period) {
      return res
        .status(404)
        .json({ success: false, message: "Registration period not found" });
    }

    res.status(200).json({
      success: true,
      message: "Registration period restored successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  deleteRegistrationPeriod,
  restoreRegistrationPeriod,
  createRegistrationPeriod,
  updateRegistrationPeriod,
  getCurrentRegistrationPeriod,
};

// controllers/accountabilityController.js
const Accountability = require("../models/accountability");

// Controller to handle CRUD operations

// Get all accountability entries
const getAllAccountabilityEntries = async (req, res) => {
  try {
    const entries = await Accountability.find();
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};

// Get a single accountability entry by ID
const getAccountabilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Accountability.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.status(200).json(entry);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};

// Create a new accountability entry
const createAccountabilityEntry = async (req, res) => {
  try {
    const newEntry = new Accountability(req.body);
    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(500).json({ message: "Error creating entry", error });
  }
};

// Update an accountability entry by ID
const updateAccountabilityEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = await Accountability.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.status(200).json(updatedEntry);
  } catch (error) {
    res.status(500).json({ message: "Error updating entry", error });
  }
};

// Delete an accountability entry by ID
const deleteAccountabilityEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEntry = await Accountability.findByIdAndDelete(id);
    if (!deletedEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting entry", error });
  }
};

const getAllApprovalEntries = async (req, res) => {
  const { year } = req.query;
  try {
    const entries = await Accountability.aggregate([
      // Match documents with the specified academic year
      { $match: { academicYear: parseInt(year) } },

      // Unwind the tranches array to get individual tranche documents
      { $unwind: "$tranches" },

      // Project the required fields
      {
        $project: {
          code: 1,
          academicYear: 1,
          state10: 1,
          county28: 1,
          payam28: 1,
          schoolName: 1,
          schoolType: 1,
          ownership: 1,
          amountDisbursed: "$tranches.amountDisbursed",
          currency: "$tranches.currency",
          approval: "$tranches.approval",
          amountApproved: "$tranches.amountApproved",
          name: "$tranches.name",
        },
      },
    ]);

    // Respond with the aggregated data
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: "Error fetching approval entries", error });
  }
};

module.exports = {
  getAllAccountabilityEntries,
  getAccountabilityById,
  createAccountabilityEntry,
  updateAccountabilityEntry,
  deleteAccountabilityEntry,
  //APPROVALS
  getAllApprovalEntries,
};

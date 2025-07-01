const Accountability = require("../models/accountability");


// Get all accountability entries
const getAllAccountabilityEntries = async (req, res) => {
  try {
    const { tranche, year } = req.query;
    // Input validation
    if (year && isNaN(parseInt(year))) {
      return res.status(400).json({ message: "Invalid year format" });
    }

    // Build match conditions first
    const matchConditions = {};

    if (year) {
      matchConditions.academicYear = parseInt(year);
    }

    if (tranche) {
      matchConditions["tranches.name"] = tranche;
    }

    const entries = await Accountability.aggregate([
      { $match: matchConditions },

      // Unwind tranches to work with individual tranche records
      { $unwind: { path: "$tranches", preserveNullAndEmptyArrays: true } },

      // Project the essential fields
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
          amountApproved: "$tranches.amountApproved",
          paidBy: "$tranches.paidBy",
          totalRevenue: "$financialSummary.totalRevenue",
          totalExpenditure: "$financialSummary.totalExpenditure",
          openingBalance: "$financialSummary.openingBalance",
          closingBalance: "$financialSummary.closingBalance",
        },
      },

      // Group by the main accountability document (for multiple tranche entries)
      {
        $group: {
          _id: "$_id",
          code: { $first: "$code" },
          academicYear: { $first: "$academicYear" },
          state10: { $first: "$state10" },
          county28: { $first: "$county28" },
          payam28: { $first: "$payam28" },
          schoolName: { $first: "$schoolName" },
          schoolType: { $first: "$schoolType" },
          ownership: { $first: "$ownership" },
          totalRevenue: { $first: "$totalRevenue" },
          totalExpenditure: { $first: "$totalExpenditure" },
          openingBalance: { $first: "$openingBalance" },
          closingBalance: { $first: "$closingBalance" },
          tranches: {
            $push: {
              name: "$tranches.name",
              amountDisbursed: "$amountDisbursed",
              amountApproved: "$amountApproved",
              paidBy: "$paidBy",
            },
          },
        },
      },
    ]);

    res.status(200).json(entries);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching accountability data", error });
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
      { $match: { academicYear: parseInt(year) } },

      { $unwind: "$tranches" },

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

    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: "Error fetching approval entries", error });
  }
};



const getSchoolDisbursements = async (req, res) => {
  try {
    const { academicYear, state10, county28, payam28, schoolCode } = req.query;

    if (!academicYear) {
      return res.status(400).json({ message: "Academic year is required" });
    }
    if (isNaN(parseInt(academicYear))) {
      return res.status(400).json({ message: "Invalid academic year format" });
    }

    const matchConditions = { academicYear: parseInt(academicYear) };
    if (state10) matchConditions.state10 = state10;
    if (county28) matchConditions.county28 = county28;
    if (payam28) matchConditions.payam28 = payam28;
    if (schoolCode) matchConditions.code = schoolCode;

    const disbursements = await Accountability.aggregate([
      { $match: matchConditions },
      { $unwind: "$tranches" },
      {
        $project: {
          _id: 0,
          schoolCode: "$code",
          schoolName: "$schoolName",
          academicYear: "$academicYear",
          state10: "$state10",
          county28: "$county28",
          payam28: "$payam28",
          trancheName: "$tranches.name",
          amountDisbursed: "$tranches.amountDisbursed",
          amountApproved: "$tranches.amountApproved",
          paidBy: "$tranches.paidBy",
        },
      },
      {
        $group: {
          _id: "$schoolCode",
          schoolName: { $first: "$schoolName" },
          academicYear: { $first: "$academicYear" },
          state10: { $first: "$state10" },
          county28: { $first: "$county28" },
          payam28: { $first: "$payam28" },
          disbursements: {
            $push: {
              name: "$trancheName",
              amountDisbursed: "$amountDisbursed",
              amountApproved: "$amountApproved",
              paidBy: "$paidBy",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          schoolCode: "$_id",
          schoolName: 1,
          academicYear: 1,
          state10: 1,
          county28: 1,
          payam28: 1,
          disbursements: 1,
        }
      },
      { $sort: { schoolName: 1 } },
    ]);

    if (!disbursements || disbursements.length === 0) {
      return res.status(404).json({ message: "No disbursements found for the criteria" });
    }

    res.status(200).json(disbursements);
  } catch (error) {
    res.status(500).json({ message: "Error fetching school disbursements", error: error.message });
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
  getSchoolDisbursements,
};

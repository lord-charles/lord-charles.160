const CashTransfer = require("../models/ct");

// Create a new cash transfer
exports.createCashTransfer = async (req, res) => {
  try {
    const cashTransfer = await CashTransfer.create(req.body);
    res.status(201).json(cashTransfer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all cash transfers with optional filters
exports.getAllCashTransfers = async (req, res) => {
  try {
    const filters = req.query || {};
    const cashTransfers = await CashTransfer.find(filters);
    res.status(200).json(cashTransfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single cash transfer by ID
exports.getCashTransferById = async (req, res) => {
  try {
    const cashTransfer = await CashTransfer.findById(req.params.id);
    if (!cashTransfer) {
      return res.status(404).json({ error: "Cash transfer not found" });
    }
    res.status(200).json(cashTransfer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a cash transfer
exports.updateCashTransfer = async (req, res) => {
  try {
    const cashTransfer = await CashTransfer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!cashTransfer) {
      return res.status(404).json({ error: "Cash transfer not found" });
    }
    res.status(200).json(cashTransfer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a cash transfer
exports.deleteCashTransfer = async (req, res) => {
  try {
    const cashTransfer = await CashTransfer.findByIdAndDelete(req.params.id);
    if (!cashTransfer) {
      return res.status(404).json({ error: "Cash transfer not found" });
    }
    res.status(200).json({ message: "Cash transfer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Advanced query: Get transfers by school type
exports.getTransfersBySchoolType = async (req, res) => {
  try {
    const { type } = req.params;
    const transfers = await CashTransfer.find({ "school.type": type });
    res.status(200).json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Advanced query: Get total approved amounts by state
exports.getTotalApprovedByState = async (req, res) => {
  try {
    const results = await CashTransfer.aggregate([
      {
        $group: {
          _id: "$location.state10",
          totalApproved: { $sum: "$amounts.approved.amount" },
        },
      },
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Validate and approve transfer
exports.validateAndApproveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { validationData, approvalData } = req.body;

    const cashTransfer = await CashTransfer.findByIdAndUpdate(
      id,
      {
        $set: {
          validation: validationData,
          approval: approvalData,
        },
      },
      { new: true, runValidators: true }
    );

    if (!cashTransfer) {
      return res.status(404).json({ error: "Cash transfer not found" });
    }
    res.status(200).json(cashTransfer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

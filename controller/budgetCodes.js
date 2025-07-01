const BudgetCode = require("../models/budgetCodeschema");

// Get all budget codes
const getAllBudgetCodes = async (req, res) => {
  try {
    const budgetCodes = await BudgetCode.find();
    res.status(200).json(budgetCodes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get a budget code by ID
const getBudgetCodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const budgetCode = await BudgetCode.findById(id);
    if (!budgetCode) {
      return res
        .status(404)
        .json({ success: false, error: "Budget code not found" });
    }
    res.status(200).json({ success: true, data: budgetCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new budget code
const createBudgetCode = async (req, res) => {
  try {
    const { type, categories } = req.body;
    const newBudgetCode = new BudgetCode({ type, categories });
    await newBudgetCode.save();
    res.status(201).json({ success: true, data: newBudgetCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a budget code by ID
const updateBudgetCode = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBudgetCode = await BudgetCode.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!updatedBudgetCode) {
      return res
        .status(404)
        .json({ success: false, error: "Budget code not found" });
    }
    res.status(200).json({ success: true, data: updatedBudgetCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a budget code by ID
const deleteBudgetCode = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBudgetCode = await BudgetCode.findByIdAndDelete(id);
    if (!deletedBudgetCode) {
      return res
        .status(404)
        .json({ success: false, error: "Budget code not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Budget code deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllBudgetCodes,
  getBudgetCodeById,
  createBudgetCode,
  updateBudgetCode,
  deleteBudgetCode,
};

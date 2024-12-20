const Budget = require("../models/budget");
const SchoolData = require("../models/2023Data");
// Create a new budget
exports.createBudget = async (req, res) => {
  try {
    const budget = new Budget(req.body);
    const savedBudget = await budget.save();
    res.status(201).json(savedBudget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all budgets
exports.getBudgets = async (req, res) => {
  const { year } = req.query;
  try {
    const projection = {
      code: 1,
      year: 1,
      state10: 1,
      county28: 1,
      payam28: 1,
      schoolType: 1,
      ownership: 1,
      school: 1,
      "budget.submittedAmount": 1,
      "budget.preparedBy": 1,
      "budget.reviewedBy": 1,
      "budget.reviewDate": 1,
    };

    const query = year ? { year } : {};
    const budgets = await Budget.find(query, projection);
    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single budget by ID
exports.getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);
    if (!budget) return res.status(404).json({ error: "Budget not found" });
    res.status(200).json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single budget by ID
exports.getBudgetByCode = async (req, res) => {
  try {
    const { code, year } = req.params;

    if (!code || !year) {
      return res.status(400).json({ error: "Code and year are required" });
    }

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear)) {
      return res.status(400).json({ error: "Invalid year format" });
    }

    const budgets = await Budget.findOne({ code, year: parsedYear });
    if (!budgets || budgets.length === 0) {
      return res.status(404).json({ error: "No budgets found" });
    }

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a budget
exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBudget = await Budget.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedBudget)
      return res.status(404).json({ error: "Budget not found" });
    res.status(200).json(updatedBudget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a budget
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBudget = await Budget.findByIdAndDelete(id);
    if (!deletedBudget)
      return res.status(404).json({ error: "Budget not found" });
    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEligibility = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res
        .status(400)
        .json({ error: "Year is required in the request query." });
    }

    // Step 1: Run SchoolData and Budget queries in parallel
    const [enrollmentAggregation, budgets] = await Promise.all([
      // Aggregate learner enrollment from SchoolData
      SchoolData.aggregate([
        { $match: { isDroppedOut: false } },
        { $group: { _id: "$code", enrolment: { $sum: 1 } } }, // Count learners per school
        { $project: { _id: 1, enrolment: 1 } }, // Project only required fields
      ]),

      // Fetch budgets and governance details for the specified year
      Budget.find(
        { year },
        {
          code: 1,
          year: 1,
          ownership: 1,
          schoolType: 1,
          school: 1,
          "meta.governance": 1,
          "meta.estimateLearnerEnrolment": 1,
          "budget.submittedAmount": 1,
          "revenues.state10": 1,
          "revenues.county28": 1,
          "revenues.payam28": 1,
        }
      ),
    ]);

    // Step 2: Map enrollment data for quick access
    const enrollmentData = enrollmentAggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.enrolment;
      return acc;
    }, {});

    // Step 3: Construct response with eligibility field
    const response = budgets.map((budget) => {
      const enrolment = enrollmentData[budget.code] || 0;

      // Check governance criteria
      const { SGB, SDP, budgetSubmitted, bankAccount } = budget.meta.governance;
      const isEligible =
        enrolment > 0 && SGB && SDP && budgetSubmitted && bankAccount;

      return {
        code: budget.code,
        year: budget.year,
        ownership: budget.ownership,
        schoolType: budget.schoolType,
        school: budget.school,
        state10: budget.revenues.state10,
        county28: budget.revenues.county28,
        payam28: budget.revenues.payam28,
        submittedAmount: budget.budget.submittedAmount,
        governance: budget.meta.governance,
        enrolment,
        eligibility: isEligible ? "Eligible" : "Not Eligible",
      };
    });

    res.status(200).json({ data: response });
  } catch (error) {
    console.error("Error fetching eligibility data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

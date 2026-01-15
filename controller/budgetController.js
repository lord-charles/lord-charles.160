const Budget = require("../models/budget");
const SchoolData = require("../models/2023Data");
const Accountability = require("../models/accountability");
const CapitationSettings = require("../models/capitationSettings");

// Get funding groups for a specific year
exports.getFundingGroups = async (req, res) => {
  try {
    const { year } = req.params;

    if (!year) {
      return res.status(400).json({ error: "Year parameter is required" });
    }

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear)) {
      return res.status(400).json({ error: "Invalid year format" });
    }

    const settings = await CapitationSettings.findOne({
      academicYear: parsedYear,
    });

    if (!settings) {
      return res.status(404).json({
        error: "No capitation settings found for this year",
        academicYear: parsedYear,
        fundingGroups: {},
      });
    }

    // Convert Map to object for JSON response
    const fundingGroupsObj = {};
    if (settings.fundingGroups && settings.fundingGroups.size > 0) {
      for (const [key, value] of settings.fundingGroups) {
        fundingGroupsObj[key] = value;
      }
    }

    res.status(200).json({
      academicYear: parsedYear,
      fundingGroups: fundingGroupsObj,
    });
  } catch (error) {
    console.error("Error fetching funding groups:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new budget
exports.createBudget = async (req, res) => {
  try {
    const { code, year, budget } = req.body;

    // Check if school already has a budget document for this year
    if (code && year) {
      const existingBudget = await Budget.findOne({ code, year });

      if (existingBudget && budget?.groups?.length > 0) {
        // Check if any of the groups being added already exist
        const newGroupNames = budget.groups.map((g) => g.group);
        const existingGroupNames =
          existingBudget.budget?.groups?.map((g) => g.group) || [];

        const duplicateGroups = newGroupNames.filter((name) =>
          existingGroupNames.includes(name)
        );

        if (duplicateGroups.length > 0) {
          return res.status(400).json({
            error: "Budget group already exists",
            duplicateGroups,
            message: `The following funding groups already exist for this school in ${year}: ${duplicateGroups.join(
              ", "
            )}. Each funding group can only be created once per school per year.`,
          });
        }

        // If no duplicates, add the new groups to existing budget
        existingBudget.budget.groups.push(...budget.groups);
        const savedBudget = await existingBudget.save();
        return res.status(200).json(savedBudget);
      }
    }

    // Create new budget if no existing document or no groups conflict
    const newBudget = new Budget(req.body);
    const savedBudget = await newBudget.save();
    res.status(201).json(savedBudget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all budgets
exports.getBudgets = async (req, res) => {
  const { year } = req.query;
  try {
    const matchStage = year ? { $match: { year: Number(year) } } : null;
    const pipeline = [
      ...(matchStage ? [matchStage] : []),
      {
        $addFields: {
          submittedAmount: {
            $sum: {
              $map: {
                input: {
                  $reduce: {
                    input: {
                      $reduce: {
                        input: "$budget.groups",
                        initialValue: [],
                        in: { $concatArrays: ["$$value", "$$this.categories"] },
                      },
                    },
                    initialValue: [],
                    in: { $concatArrays: ["$$value", "$$this.items"] },
                  },
                },
                as: "item",
                in: "$$item.totalCostSSP",
              },
            },
          },
        },
      },
      {
        $project: {
          code: 1,
          year: 1,
          state10: 1,
          county28: 1,
          payam28: 1,
          schoolType: 1,
          ownership: 1,
          school: 1,
          submittedAmount: 1,
          preparedBy: "$meta.preparation.preparedBy",
        },
      },
    ];

    const budgets = await Budget.aggregate(pipeline);
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

    const budgets = await Budget.findOne({ code, year: parsedYear }).populate(
      "accountability"
    );
    if (!budgets || budgets.length === 0) {
      return res.status(404).json({ error: "No budgets found" });
    }

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Review a budget and create an Accountability record using available Budget data
exports.reviewBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reviewedByName,
      reviewedByDesignation,
      notes,
      reviewStatus,
      corrections,
      reviewNotes,
      reviewDate,
    } = req.body || {};

    const budgetDoc = await Budget.findById(id);
    if (!budgetDoc) return res.status(404).json({ error: "Budget not found" });

    // If already linked to an Accountability, return existing linkage
    if (budgetDoc.accountability) {
      return res.status(200).json({
        message: "Budget already reviewed",
        accountabilityId: budgetDoc.accountability,
      });
    }

    // Compute submitted amount from available data (prefer stored submittedAmount)
    const submittedAmount = (() => {
      const stored = budgetDoc.budget?.submittedAmount;
      if (typeof stored === "number" && !Number.isNaN(stored)) return stored;
      // Fallback: sum totals from groups -> categories -> items
      try {
        const groups = budgetDoc.budget?.groups || [];
        return groups.reduce((sum, g) => {
          return (
            sum +
            (g.categories || []).reduce((s2, c) => {
              return (
                s2 +
                (c.items || []).reduce(
                  (s3, it) => s3 + (Number(it.totalCostSSP) || 0),
                  0
                )
              );
            }, 0)
          );
        }, 0);
      } catch (_) {
        return 0;
      }
    })();

    // Load capitation settings for tranche distribution
    const settings = await CapitationSettings.findOne({
      academicYear: budgetDoc.year,
    }).lean();
    const schoolType = budgetDoc.schoolType;
    const defaultDist = {
      tranche1Pct: 70,
      tranche2Pct: 20,
      tranche3Pct: 10,
      tranche1InflationCorrectionPct: 0,
      tranche2InflationCorrectionPct: 0,
      tranche3InflationCorrectionPct: 0,
    };
    const rule =
      settings?.capitationGrants?.rules?.find?.(
        (r) => r.schoolType === schoolType
      ) ||
      settings?.capitalSpend?.rules?.find?.((r) => r.schoolType === schoolType);
    const dist = rule?.trancheDistribution || defaultDist;
    const currency = rule?.currency || "SSP";

    const pct = (v) => (Number(v) || 0) / 100;
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const t1Raw = submittedAmount * pct(dist.tranche1Pct);
    const t2Raw = submittedAmount * pct(dist.tranche2Pct);
    // Ensure sum matches submittedAmount by assigning remainder to tranche 3
    const t1Amt = round2(t1Raw);
    const t2Amt = round2(t2Raw);
    const t3Amt = round2(submittedAmount - t1Amt - t2Amt);

    const t1Infl = round2(t1Amt * pct(dist.tranche1InflationCorrectionPct));
    const t2Infl = round2(t2Amt * pct(dist.tranche2InflationCorrectionPct));
    const t3Infl = round2(t3Amt * pct(dist.tranche3InflationCorrectionPct));

    const tranches = [
      {
        name: "Tranche 1",
        amountDisbursed: 0,
        amountApproved: t1Amt,
        currency,
        inflationCorrection: t1Infl,
      },
      {
        name: "Tranche 2",
        amountDisbursed: 0,
        amountApproved: t2Amt,
        currency,
        inflationCorrection: t2Infl,
      },
      {
        name: "Tranche 3",
        amountDisbursed: 0,
        amountApproved: t3Amt,
        currency,
        inflationCorrection: t3Infl,
      },
    ];

    // Build Accountability payload from available Budget fields only
    const accountabilityPayload = {
      code: budgetDoc.code,
      academicYear: budgetDoc.year,
      state10: budgetDoc.state10,
      county28: budgetDoc.county28,
      payam28: budgetDoc.payam28,
      schoolName: budgetDoc.school,
      schoolType: budgetDoc.schoolType,
      ownership: budgetDoc.ownership,
      financialSummary: {
        previousYearLedgerAccountedFor:
          budgetDoc.budget?.previousYearLedgerAccountedFor ?? false,
      },
      tranches,
      notes: notes || undefined,
    };
    // Determine review outcome before creating accountability
    const normalizedStatus = ["Reviewed", "Corrections Required"].includes(
      reviewStatus
    )
      ? reviewStatus
      : "Reviewed";

    // Common review metadata
    budgetDoc.budget = budgetDoc.budget || {};
    budgetDoc.budget.reviewedBy = `${reviewedByName} (${reviewedByDesignation})`;
    budgetDoc.budget.reviewDate = reviewDate
      ? new Date(reviewDate)
      : new Date();
    budgetDoc.budget.reviewStatus = normalizedStatus;
    if (typeof reviewNotes === "string") {
      budgetDoc.budget.reviewNotes = reviewNotes;
    } else if (typeof notes === "string") {
      budgetDoc.budget.reviewNotes = notes;
    }
    if (Array.isArray(corrections)) {
      budgetDoc.budget.corrections = corrections
        .filter(
          (c) => c && typeof c.note === "string" && c.note.trim().length > 0
        )
        .map((c) => ({
          note: c.note,
          addedBy: c.addedBy || `${reviewedByName} (${reviewedByDesignation})`,
          addedAt: c.addedAt ? new Date(c.addedAt) : new Date(),
        }));
    }

    // If corrections are required, do NOT create Accountability yet
    if (normalizedStatus === "Corrections Required") {
      await budgetDoc.save();
      return res.status(200).json({
        message: "Corrections requested; Accountability not created",
        budgetId: budgetDoc._id,
      });
    }

    // Otherwise create Accountability and link it
    const accountabilityDoc = await Accountability.create(
      accountabilityPayload
    );
    budgetDoc.accountability = accountabilityDoc._id;
    await budgetDoc.save();

    return res.status(201).json({
      message: "Budget reviewed and Accountability record created",
      accountability: accountabilityDoc,
      budgetId: budgetDoc._id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Unreview a budget: delete linked Accountability and clear review fields
exports.unreviewBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budgetDoc = await Budget.findById(id);
    if (!budgetDoc) return res.status(404).json({ error: "Budget not found" });

    const accountabilityId = budgetDoc.accountability;
    if (!accountabilityId) {
      // Nothing to unreview
      return res.status(200).json({ message: "Budget is not reviewed" });
    }

    // Delete the Accountability record
    await Accountability.findByIdAndDelete(accountabilityId);

    // Clear review fields and unlink
    budgetDoc.accountability = undefined;
    budgetDoc.budget = budgetDoc.budget || {};
    budgetDoc.budget.reviewedBy = undefined;
    budgetDoc.budget.reviewDate = undefined;
    budgetDoc.budget.reviewStatus = "Unreviewed";
    budgetDoc.budget.reviewNotes = undefined;
    budgetDoc.budget.corrections = [];
    await budgetDoc.save();

    return res
      .status(200)
      .json({ message: "Budget unreviewed and Accountability deleted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// Update a budget
exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBudget = await Budget.findByIdAndUpdate(id, req.body, {
      new: true,
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

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear)) {
      return res.status(400).json({ error: "Invalid year format" });
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
        { year: parsedYear },
        {
          code: 1,
          year: 1,
          state10: 1,
          county28: 1,
          payam28: 1,
          ownership: 1,
          schoolType: 1,
          school: 1,
          "meta.governance": 1,
          "meta.estimateLearnerEnrolment": 1,
          "budget.submittedAmount": 1,
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
        state10: budget.state10,
        county28: budget.county28,
        payam28: budget.payam28,
        ownership: budget.ownership,
        schoolType: budget.schoolType,
        school: budget.school,
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

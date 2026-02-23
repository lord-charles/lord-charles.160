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

// Get documents for a budget (optionally filtered by fundingGroup)
exports.getBudgetDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { fundingGroup } = req.query;

    const budget = await Budget.findById(id);
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    let docs = (budget.budget && budget.budget.documents) || [];
    if (fundingGroup) {
      docs = docs.filter(
        (d) => d.fundingGroup && d.fundingGroup === String(fundingGroup),
      );
    }

    res.status(200).json({ documents: docs });
  } catch (error) {
    console.error("Error fetching budget documents:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add a document entry for a specific budget + funding group
exports.addBudgetDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { fundingGroup, name, url, key, uploadedBy } = req.body || {};

    if (!fundingGroup || !name || !url) {
      return res.status(400).json({
        error: "fundingGroup, name and url are required",
      });
    }

    const budget = await Budget.findById(id);
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    if (!budget.budget) {
      budget.budget = {};
    }
    if (!Array.isArray(budget.budget.documents)) {
      budget.budget.documents = [];
    }

    const docEntry = {
      fundingGroup,
      name,
      url,
      key: key || undefined,
      uploadedBy: uploadedBy || undefined,
      uploadedAt: new Date(),
    };

    budget.budget.documents.push(docEntry);
    await budget.save();

    const groupDocs = budget.budget.documents.filter(
      (d) => d.fundingGroup === fundingGroup,
    );

    res.status(200).json({ documents: groupDocs });
  } catch (error) {
    console.error("Error adding budget document:", error);
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
          existingGroupNames.includes(name),
        );

        if (duplicateGroups.length > 0) {
          return res.status(400).json({
            error: "Budget group already exists",
            duplicateGroups,
            message: `The following funding groups already exist for this school in ${year}: ${duplicateGroups.join(
              ", ",
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
      "accountability",
    );
    if (!budgets || budgets.length === 0) {
      return res.status(404).json({ error: "No budgets found" });
    }

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Review a budget funding group and create/update an Accountability record
exports.reviewBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fundingGroup,
      reviewedByName,
      reviewedByDesignation,
      notes,
      reviewStatus,
      corrections,
      reviewNotes,
      reviewDate,
    } = req.body || {};

    if (!fundingGroup) {
      return res
        .status(400)
        .json({ error: "fundingGroup is required for review" });
    }
    const budgetDoc = await Budget.findById(id);
    if (!budgetDoc) return res.status(404).json({ error: "Budget not found" });

    const groups = budgetDoc.budget?.groups || [];
    const targetGroup = groups.find((g) => g.group === fundingGroup);
    if (!targetGroup) {
      return res.status(400).json({
        error: "Funding group not found on budget",
        fundingGroup,
      });
    }

    // Compute submitted amount FROM THIS FUNDING GROUP ONLY
    const submittedAmount = (() => {
      try {
        const categories = targetGroup.categories || [];
        return categories.reduce((catSum, c) => {
          return (
            catSum +
            (c.items || []).reduce(
              (itemSum, it) => itemSum + (Number(it.totalCostSSP) || 0),
              0,
            )
          );
        }, 0);
      } catch (_) {
        return 0;
      }
    })();

    // Load capitation settings for tranche distribution (per funding group)
    const settings = await CapitationSettings.findOne({
      academicYear: parseInt(budgetDoc.year, 10),
    });
    if (!settings) {
      return res.status(400).json({
        error: "No capitation settings found for academic year",
        academicYear: budgetDoc.year,
      });
    }

    const schoolType = budgetDoc.schoolType;
    // fundingGroups is a Map in mongoose; support both Map and plain object access
    const rawFundingGroups = settings.fundingGroups;
    const isMap =
      rawFundingGroups && typeof rawFundingGroups.get === "function";
    const entries = isMap
      ? Array.from(rawFundingGroups.entries())
      : rawFundingGroups
        ? Object.entries(rawFundingGroups)
        : [];

    // Look up by key first (e.g. "capexTest"), then by displayName (e.g. "CAPEX TEST")
    let groupConfig = isMap
      ? rawFundingGroups.get(fundingGroup)
      : rawFundingGroups?.[fundingGroup];
    if (!groupConfig && entries.length > 0) {
      const byDisplayName = entries.find(
        ([_, config]) =>
          config &&
          String(config.displayName || "").trim().toLowerCase() ===
            String(fundingGroup || "").trim().toLowerCase()
      );
      if (byDisplayName) groupConfig = byDisplayName[1];
    }

    if (!groupConfig) {
      return res.status(400).json({
        error: "No capitation funding group configuration found",
        fundingGroup,
        hint: "Capitation keys are per funding group (e.g. capexTest, opexTest). Match by key or by displayName.",
      });
    }

    if (!Array.isArray(groupConfig.rules) || groupConfig.rules.length === 0) {
      return res.status(400).json({
        error: "No capitation rules configured for funding group",
        fundingGroup,
      });
    }

    const rule = groupConfig.rules.find((r) => r.schoolType === schoolType);
    if (!rule) {
      return res.status(400).json({
        error: "No capitation rule found for school type in funding group",
        fundingGroup,
        schoolType,
      });
    }

    const dist = rule.trancheDistribution;
    if (!dist) {
      return res.status(400).json({
        error: "No tranche distribution configured for funding group rule",
        fundingGroup,
        schoolType,
      });
    }

    const currency = rule.currency || "SSP";

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
        fundingGroup,
        amountDisbursed: 0,
        amountApproved: t1Amt,
        currency,
        inflationCorrection: t1Infl,
      },
      {
        name: "Tranche 2",
        fundingGroup,
        amountDisbursed: 0,
        amountApproved: t2Amt,
        currency,
        inflationCorrection: t2Infl,
      },
      {
        name: "Tranche 3",
        fundingGroup,
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
      reviewStatus,
    )
      ? reviewStatus
      : "Reviewed";

    // Common review metadata (legacy whole-budget fields)
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
          (c) => c && typeof c.note === "string" && c.note.trim().length > 0,
        )
        .map((c) => ({
          note: c.note,
          addedBy: c.addedBy || `${reviewedByName} (${reviewedByDesignation})`,
          addedAt: c.addedAt ? new Date(c.addedAt) : new Date(),
        }));
    }

    // Group-level review metadata
    budgetDoc.budget.fundingGroupReviews =
      budgetDoc.budget.fundingGroupReviews || [];
    const existingGroupReviewIndex =
      budgetDoc.budget.fundingGroupReviews.findIndex(
        (gr) => gr.group === fundingGroup,
      );

    const groupReviewPayload = {
      group: fundingGroup,
      reviewedBy: `${reviewedByName} (${reviewedByDesignation})`,
      reviewDate: budgetDoc.budget.reviewDate,
      reviewStatus: normalizedStatus,
      reviewNotes:
        typeof reviewNotes === "string"
          ? reviewNotes
          : typeof notes === "string"
            ? notes
            : undefined,
      corrections: Array.isArray(corrections)
        ? corrections
            .filter(
              (c) =>
                c && typeof c.note === "string" && c.note.trim().length > 0,
            )
            .map((c) => ({
              note: c.note,
              addedBy:
                c.addedBy || `${reviewedByName} (${reviewedByDesignation})`,
              addedAt: c.addedAt ? new Date(c.addedAt) : new Date(),
            }))
        : [],
    };

    if (existingGroupReviewIndex >= 0) {
      budgetDoc.budget.fundingGroupReviews[existingGroupReviewIndex] =
        groupReviewPayload;
    } else {
      budgetDoc.budget.fundingGroupReviews.push(groupReviewPayload);
    }

    // If corrections are required, do NOT create Accountability yet
    if (normalizedStatus === "Corrections Required") {
      await budgetDoc.save();
      return res.status(200).json({
        message: "Corrections requested; Accountability not created",
        budgetId: budgetDoc._id,
      });
    }

    // Otherwise create or update Accountability and link it
    let accountabilityDoc;
    if (budgetDoc.accountability) {
      accountabilityDoc = await Accountability.findById(
        budgetDoc.accountability,
      );
      if (!accountabilityDoc) {
        accountabilityDoc = await Accountability.create(accountabilityPayload);
        budgetDoc.accountability = accountabilityDoc._id;
      }
    } else {
      accountabilityDoc = await Accountability.create(accountabilityPayload);
      budgetDoc.accountability = accountabilityDoc._id;
    }

    // Replace this funding group's tranches; keep existing tranches for other groups
    accountabilityDoc.tranches = accountabilityDoc.tranches || [];
    accountabilityDoc.tranches = accountabilityDoc.tranches.filter(
      (t) => t.fundingGroup !== fundingGroup,
    );
    accountabilityDoc.tranches.push(...tranches);
    await accountabilityDoc.save();
    await budgetDoc.save();

    return res.status(201).json({
      message: "Budget funding group reviewed and Accountability updated",
      accountability: accountabilityDoc,
      budgetId: budgetDoc._id,
      fundingGroup,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Unreview a budget funding group: remove that group's tranches and clear review fields
exports.unreviewBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { fundingGroup } = req.body || {};

    if (!fundingGroup) {
      return res
        .status(400)
        .json({ error: "fundingGroup is required to unreview" });
    }

    const budgetDoc = await Budget.findById(id);
    if (!budgetDoc) return res.status(404).json({ error: "Budget not found" });

    const accountabilityId = budgetDoc.accountability;
    if (!accountabilityId) {
      // Nothing to unreview
      return res.status(200).json({ message: "Budget is not reviewed" });
    }

    const accountabilityDoc = await Accountability.findById(accountabilityId);
    if (accountabilityDoc) {
      accountabilityDoc.tranches =
        accountabilityDoc.tranches?.filter(
          (t) => t.fundingGroup !== fundingGroup,
        ) || [];

      // If no tranches remain, delete the Accountability document and unlink
      if (accountabilityDoc.tranches.length === 0) {
        await Accountability.findByIdAndDelete(accountabilityId);
        budgetDoc.accountability = undefined;
      } else {
        await accountabilityDoc.save();
      }
    }

    // Clear group-level review fields
    budgetDoc.budget = budgetDoc.budget || {};
    budgetDoc.budget.fundingGroupReviews =
      budgetDoc.budget.fundingGroupReviews || [];
    budgetDoc.budget.fundingGroupReviews =
      budgetDoc.budget.fundingGroupReviews.filter(
        (gr) => gr.group !== fundingGroup,
      );

    // Legacy whole-budget review fields remain untouched for other groups;
    // if no group reviews remain, reset to Unreviewed
    if (
      !budgetDoc.budget.fundingGroupReviews ||
      budgetDoc.budget.fundingGroupReviews.length === 0
    ) {
      budgetDoc.budget.reviewedBy = undefined;
      budgetDoc.budget.reviewDate = undefined;
      budgetDoc.budget.reviewStatus = "Unreviewed";
      budgetDoc.budget.reviewNotes = undefined;
      budgetDoc.budget.corrections = [];
    }

    await budgetDoc.save();

    return res.status(200).json({
      message: "Budget funding group unreviewed",
      fundingGroup,
    });
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
        },
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

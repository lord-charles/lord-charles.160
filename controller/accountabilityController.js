const Accountability = require("../models/accountability");
const Budget = require("../models/budget");
const FinancialCalculationService = require("../services/financialCalculationService");

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

      // Filter by specific tranche if provided
      ...(tranche ? [{ $match: { "tranches.name": tranche } }] : []),

      // Project and calculate accountability metrics
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
          // Calculate accountability metrics
          hasAccountingEntries: {
            $gt: [
              {
                $size: {
                  $ifNull: [
                    "$tranches.fundsAccountability.accountingEntries",
                    [],
                  ],
                },
              },
              0,
            ],
          },
          hasRevenueEntries: {
            $gt: [{ $size: { $ifNull: ["$tranches.revenues", []] } }, 0],
          },
          hasExpenditureEntries: {
            $gt: [{ $size: { $ifNull: ["$tranches.expenditures", []] } }, 0],
          },
          accountingEntriesTotal: {
            $sum: {
              $ifNull: [
                "$tranches.fundsAccountability.accountingEntries.value",
                0,
              ],
            },
          },
          revenueTotal: {
            $sum: { $ifNull: ["$tranches.revenues.amount", 0] },
          },
          expenditureTotal: {
            $sum: { $ifNull: ["$tranches.expenditures.amount", 0] },
          },
        },
      },

      // Add calculated fields for accountability status
      {
        $addFields: {
          // Calculate total accounted amount (from all sources)
          totalAccountedAmount: {
            $add: [
              { $ifNull: ["$totalExpenditure", 0] },
              { $ifNull: ["$expenditureTotal", 0] },
              { $ifNull: ["$accountingEntriesTotal", 0] },
            ],
          },
          // Calculate accountability status
          accountabilityStatus: {
            $cond: {
              if: { $eq: ["$amountDisbursed", 0] },
              then: "Not Disbursed",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$hasAccountingEntries", false] },
                      { $eq: ["$hasRevenueEntries", false] },
                      { $eq: ["$hasExpenditureEntries", false] },
                      { $eq: [{ $ifNull: ["$totalRevenue", 0] }, 0] },
                      { $eq: [{ $ifNull: ["$totalExpenditure", 0] }, 0] },
                    ],
                  },
                  then: "No Accountability",
                  else: {
                    $cond: {
                      if: {
                        $and: [
                          {
                            $or: [
                              { $gt: [{ $ifNull: ["$totalRevenue", 0] }, 0] },
                              { $eq: ["$hasRevenueEntries", true] },
                              { $eq: ["$hasAccountingEntries", true] },
                            ],
                          },
                          {
                            $or: [
                              {
                                $gt: [{ $ifNull: ["$totalExpenditure", 0] }, 0],
                              },
                              { $eq: ["$hasExpenditureEntries", true] },
                            ],
                          },
                        ],
                      },
                      then: "Complete",
                      else: "Partial",
                    },
                  },
                },
              },
            },
          },
          // Calculate accountability percentage
          accountabilityPercentage: {
            $cond: {
              if: { $eq: ["$amountDisbursed", 0] },
              then: 0,
              else: {
                $min: [
                  100,
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $add: [
                              { $ifNull: ["$totalExpenditure", 0] },
                              { $ifNull: ["$expenditureTotal", 0] },
                              { $ifNull: ["$accountingEntriesTotal", 0] },
                            ],
                          },
                          "$amountDisbursed",
                        ],
                      },
                      100,
                    ],
                  },
                ],
              },
            },
          },
          // Calculate unaccounted amount
          unaccountedAmount: {
            $max: [
              0,
              {
                $subtract: [
                  "$amountDisbursed",
                  {
                    $add: [
                      { $ifNull: ["$totalExpenditure", 0] },
                      { $ifNull: ["$expenditureTotal", 0] },
                      { $ifNull: ["$accountingEntriesTotal", 0] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },

      // Clean up the projection - only send necessary fields
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
          amountDisbursed: 1,
          amountApproved: 1,
          paidBy: 1,
          totalRevenue: 1,
          totalExpenditure: 1,
          openingBalance: 1,
          closingBalance: 1,
          accountabilityStatus: 1,
          accountabilityPercentage: {
            $round: ["$accountabilityPercentage", 1],
          },
          unaccountedAmount: 1,
          totalAccountedAmount: 1,
        },
      },

      // Sort by school name
      { $sort: { schoolName: 1 } },
    ]);

    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching accountability data",
      error: error.message,
    });
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
          // amountDisbursed: "$tranches.amountDisbursed",
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
    const { academicYear, state10, county28, payam28, schoolCode, tranche } =
      req.query;

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

    const pipeline = [{ $match: matchConditions }, { $unwind: "$tranches" }];

    // Add tranche filtering if specified, default to Tranche 1
    const trancheFilter = tranche || "Tranche 1";
    pipeline.push({
      $match: { "tranches.name": trancheFilter },
    });

    pipeline.push(
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
        },
      },
      { $sort: { schoolName: 1 } }
    );

    const disbursements = await Accountability.aggregate(pipeline);

    if (!disbursements || disbursements.length === 0) {
      return res.status(404).json({
        message: `No disbursements found for ${trancheFilter} in ${academicYear}`,
      });
    }

    res.status(200).json(disbursements);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching school disbursements",
      error: error.message,
    });
  }
};

// Approve a tranche for a given accountability entry
const approveTranche = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      trancheName,
      approvedBy,
      approverName,
      approvalDate,
      status,
      remarks,
      amountApproved,
    } = req.body;

    if (!trancheName) {
      return res.status(400).json({ message: "trancheName is required" });
    }

    const update = {
      "tranches.$[t].approval.approvedBy": approvedBy ?? null,
      "tranches.$[t].approval.approverName": approverName ?? null,
      "tranches.$[t].approval.approvalDate": approvalDate
        ? new Date(approvalDate)
        : new Date(),
      "tranches.$[t].approval.status": status || "Approved",
      "tranches.$[t].approval.remarks": remarks ?? null,
    };

    // Update amountApproved if provided
    if (amountApproved !== undefined && amountApproved !== null) {
      update["tranches.$[t].amountApproved"] = Number(amountApproved);
    }

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      { $set: update },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry or tranche not found" });
    }

    // Return the updated tranche only for convenience
    const updatedTranche = (updated.tranches || []).find(
      (tr) => tr.name === trancheName
    );

    return res.status(200).json({
      message: "Tranche approved successfully",
      tranche: updatedTranche || null,
      entryId: updated._id,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error approving tranche", error: error.message });
  }
};

// Disburse funds for a tranche
const disburseTranche = async (req, res) => {
  try {
    const { id } = req.params; // accountability document ID
    const {
      trancheName,
      amountDisbursed,
      paidBy,
      disbursementDate,
      paidThrough,
    } = req.body;

    if (!trancheName || amountDisbursed === undefined) {
      return res.status(400).json({
        message: "trancheName and amountDisbursed are required",
      });
    }

    if (
      !paidThrough ||
      !["Bank", "Pay Agent", "Mobile Money"].includes(paidThrough)
    ) {
      return res.status(400).json({
        message: "paidThrough must be one of: Bank, Pay Agent, Mobile Money",
      });
    }

    // Find the accountability document and tranche to validate
    const accountability = await Accountability.findById(id);
    if (!accountability) {
      return res
        .status(404)
        .json({ message: "Accountability entry not found" });
    }

    const tranche = accountability.tranches.find((t) => t.name === trancheName);
    if (!tranche) {
      return res.status(404).json({ message: "Tranche not found" });
    }

    // Validate that disbursement doesn't exceed approved amount
    const amountApproved = tranche.amountApproved || 0;
    const requestedAmount = Number(amountDisbursed);

    if (requestedAmount > amountApproved) {
      return res.status(400).json({
        message: `Cannot disburse ${requestedAmount} SSP. Approved amount is ${amountApproved} SSP.`,
        amountApproved,
        requestedAmount,
      });
    }

    const update = {
      "tranches.$[t].amountDisbursed": requestedAmount,
      "tranches.$[t].paidBy": paidBy || "Unknown",
      "tranches.$[t].paidThrough": paidThrough,
      "tranches.$[t].dateDisbursed": disbursementDate
        ? new Date(disbursementDate)
        : new Date(),
      "tranches.$[t].fundsAccountability.receivedBySchool": requestedAmount,
    };

    // If paid through bank, set bankInstructed to true
    if (paidThrough === "Bank") {
      update["tranches.$[t].fundsAccountability.bankInstructed"] = true;
    }

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      { $set: update },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry or tranche not found" });
    }

    const updatedTranche = (updated.tranches || []).find(
      (tr) => tr.name === trancheName
    );

    return res.status(200).json({
      message: "Tranche disbursed successfully",
      tranche: updatedTranche || null,
      entryId: updated._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error disbursing tranche",
      error: error.message,
    });
  }
};

// Add accounting entry to a tranche
const addAccountingEntry = async (req, res) => {
  try {
    const { id } = req.params; // accountability document ID
    const { trancheName, field, value, comment, category, recordedBy } =
      req.body;

    if (!trancheName || !field || value === undefined) {
      return res.status(400).json({
        message: "trancheName, field, and value are required",
      });
    }

    const accountingEntry = {
      field,
      value: Number(value),
      comment: comment || "",
      category: category || "General",
      dateRecorded: new Date(),
      recordedBy: recordedBy || "Unknown",
    };

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      {
        $push: {
          "tranches.$[t].fundsAccountability.accountingEntries":
            accountingEntry,
        },
      },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry or tranche not found" });
    }

    const updatedTranche = (updated.tranches || []).find(
      (tr) => tr.name === trancheName
    );

    return res.status(200).json({
      message: "Accounting entry added successfully",
      tranche: updatedTranche || null,
      entryId: updated._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error adding accounting entry",
      error: error.message,
    });
  }
};

// Update accounting entry
const updateAccountingEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params; // accountability ID and accounting entry ID
    const { trancheName, field, value, comment, category } = req.body;

    if (!trancheName) {
      return res.status(400).json({ message: "trancheName is required" });
    }

    const updateFields = {};
    if (field !== undefined)
      updateFields[
        "tranches.$[t].fundsAccountability.accountingEntries.$[e].field"
      ] = field;
    if (value !== undefined)
      updateFields[
        "tranches.$[t].fundsAccountability.accountingEntries.$[e].value"
      ] = Number(value);
    if (comment !== undefined)
      updateFields[
        "tranches.$[t].fundsAccountability.accountingEntries.$[e].comment"
      ] = comment;
    if (category !== undefined)
      updateFields[
        "tranches.$[t].fundsAccountability.accountingEntries.$[e].category"
      ] = category;

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }, { "e._id": entryId }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ message: "Entry, tranche, or accounting entry not found" });
    }

    return res.status(200).json({
      message: "Accounting entry updated successfully",
      entryId: updated._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating accounting entry",
      error: error.message,
    });
  }
};

// Delete accounting entry
const deleteAccountingEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params; // accountability ID and accounting entry ID
    const { trancheName } = req.body;

    if (!trancheName) {
      return res.status(400).json({ message: "trancheName is required" });
    }

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      {
        $pull: {
          "tranches.$[t].fundsAccountability.accountingEntries": {
            _id: entryId,
          },
        },
      },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry or tranche not found" });
    }

    return res.status(200).json({
      message: "Accounting entry deleted successfully",
      entryId: updated._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting accounting entry",
      error: error.message,
    });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year || isNaN(parseInt(year))) {
      return res.status(400).json({ message: "Valid year is required" });
    }

    const academicYear = parseInt(year);

    // Get budget statistics
    const budgetStats = await Budget.aggregate([
      { $match: { year: academicYear } },
      {
        $group: {
          _id: null,
          totalSchoolsWithBudgets: { $sum: 1 },
          totalBudgetAllocated: {
            $sum: {
              $add: [
                { $ifNull: ["$budget.submittedAmount", 0] },
                {
                  $sum: {
                    $map: {
                      input: "$revenues",
                      as: "revenue",
                      in: { $ifNull: ["$$revenue.amount", 0] },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ]);

    // Get accountability statistics (approvals, disbursements, accountability)
    const accountabilityStats = await Accountability.aggregate([
      { $match: { academicYear } },

      // Calculate metrics for each school
      {
        $addFields: {
          totalApproved: {
            $sum: "$tranches.amountApproved",
          },
          totalDisbursed: {
            $sum: "$tranches.amountDisbursed",
          },

          // Approval metrics - check if any tranche is approved
          hasApprovedTranches: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$tranches",
                    cond: { $eq: ["$$this.approval.status", "Approved"] },
                  },
                },
              },
              0,
            ],
          },

          // Disbursement metrics - check if any tranche has disbursements
          hasDisbursements: {
            $gt: [
              {
                $sum: "$tranches.amountDisbursed",
              },
              0,
            ],
          },

          // Accountability metrics - check if any accountability data exists
          hasAccountabilityData: {
            $or: [
              // Check financial summary
              { $gt: [{ $ifNull: ["$financialSummary.totalRevenue", 0] }, 0] },
              {
                $gt: [
                  { $ifNull: ["$financialSummary.totalExpenditure", 0] },
                  0,
                ],
              },
              // Check if any tranche has accountability entries
              {
                $gt: [
                  {
                    $sum: {
                      $map: {
                        input: "$tranches",
                        as: "tranche",
                        in: {
                          $add: [
                            {
                              $size: {
                                $ifNull: [
                                  "$$tranche.fundsAccountability.accountingEntries",
                                  [],
                                ],
                              },
                            },
                            { $size: { $ifNull: ["$$tranche.revenues", []] } },
                            {
                              $size: {
                                $ifNull: ["$$tranche.expenditures", []],
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            ],
          },
        },
      },

      // Group to calculate final statistics
      {
        $group: {
          _id: null,

          // Approval Stage - Count total approved tranches (not schools)
          schoolsWithApprovals: {
            $sum: {
              $size: {
                $filter: {
                  input: "$tranches",
                  cond: { $eq: ["$$this.approval.status", "Approved"] },
                },
              },
            },
          },

          // Disbursement Stage - Count schools with disbursements
          schoolsWithDisbursements: {
            $sum: {
              $cond: ["$hasDisbursements", 1, 0],
            },
          },
          totalAmountDisbursed: { $sum: "$totalDisbursed" },

          // Accountability Stage - Count schools with accountability (only if disbursed)
          schoolsWithAccountability: {
            $sum: {
              $cond: [
                {
                  $and: [
                    "$hasDisbursements", // Must be disbursed first
                    "$hasAccountabilityData", // Must have accountability data
                  ],
                },
                1,
                0,
              ],
            },
          },

          schoolsAwaitingAccountability: {
            $sum: {
              $cond: [
                {
                  $and: [
                    "$hasDisbursements", // Disbursed
                    { $not: "$hasAccountabilityData" }, // But no accountability
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Combine results
    const budgetResult =
      budgetStats.length > 0
        ? budgetStats[0]
        : {
            totalSchoolsWithBudgets: 0,
            totalBudgetAllocated: 0,
          };

    const accountabilityResult =
      accountabilityStats.length > 0
        ? accountabilityStats[0]
        : {
            schoolsWithApprovals: 0,
            schoolsWithDisbursements: 0,
            totalAmountDisbursed: 0,
            schoolsWithAccountability: 0,
            schoolsAwaitingAccountability: 0,
          };

    // Calculate percentages
    const result = {
      // Budget Stage
      totalSchoolsWithBudgets: budgetResult.totalSchoolsWithBudgets,
      totalBudgetAllocated:
        Math.round(budgetResult.totalBudgetAllocated * 100) / 100,

      // Approval Stage
      schoolsWithApprovals: accountabilityResult.schoolsWithApprovals,
      approvalRate:
        budgetResult.totalSchoolsWithBudgets > 0
          ? Math.round(
              (accountabilityResult.schoolsWithApprovals /
                budgetResult.totalSchoolsWithBudgets) *
                100 *
                10
            ) / 10
          : 0,

      // Disbursement Stage
      schoolsWithDisbursements: accountabilityResult.schoolsWithDisbursements,
      totalAmountDisbursed:
        Math.round(accountabilityResult.totalAmountDisbursed * 100) / 100,
      disbursementRate:
        accountabilityResult.schoolsWithApprovals > 0
          ? Math.round(
              (accountabilityResult.schoolsWithDisbursements /
                accountabilityResult.schoolsWithApprovals) *
                100 *
                10
            ) / 10
          : 0,

      // Accountability Stage
      schoolsWithAccountability: accountabilityResult.schoolsWithAccountability,
      schoolsAwaitingAccountability:
        accountabilityResult.schoolsAwaitingAccountability,
      accountabilityRate:
        accountabilityResult.schoolsWithDisbursements > 0
          ? Math.round(
              (accountabilityResult.schoolsWithAccountability /
                accountabilityResult.schoolsWithDisbursements) *
                100 *
                10
            ) / 10
          : 0,
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};

// Record returned funds for a tranche
const recordReturnedFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { trancheName, amount, reason, recordedBy } = req.body;

    if (!trancheName || !amount) {
      return res.status(400).json({
        message: "trancheName and amount are required",
      });
    }

    const update = {
      "tranches.$[t].fundsAccountability.returnedFunds.amount": Number(amount),
      "tranches.$[t].fundsAccountability.returnedFunds.returnDate": new Date(),
      "tranches.$[t].fundsAccountability.returnedFunds.reason": reason || "",
      "tranches.$[t].fundsAccountability.returnedFunds.recordedBy":
        recordedBy || "Unknown",
    };

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      { $set: update },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry or tranche not found" });
    }

    return res.status(200).json({
      message: "Returned funds recorded successfully",
      entryId: updated._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error recording returned funds",
      error: error.message,
    });
  }
};

// Record held funds for a tranche
const recordHeldFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { trancheName, amount, heldBy, reason, recordedBy } = req.body;

    if (!trancheName || !amount) {
      return res.status(400).json({
        message: "trancheName and amount are required",
      });
    }

    const update = {
      "tranches.$[t].fundsAccountability.heldFunds.amount": Number(amount),
      "tranches.$[t].fundsAccountability.heldFunds.heldBy": heldBy || "",
      "tranches.$[t].fundsAccountability.heldFunds.reason": reason || "",
      "tranches.$[t].fundsAccountability.heldFunds.dateHeld": new Date(),
      "tranches.$[t].fundsAccountability.heldFunds.recordedBy":
        recordedBy || "Unknown",
    };

    const updated = await Accountability.findOneAndUpdate(
      { _id: id },
      { $set: update },
      {
        new: true,
        arrayFilters: [{ "t.name": trancheName }],
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry or tranche not found" });
    }

    return res.status(200).json({
      message: "Held funds recorded successfully",
      entryId: updated._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error recording held funds",
      error: error.message,
    });
  }
};

// Get financial summary with real-time calculations
const getFinancialSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const accountability = await Accountability.findById(id);
    if (!accountability) {
      return res
        .status(404)
        .json({ message: "Accountability record not found" });
    }

    const summary = await FinancialCalculationService.calculateFinancialSummary(
      id,
      accountability.academicYear
    );

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({
      message: "Error calculating financial summary",
      error: error.message,
    });
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
  approveTranche,
  // NEW ENDPOINTS
  disburseTranche,
  recordReturnedFunds,
  recordHeldFunds,
  addAccountingEntry,
  updateAccountingEntry,
  deleteAccountingEntry,
  // STATS ENDPOINT
  getDashboardStats,
  // FINANCIAL CALCULATIONS
  getFinancialSummary,
};

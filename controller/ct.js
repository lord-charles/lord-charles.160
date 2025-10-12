const CashTransfer = require("../models/ct");
const mongoose = require("mongoose");
const SchoolData = require("../models/2023Data");
const CTCriteria = require("../models/CTCriteria");
const School = require("../models/school-data");

// Helper function to intelligently parse numbers from strings
const parseNumberFromString = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Convert to string first
  const stringValue = String(value);

  // Remove all non-digit characters except decimal point and minus sign
  const cleanedValue = stringValue.replace(/[^\d.-]/g, "");

  // If empty after cleaning, return null
  if (!cleanedValue) {
    return null;
  }

  // Parse as number
  const parsedNumber = parseFloat(cleanedValue);

  // Return null if not a valid number
  return isNaN(parsedNumber) ? null : Math.floor(Math.abs(parsedNumber));
};

// Create a new cash transfer
exports.createCashTransfer = async (req, res) => {
  try {
    const {
      learnerId,
      isValidated,
      CTEFSerialNumber,
      ctAttendance,
      invalidationReason,
      tranche,
    } = req.body;

    const learner = await SchoolData.findById(learnerId);
    if (!learner) {
      return res.status(404).json({ error: "Learner not found" });
    }

    const criteria = await CTCriteria.findOne({
      tranche: tranche,
      educationType: learner.education,
      isActive: true,
    });

    if (!criteria) {
      return res.status(400).json({
        error: "CT Criteria not found for this tranche and education type",
      });
    }

    const classCriterion = criteria.classes.find(
      (c) => c.className === learner.class
    );

    if (!classCriterion) {
      return res
        .status(400)
        .json({ error: "CT Criteria not found for this learner's class" });
    }

    // Get school ownership dynamically
    const schoolInfo = await School.findOne({ code: learner.code }).select(
      "schoolOwnerShip"
    );
    const schoolOwnership = schoolInfo?.schoolOwnerShip || "Public";

    const cashTransferData = {
      tranche: tranche,
      year: new Date().getFullYear(),
      location: {
        state10: learner.state10,
        county28: learner.county28,
        payam28: learner.payam28,
      },
      school: {
        name: learner.school,
        code: learner.code,
        type: learner.education,
        ownership: schoolOwnership,
      },
      learner: {
        dob: learner.dob.toString() || null,
        name: {
          firstName: learner.firstName,
          middleName: learner.middleName,
          lastName: learner.lastName,
        },
        learnerUniqueID: learner.learnerUniqueID,
        reference: learner.reference,
        classInfo: {
          class: learner.class,
          classStream: learner.formstream,
        },
        gender: learner.gender,
        attendance: ctAttendance,
        disabilities: learner.disabilities,
      },
      validation: {
        isValidated: isValidated,
        invalidationReason: invalidationReason || "",
        finalSerialCtefNumber: parseNumberFromString(
          CTEFSerialNumber[0].Number
        ),
        dateValidatedAtSchool: CTEFSerialNumber[0].DateIssued,
      },
      amounts: {
        approved: {
          amount: classCriterion.amount,
          currency: criteria.currency,
        },
      },
    };

    // Check if a cash transfer for this learner and year already exists (by learnerUniqueID or reference)
    const yearQuery = { year: cashTransferData.year };
    const orConditions = [];
    if (learner.learnerUniqueID) {
      orConditions.push({ "learner.learnerUniqueID": learner.learnerUniqueID });
    }
    if (learner.reference) {
      orConditions.push({ "learner.reference": learner.reference });
    }
    const existingCashTransfer = await CashTransfer.findOne({
      ...yearQuery,
      $or: orConditions.length > 0 ? orConditions : [{}],
    });

    let cashTransfer;
    if (existingCashTransfer) {
      // Update the existing record
      cashTransfer = await CashTransfer.findOneAndUpdate(
        {
          year: cashTransferData.year,
          $or: orConditions.length > 0 ? orConditions : [{}],
        },
        cashTransferData,
        { new: true }
      );
    } else {
      // Create a new record
      cashTransfer = await CashTransfer.create(cashTransferData);
    }

    // Ensure only one isCTValidated entry per year
    const currentYear = new Date().getFullYear();
    learner.isCTValidated = learner.isCTValidated.filter(
      (entry) => entry.year !== currentYear
    );
    learner.isCTValidated.push({
      year: currentYear,
      validated: isValidated,
      invalidationReason: invalidationReason || "",
      CTEFSerialNumber: parseNumberFromString(CTEFSerialNumber[0].Number),
      dateInvalidated: new Date(),
      validatedBy: CTEFSerialNumber[0].validatedBy,
    });
    await learner.save();

    res.status(201).json(cashTransfer);
  } catch (error) {
    console.log(error);
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

exports.getStatCardData = async (req, res) => {
  try {
    const { tranche, state, county, payam, year } = req.query;

    // Build match conditions
    const matchConditions = {};

    if (state) {
      matchConditions["location.state10"] = state;
    }
    if (county) {
      matchConditions["location.county10"] = county;
    }
    if (payam) {
      matchConditions["location.payam10"] = payam;
    }
    if (year) {
      matchConditions.year = parseInt(year);
    }
    if (tranche) {
      matchConditions.tranche = parseInt(tranche);
    }

    console.log("Match conditions:", matchConditions);

    // First, let's check a sample of the data to understand the amounts structure
    const sampleData = await CashTransfer.findOne(matchConditions).select(
      "amounts"
    );
    console.log("Sample amounts data:", JSON.stringify(sampleData, null, 2));

    // Check how many records have isDisbursed = true
    const disbursedCount = await CashTransfer.countDocuments({
      ...matchConditions,
      "amounts.approved.isDisbursed": true,
    });
    console.log("Records with isDisbursed=true:", disbursedCount);

    // Check the actual disbursed records and their amounts
    const disbursedRecords = await CashTransfer.find({
      ...matchConditions,
      "amounts.approved.isDisbursed": true,
    })
      .select("amounts learner.name school.name")
      .limit(5);
    console.log(
      "Sample disbursed records:",
      JSON.stringify(disbursedRecords, null, 2)
    );

    // Check if there are any records with amount > 0
    const recordsWithAmount = await CashTransfer.countDocuments({
      ...matchConditions,
      "amounts.approved.amount": { $gt: 0 },
    });
    console.log("Records with amount > 0:", recordsWithAmount);

    // Simplified and more robust aggregation pipeline
    const pipeline = [
      {
        $match: matchConditions,
      },
      // Add fields for disability checking with proper null handling
      {
        $addFields: {
          disabilityInfo: {
            $ifNull: [{ $arrayElemAt: ["$learner.disabilities", 0] }, {}],
          },
        },
      },
      {
        $addFields: {
          hasDisability: {
            $cond: {
              if: { $ifNull: ["$disabilityInfo.disabilities", false] },
              then: {
                $or: [
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$disabilityInfo.disabilities.difficultySeeing",
                          1,
                        ],
                      },
                      1,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$disabilityInfo.disabilities.difficultyHearing",
                          1,
                        ],
                      },
                      1,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$disabilityInfo.disabilities.difficultyTalking",
                          1,
                        ],
                      },
                      1,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$disabilityInfo.disabilities.difficultySelfCare",
                          1,
                        ],
                      },
                      1,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$disabilityInfo.disabilities.difficultyWalking",
                          1,
                        ],
                      },
                      1,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$disabilityInfo.disabilities.difficultyRecalling",
                          1,
                        ],
                      },
                      1,
                    ],
                  },
                ],
              },
              else: false,
            },
          },
          learnerGender: { $ifNull: ["$learner.gender", "U"] },
          learnerAttendance: { $ifNull: ["$learner.attendance", 0] },
          schoolOwnership: { $ifNull: ["$school.ownership", "Unknown"] },
          disbursedAmount: {
            $cond: {
              if: { $eq: ["$amounts.approved.isDisbursed", true] },
              then: { $ifNull: ["$amounts.approved.amount", 0] },
              else: 0,
            },
          },
          accountedAmount: { $ifNull: ["$accountability.amountAccounted", 0] },
        },
      },
      // Debug stage - let's see what we have
      {
        $addFields: {
          debugInfo: {
            originalApprovedAmount: "$amounts.approved.amount",
            originalIsDisbursed: "$amounts.approved.isDisbursed",
            calculatedDisbursedAmount: "$disbursedAmount",
          },
        },
      },
      // Group by school first
      {
        $group: {
          _id: {
            schoolCode: "$school.code",
            tranche: "$tranche",
          },
          createdAt: { $first: "$createdAt" },
          isPublicSchool: {
            $first: { $eq: ["$schoolOwnership", "Public"] },
          },
          totalLearners: { $sum: 1 },
          maleLearners: {
            $sum: { $cond: [{ $eq: ["$learnerGender", "M"] }, 1, 0] },
          },
          femaleLearners: {
            $sum: { $cond: [{ $eq: ["$learnerGender", "F"] }, 1, 0] },
          },
          disabledMaleLearners: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ["$learnerGender", "M"] }, "$hasDisability"],
                },
                1,
                0,
              ],
            },
          },
          disabledFemaleLearners: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ["$learnerGender", "F"] }, "$hasDisability"],
                },
                1,
                0,
              ],
            },
          },
          totalAttendance: { $sum: "$learnerAttendance" },
          totalAmountDisbursed: { $sum: "$disbursedAmount" },
          accountedAmount: { $sum: "$accountedAmount" },
          // Debug info
          sampleDebugInfo: { $first: "$debugInfo" },
          recordsWithDisbursedAmount: {
            $sum: { $cond: [{ $gt: ["$disbursedAmount", 0] }, 1, 0] },
          },
        },
      },
      // Group by tranche
      {
        $group: {
          _id: "$_id.tranche",
          createdAt: { $first: "$createdAt" },
          totalSchools: { $sum: 1 },
          publicSchools: {
            $sum: { $cond: ["$isPublicSchool", 1, 0] },
          },
          totalLearners: { $sum: "$totalLearners" },
          maleLearners: { $sum: "$maleLearners" },
          femaleLearners: { $sum: "$femaleLearners" },
          disabledMaleLearners: { $sum: "$disabledMaleLearners" },
          disabledFemaleLearners: { $sum: "$disabledFemaleLearners" },
          totalAttendance: { $sum: "$totalAttendance" },
          totalAmountDisbursed: { $sum: "$totalAmountDisbursed" },
          accountedAmount: { $sum: "$accountedAmount" },
        },
      },
      // Calculate averages and percentages
      {
        $addFields: {
          averageAttendance: {
            $cond: {
              if: { $gt: ["$totalLearners", 0] },
              then: { $divide: ["$totalAttendance", "$totalLearners"] },
              else: 0,
            },
          },
          totalDisabled: {
            $add: ["$disabledMaleLearners", "$disabledFemaleLearners"],
          },
        },
      },
      { $sort: { _id: -1 } },
    ];

    console.log("Executing aggregation pipeline...");
    const stats = await CashTransfer.aggregate(pipeline);
    console.log("Aggregation result:", JSON.stringify(stats, null, 2));

    if (!stats || stats.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the specified criteria" });
    }

    const currentTranche = tranche
      ? stats.find((stat) => stat._id === parseInt(tranche))
      : stats[0];

    if (!currentTranche) {
      return res.status(404).json({ message: "Tranche not found" });
    }

    // Build response with safe calculations
    const totalDisabled = currentTranche.totalDisabled || 0;
    const totalLearners = currentTranche.totalLearners || 0;
    const totalSchools = currentTranche.totalSchools || 0;
    const publicSchools = currentTranche.publicSchools || 0;
    const totalAmountDisbursed = currentTranche.totalAmountDisbursed || 0;
    const accountedAmount = currentTranche.accountedAmount || 0;

    const response = {
      totalSchools: {
        value: totalSchools,
      },
      totalLearners: {
        value: totalLearners,
        male: currentTranche.maleLearners || 0,
        female: currentTranche.femaleLearners || 0,
      },
      totalAmountDisbursed: {
        value: totalAmountDisbursed,
        currency: "SSP",
      },
      accountabilityRate: {
        value:
          totalAmountDisbursed > 0
            ? Number(
                ((accountedAmount / totalAmountDisbursed) * 100).toFixed(1)
              )
            : 0,
      },
      learnersWithDisabilities: {
        value: totalDisabled,
        percentageOfTotalLearners:
          totalLearners > 0
            ? Number(((totalDisabled / totalLearners) * 100).toFixed(1))
            : 0,
        male: currentTranche.disabledMaleLearners || 0,
        female: currentTranche.disabledFemaleLearners || 0,
      },
      averageAttendance: {
        value: Number((currentTranche.averageAttendance || 0).toFixed(1)),
      },
      publicSchools: {
        value: publicSchools,
        percentageOfTotalSchools:
          totalSchools > 0
            ? Number(((publicSchools / totalSchools) * 100).toFixed(1))
            : 0,
      },
      latestTranche: {
        trancheNumber: currentTranche._id,
        startDate: currentTranche.createdAt,
      },
    };

    console.log("Response:", JSON.stringify(response, null, 2));
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getUniqueCtSchools = async (req, res) => {
  try {
    const { tranche, state, county, payam, year } = req.query;
    const matchConditions = {};

    if (state) {
      matchConditions["location.state10"] = state;
    }
    if (county) {
      matchConditions["location.county28"] = county;
    }
    if (payam) {
      matchConditions["location.payam28"] = payam;
    }
    if (tranche) {
      matchConditions.tranche = parseInt(tranche, 10);
    } else {
      const latestTranche = await CashTransfer.findOne()
        .sort({ tranche: -1 })
        .select("tranche");
      if (latestTranche) {
        matchConditions.tranche = latestTranche.tranche;
      }
    }

    if (year) {
      matchConditions.year = parseInt(year);
    }

    const schools = await CashTransfer.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: "$school.code",
          tranche: { $first: "$tranche" },
          year: { $first: "$year" },
          state10: { $first: "$location.state10" },
          county28: { $first: "$location.county28" },
          payam28: { $first: "$location.payam28" },
          schoolName: { $first: "$school.name" },
          schoolType: { $first: "$school.type" },
          schoolOwnership: { $first: "$school.ownership" },
          schoolCode: { $first: "$school.code" },
          amounts: { $first: "$amounts" },
          learnerCount: { $sum: 1 },
          validatedCount: {
            $sum: {
              $cond: [{ $eq: ["$validation.isValidated", true] }, 1, 0],
            },
          },
          notValidatedCount: {
            $sum: {
              $cond: [{ $ne: ["$validation.isValidated", true] }, 1, 0],
            },
          },
          totalAmountAccounted: {
            $sum: {
              $ifNull: ["$accountability.amountAccounted", 0],
            },
          },
          // Get the first valid date accounted
          firstDateAccounted: {
            $first: {
              $ifNull: ["$accountability.dateAccounted", "Not Accounted"],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          tranche: 1,
          year: 1,
          state10: 1,
          county28: 1,
          payam28: 1,
          school: {
            name: "$schoolName",
            type: "$schoolType",
            ownership: "$schoolOwnership",
            code: "$schoolCode",
          },
          amounts: 1,
          learnerCount: 1,
          validatedCount: 1,
          notValidatedCount: 1,
          accountability: {
            amountAccounted: "$totalAmountAccounted",
            dateAccounted: "$firstDateAccounted",
          },
        },
      },
      { $sort: { "school.name": 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: schools,
    });
  } catch (error) {
    console.error("Error fetching schools:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch schools", error });
  }
};

exports.getLearnerByCode = async (req, res) => {
  try {
    const { code, tranche, year } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "School code is required",
      });
    }

    // Build match conditions
    const matchConditions = {
      "school.code": code,
    };

    if (tranche) {
      matchConditions.tranche = parseInt(tranche);
    } else {
      const latestTranche = await CashTransfer.findOne()
        .sort({ tranche: -1 })
        .select("tranche");
      if (latestTranche) {
        matchConditions.tranche = latestTranche.tranche;
      }
    }

    if (year) {
      matchConditions.year = parseInt(year);
    }

    const pipeline = [
      {
        $match: matchConditions,
      },
      {
        $addFields: {
          disabilityInfo: { $arrayElemAt: ["$learner.disabilities", 0] },
        },
      },
      {
        $addFields: {
          hasDisability: {
            $or: [
              {
                $gt: [
                  {
                    $ifNull: [
                      "$disabilityInfo.disabilities.difficultySeeing",
                      1,
                    ],
                  },
                  1,
                ],
              },
              {
                $gt: [
                  {
                    $ifNull: [
                      "$disabilityInfo.disabilities.difficultyHearing",
                      1,
                    ],
                  },
                  1,
                ],
              },
              {
                $gt: [
                  {
                    $ifNull: [
                      "$disabilityInfo.disabilities.difficultyTalking",
                      1,
                    ],
                  },
                  1,
                ],
              },
              {
                $gt: [
                  {
                    $ifNull: [
                      "$disabilityInfo.disabilities.difficultySelfCare",
                      1,
                    ],
                  },
                  1,
                ],
              },
              {
                $gt: [
                  {
                    $ifNull: [
                      "$disabilityInfo.disabilities.difficultyWalking",
                      1,
                    ],
                  },
                  1,
                ],
              },
              {
                $gt: [
                  {
                    $ifNull: [
                      "$disabilityInfo.disabilities.difficultyRecalling",
                      1,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "ctcriterias",
          let: {
            learnerTranche: "$tranche",
            learnerClass: "$learner.classInfo.class",
            learnerGender: "$learner.gender",
            learnerHasDisability: "$hasDisability",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tranche", "$$learnerTranche"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            {
              $unwind: "$classes",
            },
            {
              $match: {
                $expr: {
                  $eq: ["$classes.className", "$$learnerClass"],
                },
              },
            },
            {
              $addFields: {
                requiresDisabilityForGender: {
                  $cond: [
                    { $eq: ["$$learnerGender", "M"] },
                    "$classes.requiresDisability.male",
                    "$classes.requiresDisability.female",
                  ],
                },
              },
            },
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$requiresDisabilityForGender", false] },
                    {
                      $and: [
                        { $eq: ["$requiresDisabilityForGender", true] },
                        { $eq: ["$$learnerHasDisability", true] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                amount: "$classes.amount",
                currency: 1,
              },
            },
          ],
          as: "criteriaMatch",
        },
      },
      {
        $addFields: {
          calculatedAmount: {
            $cond: [
              { $gt: [{ $size: "$criteriaMatch" }, 0] },
              { $arrayElemAt: ["$criteriaMatch.amount", 0] },
              0,
            ],
          },
          calculatedCurrency: {
            $cond: [
              { $gt: [{ $size: "$criteriaMatch" }, 0] },
              { $arrayElemAt: ["$criteriaMatch.currency", 0] },
              "SSP",
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          tranche: 1,
          state10: "$location.state10",
          county28: "$location.county28",
          payam28: "$location.payam28",
          schoolName: "$school.name",
          schoolType: "$school.type",
          schoolOwnership: "$school.ownership",
          code: "$school.code",
          "learner.name": 1,
          "learner.learnerUniqueID": 1,
          "learner.reference": 1,
          "learner.classInfo": 1,
          "learner.gender": 1,
          "learner.attendance": 1,
          hasDisability: {
            $cond: [{ $eq: ["$hasDisability", true] }, "Yes", "No"],
          },
          amounts: {
            approved: {
              amount: "$calculatedAmount",
              currency: "$calculatedCurrency",
              isDisbursed: {
                $ifNull: ["$amounts.approved.isDisbursed", false],
              },
            },
          },
          accountability: 1,
          approval: 1,
          year: 1,
          validation: 1,
        },
      },
      { $sort: { "learner.name.firstName": 1 } },
    ];

    const learners = await CashTransfer.aggregate(pipeline);

    if (!learners || learners.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No learners found for this school code",
      });
    }

    res.status(200).json({
      success: true,
      count: learners.length,
      data: learners,
    });
  } catch (error) {
    console.error("Error fetching learners:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch learners",
      error: error.message,
    });
  }
};

// Fetches disbursement data grouped by school for a specific year
exports.getDisbursementByYear = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res
        .status(400)
        .json({ success: false, message: "Year is required" });
    }

    const parsedYear = parseInt(year);
    if (isNaN(parsedYear)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid year format" });
    }

    const pipeline = [
      {
        $match: { year: parsedYear },
      },
      {
        $group: {
          _id: "$school.code",
          schoolDetails: { $first: "$school" },
          disbursements: {
            $push: {
              tranche: "$tranche",
              learnerReference: "$learner.reference",
              amounts: "$amounts",
              heldBy: "$heldBy",
              paymentWitnesses: "$paymentWitnesses",
              approval: "$approval",
              accountability: "$accountability",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          schoolCode: "$_id",
          schoolDetails: 1,
          disbursements: 1,
        },
      },
      { $sort: { "schoolDetails.name": 1 } },
    ];

    const results = await CashTransfer.aggregate(pipeline);

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No disbursement data found for the specified year",
      });
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching disbursement data by year:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch disbursement data",
      error: error.message,
    });
  }
};

exports.disburseCash = async (req, res) => {
  try {
    const { learnerId } = req.params;
    const { paymentWitnesses } = req.body;

    // Find the active tranche from CTCriteria
    const activeCriteria = await CTCriteria.findOne({ isActive: true });
    if (!activeCriteria) {
      return res.status(404).json({ error: "No active tranche found" });
    }
    const tranche = activeCriteria.tranche;

    const learner = await SchoolData.findById(learnerId);
    if (!learner) {
      return res.status(404).json({ error: "Learner not found" });
    }

    const currentYear = new Date().getFullYear();

    // Update isDisbursed
    const disbursementIndex = learner.isDisbursed.findIndex(
      (d) => d.year === currentYear
    );

    if (disbursementIndex > -1) {
      learner.isDisbursed[disbursementIndex].disbursed = true;
      if (paymentWitnesses) {
        learner.isDisbursed[disbursementIndex].paymentWitnesses =
          paymentWitnesses;
      }
    } else {
      learner.isDisbursed.push({
        year: currentYear,
        disbursed: true,
        paymentWitnesses: paymentWitnesses || "",
      });
    }

    await learner.save();

    // Find the relevant cash transfer record
    const cashTransfer = await CashTransfer.findOne({
      "learner.learnerUniqueID": learner.learnerUniqueID,
      year: currentYear,
      tranche: tranche,
    });

    if (!cashTransfer) {
      return res.status(404).json({
        error:
          "Cash Transfer record not found for the current year and active tranche",
      });
    }

    // Update disbursement status in CashTransfer collection
    cashTransfer.amounts.approved.isDisbursed = true;

    // update payment witnesses
    if (paymentWitnesses) {
      cashTransfer.paymentWitnesses = paymentWitnesses;
    }

    await cashTransfer.save();

    res.status(200).json("Disbursement successful");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Download CT data in batches filtered by state10 and current year
// Accepts body: { state10: string, lastId?: string, page?: number, limit?: number }
// Returns up to 5000 records per call with minimal projection
exports.downloadCTBatch = async (req, res) => {
  try {
    const { state10, lastId } = req.body || {};
    let { page = 1, limit = 5000 } = req.body || {};

    if (!state10) {
      return res.status(400).json({
        success: false,
        message: "state10 is required in the request body",
      });
    }

    limit = Math.min(parseInt(limit, 10) || 5000, 5000);
    page = parseInt(page, 10) || 1;

    // Always use current year
    const currentYear = new Date().getFullYear();

    const match = {
      "location.state10": state10,
      year: currentYear,
    };

    const projection = {
      _id: 1,
      year: 1,
      "location.state10": 1,
      "location.county28": 1,
      "location.payam28": 1,
      "school.name": 1,
      "learner.classInfo.class": 1,
      "school.code": 1,
      "school.type": 1,
      "learner.dob": 1,
      "learner.gender": 1,
      "learner.name.firstName": 1,
      "learner.name.middleName": 1,
      "learner.name.lastName": 1,
      "learner.learnerUniqueID": 1,
      "learner.reference": 1,
      "validation.isValidated": 1,
      "validation.invalidationReason": 1,
      "validation.finalSerialCtefNumber": 1,
      "amounts.approved.amount": 1,
      "amounts.approved.currency": 1,
      "amounts.approved.isDisbursed": 1,
    };

    const sort = { _id: 1 };
    let query = CashTransfer.find(match)
      .select(projection)
      .sort(sort)
      .limit(limit);

    // Prefer keyset pagination when lastId is provided
    if (lastId) {
      if (!mongoose.Types.ObjectId.isValid(lastId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid lastId" });
      }
      query = CashTransfer.find({
        ...match,
        _id: { $gt: new mongoose.Types.ObjectId(lastId) },
      })
        .select(projection)
        .sort(sort)
        .limit(limit);
    } else if (page && page > 1) {
      const skip = (page - 1) * limit;
      query = CashTransfer.find(match)
        .select(projection)
        .sort(sort)
        .skip(skip)
        .limit(limit);
    }

    const docs = await query.lean();

    const countFetched = docs.length;
    const nextLastId =
      countFetched > 0 ? String(docs[countFetched - 1]._id) : null;

    // Strip _id from the data payload as per requested fields
    const data = docs.map(({ _id, ...rest }) => rest);

    // Determine if there may be more records
    let hasMore = false;
    if (countFetched === limit) {
      // Check existence of at least one more document
      const moreFilter = lastId
        ? { ...match, _id: { $gt: new mongoose.Types.ObjectId(nextLastId) } }
        : { ...match, _id: { $gt: docs[countFetched - 1]._id } };
      hasMore = !!(await CashTransfer.exists(moreFilter));
    }

    // Additional safety: if we're using page-based pagination and got fewer records than limit,
    // we can be confident there are no more records
    if (!lastId && countFetched < limit) {
      hasMore = false;
    }

    return res.status(200).json({
      success: true,
      count: countFetched,
      limit,
      page: lastId ? undefined : page,
      nextLastId,
      hasMore,
      // Include current year for reference
      year: currentYear,
      data,
    });
  } catch (error) {
    console.error("Error downloading CT batch:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

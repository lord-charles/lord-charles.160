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

exports.getStatCardData = async (req, res) => {
  try {
    const { tranche, state, county, payam, year } = req.query;

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
          totalDisabilities: {
            $sum: [
              { $ifNull: ["$disabilityInfo.disabilities.difficultySeeing", 1] },
              {
                $ifNull: ["$disabilityInfo.disabilities.difficultyHearing", 1],
              },
              {
                $ifNull: ["$disabilityInfo.disabilities.difficultyTalking", 1],
              },
              {
                $ifNull: ["$disabilityInfo.disabilities.difficultySelfCare", 1],
              },
              {
                $ifNull: ["$disabilityInfo.disabilities.difficultyWalking", 1],
              },
              {
                $ifNull: [
                  "$disabilityInfo.disabilities.difficultyRecalling",
                  1,
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          hasDisability: {
            $or: [
              { $gt: ["$disabilityInfo.disabilities.difficultySeeing", 1] },
              { $gt: ["$disabilityInfo.disabilities.difficultyHearing", 1] },
              { $gt: ["$disabilityInfo.disabilities.difficultyTalking", 1] },
              { $gt: ["$disabilityInfo.disabilities.difficultySelfCare", 1] },
              { $gt: ["$disabilityInfo.disabilities.difficultyWalking", 1] },
              { $gt: ["$disabilityInfo.disabilities.difficultyRecalling", 1] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$school.code",
          tranche: { $first: "$tranche" },
          createdAt: { $first: "$createdAt" },
          isPublicSchool: {
            $first: { $eq: ["$school.ownership", "Public"] },
          },
          learners: {
            $push: {
              gender: "$learner.gender",
              hasDisability: "$hasDisability",
              attendance: "$learner.attendance",
            },
          },
          totalAmountDisbursed: { $sum: "$amounts.paid.amount" },
          accountedAmount: { $sum: "$accountability.amountAccounted" },
        },
      },
      {
        $group: {
          _id: "$tranche",
          createdAt: { $first: "$createdAt" },
          totalSchools: { $sum: 1 },
          publicSchools: {
            $sum: { $cond: ["$isPublicSchool", 1, 0] },
          },
          learners: { $push: "$learners" },
          totalAmountDisbursed: { $sum: "$totalAmountDisbursed" },
          accountedAmount: { $sum: "$accountedAmount" },
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          totalSchools: 1,
          publicSchools: 1,
          totalAmountDisbursed: 1,
          accountedAmount: 1,
          learnerStats: {
            $reduce: {
              input: {
                $reduce: {
                  input: "$learners",
                  initialValue: [],
                  in: { $concatArrays: ["$$value", "$$this"] },
                },
              },
              initialValue: {
                total: 0,
                male: 0,
                female: 0,
                disabledMale: 0,
                disabledFemale: 0,
                attendance: [],
              },
              in: {
                total: { $add: ["$$value.total", 1] },
                male: {
                  $add: [
                    "$$value.male",
                    { $cond: [{ $eq: ["$$this.gender", "M"] }, 1, 0] },
                  ],
                },
                female: {
                  $add: [
                    "$$value.female",
                    { $cond: [{ $eq: ["$$this.gender", "F"] }, 1, 0] },
                  ],
                },
                disabledMale: {
                  $add: [
                    "$$value.disabledMale",
                    {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$$this.gender", "M"] },
                            "$$this.hasDisability",
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  ],
                },
                disabledFemale: {
                  $add: [
                    "$$value.disabledFemale",
                    {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$$this.gender", "F"] },
                            "$$this.hasDisability",
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  ],
                },
                attendance: {
                  $concatArrays: ["$$value.attendance", ["$$this.attendance"]],
                },
              },
            },
          },
        },
      },
      { $sort: { _id: -1 } },
    ];

    const stats = await CashTransfer.aggregate(pipeline);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const currentTranche = tranche
      ? stats.find((stat) => stat._id === parseInt(tranche))
      : stats[0];

    if (!currentTranche) {
      return res.status(404).json({ message: "Tranche not found" });
    }

    const totalDisabled =
      (currentTranche.learnerStats?.disabledMale || 0) +
      (currentTranche.learnerStats?.disabledFemale || 0);
    const totalLearners = currentTranche.learnerStats?.total || 0;
    const averageAttendance =
      currentTranche.learnerStats?.attendance?.length > 0
        ? currentTranche.learnerStats.attendance.reduce(
            (sum, val) => sum + (val || 0),
            0
          ) / currentTranche.learnerStats.attendance.length
        : 0;

    const response = {
      totalSchools: {
        value: currentTranche.totalSchools || 0,
      },
      totalLearners: {
        value: totalLearners,
        male: currentTranche.learnerStats?.male || 0,
        female: currentTranche.learnerStats?.female || 0,
      },
      totalAmountDisbursed: {
        value: currentTranche.totalAmountDisbursed || 0,
        currency: "SSP",
      },
      accountabilityRate: {
        value: currentTranche.totalAmountDisbursed
          ? Number(
              (
                ((currentTranche.accountedAmount || 0) /
                  currentTranche.totalAmountDisbursed) *
                100
              ).toFixed(1)
            )
          : 0,
      },
      learnersWithDisabilities: {
        value: totalDisabled,
        percentageOfTotalLearners: totalLearners
          ? Number(((totalDisabled / totalLearners) * 100).toFixed(1))
          : 0,
        male: currentTranche.learnerStats?.disabledMale || 0,
        female: currentTranche.learnerStats?.disabledFemale || 0,
      },
      averageAttendance: {
        value: Number(averageAttendance.toFixed(1)),
      },
      publicSchools: {
        value: currentTranche.publicSchools || 0,
        percentageOfTotalSchools: currentTranche.totalSchools
          ? Number(
              (
                ((currentTranche.publicSchools || 0) /
                  currentTranche.totalSchools) *
                100
              ).toFixed(1)
            )
          : 0,
      },
      latestTranche: {
        trancheNumber: currentTranche._id,
        startDate: currentTranche.createdAt,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
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
      matchConditions["location.county10"] = county;
    }
    if (payam) {
      matchConditions["location.payam10"] = payam;
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
          county10: { $first: "$location.county10" },
          payam10: { $first: "$location.payam10" },
          schoolName: { $first: "$school.name" },
          schoolType: { $first: "$school.type" },
          schoolOwnership: { $first: "$school.ownership" },
          schoolCode: { $first: "$school.code" },
          amounts: { $first: "$amounts" },
          learnerCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          tranche: 1,
          year: 1,
          state10: 1,
          county10: 1,
          payam10: 1,
          school: {
            name: "$schoolName",
            type: "$schoolType",
            ownership: "$schoolOwnership",
            code: "$schoolCode",
          },
          amounts: 1,
          learnerCount: 1,
        },
      },
      { $sort: { "school.name": 1 } },
    ]);

    res.status(200).json({
      success: true,
      count: schools.length,
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
    const { code, tranche } = req.query;

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
        $project: {
          _id: 1,
          tranche: 1,
          state10: "$location.state10",
          county28: "$location.county10",
          payam28: "$location.payam10",
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
          amounts: 1,
          accountability: 1,
          approval: 1,
          year: 1,
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

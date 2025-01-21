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

    const matchStage = [];
    const matchConditions = {};

    // Only add location and year filters to the initial match
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

    // Only add the match stage if there are conditions
    if (Object.keys(matchConditions).length > 0) {
      matchStage.push({ $match: matchConditions });
    }

    const pipeline = [
      ...matchStage,
      {
        $addFields: {
          tranche: { $ifNull: ["$tranche", 0] },
        },
      },
      {
        $group: {
          _id: {
            tranche: "$tranche",
            schoolCode: "$school.code",
          },
          schoolName: { $first: "$school.name" },
          schoolCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.tranche",
          schools: {
            $push: {
              code: "$_id.schoolCode",
              name: "$schoolName",
              count: "$schoolCount",
            },
          },
          totalSchools: { $sum: 1 },
          uniqueSchoolCodes: { $addToSet: "$_id.schoolCode" },
        },
      },
      {
        $lookup: {
          from: "cashtransfers",
          let: {
            tranche: { $ifNull: ["$_id", 0] },
            requestedTranche: tranche ? parseInt(tranche) : null,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $ifNull: ["$tranche", 0] }, "$$tranche"] },
                    {
                      $or: [
                        { $eq: ["$$requestedTranche", null] },
                        { $eq: ["$$tranche", "$$requestedTranche"] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalLearners: { $addToSet: "$learner.learnerUniqueID" },
                totalAmountDisbursed: { $sum: "$amounts.paid.amount" },
                accountedAmount: { $sum: "$accountability.amountAccounted" },
                averageAttendance: { $avg: "$learner.attendance" },
                maleLearners: {
                  $sum: { $cond: [{ $eq: ["$learner.gender", "M"] }, 1, 0] },
                },
                femaleLearners: {
                  $sum: { $cond: [{ $eq: ["$learner.gender", "F"] }, 1, 0] },
                },
                disabledMaleLearners: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$learner.gender", "M"] },
                          {
                            $gt: [
                              {
                                $size: {
                                  $ifNull: ["$learner.disabilities", []],
                                },
                              },
                              0,
                            ],
                          },
                        ],
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
                        $and: [
                          { $eq: ["$learner.gender", "F"] },
                          {
                            $gt: [
                              {
                                $size: {
                                  $ifNull: ["$learner.disabilities", []],
                                },
                              },
                              0,
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                learnersWithDisabilities: {
                  $sum: {
                    $cond: [
                      {
                        $gt: [
                          { $size: { $ifNull: ["$learner.disabilities", []] } },
                          0,
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                publicSchools: {
                  $addToSet: {
                    $cond: [
                      { $eq: ["$school.ownership", "Public"] },
                      "$school.code",
                      null,
                    ],
                  },
                },
              },
            },
            {
              $addFields: {
                publicSchools: {
                  $size: {
                    $filter: {
                      input: "$publicSchools",
                      as: "code",
                      cond: { $ne: ["$$code", null] },
                    },
                  },
                },
              },
            },
          ],
          as: "trancheStats",
        },
      },
      {
        $addFields: {
          stats: { $arrayElemAt: ["$trancheStats", 0] },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const allStats = await CashTransfer.aggregate(pipeline);

    if (!allStats || allStats.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const currentTranche = tranche
      ? allStats.find((stat) => stat._id === parseInt(tranche))
      : allStats[allStats.length - 1];

    if (!currentTranche) {
      return res.status(404).json({ message: "Tranche not found" });
    }

    const response = {
      totalSchools: {
        value: currentTranche.totalSchools,
      },
      totalLearners: {
        value: currentTranche.stats.totalLearners.length,
        male: currentTranche.stats.maleLearners,
        female: currentTranche.stats.femaleLearners,
      },
      totalAmountDisbursed: {
        value: currentTranche.stats.totalAmountDisbursed,
        currency: "SSP",
      },
      accountabilityRate: {
        value: Number(
          (
            (currentTranche.stats.accountedAmount /
              currentTranche.stats.totalAmountDisbursed) *
            100
          ).toFixed(1)
        ),
        unit: "%",
      },
      learnersWithDisabilities: {
        value: currentTranche.stats.learnersWithDisabilities,
        percentageOfTotalLearners: Number(
          (
            (currentTranche.stats.learnersWithDisabilities /
              currentTranche.stats.totalLearners.length) *
            100
          ).toFixed(1)
        ),
        male: currentTranche.stats.disabledMaleLearners,
        female: currentTranche.stats.disabledFemaleLearners,
      },
      averageAttendance: {
        value: Number(currentTranche.stats.averageAttendance.toFixed(1)),
        unit: "%",
      },
      publicSchools: {
        value: currentTranche.stats.publicSchools,
        percentageOfTotalSchools: Number(
          (
            (currentTranche.stats.publicSchools / currentTranche.totalSchools) *
            100
          ).toFixed(1)
        ),
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

// exports.getUniqueCtSchools = async (req, res) => {
//   try {
//     const { year, tranche } = req.query;

//     // Determine the tranche to use: either from params or the latest tranche
//     let trancheFilter = tranche ? parseInt(tranche, 10) : null;
//     if (!trancheFilter) {
//       const latestTranche = await CashTransfer.findOne()
//         .sort({ tranche: -1 })
//         .select("tranche");
//       trancheFilter = latestTranche ? latestTranche.tranche : null;
//     }

//     if (!trancheFilter) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No tranche data available." });
//     }

//     // Fetch distinct schools based on their code and project additional fields
//     const schools = await CashTransfer.aggregate([
//       {
//         $match: {
//           tranche: trancheFilter,
//           ...(year ? { year: parseInt(year) } : {}),
//         },
//       },
//       {
//         $group: {
//           _id: "$school.code",
//           tranche: { $first: "$tranche" },
//           year: { $first: "$year" },
//           location: { $first: "$location" },
//           schoolName: { $first: "$school.name" },
//           schoolType: { $first: "$school.type" },
//           schoolOwnership: { $first: "$school.ownership" },
//           schoolCode: { $first: "$school.code" },
//           amounts: { $first: "$amounts" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           tranche: 1,
//           year: 1,
//           location: 1,
//           school: {
//             name: "$schoolName",
//             type: "$schoolType",
//             ownership: "$schoolOwnership",
//             code: "$schoolCode",
//           },
//           amounts: 1,
//         },
//       },
//     ]);

//     res.status(200).json({ success: true, data: schools });
//   } catch (error) {
//     console.error("Error fetching schools:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch schools", error });
//   }
// };
exports.getUniqueCtSchools = async (req, res) => {
  try {
    const { year, tranche } = req.query;

    // Build match conditions dynamically
    const matchConditions = {};

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

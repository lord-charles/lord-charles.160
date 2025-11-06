const Attendance = require("../models/Attendance");
const asyncHandler = require("express-async-handler");

/**
 * Attendance Analytics API
 * GET /express/attendance-analytics
 *
 * Provides comprehensive attendance analytics with dynamic geographic grouping
 */
const getAttendanceAnalytics = asyncHandler(async (req, res) => {
  try {
    const {
      year,
      state10,
      county28,
      payam28,
      code,
      page = 1,
      limit = 100,
    } = req.query;

    // Validate required year parameter
    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required",
      });
    }

    // Build match conditions
    const matchConditions = { year: parseInt(year) };
    if (state10) matchConditions.state10 = state10;
    if (county28) matchConditions.county28 = county28;
    if (payam28) matchConditions.payam28 = payam28;
    if (code) matchConditions.code = code;

    // Determine grouping logic based on filters provided
    let groupBy = {};
    let groupedBy = "";
    let groupKey = "";

    if (code) {
      // Group by school when code is provided
      groupBy = { school: "$school", code: "$code" };
      groupedBy = "school";
      groupKey = "school";
    } else if (payam28) {
      // Group by payam when payam is provided
      groupBy = { payam: "$payam28" };
      groupedBy = "payam28";
      groupKey = "payam";
    } else if (county28) {
      // Group by payam when county is provided
      groupBy = { payam: "$payam28" };
      groupedBy = "payam28";
      groupKey = "payam";
    } else if (state10) {
      // Group by county when state is provided
      groupBy = { county: "$county28" };
      groupedBy = "county28";
      groupKey = "county";
    } else {
      // Group by state when only year is provided
      groupBy = { state: "$state10" };
      groupedBy = "state10";
      groupKey = "state";
    }

    // Build comprehensive aggregation pipeline using $facet
    const pipeline = [
      { $match: matchConditions },
      {
        $facet: {
          // 1. Attendance Rate Report
          attendanceRateReport: [
            {
              $group: {
                _id: groupBy,
                totalRecords: { $sum: 1 },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$absent", true] }, 1, 0] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                [groupKey]: code ? "$_id.school" : `$_id.${groupKey}`,
                ...(code && { code: "$_id.code" }),
                totalRecords: 1,
                absentCount: 1,
                attendanceRate: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $subtract: [
                            1,
                            { $divide: ["$absentCount", "$totalRecords"] },
                          ],
                        },
                        100,
                      ],
                    },
                    2,
                  ],
                },
              },
            },
            { $sort: { attendanceRate: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],

          // 2. Absenteeism Report
          absenteeismReport: [
            {
              $match: { absent: true },
            },
            {
              $group: {
                _id: groupBy,
                absentCount: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                [groupKey]: code ? "$_id.school" : `$_id.${groupKey}`,
                ...(code && { code: "$_id.code" }),
                absentCount: 1,
              },
            },
            { $sort: { absentCount: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],

          // 3. Gender-Based Attendance Report
          genderReport: [
            {
              $group: {
                _id: {
                  ...groupBy,
                  gender: "$gender",
                },
                totalRecords: { $sum: 1 },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$absent", true] }, 1, 0] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                [groupKey]: code ? "$_id.school" : `$_id.${groupKey}`,
                ...(code && { code: "$_id.code" }),
                gender: "$_id.gender",
                totalRecords: 1,
                absentCount: 1,
                attendanceRate: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $subtract: [
                            1,
                            { $divide: ["$absentCount", "$totalRecords"] },
                          ],
                        },
                        100,
                      ],
                    },
                    2,
                  ],
                },
              },
            },
            { $sort: { [groupKey]: 1, gender: 1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],

          // 4. Disability-Based Attendance Report
          disabilityReport: [
            {
              $group: {
                _id: {
                  ...groupBy,
                  isWithDisability: "$isWithDisability",
                },
                totalRecords: { $sum: 1 },
                absentCount: {
                  $sum: { $cond: [{ $eq: ["$absent", true] }, 1, 0] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                [groupKey]: code ? "$_id.school" : `$_id.${groupKey}`,
                ...(code && { code: "$_id.code" }),
                label: {
                  $cond: [
                    { $eq: ["$_id.isWithDisability", true] },
                    "With Disability",
                    "Without Disability",
                  ],
                },
                totalRecords: 1,
                absentCount: 1,
                attendanceRate: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $subtract: [
                            1,
                            { $divide: ["$absentCount", "$totalRecords"] },
                          ],
                        },
                        100,
                      ],
                    },
                    2,
                  ],
                },
              },
            },
            { $sort: { [groupKey]: 1, label: 1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],

          // 5. Summary Statistics (Memory Optimized)
          summaryStats: [
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                totalAbsent: {
                  $sum: { $cond: [{ $eq: ["$absent", true] }, 1, 0] },
                },
                totalPresent: {
                  $sum: { $cond: [{ $eq: ["$absent", false] }, 1, 0] },
                },
                minDate: { $min: "$date" },
                maxDate: { $max: "$date" },
              },
            },
            {
              $project: {
                _id: 0,
                totalRecords: 1,
                totalAbsent: 1,
                totalPresent: 1,
                overallAttendanceRate: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $subtract: [
                            1,
                            { $divide: ["$totalAbsent", "$totalRecords"] },
                          ],
                        },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                minDate: 1,
                maxDate: 1,
              },
            },
          ],

          // 6. Unique Counts (Separate pipeline for memory efficiency)
          uniqueCounts: [
            {
              $group: {
                _id: {
                  student: "$student",
                  school: "$school",
                },
              },
            },
            {
              $group: {
                _id: null,
                uniqueStudents: { $sum: 1 },
                uniqueSchools: { $addToSet: "$_id.school" },
              },
            },
            {
              $project: {
                _id: 0,
                uniqueStudents: 1,
                uniqueSchools: { $size: "$uniqueSchools" },
              },
            },
          ],
        },
      },
    ];

    // Execute the aggregation
    const result = await Attendance.aggregate(pipeline);
    const data = result[0];

    // Format the response with memory-optimized summary
    const summaryStats = data.summaryStats[0] || {
      totalRecords: 0,
      totalAbsent: 0,
      totalPresent: 0,
      overallAttendanceRate: 0,
      minDate: null,
      maxDate: null,
    };

    const uniqueCounts = data.uniqueCounts[0] || {
      uniqueStudents: 0,
      uniqueSchools: 0,
    };

    const response = {
      success: true,
      filtersUsed: {
        year: parseInt(year),
        ...(state10 && { state10 }),
        ...(county28 && { county28 }),
        ...(payam28 && { payam28 }),
        ...(code && { code }),
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
      groupedBy,
      summary: {
        ...summaryStats,
        ...uniqueCounts,
      },
      attendanceRateReport: data.attendanceRateReport || [],
      absenteeismReport: data.absenteeismReport || [],
      genderReport: data.genderReport || [],
      disabilityReport: data.disabilityReport || [],
    };

    res.json(response);
  } catch (error) {
    console.error("Attendance Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance analytics",
      error: error.message,
    });
  }
});

/**
 * Get Attendance Trends Over Time
 * GET /express/attendance-analytics/trends
 */
const getAttendanceTrends = asyncHandler(async (req, res) => {
  try {
    const {
      year,
      state10,
      county28,
      payam28,
      code,
      groupBy = "month",
    } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required",
      });
    }

    const matchConditions = { year: parseInt(year) };
    if (state10) matchConditions.state10 = state10;
    if (county28) matchConditions.county28 = county28;
    if (payam28) matchConditions.payam28 = payam28;
    if (code) matchConditions.code = code;

    // Define grouping based on groupBy parameter
    let dateGrouping = {};
    if (groupBy === "day") {
      dateGrouping = {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" },
      };
    } else if (groupBy === "week") {
      dateGrouping = {
        year: { $year: "$date" },
        week: { $week: "$date" },
      };
    } else {
      // Default to month
      dateGrouping = {
        year: { $year: "$date" },
        month: { $month: "$date" },
      };
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: dateGrouping,
          totalRecords: { $sum: 1 },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$absent", true] }, 1, 0] },
          },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$absent", false] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          period: "$_id",
          totalRecords: 1,
          absentCount: 1,
          presentCount: 1,
          attendanceRate: {
            $round: [
              {
                $multiply: [
                  {
                    $subtract: [
                      1,
                      { $divide: ["$absentCount", "$totalRecords"] },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $sort: {
          "period.year": 1,
          "period.month": 1,
          "period.day": 1,
          "period.week": 1,
        },
      },
    ];

    const trends = await Attendance.aggregate(pipeline);

    res.json({
      success: true,
      filtersUsed: {
        year: parseInt(year),
        ...(state10 && { state10 }),
        ...(county28 && { county28 }),
        ...(payam28 && { payam28 }),
        ...(code && { code }),
      },
      groupBy,
      trends,
    });
  } catch (error) {
    console.error("Attendance Trends Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance trends",
      error: error.message,
    });
  }
});

/**
 * Get Top Absenteeism Reasons
 * GET /express/attendance-analytics/absence-reasons
 */
const getAbsenceReasons = asyncHandler(async (req, res) => {
  try {
    const { year, state10, county28, payam28, code, limit = 10 } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required",
      });
    }

    const matchConditions = {
      year: parseInt(year),
      absent: true,
      absenceReason: { $ne: null, $ne: "" },
    };
    if (state10) matchConditions.state10 = state10;
    if (county28) matchConditions.county28 = county28;
    if (payam28) matchConditions.payam28 = payam28;
    if (code) matchConditions.code = code;

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: {
            reason: "$absenceReason",
            student: "$student",
          },
        },
      },
      {
        $group: {
          _id: "$_id.reason",
          count: { $sum: 1 },
          affectedStudents: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          reason: "$_id",
          count: 1,
          affectedStudents: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ];

    const reasons = await Attendance.aggregate(pipeline);

    res.json({
      success: true,
      filtersUsed: {
        year: parseInt(year),
        ...(state10 && { state10 }),
        ...(county28 && { county28 }),
        ...(payam28 && { payam28 }),
        ...(code && { code }),
      },
      absenceReasons: reasons,
    });
  } catch (error) {
    console.error("Absence Reasons Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching absence reasons",
      error: error.message,
    });
  }
});

module.exports = {
  getAttendanceAnalytics,
  getAttendanceTrends,
  getAbsenceReasons,
};

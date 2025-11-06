const Attendance = require("../models/Attendance");
const asyncHandler = require("express-async-handler");

/**
 * Memory-Optimized Attendance Analytics API
 * Uses streaming and chunked processing for large datasets
 */
const getAttendanceAnalyticsOptimized = asyncHandler(async (req, res) => {
  try {
    const {
      year,
      state10,
      county28,
      payam28,
      code,
      page = 1,
      limit = 50,
      streamMode = false,
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

    // Determine grouping logic
    let groupBy = {};
    let groupedBy = "";
    let groupKey = "";

    if (code) {
      groupBy = { school: "$school", code: "$code" };
      groupedBy = "school";
      groupKey = "school";
    } else if (payam28) {
      groupBy = { payam: "$payam28" };
      groupedBy = "payam28";
      groupKey = "payam";
    } else if (county28) {
      groupBy = { payam: "$payam28" };
      groupedBy = "payam28";
      groupKey = "payam";
    } else if (state10) {
      groupBy = { county: "$county28" };
      groupedBy = "county28";
      groupKey = "county";
    } else {
      groupBy = { state: "$state10" };
      groupedBy = "state10";
      groupKey = "state";
    }

    // For streaming mode, use cursor-based processing
    if (streamMode === "true") {
      return await streamAttendanceAnalytics(
        req,
        res,
        matchConditions,
        groupBy,
        groupKey
      );
    }

    // Memory-optimized pipeline with allowDiskUse
    const pipeline = [
      { $match: matchConditions },
      {
        $facet: {
          // 1. Attendance Rate Report (Limited)
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

          // 2. Summary Statistics (Memory Optimized)
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
        },
      },
    ];

    // Execute with allowDiskUse for large datasets
    const result = await Attendance.aggregate(pipeline, {
      allowDiskUse: true,
      maxTimeMS: 30000, // 30 second timeout
    });

    const data = result[0];

    // Get unique counts separately to avoid memory issues
    const uniqueCountsPipeline = [
      { $match: matchConditions },
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
    ];

    const uniqueCountsResult = await Attendance.aggregate(
      uniqueCountsPipeline,
      {
        allowDiskUse: true,
      }
    );
    const uniqueCounts = uniqueCountsResult[0] || {
      uniqueStudents: 0,
      uniqueSchools: 0,
    };

    // Format response
    const summaryStats = data.summaryStats[0] || {
      totalRecords: 0,
      totalAbsent: 0,
      totalPresent: 0,
      overallAttendanceRate: 0,
      minDate: null,
      maxDate: null,
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
        hasMore: data.attendanceRateReport.length === parseInt(limit),
      },
      groupedBy,
      summary: {
        ...summaryStats,
        ...uniqueCounts,
      },
      attendanceRateReport: data.attendanceRateReport || [],
      optimizations: {
        memoryOptimized: true,
        diskUseEnabled: true,
        streamingAvailable: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Attendance Analytics Error:", error);

    // Handle specific MongoDB errors
    if (error.code === 16389) {
      // Aggregation memory limit exceeded
      return res.status(413).json({
        success: false,
        message:
          "Dataset too large for current query. Please use more specific filters or enable streaming mode.",
        error: "Memory limit exceeded",
        suggestions: [
          "Add more specific filters (state, county, payam, or school code)",
          "Reduce the date range",
          "Use streaming mode by adding ?streamMode=true",
          "Reduce the limit parameter",
        ],
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching attendance analytics",
      error: error.message,
    });
  }
});

/**
 * Streaming version for very large datasets
 */
async function streamAttendanceAnalytics(
  req,
  res,
  matchConditions,
  groupBy,
  groupKey
) {
  try {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write('{"success": true, "streaming": true, "data": [');

    let isFirst = true;
    const cursor = Attendance.aggregate(
      [
        { $match: matchConditions },
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
            [groupKey]: `$_id.${groupKey}`,
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
      ],
      { allowDiskUse: true, cursor: { batchSize: 100 } }
    );

    for await (const doc of cursor) {
      if (!isFirst) {
        res.write(",");
      }
      res.write(JSON.stringify(doc));
      isFirst = false;
    }

    res.write("]}");
    res.end();
  } catch (error) {
    res.write(`,"error": "${error.message}"}`);
    res.end();
  }
}

/**
 * Get attendance summary with minimal memory usage
 */
const getAttendanceSummary = asyncHandler(async (req, res) => {
  try {
    const { year, state10, county28, payam28, code } = req.query;

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

    // Simple aggregation for summary only
    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalAbsent: { $sum: { $cond: [{ $eq: ["$absent", true] }, 1, 0] } },
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
    ];

    const result = await Attendance.aggregate(pipeline);
    const summary = result[0] || {
      totalRecords: 0,
      totalAbsent: 0,
      totalPresent: 0,
      overallAttendanceRate: 0,
      minDate: null,
      maxDate: null,
    };

    res.json({
      success: true,
      filtersUsed: matchConditions,
      summary,
    });
  } catch (error) {
    console.error("Attendance Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance summary",
      error: error.message,
    });
  }
});

module.exports = {
  getAttendanceAnalyticsOptimized,
  getAttendanceSummary,
};

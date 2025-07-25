const schoolData = require("../models/school-data");
const Attendance = require("../models/Attendance");
const SchoolData = require("../models/2023Data");

const markAttendanceBulk = async (req, res) => {
  try {
    const { studentIds, date, absenceReason, classId, code } = req.body;

    if (!Array.isArray(studentIds) || !date || !classId || !code) {
      return res.status(400).json({
        error:
          "Invalid request format. Ensure studentIds array, date, classId, and code are provided.",
      });
    }

    // Convert studentIds to ObjectId set for efficient lookup
    const absentStudentIds = new Set(studentIds);

    // Get all students in the class with all required fields
    const allStudents = await SchoolData.find(
      {
        class: classId,
        code: code,
        isDroppedOut: false,
      },
      "_id gender isWithDisability county28 payam28 state10 school class code education firstName middleName lastName learnerUniqueID reference"
    );

    if (!allStudents.length) {
      return res.status(404).json({
        error: "No students found in this class",
      });
    }

    // Convert date to start and end of day for comparison
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Prepare bulk write operations using updateOne with upsert
    const operations = allStudents.map((student) => {
      const isInCurrentAbsentList = absentStudentIds.has(
        student._id.toString()
      );
      return {
        updateOne: {
          filter: {
            student: student._id,
            date: {
              $gte: attendanceDate,
              $lt: nextDay,
            },
          },
          update: {
            ...(isInCurrentAbsentList && {
              $set: {
                absent: true,
                absenceReason: absenceReason || "",
              },
            }),
            $setOnInsert: {
              student: student._id,
              date: attendanceDate,
              year: attendanceDate.getFullYear(),
              county28: student.county28,
              payam28: student.payam28,
              state10: student.state10,
              school: student.school,
              code: student.code,
              education: student.education,
              gender: student.gender,
              firstName: student.firstName,
              middleName: student.middleName,
              lastName: student.lastName,
              learnerUniqueID: student.learnerUniqueID,
              reference: student.reference,
              isWithDisability: student.isWithDisability,
              class: student.class,
              ...(isInCurrentAbsentList
                ? {}
                : { absent: false, absenceReason: "" }),
            },
          },
          upsert: true,
        },
      };
    });

    // Execute bulk write
    const result = await Attendance.bulkWrite(operations);

    res.status(200).json({
      message: "Attendance marked successfully",
      stats: {
        total: result.upsertedCount + result.modifiedCount,
        new: result.upsertedCount,
        existing: result.matchedCount,
        present: allStudents.length - studentIds.length,
        absent: studentIds.length,
      },
    });
  } catch (error) {
    console.error("Error marking attendance:", error.message);
    res.status(500).json({
      error: "Failed to mark attendance. Please try again later.",
      details: error.message,
    });
  }
};

const getStudentsAttendance = async (req, res) => {
  try {
    const { schoolName, code, Class, isDroppedOut, attendanceDate } = req.body;

    // Validate isDroppedOut field if provided
    if (isDroppedOut !== undefined && typeof isDroppedOut !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "isDroppedOut must be a boolean" });
    }

    // Construct query
    const query = {};
    if (code) {
      query.code = code;
    }
    if (schoolName) {
      query.school = schoolName;
    }
    if (isDroppedOut !== undefined) {
      query.isDroppedOut = isDroppedOut;
    }

    if (Class) {
      query.class = Class;
    }

    // Find matching documents in SchoolData
    const students = await SchoolData.find(query).exec();

    if (!students.length) {
      return res
        .status(404)
        .json({ success: false, error: "No students found" });
    }

    // Convert attendanceDate to start and end of the day
    const startDate = new Date(attendanceDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(attendanceDate);
    endDate.setHours(23, 59, 59, 999);

    // Populate attendance for each student for the specified date
    const populatedStudents = await Promise.all(
      students.map(async (student) => {
        try {
          // Check if attendance for the date already exists for the student
          let attendance = await Attendance.findOne({
            student: student._id,
            date: { $gte: startDate, $lte: endDate },
          })
            .select("date absenceReason absent")
            .exec();

          // Return the student with attendance information
          return {
            ...student.toObject(),
            attendance,
          };
        } catch (error) {
          console.error(`Error processing student ${student._id}:`, error);
          throw error;
        }
      })
    );

    // Return result
    res.status(200).json(populatedStudents);
  } catch (error) {
    console.error("Error fetching students in school:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const markPresentAttendanceForDay = async (req, res) => {
  try {
    const { date, studentIds } = req.body;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, error: "Date is required" });
    }
    if (!Array.isArray(studentIds) || !studentIds.length) {
      return res
        .status(400)
        .json({ success: false, error: "Student IDs are required" });
    }

    // Normalize date range for the day
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Fetch student info for all studentIds
    const students = await SchoolData.find(
      { _id: { $in: studentIds } },
      "_id gender isWithDisability county28 payam28 state10 school class code education firstName middleName lastName learnerUniqueID reference"
    );

    if (!students.length) {
      return res
        .status(404)
        .json({
          success: false,
          error: "No students found for the provided IDs",
        });
    }

    // Prepare bulkWrite operations for upsert
    const operations = students.map((student) => ({
      updateOne: {
        filter: {
          student: student._id,
          date: {
            $gte: attendanceDate,
            $lt: nextDay,
          },
        },
        update: {
          $set: {
            absent: false,
            absenceReason: "",
          },
          $setOnInsert: {
            student: student._id,
            date: attendanceDate,
            year: attendanceDate.getFullYear(),
            county28: student.county28,
            payam28: student.payam28,
            state10: student.state10,
            school: student.school,
            code: student.code,
            education: student.education,
            gender: student.gender,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            learnerUniqueID: student.learnerUniqueID,
            reference: student.reference,
            isWithDisability: student.isWithDisability,
            class: student.class,
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);

    res.status(200).json({
      success: true,
      message: `Attendance marked present for ${students.length} students`,
      stats: {
        total: result.upsertedCount + result.modifiedCount,
        new: result.upsertedCount,
        updated: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error marking present attendance records:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getLearnersWithAbsenceStatus = async (req, res) => {
  try {
    const { code, Class, attendanceDate } = req.body;
    if (!code || !attendanceDate) {
      return res.status(400).json({
        success: false,
        error: "School code and attendanceDate are required",
      });
    }

    // Query for non-dropped learners
    const query = { code, isDroppedOut: false };
    if (Class) query.class = Class;

    // Only select the required fields
    const selectFields =
      "education gender firstName middleName lastName isWithDisability learnerUniqueID reference";

    const learners = await SchoolData.find(query).select(selectFields).exec();
    if (!learners.length) {
      return res
        .status(404)
        .json({ success: false, error: "No learners found" });
    }

    // Prepare date range for the day
    const startDate = new Date(attendanceDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(attendanceDate);
    endDate.setHours(23, 59, 59, 999);

    // For each learner, check if they have an attendance record for that day
    const results = await Promise.all(
      learners.map(async (learner) => {
        const absentRecord = await Attendance.findOne({
          student: learner._id,
          date: { $gte: startDate, $lte: endDate },
        }).exec();
        const learnerObj = learner.toObject();
        return {
          ...learnerObj,
          isWithDisability: learnerObj.isWithDisability ? "yes" : "no",
          absent: absentRecord ? "yes" : "no",
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching learners with absence status:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getAttendanceStatistics = async (req, res) => {
  try {
    const { year, state10, county28, payam28 } = req.body;
    if (!year) {
      return res
        .status(400)
        .json({ success: false, error: "Year is required" });
    }

    // Build match conditions
    const studentMatch = { isDroppedOut: false };
    if (typeof year === "number" || typeof year === "string")
      studentMatch.year = Number(year);
    if (state10) studentMatch.state10 = state10;
    if (county28) studentMatch.county28 = county28;
    if (payam28) studentMatch.payam28 = payam28;

    // Get student statistics using aggregation
    const [studentStats] = await SchoolData.aggregate([
      { $match: studentMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          male: { $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] } },
          female: { $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] } },
          withDisability: { $sum: { $cond: ["$isWithDisability", 1, 0] } },
          maleWithDisability: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$gender", "M"] }, "$isWithDisability"] },
                1,
                0,
              ],
            },
          },
          femaleWithDisability: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$gender", "F"] }, "$isWithDisability"] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!studentStats) {
      return res
        .status(404)
        .json({
          success: false,
          error: "No learners found for the specified filters.",
        });
    }

    // Get absence statistics using aggregation with the same filters
    const attendanceMatch = { year: Number(year) };
    if (state10) attendanceMatch.state10 = state10;
    if (county28) attendanceMatch.county28 = county28;
    if (payam28) attendanceMatch.payam28 = payam28;

    const [absenceStats] = (await Attendance.aggregate([
      { $match: attendanceMatch },
      {
        $group: {
          _id: null,
          absent: { $sum: 1 },
          absentMale: { $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] } },
          absentFemale: { $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] } },
          absentWithDisability: {
            $sum: { $cond: ["$isWithDisability", 1, 0] },
          },
        },
      },
    ])) || {
      absent: 0,
      absentMale: 0,
      absentFemale: 0,
      absentWithDisability: 0,
    };

    // Calculate present statistics
    const present = studentStats.total - absenceStats.absent;
    const presentMale = studentStats.male - absenceStats.absentMale;
    const presentFemale = studentStats.female - absenceStats.absentFemale;
    const presentWithDisability =
      studentStats.withDisability - absenceStats.absentWithDisability;

    res.json({
      total: studentStats.total,
      male: studentStats.male,
      female: studentStats.female,
      withDisability: studentStats.withDisability,
      maleWithDisability: studentStats.maleWithDisability,
      femaleWithDisability: studentStats.femaleWithDisability,
      absent: absenceStats.absent,
      absentMale: absenceStats.absentMale,
      absentFemale: absenceStats.absentFemale,
      absentWithDisability: absenceStats.absentWithDisability,
      present,
      presentMale,
      presentFemale,
      presentWithDisability,
    });
  } catch (error) {
    console.error("Error in getAttendanceStatistics:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getAttendanceStatCards = async (req, res) => {
  try {
    const { state, county, payam, code, year } = req.query;

    const currentDate = new Date();
    const startOfYear = new Date(parseInt(year), 0, 1);
    const endOfYear = new Date(parseInt(year), 11, 31);
    const startOfToday = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );

    let params = {};
    if (state) params.state10 = state;
    if (county) params.county28 = county;
    if (payam) params.payam28 = payam;
    if (code) params.code = code;

    const [
      yearToDateStats,
      todayStats,
      averageDailyStats,
      demographicStats,
      regionalStats,
      engagementStats,
      uniqueStudentsCount,
      dailyAttendanceRates,
    ] = await Promise.all([
      // 1. Year to Date Summary (Entries and Date Range)
      Attendance.aggregate([
        { $match: { date: { $gte: startOfYear, $lte: endOfYear }, ...params } },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            minDate: { $min: "$date" },
            maxDate: { $max: "$date" },
          },
        },
      ]),

      // 2. Today's Snapshot
      Attendance.aggregate([
        { $match: { date: { $gte: startOfToday }, ...params } },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            totalAbsent: { $sum: { $cond: ["$absent", 1, 0] } },
          },
        },
      ]),

      // 3. Average Daily Attendance Rate (YTD)
      Attendance.aggregate([
        { $match: { date: { $gte: startOfYear, $lte: endOfYear }, ...params } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            totalStudents: { $sum: 1 },
            absentStudents: { $sum: { $cond: ["$absent", 1, 0] } },
          },
        },
        {
          $project: {
            attendanceRate: {
              $cond: [
                { $eq: ["$totalStudents", 0] },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$totalStudents", "$absentStudents"] },
                        "$totalStudents",
                      ],
                    },
                    100,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: { _id: null, avgAttendanceRate: { $avg: "$attendanceRate" } },
        },
      ]),

      // 4. Demographic Breakdown
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: startOfYear, $lte: endOfYear },
            absent: true,
            ...params,
          },
        },
        {
          $group: {
            _id: null,
            totalAbsent: { $sum: 1 },
            maleAbsent: { $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] } },
            femaleAbsent: {
              $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] },
            },
            disabilityAbsent: { $sum: { $cond: ["$isWithDisability", 1, 0] } },
          },
        },
      ]),

      // 5. Regional Distribution
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: startOfYear, $lte: endOfYear },
            absent: true,
            ...params,
          },
        },
        {
          $facet: {
            topCounties: [
              { $group: { _id: "$county28", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 3 },
              { $project: { name: "$_id", count: 1, _id: 0 } },
            ],
            topStates: [
              { $group: { _id: "$state10", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 3 },
              { $project: { name: "$_id", count: 1, _id: 0 } },
            ],
            totalAbsent: [{ $count: "count" }],
          },
        },
        { $unwind: "$totalAbsent" },
        {
          $project: {
            topCounties: 1,
            topStates: 1,
            totalAbsent: "$totalAbsent.count",
          },
        },
      ]),

      // 6. Engagement Metrics
      Attendance.aggregate([
        { $match: { date: { $gte: startOfToday }, ...params } },
        { $group: { _id: "$school", studentsCount: { $sum: 1 } } },
        {
          $group: {
            _id: null,
            schoolsReporting: { $sum: 1 },
            totalStudents: { $sum: "$studentsCount" },
          },
        },
      ]),

      // 7. Count Unique Students (YTD)
      Attendance.aggregate([
        { $match: { date: { $gte: startOfYear, $lte: endOfYear }, ...params } },
        { $group: { _id: "$student" } },
        { $count: "uniqueCount" },
      ]),

      // 8. Peak and Lowest Attendance Days
      Attendance.aggregate([
        { $match: { date: { $gte: startOfYear, $lte: endOfYear }, ...params } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            totalStudents: { $sum: 1 },
            absentStudents: { $sum: { $cond: ["$absent", 1, 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            rate: {
              $cond: [
                { $eq: ["$totalStudents", 0] },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$totalStudents", "$absentStudents"] },
                        "$totalStudents",
                      ],
                    },
                    100,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { rate: -1 } },
        {
          $facet: {
            peakDay: [{ $limit: 1 }],
            lowestDay: [{ $sort: { rate: 1 } }, { $limit: 1 }],
          },
        },
      ]),
    ]);

    const peakDayData = dailyAttendanceRates[0]?.peakDay[0] || {
      date: null,
      rate: 0,
    };
    const lowestDayData = dailyAttendanceRates[0]?.lowestDay[0] || {
      date: null,
      rate: 0,
    };
    const regionalData = regionalStats[0] || {
      topCounties: [],
      topStates: [],
      totalAbsent: 0,
    };

    const response = {
      yearToDate: {
        totalEntries: yearToDateStats[0]?.totalEntries || 0,
        totalStudents: uniqueStudentsCount[0]?.uniqueCount || 0,
        dateRange: {
          start: yearToDateStats[0]?.minDate,
          end: yearToDateStats[0]?.maxDate,
        },
      },
      todaySnapshot: {
        recordsLogged: todayStats[0]?.totalRecords || 0,
        absent: todayStats[0]?.totalAbsent || 0,
        present:
          (todayStats[0]?.totalRecords || 0) -
          (todayStats[0]?.totalAbsent || 0),
        absenteeRate: todayStats[0]?.totalRecords
          ? (
              (todayStats[0].totalAbsent / todayStats[0].totalRecords) *
              100
            ).toFixed(1)
          : 0,
      },
      averageAttendance: {
        overallRate: averageDailyStats[0]?.avgAttendanceRate?.toFixed(1) || 0,
        peakDay: { date: peakDayData.date, rate: peakDayData.rate.toFixed(1) },
        lowestDay: {
          date: lowestDayData.date,
          rate: lowestDayData.rate.toFixed(1),
        },
      },
      demographics: {
        male: {
          percentage: demographicStats[0]?.totalAbsent
            ? (
                (demographicStats[0].maleAbsent /
                  demographicStats[0].totalAbsent) *
                100
              ).toFixed(1)
            : 0,
          count: demographicStats[0]?.maleAbsent || 0,
        },
        female: {
          percentage: demographicStats[0]?.totalAbsent
            ? (
                (demographicStats[0].femaleAbsent /
                  demographicStats[0].totalAbsent) *
                100
              ).toFixed(1)
            : 0,
          count: demographicStats[0]?.femaleAbsent || 0,
        },
        disability: {
          percentage: demographicStats[0]?.totalAbsent
            ? (
                (demographicStats[0].disabilityAbsent /
                  demographicStats[0].totalAbsent) *
                100
              ).toFixed(1)
            : 0,
          count: demographicStats[0]?.disabilityAbsent || 0,
        },
      },
      regionalDistribution: {
        topCounties: regionalData.topCounties.map((county) => ({
          name: county.name,
          percentage: regionalData.totalAbsent
            ? ((county.count / regionalData.totalAbsent) * 100).toFixed(1)
            : 0,
          count: county.count,
        })),
        topStates: regionalData.topStates.map((state) => ({
          name: state.name,
          percentage: regionalData.totalAbsent
            ? ((state.count / regionalData.totalAbsent) * 100).toFixed(1)
            : 0,
          count: state.count,
        })),
      },
      engagement: {
        schoolsReporting: engagementStats[0]?.schoolsReporting || 0,
        averageAttendancePerSchool: engagementStats[0]?.schoolsReporting
          ? Math.round(
              engagementStats[0].totalStudents /
                engagementStats[0].schoolsReporting
            )
          : 0,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching attendance statistics:", error);
    res.status(500).json({
      error: "Failed to fetch attendance statistics",
      details: error.message,
    });
  }
};

// Get unique schools with attendance for a given date or date range
const getSchoolsWithAttendance = async (req, res) => {
  try {
    let { date, from, to } = req.body;
    let startDate, endDate;
    if (from && to) {
      // Date range
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Single day (either date provided or default to today)
      if (!date) {
        const now = new Date();
        date = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      }
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    }

    const results = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      // First group: by school fields and day (YYYY-MM-DD)
      {
        $group: {
          _id: {
            county28: "$county28",
            payam28: "$payam28",
            state10: "$state10",
            school: "$school",
            code: "$code",
            education: "$education",
            day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          },
          date: { $first: "$date" },
          numWithDisability: { $sum: { $cond: ["$isWithDisability", 1, 0] } },
          absent: { $sum: { $cond: ["$absent", 1, 0] } },
          present: { $sum: { $cond: [{ $not: ["$absent"] }, 1, 0] } },
        },
      },
      // Second group: by school fields only, count unique days
      {
        $group: {
          _id: {
            county28: "$_id.county28",
            payam28: "$_id.payam28",
            state10: "$_id.state10",
            school: "$_id.school",
            code: "$_id.code",
            education: "$_id.education",
          },
          reportCount: { $sum: 1 },
          numWithDisability: { $sum: "$numWithDisability" },
          absent: { $sum: "$absent" },
          present: { $sum: "$present" },
          lastDate: { $max: "$date" },
        },
      },
      {
        $project: {
          _id: 0,
          county28: "$_id.county28",
          payam28: "$_id.payam28",
          state10: "$_id.state10",
          school: "$_id.school",
          code: "$_id.code",
          education: "$_id.education",
          reportCount: 1,
          numWithDisability: 1,
          absent: 1,
          present: 1,
          lastDate: 1,
        },
      },
    ]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching schools with attendance:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch schools with attendance",
        details: error.message,
      });
  }
};

// Get all schools with optional filtering and attendance count for current year if no date range is provided
const getAllSchools = async (req, res) => {
  try {
    const { schoolType, state10, county10, payam10, date, from, to } =
      req.query;
    const filter = {};
    if (schoolType) filter.schoolType = schoolType;
    if (state10) filter.state10 = state10;
    if (county10) filter.county10 = county10;
    if (payam10) filter.payam10 = payam10;

    const projection = {
      code: 1,
      schoolName: 1,
      schoolType: 1,
      state10: 1,
      county28: 1,
      payam28: 1,
      schoolOwnerShip: 1,
      emisId: 1,
    };

    // Fetch schools
    const schools = await schoolData.find(filter, projection);

    // If no date or date range, get attendance counts for current year (number of unique days a school reported attendance)
    if (!date && !from && !to) {
      const currentYear = new Date().getFullYear();
      // Aggregate: count unique days with at least one attendance record per school code for current year
      const attendanceCounts = await Attendance.aggregate([
        {
          $match: {
            year: currentYear,
          },
        },
        {
          $group: {
            _id: {
              code: "$code",
              day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            },
          },
        },
        {
          $group: {
            _id: "$_id.code",
            attendanceDays: { $sum: 1 },
          },
        },
      ]);
      // Map code to attendanceDays
      const attendanceMap = {};
      attendanceCounts.forEach((item) => {
        attendanceMap[item._id] = item.attendanceDays;
      });
      // Attach attendanceDays to each school
      const schoolsWithAttendance = schools.map((school) => ({
        ...school.toObject(),
        attendanceDays: attendanceMap[school.code] || 0,
      }));
      return res
        .status(200)
        .json({
          message: "Schools retrieved successfully",
          data: schoolsWithAttendance,
        });
    }
    // If date or date range provided, optionally return attendanceDays for that period
    if (date || (from && to)) {
      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      }
      const attendanceCounts = await Attendance.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              code: "$code",
              day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            },
          },
        },
        {
          $group: {
            _id: "$_id.code",
            attendanceDays: { $sum: 1 },
          },
        },
      ]);
      const attendanceMap = {};
      attendanceCounts.forEach((item) => {
        attendanceMap[item._id] = item.attendanceDays;
      });
      const schoolsWithAttendance = schools.map((school) => ({
        ...school.toObject(),
        attendanceDays: attendanceMap[school.code] || 0,
      }));
      return res
        .status(200)
        .json({
          message: "Schools retrieved successfully",
          data: schoolsWithAttendance,
        });
    }
    // Default fallback (should not happen)
    res
      .status(200)
      .json({ message: "Schools retrieved successfully", data: schools });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving schools", error: error.message });
  }
};

module.exports = {
  markAttendanceBulk,
  getStudentsAttendance,
  markPresentAttendanceForDay,
  getLearnersWithAbsenceStatus,
  getAttendanceStatistics,
  getAttendanceStatCards,
  getAllSchools,
  getSchoolsWithAttendance,
};

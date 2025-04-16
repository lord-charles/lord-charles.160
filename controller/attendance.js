const SchoolData = require("../models/2023Data");
const Attendance = require("../models/Attendance");

const markAttendanceBulk = async (req, res) => {
  try {
    const { studentIds, date, absenceReason, classId, code } = req.body;

    if (!Array.isArray(studentIds) || !date || !classId || !code) {
      return res.status(400).json({
        error: "Invalid request format. Ensure studentIds array, date, classId, and code are provided.",
      });
    }

    // Convert studentIds to ObjectId set for efficient lookup
    const absentStudentIds = new Set(studentIds);

    // Get all students in the class with all required fields
    const allStudents = await SchoolData.find(
      { 
        class: classId,
        code: code,
        isDroppedOut: false 
      },
      '_id gender isWithDisability county28 payam28 state10 school class code education firstName middleName lastName learnerUniqueID reference'
    );

    if (!allStudents.length) {
      return res.status(404).json({
        error: "No students found in this class"
      });
    }

    // Prepare bulk write operations for both absent and present students
    const operations = allStudents.map(student => ({
      insertOne: {
        document: {
          student: student._id,
          date: new Date(date),
          year: new Date(date).getFullYear(),
          absent: absentStudentIds.has(student._id.toString()),
          absenceReason: absentStudentIds.has(student._id.toString()) ? (absenceReason || "") : "",
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
          class: student.class
        }
      }
    }));

    // Execute bulk write
    const result = await Attendance.bulkWrite(operations);

    res.status(200).json({ 
      message: "Attendance marked successfully",
      stats: {
        total: result.insertedCount,
        present: allStudents.length - studentIds.length,
        absent: studentIds.length
      }
    });

  } catch (error) {
    console.error("Error marking attendance:", error.message);
    res.status(500).json({ 
      error: "Failed to mark attendance. Please try again later.",
      details: error.message 
    });
  }
};

const getStudentsAttendance = async (req, res) => {
  try {
    const { schoolName,code, Class, isDroppedOut, attendanceDate } = req.body;


    // Validate isDroppedOut field if provided
    if (isDroppedOut !== undefined && typeof isDroppedOut !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "isDroppedOut must be a boolean" });
    }

    // Construct query
    const query = {absent: true};
    if(code){
      query.code = code;
    }
    if(schoolName){
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
            .select("date absenceReason")
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

const deleteAttendanceForDay = async (req, res) => {
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

    // Convert date to the beginning of the specified day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    // Convert date to the end of the specified day
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Delete attendance records for the specified date and students
    const result = await Attendance.deleteMany({
      student: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    });

    // Return the result
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} attendance records deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting attendance records:", error);
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
      return res.status(404).json({ success: false, error: "No learners found" });
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
      return res.status(400).json({ success: false, error: "Year is required" });
    }

    // Build match conditions
    const studentMatch = { isDroppedOut: false };
    if (typeof year === 'number' || typeof year === 'string') studentMatch.year = Number(year);
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
                0
              ]
            }
          },
          femaleWithDisability: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$gender", "F"] }, "$isWithDisability"] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    if (!studentStats) {
      return res.status(404).json({ success: false, error: "No learners found for the specified filters." });
    }

    // Get absence statistics using aggregation with the same filters
    const attendanceMatch = { year: Number(year) };
    if (state10) attendanceMatch.state10 = state10;
    if (county28) attendanceMatch.county28 = county28;
    if (payam28) attendanceMatch.payam28 = payam28;

    const [absenceStats] = await Attendance.aggregate([
      { $match: attendanceMatch },
      {
        $group: {
          _id: null,
          absent: { $sum: 1 },
          absentMale: { $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] } },
          absentFemale: { $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] } },
          absentWithDisability: { $sum: { $cond: ["$isWithDisability", 1, 0] } }
        }
      }
    ]) || { absent: 0, absentMale: 0, absentFemale: 0, absentWithDisability: 0 };

    // Calculate present statistics
    const present = studentStats.total - absenceStats.absent;
    const presentMale = studentStats.male - absenceStats.absentMale;
    const presentFemale = studentStats.female - absenceStats.absentFemale;
    const presentWithDisability = studentStats.withDisability - absenceStats.absentWithDisability;

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
      presentWithDisability
    });
  } catch (error) {
    console.error('Error in getAttendanceStatistics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  markAttendanceBulk,
  getStudentsAttendance,
  deleteAttendanceForDay,
  getLearnersWithAbsenceStatus,
  getAttendanceStatistics,
};

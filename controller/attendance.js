const SchoolData = require("../models/2023Data");
const Attendance = require("../models/Attendance");

const markAttendanceBulk = async (req, res) => {
  try {
    const { studentIds, date, absenceReason } = req.body;

    if (!Array.isArray(studentIds) || !studentIds.length || !date) {
      return res.status(400).json({
        error:
          "Invalid request format. Ensure studentIds is a non-empty array and date is provided.",
      });
    }

    const attendanceRecords = await Promise.all(
      studentIds.map(async (studentId) => {
        try {
          const attendance = await Attendance.create({
            student: studentId,
            date: new Date(date),
            absenceReason: absenceReason || "",
          });
          return attendance;
        } catch (error) {
          console.error(
            `Error creating attendance for student ${studentId}:`,
            error.message
          );
          throw error;
        }
      })
    );

    res
      .status(200)
      .json({ message: "Attendance marked successfully", attendanceRecords });
  } catch (error) {
    console.error("Error marking attendance:", error.message); // Log specific error message
    res
      .status(500)
      .json({ error: "Failed to mark attendance. Please try again later." });
  }
};

const getStudentsAttendance = async (req, res) => {
  try {
    const { schoolName, Class, isDroppedOut, attendanceDate } = req.body;

    // Validate required fields
    if (!schoolName) {
      return res
        .status(400)
        .json({ success: false, error: "School name is required" });
    }

    // Validate isDroppedOut field if provided
    if (isDroppedOut !== undefined && typeof isDroppedOut !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "isDroppedOut must be a boolean" });
    }

    // Construct query
    const query = { school: schoolName };
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
    const { date } = req.body;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, error: "Date is required" });
    }

    // Convert date to the beginning of the specified day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    // Convert date to the end of the specified day
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Delete attendance records for the specified date
    const result = await Attendance.deleteMany({
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

module.exports = {
  markAttendanceBulk,
  getStudentsAttendance,
  deleteAttendanceForDay,
};

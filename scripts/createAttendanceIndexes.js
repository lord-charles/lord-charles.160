const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");

/**
 * Create optimized indexes for attendance analytics
 * Run this script to improve query performance and reduce memory usage
 */
async function createAttendanceIndexes() {
  try {
    console.log("Creating attendance analytics indexes...");

    // Compound index for common filter combinations
    await Attendance.collection.createIndex(
      {
        year: 1,
        state10: 1,
        county28: 1,
        payam28: 1,
        code: 1,
      },
      { name: "attendance_filters_compound" }
    );

    // Index for date-based queries
    await Attendance.collection.createIndex(
      {
        year: 1,
        date: 1,
      },
      { name: "attendance_date_compound" }
    );

    // Index for absence analysis
    await Attendance.collection.createIndex(
      {
        absent: 1,
        absenceReason: 1,
        year: 1,
      },
      { name: "attendance_absence_compound" }
    );

    // Index for student-based aggregations
    await Attendance.collection.createIndex(
      {
        student: 1,
        year: 1,
        absent: 1,
      },
      { name: "attendance_student_compound" }
    );

    // Index for school-based aggregations
    await Attendance.collection.createIndex(
      {
        school: 1,
        code: 1,
        year: 1,
        absent: 1,
      },
      { name: "attendance_school_compound" }
    );

    // Index for gender-based analysis
    await Attendance.collection.createIndex(
      {
        gender: 1,
        year: 1,
        absent: 1,
      },
      { name: "attendance_gender_compound" }
    );

    // Index for disability-based analysis
    await Attendance.collection.createIndex(
      {
        isWithDisability: 1,
        year: 1,
        absent: 1,
      },
      { name: "attendance_disability_compound" }
    );

    console.log("All indexes created successfully!");

    // List all indexes
    const indexes = await Attendance.collection.listIndexes().toArray();
    console.log("Current indexes:");
    indexes.forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

module.exports = { createAttendanceIndexes };

// Run if called directly
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/sams";

  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("Connected to MongoDB");
      return createAttendanceIndexes();
    })
    .then(() => {
      console.log("Index creation completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}

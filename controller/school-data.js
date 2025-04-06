const schoolData = require("../models/school-data");
const SchoolData2023 = require('../models/2023Data');

// Create a new school entry
exports.createSchool = async (req, res) => {
  try {
    // Check if a school with the same code or emisId exists
    const existingSchool = await schoolData.findOne({
      $or: [{ code: req.body.code }, { emisId: req.body.emisId }]
    });

    if (existingSchool) {
      return res.status(400).json({ message: "School with the same code or emisId already exists." });
    }

    const newSchool = new schoolData(req.body);
    const savedSchool = await newSchool.save();

    const testLearner = new SchoolData2023({
      year: new Date().getFullYear(),
      state28: savedSchool.state10,
      county28: savedSchool.county28,
      payam28: savedSchool.payam28,
      state10: savedSchool.state10,
      county10: savedSchool.county28,
      payam10: savedSchool.payam28,
      school: savedSchool.schoolName,
      class: "P1",
      code: savedSchool.code,
      education: "PRI",
      form: 1,
      formstream: 1,
      gender: "M",
      dob: "2015-01-01",
      age: 10,
      firstName: "Test",
      middleName: "Student",
      lastName: "Learner",

    });

    await testLearner.save();

    res.status(201).json({
      message: "School and test learner created successfully",
      data: {
        school: savedSchool,
        testLearner: testLearner
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating school and test learner", error: error.message });
  }
};

// Get all schools with optional filtering
exports.getAllSchools = async (req, res) => {
  try {

    const { schoolType, state10, county10, payam10 } = req.query;
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
      schoolType: 1,
      emisId: 1,
    };

    const schools = await schoolData.find(filter, projection);

    res
      .status(200)
      .json({ message: "Schools retrieved successfully", data: schools });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving schools", error: error.message });
  }
};

// Fetch schools whose enrollment is complete
exports.getSchoolsWithCompletedEnrollment = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    // First get schools with completed enrollment
    const schoolProjection = {
      code: 1,
      schoolName: 1,
      schoolType: 1,
      state10: 1,
      county28: 1,
      payam28: 1,
      schoolOwnerShip: 1,
      schoolType: 1,
      emisId: 1,
      isEnrollmentComplete: 1
    };

    const completedSchools = await schoolData.find({
      "isEnrollmentComplete": {
        $elemMatch: {
          "year": currentYear,
          "percentageComplete": { $gte: 1 }
        }
      }
    }, schoolProjection);

    // For each school, get learner statistics from 2023Data
    const schoolsWithStats = await Promise.all(
      completedSchools.map(async (school) => {
        const learnerStats = await SchoolData2023.aggregate([
          {
            $match: {
              code: school.code,
              isDroppedOut: false,
              $or: [
                { updatedAt: { $gte: startOfYear, $lte: endOfYear } },
                { createdAt: { $gte: startOfYear, $lte: endOfYear } }
              ]
            }
          },
          {
            $group: {
              _id: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$class", null] },
                      { $ne: ["$class", "undefined"] },
                      { $ne: ["$class", ""] }
                    ]
                  },
                  then: "$class",
                  else: "Unknown"
                }
              },
              totalLearners: { $sum: 1 },
              maleLearners: {
                $sum: { $cond: [{ $eq: ["$gender", "M"] }, 1, 0] }
              },
              femaleLearners: {
                $sum: { $cond: [{ $eq: ["$gender", "F"] }, 1, 0] }
              },
              learnersWithDisability: {
                $sum: { $cond: [{ $eq: ["$isWithDisability", true] }, 1, 0] }
              },
              // Count current year learners using year field
              currentYearLearners: {
                $sum: { $cond: [{ $eq: ["$year", currentYear] }, 1, 0] }
              },
              currentYearMale: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$gender", "M"] },
                        { $eq: ["$year", currentYear] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              currentYearFemale: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$gender", "F"] },
                        { $eq: ["$year", currentYear] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              currentYearWithDisability: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isWithDisability", true] },
                        { $eq: ["$year", currentYear] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              class: { $cond: { if: { $eq: ["$_id", "Unknown"] }, then: "Unknown", else: "$_id" } },
              total: "$totalLearners",
              male: "$maleLearners",
              female: "$femaleLearners",
              withDisability: "$learnersWithDisability",
              currentYear: {
                total: "$currentYearLearners",
                male: "$currentYearMale",
                female: "$currentYearFemale",
                withDisability: "$currentYearWithDisability"
              }
            }
          }
        ]);

        return {
          ...school.toObject(),
          learnerStats: learnerStats.reduce((acc, stat) => {
            acc[stat.class] = {
              total: stat.total,
              male: stat.male,
              female: stat.female,
              withDisability: stat.withDisability,
              currentYear: stat.currentYear
            };
            return acc;
          }, {})
        };
      })
    );

    res.json(schoolsWithStats);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Mark enrollment as complete
exports.markEnrollmentComplete = async (req, res) => {
  try {
    const { year, completedBy,comments, percentageComplete,isComplete,learnerEnrollmentComplete } = req.body;
    const schoolId = req.params.id;

    const school = await schoolData.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Check if enrollment for the given year exists, if not, create it
    const enrollmentIndex = school.isEnrollmentComplete.findIndex(e => e.year === year);

    if (enrollmentIndex !== -1) {
      // Update existing entry
      school.isEnrollmentComplete[enrollmentIndex].isComplete = isComplete
      school.isEnrollmentComplete[enrollmentIndex].completedBy = completedBy;
      school.isEnrollmentComplete[enrollmentIndex].year = year;
      school.isEnrollmentComplete[enrollmentIndex].comments = comments;
      school.isEnrollmentComplete[enrollmentIndex].percentageComplete = percentageComplete;
      school.isEnrollmentComplete[enrollmentIndex].learnerEnrollmentComplete = learnerEnrollmentComplete;



    } else {
      // Create new entry
      school.isEnrollmentComplete.push({ year, isComplete, completedBy ,comments, percentageComplete,learnerEnrollmentComplete});
    }

    await school.save();
    res.json({ message: "Enrollment marked as complete", school });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


// Get a single school by ID
exports.getSchoolById = async (req, res) => {
  try {
    const school = await schoolData.findById(req.params.id);
    // .populate("headTeacher reporter facilities radioCoverage.stations");
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    res
      .status(200)
      .json({ message: "School retrieved successfully", data: school });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving school", error: error.message });
  }
};

// Get a single school by ID
exports.getSchoolByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: "school code is required!" });
    }

    const school = await schoolData.findOne({ code });
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    res
      .status(200)
      .json({ message: "School retrieved successfully", data: school });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving school", error: error.message });
  }
};

// Update a school by ID
exports.updateSchool = async (req, res) => {
  try {
    const updatedSchool = await schoolData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedSchool) {
      return res.status(404).json({ message: "School not found" });
    }
    res
      .status(200)
      .json({ message: "School updated successfully", data: updatedSchool });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating school", error: error.message });
  }
};

// Delete a school by ID
exports.deleteSchool = async (req, res) => {
  try {
    const deletedSchool = await schoolData.findByIdAndDelete(req.params.id);
    if (!deletedSchool) {
      return res.status(404).json({ message: "School not found" });
    }
    res.status(200).json({ message: "School deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting school", error: error.message });
  }
};

// Get schools with advanced querying (e.g., schools with specific facilities or programs)
exports.getSchoolsByCriteria = async (req, res) => {
  try {
    const { facilities, mentoringProgramme, feedingProgramme } = req.query;
    const filter = {};

    if (facilities) filter.facilities = { $in: facilities.split(",") };
    if (mentoringProgramme)
      filter["mentoringProgramme.isAvailable"] = mentoringProgramme === "true";
    if (feedingProgramme)
      filter["feedingProgramme.isAvailable"] = feedingProgramme === "true";

    const schools = await schoolData
      .find(filter)
      .populate("facilities radioCoverage.stations");
    res
      .status(200)
      .json({ message: "Schools retrieved successfully", data: schools });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving schools", error: error.message });
  }
};

// Aggregate data (e.g., count schools by type)
exports.countSchoolsByType = async (req, res) => {
  try {
    const result = await schoolData.aggregate([
      { $group: { _id: "$schoolType", count: { $sum: 1 } } },
    ]);
    res.status(200).json({ message: "School count by type", data: result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error aggregating school data", error: error.message });
  }
};

// Get learner statistics by state
exports.getLearnerStatsByState = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Create date objects with timezone offset
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    const learnerStats = await SchoolData2023.aggregate([
      {
        $match: {
          $or: [
            { updatedAt: { $gte: startOfYear, $lte: endOfYear } },
            { createdAt: { $gte: startOfYear, $lte: endOfYear } }
          ],
          isDroppedOut: false
        }
      },
      {
        $group: {
          _id: {
            state10: "$state10",
          },
          newLearners: {
            $sum: { $cond: [{ $eq: ["$year", currentYear] }, 1, 0] }
          },
          maleLearners: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$gender", "M"] },
                  ]
                },
                1,
                0
              ]
            }
          },
          femaleLearners: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$gender", "F"] },
                  ]
                },
                1,
                0
              ]
            }
          },
          learnersWithDisability: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isWithDisability", true] },
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          state10: "$_id.state10",
          new: "$newLearners",
          male: "$maleLearners",
          female: "$femaleLearners",
          withDisability: "$learnersWithDisability"
        }
      },
      {
        $sort: {
          state10: 1
        }
      }
    ]);

    res.json(learnerStats);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get school types count by state
exports.getSchoolTypesByState = async (req, res) => {
  try {
    const schoolTypeStats = await schoolData.aggregate([
      {
        $match: {
          schoolType: { $in: ["SEC", "PRI", "ECD", "CGS", "ALP", "ASP"] }
        }
      },
      {
        $group: {
          _id: {
            state10: "$state10",
            schoolType: "$schoolType"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.state10",
          schoolTypes: {
            $push: {
              type: "$_id.schoolType",
              count: "$count"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          state10: "$_id",
          SEC: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "SEC"] },
                  "$$this.count",
                  "$$value"
                ]
              }
            }
          },
          PRI: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "PRI"] },
                  "$$this.count",
                  "$$value"
                ]
              }
            }
          },
          ECD: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "ECD"] },
                  "$$this.count",
                  "$$value"
                ]
              }
            }
          },
          CGS: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "CGS"] },
                  "$$this.count",
                  "$$value"
                ]
              }
            }
          },
          ALP: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "ALP"] },
                  "$$this.count",
                  "$$value"
                ]
              }
            }
          },
          ASP: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "ASP"] },
                  "$$this.count",
                  "$$value"
                ]
              }
            }
          }
        }
      },
      {
        $sort: {
          state10: 1
        }
      }
    ]);

    res.json(schoolTypeStats);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get overall learner statistics
exports.getOverallLearnerStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    // Get statistics by education type (PRI, SEC, etc)
    const schoolTypeStats = await SchoolData2023.aggregate([
      {
        $match: {
          $or: [
            { updatedAt: { $gte: startOfYear, $lte: endOfYear } },
            { createdAt: { $gte: startOfYear, $lte: endOfYear } }
          ],
          isDroppedOut: false
        }
      },
      {
        $group: {
          _id: "$education",
          totalLearners: { $sum: 1 },
          maleLearners: {
            $sum: { $cond: [{ $in: ["$gender", ["M", "Male"]] }, 1, 0] }
          },
          femaleLearners: {
            $sum: { $cond: [{ $in: ["$gender", ["F", "Female"]] }, 1, 0] }
          },
          learnersWithDisability: {
            $sum: { $cond: [{ $eq: ["$isWithDisability", true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          schoolType: "$_id",
          total: "$totalLearners",
          male: "$maleLearners",
          female: "$femaleLearners",
          withDisability: "$learnersWithDisability"
        }
      }
    ]);

    // Get overall totals
    const overallStats = await SchoolData2023.aggregate([
      {
        $match: {
          $or: [
            { updatedAt: { $gte: startOfYear, $lte: endOfYear } },
            { createdAt: { $gte: startOfYear, $lte: endOfYear } }
          ],
          isDroppedOut: false
        }
      },
      {
        $group: {
          _id: null,
          totalLearners: { $sum: 1 },
          maleLearners: {
            $sum: { $cond: [{ $in: ["$gender", ["M", "Male"]] }, 1, 0] }
          },
          femaleLearners: {
            $sum: { $cond: [{ $in: ["$gender", ["F", "Female"]] }, 1, 0] }
          },
          learnersWithDisability: {
            $sum: { $cond: [{ $eq: ["$isWithDisability", true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: "$totalLearners",
          male: "$maleLearners",
          female: "$femaleLearners",
          withDisability: "$learnersWithDisability"
        }
      }
    ]);

    res.json({
      overall: overallStats[0] || {
        total: 0,
        male: 0,
        female: 0,
        withDisability: 0
      },
      bySchoolType: schoolTypeStats
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching learner statistics", 
      error: error.message 
    });
  }
};

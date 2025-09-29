const schoolData = require("../models/school-data");
const SchoolData2023 = require('../models/2023Data');

// Generate a unique school code based on school name
const generateSchoolCode = async (schoolName) => {
  // Clean the school name and extract meaningful words
  const cleanName = schoolName.toUpperCase().replace(/[^A-Z\s]/g, '');
  const words = cleanName.split(/\s+/).filter(word => word.length > 0);
  
  // Helper function to check if code exists
  const codeExists = async (code) => {
    const existing = await schoolData.findOne({ code });
    return !!existing;
  };

  // Strategy 1: First letters of first 3 words
  if (words.length >= 3) {
    const code = words[0][0] + words[1][0] + words[2][0];
    if (!(await codeExists(code))) {
      return code;
    }
  }

  // Strategy 2: First 2 letters of first word + first letter of second word
  if (words.length >= 2 && words[0].length >= 2) {
    const code = words[0].substring(0, 2) + words[1][0];
    if (!(await codeExists(code))) {
      return code;
    }
  }

  // Strategy 3: First 3 letters of first word
  if (words[0] && words[0].length >= 3) {
    const code = words[0].substring(0, 3);
    if (!(await codeExists(code))) {
      return code;
    }
  }

  // Strategy 4: First letter + variations with common letters
  const firstLetter = words[0] ? words[0][0] : 'A';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const code = firstLetter + alphabet[i] + alphabet[j];
      if (!(await codeExists(code))) {
        return code;
      }
    }
  }

  // Strategy 5: Random 3-letter code (fallback)
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!(await codeExists(code))) {
      return code;
    }
  }

  throw new Error('Unable to generate unique school code');
};

// Create a new school entry
exports.createSchool = async (req, res) => {
  try {
    const { codeType, code: providedCode, schoolName, emisId, ...otherData } = req.body;

    let finalCode;

    // Handle code generation based on type
    if (codeType === 'new') {
      if (!schoolName) {
        return res.status(400).json({ message: "School name is required for generating new code." });
      }
      finalCode = await generateSchoolCode(schoolName);
    } else if (codeType === 'existing') {
      if (!providedCode) {
        return res.status(400).json({ message: "School code is required when using existing code." });
      }
      
      // Check if the provided code already exists
      const existingSchool = await schoolData.findOne({ code: providedCode });
      if (existingSchool) {
        return res.status(400).json({ message: "School with this code already exists." });
      }
      
      finalCode = providedCode.toUpperCase();
    } else {
      return res.status(400).json({ message: "Invalid code type. Must be 'new' or 'existing'." });
    }

    // Check if emisId exists (if provided)
    if (emisId) {
      const existingEmisSchool = await schoolData.findOne({ emisId });
      if (existingEmisSchool) {
        return res.status(400).json({ message: "School with this EMIS ID already exists." });
      }
    }

    // Create the school with the final code
    const schoolDataToSave = {
      ...otherData,
      code: finalCode,
      schoolName,
      emisId
    };

    const newSchool = new schoolData(schoolDataToSave);
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
        testLearner: testLearner,
        generatedCode: codeType === 'new' ? finalCode : null
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
      "schoolStatus.isOpen": 1

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
    const { state, payam, county, code } = req.query;
    const params = {};
    if (state) params.state10 = state;
    if (payam) params.payam28 = payam;
    if (county) params.county28 = county;
    if (code) params.code = code;

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
      },
      "schoolStatus.isOpen": "open",
      ...params
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
    const { year, completedBy, comments, percentageComplete, isComplete, learnerEnrollmentComplete } = req.body;
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
      school.isEnrollmentComplete.push({ year, isComplete, completedBy, comments, percentageComplete, learnerEnrollmentComplete });
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
          totalLearners: { $sum: 1 },
          newLearners: {
            $sum: { $cond: [{ $eq: ["$year", currentYear] }, 1, 0] }
          },
          maleLearners: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["M", "Male"]] },
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
                    { $in: ["$gender", ["F", "Female"]] },
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
          total: "$totalLearners",
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

    // Calculate and log total learners in different ways for verification
    const totalBySum = learnerStats.reduce((sum, state) => sum + state.total, 0);
    const totalByGender = learnerStats.reduce((sum, state) => sum + state.male + state.female, 0);

    // console.log('Total learners (direct sum):', totalBySum);
    // console.log('Total learners (male + female):', totalByGender);
    // console.log('Total new learners:', learnerStats.reduce((sum, state) => sum + state.new, 0));
    // console.log('Total learners with disability:', learnerStats.reduce((sum, state) => sum + state.withDisability, 0));

    res.json(learnerStats);
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

    // Log total learners from both queries for verification
    // console.log('Overall total learners:', overallStats[0]?.total || 0);
    // console.log('Total learners by school type:', schoolTypeStats.reduce((sum, type) => sum + type.total, 0));

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

// Get school types count by state
exports.getSchoolTypesByState = async (req, res) => {
  try {
    const schoolTypeStats = await schoolData.aggregate([
      {
        $match: {
          schoolType: { $in: ["SEC", "PRI", "ECD", "CGS", "ALP", "ASP", "TTI"] },
          "schoolStatus.isOpen": "open"
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
          },
          TTI: {
            $reduce: {
              input: "$schoolTypes",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "TTI"] },
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

// Preview school code generation
exports.previewSchoolCode = async (req, res) => {
  try {
    const { schoolName } = req.body;
    
    if (!schoolName) {
      return res.status(400).json({ message: "School name is required." });
    }

    const suggestedCode = await generateSchoolCode(schoolName);
    
    res.status(200).json({
      message: "School code generated successfully",
      data: {
        schoolName,
        suggestedCode
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating school code", error: error.message });
  }
};

// Check if school code is available
exports.checkCodeAvailability = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ message: "School code is required." });
    }

    const existingSchool = await schoolData.findOne({ code: code.toUpperCase() });
    
    res.status(200).json({
      available: !existingSchool,
      code: code.toUpperCase()
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking code availability", error: error.message });
  }
};
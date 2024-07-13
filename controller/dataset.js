const { default: axios } = require("axios");
const Dataset = require("../models/ssams");
const SchoolData = require("../models/2023Data");
  const moment = require("moment-timezone");
const SchoolDataCtCash = require("../models/ctCash");

// Controller function to fetch dataset with advanced queries
const dataSet = async (req, res) => {
  try {
    // Extract query parameters from the request
    const {
      stateCode,
      countyName,
      educationLevel,
      payamName,
      code,
      schoolName,
      pupilCount,
      pupilCountOperator,
      sortBy,
      sortOrder,
      state10, // Add the state10 parameter
    } = req.query;

    // Build the query object
    const query = {};
    if (stateCode) query.stateCode = stateCode;
    if (state10) query.state10 = state10; // Add the state10 parameter to the query

    // Case-insensitive search for countyName
    if (countyName) query.countyName = { $regex: new RegExp(countyName, "i") };
    if (educationLevel) query.educationLevel = educationLevel;
    if (payamName) query.payamName = payamName;
    if (code) query.code = code;

    // Case-insensitive search for schoolName
    if (schoolName) query.schoolName = { $regex: new RegExp(schoolName, "i") };

    // Build the pupilCount query based on the specified operator
    if (pupilCount && pupilCountOperator) {
      switch (pupilCountOperator) {
        // ... (your existing pupilCount switch cases)
        default:
          break;
      }
    }

    // Build the sort object
    const sort = {};
    if (sortBy) sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Fetch data from the database using the query and sort options
    const response = await Dataset.find(query).sort(sort);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching dataset:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Controller function to fetch unique counties with total number of pupils
const countyPupilTotal = async (req, res) => {
  try {
    // Aggregate pipeline to group by countyName and calculate total pupils
    const pipeline = [
      {
        $group: {
          _id: "$countyName",
          totalPupils: { $sum: "$pupilCount" },
        },
      },
      {
        $project: {
          countyName: "$_id",
          totalPupils: 1,
          _id: 0,
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await Dataset.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching county pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const countyPayamPupilTotals = async (req, res) => {
  try {
    // Extract countyName from the request parameters
    const { countyName } = req.body;

    // Validate if countyName is provided
    if (!countyName) {
      return res
        .status(400)
        .json({ success: false, error: "County name is required" });
    }

    // Fetch data from the database
    const result = await Dataset.aggregate([
      {
        $match: { countyName: countyName },
      },
      {
        $group: {
          _id: "$payamName",
          totalPupils: { $sum: { $ifNull: ["$pupilCount", 0] } },
        },
      },
    ]);

    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching county payam pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const payamSchoolPupilTotals = async (req, res) => {
  try {
    // Extract payamName from the request parameters
    const { payamName } = req.body;

    // Validate if payamName is provided
    if (!payamName) {
      return res
        .status(400)
        .json({ success: false, error: "Payam name is required" });
    }

    // Fetch data from the database
    const result = await Dataset.aggregate([
      {
        $match: { payamName: payamName }, // Use exact match if payamName is not a regex pattern
      },
      {
        $group: {
          _id: "$schoolName",
          totalPupils: { $sum: "$pupilCount" },
        },
      },
    ]);

    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching payam school pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//not used anymore
const getStudentsInSchool = async (req, res) => {
  try {
    // Extract schoolName from the request parameters
    const { schoolName } = req.body;

    // Validate if schoolName is provided
    if (!schoolName) {
      return res
        .status(400)
        .json({ success: false, error: "School name is required" });
    }

    // Make a request to the external API using Axios
    const response = await axios.get(
      `http://35.244.58.160/mobile-api/processvalid?school_name=${schoolName}`
    );

    // Extract relevant data from the response
    const students = response.data.students;

    // Return the result
    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Error fetching students in school:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// 2023 data

const dataSet_2023 = async (req, res) => {
  try {
    const {
      state28,
      county28,
      education,
      payam28,
      code,
      school,
      sortBy,
      sortOrder,
      state10,
      county10,
      payam10,
      page, // New parameter to specify the page number
    } = req.query;

    // Calculate the number of documents to skip based on the page number
    const skip = (page - 1) * 5000;

    const query = buildQuery(
      state28,
      county28,
      education,
      payam28,
      code,
      school,
      state10,
      county10,
      payam10
    );
    const sort = buildSortObject(sortBy, sortOrder);

    // Specify the fields to exclude in the select method
    const projection = {
      firstName: 1,
      middleName: 1,
      lastName: 1,
      education: 1,
      gender: 1,
      dob: 1,
      year: 1,
      //  state28: 1,
      county28: 1,
      payam28: 1,
      state10: 1,
      school: 1,
      class: 1,
      code: 1,
      isPromoted: 1,
      isDroppedOut: 1,
      learnerUniqueID: 1,
      reference: 1,
      disabilities: 1,
      //  houseHold: 1,
      //  pregnantOrNursing: 1,
      //  modifiedBy: 1,
    };

    // Fetch documents based on pagination
    const response = await SchoolData.find(query)
      .sort(sort)
      .select(projection)
      .skip(skip) // Skip the appropriate number of documents
      .limit(5000); // Limit the number of documents per page

    // Count the total number of documents matching the query
    const totalCount = await SchoolData.countDocuments(query);

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCount / 5000);

    // Calculate the number of remaining trips
    const remainingTrips = totalPages - page;

    // Calculate the number of documents remaining after this trip
    const remainingDocuments = totalCount - page * 5000;

    res.status(200).json({
      data: response,
      totalCount: totalCount,
      totalPages: totalPages,
      remainingTrips: remainingTrips,
      remainingDocuments: remainingDocuments,
    });
  } catch (error) {
    console.log("Error fetching dataset:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const buildQuery = (
  state28,
  county28,
  education,
  payam28,
  code,
  school,
  state10,
  county10,
  payam10
) => {
  const query = {};

  // Helper function to add a query condition
  const addQueryCondition = (field, value) => {
    if (value) {
      query[field] = { $regex: new RegExp(value, "i") };
    }
  };

  addQueryCondition("state28", state28);
  addQueryCondition("county28", county28);
  addQueryCondition("education", education);
  addQueryCondition("payam28", payam28);
  addQueryCondition("code", code);
  addQueryCondition("school", school);
  addQueryCondition("state10", state10);
  addQueryCondition("county10", county10);
  addQueryCondition("payam10", payam10);

  return query;
};

const buildSortObject = (sortBy, sortOrder) => {
  const sort = {};
  if (sortBy) sort[sortBy] = sortOrder === "desc" ? -1 : 1;
  return sort;
};

const statePupilTotal_2023 = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$state10",
          totalPupils: { $sum: 1 },
          ids: { $push: "$_id" }, // Include the MongoDB _id in an array
        },
      },
      {
        $project: {
          state: "$_id",
          totalPupils: "$totalPupils",
          _id: 0,
          id: { $arrayElemAt: ["$ids", 0] }, // Use $arrayElemAt to get the first element of the ids array
        },
      },
    ];

    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching state pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const countyPupilTotal_2023 = async (req, res) => {
  try {
    // Extract county28 from the request parameters
    const { state } = req.body;

    // Validate if state is provided
    if (!state) {
      return res
        .status(400)
        .json({ success: false, error: "state name is required" });
    }

    // Fetch data from the database
    const result = await SchoolData.aggregate([
      {
        $match: { state10: state },
      },
      {
        $group: {
          _id: "$county28",
          totalPupils: { $sum: 1 },
          id: { $push: "$_id" }, // Include the MongoDB _id in an array
        },
      },
      {
        $project: {
          _id: "$_id",
          totalPupils: "$totalPupils",
          id: { $arrayElemAt: ["$id", 0] }, // Use $arrayElemAt to get the first element of the ids array
        },
      },
    ]);

    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching county state pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const countyPayamPupilTotals_2023 = async (req, res) => {
  try {
    // Extract county28 from the request parameters
    const { county28 } = req.body;

    // Validate if county28 is provided
    if (!county28) {
      return res
        .status(400)
        .json({ success: false, error: "County name is required" });
    }

    // Fetch data from the database
    const result = await SchoolData.aggregate([
      {
        $match: { county28: county28 }, // Use county28 instead of countyName
      },
      {
        $group: {
          _id: "$payam28", // Use payam28 instead of payamName
          totalPupils: { $sum: 1 }, // Count documents per payam
        },
      },
    ]);

    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching county payam pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// const payamSchoolPupilTotals_2023 = async (req, res) => {
//   try {
//     // Extract payam28 from the request parameters
//     const { payam28 } = req.body;

//     // Validate if payam28 is provided
//     if (!payam28) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Payam name is required" });
//     }

//     // Fetch unique school names and codes from the database using aggregation
//     const result = await SchoolData.aggregate([
//       { $match: { payam28: payam28 } },
//       { $group: { _id: "$code", school: { $first: "$school" } } },
//       { $project: { _id: 0, code: "$_id", school: 1 } },
//     ]);

//     // Return the result
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error fetching payam school pupil totals:", error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// };

const payamSchoolPupilTotals_2023 = async (req, res) => {
  try {
    // Extract payam28 and isDisabled from the request body
    const { payam28, isDisabled } = req.body;

    // Validate if payam28 is provided
    if (!payam28) {
      return res
        .status(400)
        .json({ success: false, error: "Payam name is required" });
    }

    // Base match stage
    const matchStage = { payam28: payam28 };

    // Create the pipeline array
    const pipeline = [{ $match: matchStage }];

    // If isDisabled is true, add the necessary stages
    if (isDisabled) {
      pipeline.push(
        {
          $match: {
            disabilities: {
              $elemMatch: {
                $or: [
                  { "disabilities.difficultyHearing": { $gt: 1 } },
                  { "disabilities.difficultyRecalling": { $gt: 1 } },
                  { "disabilities.difficultySeeing": { $gt: 1 } },
                  { "disabilities.difficultySelfCare": { $gt: 1 } },
                  { "disabilities.difficultyTalking": { $gt: 1 } },
                  { "disabilities.difficultyWalking": { $gt: 1 } },
                ],
              },
            },
          },
        },
        { $group: { _id: "$code", school: { $first: "$school" } } },
        { $project: { _id: 0, code: "$_id", school: 1 } }
      );
    } else {
      pipeline.push(
        { $group: { _id: "$code", school: { $first: "$school" } } },
        { $project: { _id: 0, code: "$_id", school: 1 } }
      );
    }

    // Execute the aggregation pipeline
    const result = await SchoolData.aggregate(pipeline);

    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching payam school pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getStudentsInSchool_2023 = async (req, res) => {
  try {
    // Extract schoolName, isDroppedOut, isValidated, and isDisabled from the request body
    const { schoolName, isDroppedOut, isValidated, isDisabled } = req.body;

    // Validate if schoolName is provided
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
    if (isValidated !== undefined) {
      query.isValidated = isValidated;
    }

    // If isDisabled is provided, modify the query to include disability check
    if (isDisabled) {
      query.disabilities = {
        $elemMatch: {
          $or: [
            { "disabilities.difficultyHearing": { $gt: 1 } },
            { "disabilities.difficultyRecalling": { $gt: 1 } },
            { "disabilities.difficultySeeing": { $gt: 1 } },
            { "disabilities.difficultySelfCare": { $gt: 1 } },
            { "disabilities.difficultyTalking": { $gt: 1 } },
            { "disabilities.difficultyWalking": { $gt: 1 } },
          ],
        },
      };
    }

    // Use the find method to get documents matching the query
    const result = await SchoolData.find(query);

    // Return the formatted result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching students in school:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getStudentsInClass_2023 = async (req, res) => {
  try {
    const { schoolName, Class, isDroppedOut } = req.body;

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

    // Find matching documents
    const result = await SchoolData.find(query);

    // Return result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching students in school:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const updateSchoolDataFields_2023 = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Validate if any fields are provided in req.body
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ message: "No fields to update provided in req.body" });
    }

    const schoolData = await SchoolData.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!schoolData) {
      return res.status(404).json({ message: "School data not found" });
    }

    res.status(200).json(schoolData);
  } catch (error) {
    if (error.code === 79) {
      return res.status(200).json({ success: true });
    }
  }
};

const updateSchoolDataFieldsBulk = async (req, res) => {
  try {
    const { ids, loggedInUser, updateFields } = req.body;

    // Validate if any fields are provided in req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid or empty IDs array" });
    }

    // Validate if any fields are provided in req.body.updateFields
    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ message: "No fields to update provided in updateFields" });
    }

    const bulkOperations = ids.map((id) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { ...updateFields, modifiedBy: loggedInUser } },
      },
    }));

    const result = await SchoolData.bulkWrite(bulkOperations);

    // Check if any documents were modified
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "No school data updated" });
    }

    res.status(200).json({ message: "School data updated successfully" });
  } catch (error) {
    console.error("Error updating school data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getSingleStudents_2023 = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await SchoolData.findById(id);

    if (!student) {
      return res.status(404).json({ message: "no student found!" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

// 2024

const registerStudent2024 = async (req, res) => {
  try {
    // Extract registration data from the request body
    const {
      year,
      state,
      stateName,
      county,
      countryOfOrigin,
      payam,
      code,
      schoolName,
      education,
      class: studentClass,
      gender,
      dob,
      firstName,
      middleName,
      lastName,
      disabilities,
      houseHold,
      pregnantOrNursing,
      modifiedBy,
    } = req.body;

    const generateUniqueCode = () => {
      const currentDate = new Date();
      const year = String(currentDate.getFullYear()).slice(-2); // Get the last two digits of the year
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      let hours = String(currentDate.getHours() + 3).padStart(2, "0");
      const minutes = String(currentDate.getMinutes()).padStart(2, "0");
      const seconds = String(currentDate.getSeconds()).padStart(2, "0");

      // Convert hours to 12-hour format
      if (hours > 12) {
        hours -= 12;
      }

      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    };

    // Create a new instance of the RegistrationData model
    const newRegistration2023 = new SchoolData({
      year,
      stateName,
      state10: state,
      code,
      county28: county,
      countryOfOrigin,
      payam28: payam,
      school: schoolName,
      education,
      class: studentClass,
      gender,
      dob,
      firstName,
      middleName,
      lastName,
      disabilities,
      houseHold,
      pregnantOrNursing,
      reference: generateUniqueCode(),
      modifiedBy,
    });

    // Save the registration data to the database
    const reg = await newRegistration2023.save();
    console.log(
      `${reg.firstName} in state ${reg.state10}, county${reg.county28} payam ${reg.payam28}, school ${reg.school} registered`
    );

    res
      .status(201)
      .json({ success: true, message: "student registered successfully." });
  } catch (error) {
    console.log(error);
    if (error.code === 79) {
      res
        .status(200)
        .json({ success: true, message: "student registed successfully" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  }
};

const deleteStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the student by ID and remove them
    const deletedStudent = await SchoolData.findByIdAndRemove(id);

    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const payamSchoolDownload = async (req, res) => {
  try {
    const { payam28, page } = req.body;

    // Input validation
    if (!payam28) {
      return res
        .status(400)
        .json({ success: false, error: "payam28 is required" });
    }

    const PAGE_SIZE = 1000;
    const PROJECTION_FIELDS = {
      year: 1,
      state28: 1,
      county28: 1,
      payam28: 1,
      state10: 1,
      school: 1,
      class: 1,
      code: 1,
      education: 1,
      gender: 1,
      dob: 1,
      firstName: 1,
      middleName: 1,
      lastName: 1,
      isPromoted: 1,
      isDroppedOut: 1,
      learnerUniqueID: 1,
      reference: 1,
      disabilities: 1,
      houseHold: 1,
      pregnantOrNursing: 1,
      isValidated: 1,
      isDisbursed: 1,
      CTEFSerialNumber: 1,
      isWithDisability: 1,
    };

    // Calculate skip value based on pagination
    const skip = (page - 1) * PAGE_SIZE;

    // Aggregation pipeline to match, project, skip, and limit documents
    const pipeline = [
      { $match: { payam28 } },
      { $project: PROJECTION_FIELDS },
      { $skip: skip },
      { $limit: PAGE_SIZE },
    ];

    // Execute the aggregation pipeline
    const schoolData = await SchoolData.aggregate(pipeline);

    // Count the total number of documents matching the query
    const totalCount = await SchoolData.countDocuments({ payam28 });

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Calculate the number of remaining trips
    const remainingTrips = totalPages - page;

    res.status(200).json({
      success: true,
      data: schoolData,
      totalCount,
      totalPages,
      remainingTrips,
    });
  } catch (error) {
    console.error("Error fetching school data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const bulkUpdateStateFields = async (req, res) => {
  try {
    const { state10, county28, state } = req.body;

    // Retrieve documents that match the criteria
    const documentsToUpdate = await SchoolData.find({
      state10,
      county28,
    });

    // Update all
    await Promise.all(
      documentsToUpdate.map(async (doc) => {
        doc.state10 = state;
        await doc.save();
      })
    );

    res.status(200).json({
      success: true,
      message: `Successfully renamed state10 to ${state} `,
    });
  } catch (error) {
    console.log("Error renaming state10:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//track

const trackOverall = async (req, res) => {
  try {
    const { startDateStr, endDateStr } = req.body;

    // Validate input dates
    if (!startDateStr || !endDateStr) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Check if startDate and endDate are valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Total count
    const totalCount = await SchoolData.countDocuments();

    // Total new enrollments
    const newEnrollmentsCount = await SchoolData.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Total dropouts
    const dropoutCount = await SchoolData.countDocuments({
      isDroppedOut: true,
      updatedAt: { $gte: startDate, $lte: endDate },
    });

    // Total disabled students
    const disabledStudentsCount = await SchoolData.countDocuments({
      disabilities: {
        $elemMatch: {
          $or: [
            { "disabilities.difficultyHearing": { $gt: 1 } },
            { "disabilities.difficultyRecalling": { $gt: 1 } },
            { "disabilities.difficultySeeing": { $gt: 1 } },
            { "disabilities.difficultySelfCare": { $gt: 1 } },
            { "disabilities.difficultyTalking": { $gt: 1 } },
            { "disabilities.difficultyWalking": { $gt: 1 } },
          ],
        },
      },
    });

    res.status(200).json({
      totalCount,
      newEnrollmentsCount,
      dropoutCount,
      disabledStudentsCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const trackState = async (req, res) => {
  try {
    const { state10, startDateStr, endDateStr } = req.body;

    // Input Validation
    if (!state10 || !startDateStr || !endDateStr) {
      return res.status(400).json({
        error: "state10, startDateStr, and endDateStr are required",
      });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Check if startDate and endDate are valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // MongoDB Aggregation Pipeline
    const pipeline = [
      {
        $match: {
          state10,
          $or: [
            { createdAt: { $gte: startDate, $lte: endDate } },
            { updatedAt: { $gte: startDate, $lte: endDate } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          newEnrollmentsCount: {
            $sum: { $cond: [{ $gte: ["$createdAt", startDate] }, 1, 0] },
          },
          dropoutCount: {
            $sum: { $cond: [{ $eq: ["$isDroppedOut", true] }, 1, 0] },
          },
          disabledStudentsCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: ["$disabilities.difficultyHearing", 1] },
                    { $gt: ["$disabilities.difficultyRecalling", 1] },
                    { $gt: ["$disabilities.difficultySeeing", 1] },
                    { $gt: ["$disabilities.difficultySelfCare", 1] },
                    { $gt: ["$disabilities.difficultyTalking", 1] },
                    { $gt: ["$disabilities.difficultyWalking", 1] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const result = await SchoolData.aggregate(pipeline);

    // Return the result
    res.status(200).json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const trackCounty = async (req, res) => {
  try {
    const { state10, county28, startDateStr, endDateStr } = req.body;

    // Input Validation
    if (!state10 || !county28 || !startDateStr || !endDateStr) {
      return res.status(400).json({
        error: "state10, county28, startDateStr, and endDateStr are required",
      });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Check if startDate and endDate are valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Total count
    const totalCount = await SchoolData.countDocuments({
      state10,
      county28,
    });

    // Total new enrollments
    const newEnrollmentsCount = await SchoolData.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      state10,
      county28,
    });

    // Total dropouts
    const dropoutCount = await SchoolData.countDocuments({
      isDroppedOut: true,
      updatedAt: { $gte: startDate, $lte: endDate },
      state10,
      county28,
    });

    res.status(200).json({
      totalCount,
      newEnrollmentsCount,
      dropoutCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const trackPayam = async (req, res) => {
  try {
    const { state10, county28, payam28, startDateStr, endDateStr } = req.body;

    // Input Validation
    if (!state10 || !county28 || !payam28 || !startDateStr || !endDateStr) {
      return res.status(400).json({
        error:
          "state10, county28, payam28, startDateStr, and endDateStr are required",
      });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Check if startDate and endDate are valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Total count
    const totalCount = await SchoolData.countDocuments({
      state10,
      county28,
      payam28,
    });

    // Total new enrollments
    const newEnrollmentsCount = await SchoolData.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      state10,
      county28,
      payam28,
    });

    // Total dropouts
    const dropoutCount = await SchoolData.countDocuments({
      isDroppedOut: true,
      updatedAt: { $gte: startDate, $lte: endDate },
      state10,
      county28,
      payam28,
    });

    res.status(200).json({
      totalCount,
      newEnrollmentsCount,
      dropoutCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const trackSchool = async (req, res) => {
  try {
    const { state10, county28, payam28, school, startDateStr, endDateStr } =
      req.body;

    // Input Validation
    if (
      !state10 ||
      !county28 ||
      !payam28 ||
      !school ||
      !startDateStr ||
      !endDateStr
    ) {
      return res.status(400).json({ error: "All parameters are required" });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Check if startDate and endDate are valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Total count
    const totalCount = await SchoolData.countDocuments({
      state10,
      county28,
      payam28,
      school,
    });

    // Total new enrollments
    const newEnrollmentsCount = await SchoolData.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      state10,
      county28,
      payam28,
      school,
    });

    // Total dropouts
    const dropoutCount = await SchoolData.countDocuments({
      isDroppedOut: true,
      updatedAt: { $gte: startDate, $lte: endDate },
      state10,
      county28,
      payam28,
      school,
    });

    res.status(200).json({
      totalCount,
      newEnrollmentsCount,
      dropoutCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// dashboard
const stateMaleFemaleStat = async (req, res) => {
  try {
    let regexYear;
    if (req.body && req.body.year) {
      regexYear = req.body.year.toString().slice(-2);
      console.log(regexYear);
    } else {
      regexYear = new Date().getFullYear().toString().slice(-2);
    }

    const regexPattern = new RegExp(`^(${regexYear})`);

    const pipeline = [
      {
        $match: {
          reference: { $regex: regexPattern }, // Match references starting with the determined year
        },
      },
      {
        $group: {
          _id: "$state10",
          totalPupils: { $sum: 1 },
          totalFemale: {
            $sum: { $cond: [{ $in: ["$gender", ["Female", "F"]] }, 1, 0] },
          },
          totalMale: {
            $sum: { $cond: [{ $in: ["$gender", ["Male", "M"]] }, 1, 0] },
          },
          ids: { $push: "$_id" },
        },
      },
      {
        $project: {
          state: "$_id",
          totalPupils: 1,
          totalFemale: 1,
          totalMale: 1,
          _id: 0,
          id: { $arrayElemAt: ["$ids", 0] },
        },
      },
    ];

    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching state pupil totals:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const findEnrolledSchools = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Define matching criteria based on provided fields from req.body
    const matchCriteria = {};
    if (req.body && req.body.county28) {
      matchCriteria.county28 = req.body.county28;
    }
    if (req.body && req.body.payam28) {
      matchCriteria.payam28 = req.body.payam28;
    }
    if (req.body && req.body.state10) {
      matchCriteria.state10 = req.body.state10;
    }

    // Aggregation pipeline to find distinct not enrolled schools
    const enrolledSchools = await SchoolData.aggregate([
      {
        $match: {
          ...matchCriteria,
        },
      },
      {
        $group: {
          _id: "$school",
          county28: { $first: "$county28" },
          payam28: { $first: "$payam28" },
          state10: { $first: "$state10" },
          years: { $addToSet: "$year" },
          isDroppedOut: { $addToSet: "$isDroppedOut" },
        },
      },
      {
        $match: {
          isDroppedOut: { $eq: true },
          years: { $lte: currentYear },
        },
      },
      {
        $project: {
          _id: 0,
          school: "$_id",
          county28: 1,
          payam28: 1,
          // years: 1,
          state10: 1,
        },
      },
    ]);

    res.status(200).json({ enrolledSchools });
  } catch (error) {
    console.error("Error finding not enrolled schools:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const findNotEnrolledSchools = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Define matching criteria based on provided fields from req.body
    const matchCriteria = {};
    if (req.body && req.body.county28) {
      matchCriteria.county28 = req.body.county28;
    }
    if (req.body && req.body.payam28) {
      matchCriteria.payam28 = req.body.payam28;
    }
    if (req.body && req.body.state10) {
      matchCriteria.state10 = req.body.state10;
    }

    // Aggregation pipeline to find distinct not enrolled schools
    const notEnrolledSchools = await SchoolData.aggregate([
      {
        $match: {
          ...matchCriteria,
        },
      },
      {
        $group: {
          _id: "$school",
          county28: { $first: "$county28" },
          payam28: { $first: "$payam28" },
          state10: { $first: "$state10" },
          years: { $addToSet: "$year" },
          isDroppedOut: { $addToSet: "$isDroppedOut" },
        },
      },
      {
        $match: {
          isDroppedOut: { $ne: true },
          years: { $ne: currentYear },
        },
      },
      {
        $project: {
          _id: 0,
          school: "$_id",
          county28: 1,
          payam28: 1,
          // years: 1,
          state10: 1,
        },
      },
    ]);

    res.status(200).json({ notEnrolledSchools });
  } catch (error) {
    console.error("Error finding not enrolled schools:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//enrolled students
const fetchSchoolsPerState = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          isDroppedOut: false,
        },
      },
      {
        $group: {
          _id: "$state10",
          schoolCount: { $sum: 1 },
        },
      },
    ];

    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching schools per state:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getUniqueSchoolsPerState10 = async (req, res) => {
  try {
    const uniqueSchoolsPerState10 = await SchoolData.aggregate([
      {
        $group: {
          _id: "$state10",
          uniqueSchools: { $addToSet: { $toLower: "$school" } }, // Convert school names to lowercase for case-insensitive comparison and add to set
        },
      },
      {
        $project: {
          _id: 1,
          numberOfUniqueSchools: { $size: "$uniqueSchools" }, // Count the number of unique schools
        },
      },
    ]);

    res.status(200).json(uniqueSchoolsPerState10);
  } catch (error) {
    console.error("Error fetching unique schools per state10:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//enrolled in the current year
const totalNewStudentsPerState = async (req, res) => {
  try {
    currentYear = new Date().getFullYear();

    // Aggregation pipeline to count documents per state10 where reference matches the regex
    const pipeline = [
      {
        $match: {
          year: currentYear,
          isDroppedOut: false,
        },
      },
      {
        $group: {
          _id: "$state10",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state10: "$_id",
          count: 1,
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//dropped in the current year
const totalNewStudentsPerStateDroppedOut = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear(); // Get the current year

    const pipeline = [
      {
        $match: {
          isDroppedOut: true,
          updatedAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`), // Filter for the current year
            $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`), // Next year's beginning
          },
        },
      },
      {
        $group: {
          _id: "$state10",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state10: "$_id",
          count: 1,
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//disabled in the current year
const totalNewStudentsPerStateDisabled = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear(); // Get the current year

    const pipeline = [
      {
        $match: {
          updatedAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`), // Filter for the current year
            $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`), // Next year's beginning
          },
        },
      },
      {
        $project: {
          state10: 1,
          disabilities: 1,
        },
      },
      {
        $addFields: {
          totalDisabilities: {
            $reduce: {
              input: "$disabilities",
              initialValue: 0,
              in: {
                $sum: [
                  "$$value",
                  {
                    $size: {
                      $filter: {
                        input: { $objectToArray: "$$this.disabilities" },
                        cond: { $gt: ["$$this.v", 1] }, // Check if disability count is greater than 1
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          totalDisabilities: { $gt: 0 }, // Filter out students with disabilities
        },
      },
      {
        $group: {
          _id: "$state10",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state10: "$_id",
          count: 1,
        },
      },
    ];

    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const fetchSchoolsEnrollmentToday = async (req, res) => {
  try {
    // Get the current date in UTC
    const currentDateUTC = moment.utc();

    // Convert UTC time to Nairobi time zone
    const currentDateNairobi = currentDateUTC.clone().tz("Africa/Nairobi");

    // Set the start of the day in Nairobi time zone and subtract 3 hours
    const startOfDayNairobi = currentDateNairobi.clone().startOf("day");

    // Set the end of the day in Nairobi time zone and subtract 3 hours
    const endOfDayNairobi = currentDateNairobi.clone().endOf("day");

    // Format dates to MongoDB format
    const start = new Date(startOfDayNairobi);
    const end = new Date(endOfDayNairobi);

    console.log(start);
    console.log(end);

    const pipeline = [
      {
        $match: {
          $or: [
            { createdAt: { $gte: start, $lte: end } },
            { updatedAt: { $gte: start, $lte: end } },
          ],
        },
      },
      {
        $group: {
          _id: {
            school: "$school",
            enumerator: "$modifiedBy",
            isDroppedOut: "$isDroppedOut",
            createdAt: "$createdAt",
            payam28: "$payam28",
            state10: "$state10",
            county28: "$county28",
          },
          studentCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            school: "$_id.school",
            enumerator: "$_id.enumerator",
            payam28: "$_id.payam28",
            state10: "$_id.state10",
            county28: "$_id.county28",
          },
          totalStudents: { $sum: "$studentCount" },
          totalStudentsDroppedOutByEnumerator: {
            $sum: {
              $cond: [{ $eq: ["$_id.isDroppedOut", true] }, "$studentCount", 0],
            },
          },
          totalStudentsByEnumerator: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.isDroppedOut", false] },
                    { $gte: ["$_id.createdAt", start] },
                    { $lte: ["$_id.createdAt", end] },
                  ],
                },
                "$studentCount",
                0,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.school",
          enumerators: {
            $push: {
              enumerator: "$_id.enumerator",
              totalStudentsByEnumerator: "$totalStudentsByEnumerator",
              totalStudentsDroppedByEnumerator:
                "$totalStudentsDroppedOutByEnumerator",
            },
          },
          payam28: { $first: "$_id.payam28" },
          state10: { $first: "$_id.state10" },
          county28: { $first: "$_id.county28" },
        },
      },
      {
        $project: {
          _id: 1,
          enumerators: 1,
          payam28: 1,
          state10: 1,
          county28: 1,
        },
      },
    ];

    const result = await SchoolData.aggregate(pipeline);

    res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching schools enrollment:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const fetchState10EnrollmentSummary = async (req, res) => {
  try {
    // Aggregate pipeline to retrieve state10 summary
    const state10Summary = await SchoolData.aggregate([
      // Your existing pipeline stages here...
      // Match documents with modifiedBy field
      {
        $match: {
          modifiedBy: { $exists: true, $ne: null },
        },
      },
      // Group by state10 to collect unique state10 values
      {
        $group: {
          _id: "$state10",
          modifiedBy: {
            $addToSet: "$modifiedBy",
          },
        },
      },
      // Project stage to shape the output
      {
        $project: {
          _id: 1,
          modifiedBy: 1,
        },
      },
      // Lookup stage to get details for each modifiedBy
      {
        $lookup: {
          from: "schooldata2023",
          localField: "_id",
          foreignField: "state10",
          as: "details",
        },
      },
      // Unwind the details array
      {
        $unwind: "$details",
      },
      // Group by state10 and modifiedBy to calculate statistics
      {
        $group: {
          _id: {
            state10: "$_id",
            modifiedBy: "$details.modifiedBy",
          },
          totalEnrolled: {
            $sum: {
              $cond: [{ $not: "$details.isDroppedOut" }, 1, 0],
            },
          },
          totalDropped: {
            $sum: {
              $cond: ["$details.isDroppedOut", 1, 0],
            },
          },
          totalSchools: {
            $addToSet: "$details.school",
          },
          uniquePayam28: {
            $addToSet: "$details.payam28",
          },
          uniqueCounty28: {
            $addToSet: "$details.county28",
          },
        },
      },
      // Group by state10 to accumulate modifiedBy statistics
      {
        $group: {
          _id: "$_id.state10",
          state10Details: {
            $push: {
              modifiedBy: "$_id.modifiedBy",
              totalEnrolled: "$totalEnrolled",
              totalDropped: "$totalDropped",
              totalSchools: { $size: "$totalSchools" },
              uniquePayam28: "$uniquePayam28",
              uniqueCounty28: "$uniqueCounty28",
            },
          },
        },
      },
    ]);

    // Additional pipeline stage to count total documents for each state and each year
    const stateYearCounts = await SchoolData.aggregate([
      // Match documents where isDroppedOut is false
      {
        $match: {
          isDroppedOut: false,
        },
      },
      // Group by state10 and year to count total documents
      {
        $group: {
          _id: {
            state10: "$state10",
            year: "$year",
          },
          total: { $sum: 1 },
        },
      },
      // Group by state10 to collect year counts
      {
        $group: {
          _id: "$_id.state10",
          stats: {
            $push: {
              year: "$_id.year",
              total: "$total",
            },
          },
        },
      },
    ]);

    // Merge state year counts into state10Summary
    state10Summary.forEach((state10) => {
      const stats =
        stateYearCounts.find((item) => item._id === state10._id)?.stats || [];
      state10.stats = stats.reduce((acc, curr) => {
        acc[curr.year] = curr.total;
        return acc;
      }, {});
    });

    res.status(200).json(state10Summary);
  } catch (error) {
    console.log("Error fetching state10 summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// for a specific modifiedBy if specified
const getUniqueSchoolsDetailsPayam = async (req, res) => {
  try {
    const { payam28, modifiedBy } = req.body;

    // Define the match condition for the modifiedBy field
    const matchCondition = modifiedBy ? { modifiedBy: modifiedBy } : {};

    // Aggregate pipeline to retrieve unique schools based on specified payam28
    const uniqueSchools = await SchoolData.aggregate([
      {
        $match: { payam28: payam28, ...matchCondition }, // Include the match condition for modifiedBy
      },
      {
        $group: {
          _id: {
            school: "$school",
            state10: "$state10",
            payam28: "$payam28",
            county28: "$county28",
            code: "$code",
            year: "$year",
          },
          totalStudents: { $sum: 1 },
          totalDroppedOut: {
            $sum: { $cond: [{ $eq: ["$isDroppedOut", true] }, 1, 0] },
          },
        },
      },
      {
        $group: {
          _id: {
            school: "$_id.school",
            state10: "$_id.state10",
            payam28: "$_id.payam28",
            county28: "$_id.county28",
            code: "$_id.code",
          },
          yearDetails: {
            $push: {
              year: "$_id.year",
              totalStudents: "$totalStudents",
              totalDroppedOut: "$totalDroppedOut",
            },
          },
          totalStudents: { $sum: "$totalStudents" }, // Calculate total students for all years
        },
      },
      {
        $project: {
          _id: 0,
          school: "$_id.school",
          state10: "$_id.state10",
          payam28: "$_id.payam28",
          county28: "$_id.county28",
          totalStudents: 1,
          yearDetails: 1,
          code: "$_id.code",
        },
      },
    ]);

    res.status(200).json(uniqueSchools);
  } catch (error) {
    console.log("Error fetching unique schools details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// learnerUniqueID, reference



const updateSchoolDataLearnerUniqueID = async (req, res) => {
  const {
    state10,
    code,
    education,
    gender,
    firstName,
    middleName,
    lastName,
    learnerUniqueID,
    reference,
  } = req.body;

  // Build the query dynamically
  const query = {
    state10,
    code,
    education,
    gender,
    firstName,
  };

  if (middleName) {
    query.middleName = middleName;
  }

  if (lastName) {
    query.lastName = lastName;
  }

  try {
    const updatedDoc = await SchoolData.findOneAndUpdate(
      query,
      { learnerUniqueID, reference },
      { new: true }
    );

    if (!updatedDoc) {
      console.log("Document not found");

      return res.status(404).json({ message: "Document not found" });
    }

    console.log("success");
    res.status(200).json({ message: "success" });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({ message: error.message });
  }
};



const fetchDocumentsWithDelay = async (req, res) => {
  try {
    const documents = await SchoolDataCtCash.find().exec();
    let count = 0;

    for (const document of documents) {
      console.log(`Document ${count + 1}:`);

      // Send the document to the remote server
      try {
        await axios.patch(
           "http://35.244.58.160/express/data-set/updateSchoolDataLearnerUniqueID",
           document
         );
        console.log(`Updated document ${count + 1}:`);
      } catch (error) {
        console.error(`Failed to update document ${count + 1}:`, error.message);
      }

      // Increment the count
      count += 1;
    }

    console.log("All documents processed");
    res.status(200).json({ message: "All documents processed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  dataSet,
  countyPupilTotal,
  countyPayamPupilTotals,
  payamSchoolPupilTotals,
  getStudentsInSchool,
  dataSet_2023,
  statePupilTotal_2023,
  countyPupilTotal_2023,
  countyPayamPupilTotals_2023,
  payamSchoolPupilTotals_2023,
  getStudentsInClass_2023,
  getStudentsInSchool_2023,
  updateSchoolDataFields_2023,
  getSingleStudents_2023,
  registerStudent2024,
  deleteStudentById,
  updateSchoolDataFieldsBulk,
  payamSchoolDownload,
  bulkUpdateStateFields,
  trackOverall,
  trackState,
  trackCounty,
  trackPayam,
  trackSchool,
  stateMaleFemaleStat,
  findEnrolledSchools,
  findNotEnrolledSchools,
  fetchSchoolsPerState,
  totalNewStudentsPerState,
  totalNewStudentsPerStateDroppedOut,
  totalNewStudentsPerStateDisabled,
  fetchSchoolsEnrollmentToday,
  getUniqueSchoolsPerState10,
  fetchState10EnrollmentSummary,
  getUniqueSchoolsDetailsPayam,
  updateSchoolDataLearnerUniqueID,
  fetchDocumentsWithDelay,
};


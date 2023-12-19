const { default: axios } = require("axios");
const Dataset = require("../models/ssams");
const SchoolData = require("../models/2023Data");

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
      pupilCountOperator, // New parameter for the operator
      sortBy,
      sortOrder,
    } = req.query;

    // Build the query object
    const query = {};
    if (stateCode) query.stateCode = stateCode;

    // Case-insensitive search for countyName
    if (countyName) query.countyName = { $regex: new RegExp(countyName, "i") };

    if (educationLevel) query.educationLevel = educationLevel;
    if (payamName) query.payamName = payamName;
    if (code) query.code = code;

    // Case-insensitive search for schoolName
    if (schoolName) query.schoolName = { $regex: new RegExp(schoolName, "i") };

    // Build the pupilCount query based on the specified operator
    // Build the pupilCount query based on the specified operator
    if (pupilCount && pupilCountOperator) {
      switch (pupilCountOperator) {
        case "eq":
          // Equal to: Matches documents where the pupilCount is equal to the specified value.
          query.pupilCount = { $eq: pupilCount };
          break;
        case "ne":
          // Not equal to: Matches documents where the pupilCount is not equal to the specified value.
          query.pupilCount = { $ne: pupilCount };
          break;
        case "gt":
          // Greater than: Matches documents where the pupilCount is greater than the specified value.
          query.pupilCount = { $gt: pupilCount };
          break;
        case "lt":
          // Less than: Matches documents where the pupilCount is less than the specified value.
          query.pupilCount = { $lt: pupilCount };
          break;
        case "gte":
          // Greater than or equal to: Matches documents where the pupilCount is greater than or equal to the specified value.
          query.pupilCount = { $gte: pupilCount };
          break;
        case "lte":
          // Less than or equal to: Matches documents where the pupilCount is less than or equal to the specified value.
          query.pupilCount = { $lte: pupilCount };
          break;
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
    } = req.query;

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

    const response = await SchoolData.find(query).sort(sort);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching dataset:", error);
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

const payamSchoolPupilTotals_2023 = async (req, res) => {
  try {
    // Extract payam28 from the request parameters
    const { payam28 } = req.body;

    // Validate if payam28 is provided
    if (!payam28) {
      return res
        .status(400)
        .json({ success: false, error: "Payam name is required" });
    }

    // Fetch data from the database
    const result = await SchoolData.aggregate([
      {
        $match: { payam28: payam28 }, // Use payam28 instead of payamName
      },
      {
        $group: {
          _id: "$school", // Use school instead of schoolName
          totalPupils: { $sum: "$eligible" }, // Use eligible instead of pupilCount
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

const getStudentsInSchool_2023 = async (req, res) => {
  try {
    // Extract schoolName from the request body
    const { schoolName } = req.body;

    // Validate if schoolName is provided
    if (!schoolName) {
      return res
        .status(400)
        .json({ success: false, error: "School name is required" });
    }

    // Use the find method to get documents matching the schoolName
    const result = await SchoolData.find({ school: schoolName });

    // Return the formatted result
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching students in school:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getStudentsInClass_2023 = async (req, res) => {
  try {
    // Extract schoolName from the request body
    const { schoolName, form } = req.body;

    // Validate if schoolName && form is provided
    if (!schoolName) {
      return res
        .status(400)
        .json({ success: false, error: "School name is required" });
    }

     if (!form) {
       return res
         .status(400)
         .json({ success: false, error: "Form name is required" });
     }

    // Use the find method to get documents matching the schoolName
    const result = await SchoolData.find({ school: schoolName, form:form });

    // Return the formatted result
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
      state,
      stateName,
      county28: county,
      countryOfOrigin,
      payam28: payam,
      school: schoolName,
      education,
      class: studentClass,
      gender,
      dob,
      "first name": firstName,
      "middle name": middleName,
      "last name": lastName,
      disabilities,
      houseHold,
      pregnantOrNursing,
      reference: generateUniqueCode(),
    });

    // const newRegistration2024 = new SchoolData2024({
    //   year,
    //   state,
    //   stateName,
    //   county,
    //   countryOfOrigin,
    //   payam,
    //   school: schoolName,
    //   education,
    //   class: studentClass,
    //   gender,
    //   dob,
    //   firstName,
    //   middleName,
    //   lastName,
    //   disabilities,
    //   houseHold,
    //   pregnantOrNursing,
    // });

    // Save the registration data to the database
    const reg = await newRegistration2023.save();
    console.log(reg);

    // await newRegistration2024.save();

    // Respond with a success message
    res
      .status(201)
      .json({ success: true, message: "student registered successfully." });
  } catch (error) {
    console.log(error);
    // Handle errors and respond with an error message
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
};



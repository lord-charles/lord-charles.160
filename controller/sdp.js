const SdpInputs = require("../models/sdp");

const createSdp = async (req, res) => {
  try {
    const {
      Sdp,
      schoolCode,
      schoolType,
      year,
      schoolName,
      category,
      county28,
      payam28,
      state10,
    } = req.body;

    // Check if required inputs are provided
    if (!Sdp || !schoolCode || !schoolName) {
      return res.status(400).json({
        message: "Sdp, schoolCode, and schoolName are required",
      });
    }

    // Create a new instance of the Sdps model
    const newSdp = new SdpInputs({
      Sdp,
      schoolCode,
      schoolType,
      schoolName,
      year,
      category,
      county28,
      payam28,
      state10,
    });

    // Save the new physical input to the database
    const savedSdp = await newSdp.save();

    res.status(201).json({ success: true, savedSdp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSdp = async (req, res) => {
  try {
    const { id } = req.params;
    const { Sdp, schoolCode, year, approved } = req.body;

    // Update the physical input in the database
    const result = await SdpInputs.updateOne(
      { _id: id },
      { Sdp, schoolCode, year, approved },
      { new: true }
    );

    if (result.nModified === 0) {
      return res.status(404).json({ message: "Physical input not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSdpsBySchoolAndYear = async (req, res) => {
  try {
    const { schoolCode } = req.body;
    let { year } = req.body;
    let { category } = req.body;

    // Validate if schoolCode is provided
    if (!schoolCode) {
      return res.status(400).json({ message: "schoolCode is required" });
    }

    // Query conditions based on schoolCode and year
    const query = { schoolCode };
    if (year) {
      query.year = year;
    }

    if (category) {
      query.category = category;
    }

    // Retrieve physical inputs based on the query conditions
    const Sdps = await SdpInputs.find(query);

    res.status(200).json(Sdps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// const getSchoolsWithAllDocuments = async (req, res) => {
//   try {
//     const pipeline = [
//       {
//         $group: {
//           _id: "$schoolCode",
//           schoolName: { $first: "$schoolName" },
//           physicalInputs: {
//             $push: {
//               $cond: [
//                 { $eq: ["$category", "physical inputs"] },
//                 "$$ROOT",
//                 null,
//               ],
//             },
//           },
//           generalSupport: {
//             $push: {
//               $cond: [
//                 { $eq: ["$category", "general support"] },
//                 "$$ROOT",
//                 null,
//               ],
//             },
//           },
//           learningQuality: {
//             $push: {
//               $cond: [
//                 { $eq: ["$category", "learning quality"] },
//                 "$$ROOT",
//                 null,
//               ],
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           schoolCode: "$_id",
//           schoolName: 1,
//           physicalInputs: {
//             $filter: {
//               input: "$physicalInputs",
//               as: "doc",
//               cond: { $ne: ["$$doc", null] },
//             },
//           },
//           generalSupport: {
//             $filter: {
//               input: "$generalSupport",
//               as: "doc",
//               cond: { $ne: ["$$doc", null] },
//             },
//           },
//           learningQuality: {
//             $filter: {
//               input: "$learningQuality",
//               as: "doc",
//               cond: { $ne: ["$$doc", null] },
//             },
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "schooldata2023",
//           localField: "schoolCode",
//           foreignField: "code",
//           as: "schoolData",
//         },
//       },
//       {
//         $addFields: {
//           schoolData: { $arrayElemAt: ["$schoolData", 0] },
//         },
//       },
//       {
//         $project: {
//           schoolCode: 1,
//           schoolName: 1,
//           state10: "$schoolData.state10",
//           payam28: "$schoolData.payam28",
//           county28: "$schoolData.county28",
//           physicalInputs: 1,
//           generalSupport: 1,
//           learningQuality: 1,
//         },
//       },
//     ];

//     const result = await SdpInputs.aggregate(pipeline).exec();
//     res.json(result);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Server error");
//   }
// };

const getSchoolsWithAllDocuments = async (req, res) => {
  try {
    const { state10, payam28, county28, year, schoolType } = req.body;
    const specifiedYear = year || new Date().getFullYear();
    const matchStage = {
      year: specifiedYear,
      ...(state10 && { state10 }),
      ...(payam28 && { payam28 }),
      ...(county28 && { county28 }),
      ...(schoolType && { schoolType }),
    };

    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: "$schoolCode",
          schoolName: { $first: "$schoolName" },
          physicalInputs: {
            $push: {
              $cond: [{ $eq: ["$category", "physical inputs"] }, "$Sdp", null],
            },
          },
          generalSupport: {
            $push: {
              $cond: [{ $eq: ["$category", "general support"] }, "$Sdp", null],
            },
          },
          learningQuality: {
            $push: {
              $cond: [{ $eq: ["$category", "learning quality"] }, "$Sdp", null],
            },
          },
          state10: { $first: "$state10" },
          payam28: { $first: "$payam28" },
          county28: { $first: "$county28" },
        },
      },
      {
        $project: {
          schoolName: 1,
          state10: 1,
          payam28: 1,
          county28: 1,
          physicalInputs: {
            $filter: {
              input: "$physicalInputs",
              as: "sdp",
              cond: { $ne: ["$$sdp", null] },
            },
          },
          generalSupport: {
            $filter: {
              input: "$generalSupport",
              as: "sdp",
              cond: { $ne: ["$$sdp", null] },
            },
          },
          learningQuality: {
            $filter: {
              input: "$learningQuality",
              as: "sdp",
              cond: { $ne: ["$$sdp", null] },
            },
          },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: [{ $size: "$physicalInputs" }, 0] },
              { $gt: [{ $size: "$generalSupport" }, 0] },
              { $gt: [{ $size: "$learningQuality" }, 0] },
            ],
          },
        },
      },
      {
        $project: {
          schoolName: 1,
          state10: 1,
          payam28: 1,
          county28: 1,
          physicalInputs: 1,
          generalSupport: 1,
          learningQuality: 1,
        },
      },
    ];

    const result = await SdpInputs.aggregate(pipeline).exec();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};



module.exports = {
  createSdp,
  updateSdp,
  getAllSdpsBySchoolAndYear,
  getSchoolsWithAllDocuments,
};

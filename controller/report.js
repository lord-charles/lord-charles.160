const SchoolData = require("../models/2023Data");

const getEnrollmentReport = async (req, res) => {
  const { state28 } = req.query; // Get the state from the query parameters

  if (!state28) {
    return res.status(400).json({ error: "State is required" });
  }

  try {
    const report = await SchoolData.aggregate([
      { $match: { state28 } },
      {
        $group: {
          _id: { code: "$code", county: "$county28", payam: "$payam28" },
          totalPromoted: { $sum: { $cond: ["$isPromoted", 1, 0] } },
          totalNew: {
            $sum: {
              $cond: [{ $eq: ["$year", new Date().getFullYear()] }, 1, 0],
            },
          },
          totalDroppedOut: { $sum: { $cond: ["$isDroppedOut", 1, 0] } },
          totalPromotedMale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["Male", "M"]] },
                    { $eq: ["$isPromoted", true] },
                    { $eq: ["$isDroppedOut", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalPromotedFemale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["Female", "F"]] },
                    { $eq: ["$isPromoted", true] },
                    { $eq: ["$isDroppedOut", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalNewMale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["Male", "M"]] },
                    { $eq: ["$year", new Date().getFullYear()] },
                    { $eq: ["$isDroppedOut", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalNewFemale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["Female", "F"]] },
                    { $eq: ["$year", new Date().getFullYear()] },
                    { $eq: ["$isDroppedOut", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalDroppedOutMale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["Male", "M"]] },
                    { $eq: ["$isDroppedOut", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalDroppedOutFemale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$gender", ["Female", "F"]] },
                    { $eq: ["$isDroppedOut", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          code: "$_id.code",
          county: "$_id.county",
          payam: "$_id.payam",
          totalPromoted: 1,
          totalNew: 1,
          totalDroppedOut: 1,
          totalPromotedMale: 1,
          totalPromotedFemale: 1,
          totalNewMale: 1,
          totalNewFemale: 1,
          totalDroppedOutMale: 1,
          totalDroppedOutFemale: 1,
        },
      },
    ]);

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




module.exports = { getEnrollmentReport };

const SchoolData = require("../models/2023Data");

const getEnrollmentReport = async (req, res) => {
  const { state28 } = req.query; // Get the state from the query parameters

  if (!state28) {
    return res.status(400).json({ error: "State is required" });
  }

  const currentYear = new Date().getFullYear();

  try {
    const report = await SchoolData.aggregate([
      { $match: { state28 } },
      {
        $facet: {
          promotedMale: [
            {
              $match: {
                $or: [{ gender: "Male" }, { gender: "M" }],
                isPromoted: true,
                isDroppedOut: false,
              },
            },
            { $count: "count" },
          ],
          promotedFemale: [
            {
              $match: {
                $or: [{ gender: "Female" }, { gender: "F" }],
                isPromoted: true,
                isDroppedOut: false,
              },
            },
            { $count: "count" },
          ],
          newMale: [
            {
              $match: {
                $or: [{ gender: "Male" }, { gender: "M" }],
                year: currentYear,
                isDroppedOut: false,
              },
            },
            { $count: "count" },
          ],
          newFemale: [
            {
              $match: {
                $or: [{ gender: "Female" }, { gender: "F" }],
                year: currentYear,
                isDroppedOut: false,
              },
            },
            { $count: "count" },
          ],
          droppedOutMale: [
            {
              $match: {
                $or: [{ gender: "Male" }, { gender: "M" }],
                isDroppedOut: true,
              },
            },
            { $count: "count" },
          ],
          droppedOutFemale: [
            {
              $match: {
                $or: [{ gender: "Female" }, { gender: "F" }],
                isDroppedOut: true,
              },
            },
            { $count: "count" },
          ],
          aggregatedData: [
            {
              $group: {
                _id: { code: "$code", county: "$county28", payam: "$payam28" },
                totalPromoted: { $sum: { $cond: ["$isPromoted", 1, 0] } },
                totalNew: {
                  $sum: { $cond: [{ $eq: ["$year", currentYear] }, 1, 0] },
                },
                totalDroppedOut: { $sum: { $cond: ["$isDroppedOut", 1, 0] } },
              },
            },
            {
              $project: {
                code: "$_id.code",
                county: "$_id.county",
                payam: "$_id.payam",
                totalPromoted: 1,
                totalNew: 1,
                totalDroppedOut: 1,
                _id: 0,
              },
            },
          ],
        },
      },
      {
        $project: {
          totalPromotedMale: {
            $ifNull: [{ $arrayElemAt: ["$promotedMale.count", 0] }, 0],
          },
          totalPromotedFemale: {
            $ifNull: [{ $arrayElemAt: ["$promotedFemale.count", 0] }, 0],
          },
          totalNewMale: {
            $ifNull: [{ $arrayElemAt: ["$newMale.count", 0] }, 0],
          },
          totalNewFemale: {
            $ifNull: [{ $arrayElemAt: ["$newFemale.count", 0] }, 0],
          },
          totalDroppedOutMale: {
            $ifNull: [{ $arrayElemAt: ["$droppedOutMale.count", 0] }, 0],
          },
          totalDroppedOutFemale: {
            $ifNull: [{ $arrayElemAt: ["$droppedOutFemale.count", 0] }, 0],
          },
          aggregatedData: 1,
        },
      },
    ]);

    const result = report[0] || {};
    const formattedResult = result.aggregatedData.map((item) => ({
      code: item.code,
      county: item.county,
      payam: item.payam,
      totalPromoted: item.totalPromoted,
      totalNew: item.totalNew,
      totalDroppedOut: item.totalDroppedOut,
      totalPromotedMale: result.totalPromotedMale,
      totalPromotedFemale: result.totalPromotedFemale,
      totalNewMale: result.totalNewMale,
      totalNewFemale: result.totalNewFemale,
      totalDroppedOutMale: result.totalDroppedOutMale,
      totalDroppedOutFemale: result.totalDroppedOutFemale,
    }));

    res.status(200).json(formattedResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getEnrollmentReport };

module.exports = { getEnrollmentReport };

const SchoolData = require("../models/2023Data");
const CTCriteria = require("../models/CTCriteria");

// Get counties with eligible learners based on disability criteria
const getEligibleCountiesWithDisability = async (req, res) => {
  try {
    const { state, ct, lwd } = req.body;

    if (!state) {
      return res.status(400).json({
        success: false,
        error: "State is required"
      });
    }

    let match = {
      state10: state,
      isDroppedOut: false
    };
    if (lwd) {
      match.isWithDisability = true;
    }

    if (ct) {
      // Get active disability criteria
      const criteria = await CTCriteria.find({ isActive: true });
      if (!criteria || criteria.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No active disability criteria found"
        });
      }
      // Flatten all classes with male disability requirement from all criteria
      const classesWithDisability = criteria
        .flatMap(c => c.classes.filter(cls => cls.requiresDisability.male).map(cls => cls.className));
      match.class = { $in: classesWithDisability };
      match.$or = [
        { gender: "M", isWithDisability: true },
        { gender: "F" }
      ];
    }

    const result = await SchoolData.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$county28",
          totalPupils: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $project: {
          _id: 1,
          totalPupils: 1,
          id: { $arrayElemAt: ["$ids", 0] }
        }
      }
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching eligible counties:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Get payams with eligible learners
const getEligiblePayamsWithDisability = async (req, res) => {
  try {
    const { county28, state10, ct, lwd } = req.body;

    if (!county28) {
      return res.status(400).json({
        success: false,
        error: "County is required"
      });
    }

    let match = {
      county28,
      isDroppedOut: false
    };
    if (state10) match.state10 = state10;
    if (lwd) match.isWithDisability = true;

    if (ct) {
      const criteria = await CTCriteria.find({ isActive: true });
      if (!criteria || criteria.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No active disability criteria found"
        });
      }
      const classesWithDisability = criteria
        .flatMap(c => c.classes.filter(cls => cls.requiresDisability.male).map(cls => cls.className));
      match.class = { $in: classesWithDisability };
      match.$or = [
        { gender: "M", isWithDisability: true },
        { gender: "F" }
      ];
    }

    const result = await SchoolData.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$payam28",
          totalPupils: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          totalPupils: 1
        }
      }
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching eligible payams:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Get eligible schools and their learners
const getEligibleSchoolsWithDisability = async (req, res) => {
  try {
    const { payam28, county28, state10, ct, lwd } = req.body;

    if (!payam28) {
      return res.status(400).json({
        success: false,
        error: "Payam is required"
      });
    }

    let matchConditions = [
      { $eq: [{ $toLower: "$payam28" }, payam28.toLowerCase()] }
    ];
    if (county28) {
      matchConditions.push({ $eq: [{ $toLower: "$county28" }, county28.toLowerCase()] });
    }
    if (state10) {
      matchConditions.push({ $eq: ["$state10", state10] });
    }
   

    let additionalMatch = {};
    if (lwd) {
      additionalMatch.isWithDisability = true;
    }
    if (ct) {
      const criteria = await CTCriteria.find({ isActive: true });
      if (!criteria || criteria.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No active disability criteria found"
        });
      }
      const classesWithDisability = criteria.flatMap(c => c.classes.filter(cls => cls.requiresDisability.male).map(cls => cls.className));
      matchConditions.push({ $in: ["$class", classesWithDisability] });
      additionalMatch.$or = [
        { gender: "M", isWithDisability: true },
        { gender: "F" }
      ];
    }

    const result = await SchoolData.aggregate([
      {
        $match: {
          isDroppedOut: false,
          $expr: { $and: matchConditions },
          ...additionalMatch
        }
      },
      {
        $group: {
          _id: "$code",
          school: { $first: "$school" },
          totalEligibleLearners: { $sum: 1 },
          disabledLearners: {
            $sum: { $cond: ["$isWithDisability", 1, 0] }
          }
        }
      },
      {
        $project: {
          code: "$_id",
          school: 1,
          totalEligibleLearners: 1,
          disabledLearners: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching eligible schools:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Get eligible students in a school
const getEligibleStudentsInSchool = async (req, res) => {
  try {
    const { code, ct, lwd } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "School code is required"
      });
    }

    let query = { code, isDroppedOut: false };
    if (ct) {
      const criteria = await CTCriteria.find({ isActive: true });
      if (!criteria || criteria.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No active disability criteria found"
        });
      }
      const classesWithDisability = criteria.flatMap(c => c.classes.filter(cls => cls.requiresDisability.male).map(cls => cls.className));
      query.class = { $in: classesWithDisability };
      query.$or = [
        { gender: "M", isWithDisability: true },
        { gender: "F" }
      ];
    }
    if (lwd) {
      query.isWithDisability = true;
    }

    const result = await SchoolData.find(query);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching eligible students:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = {
  getEligibleCountiesWithDisability,
  getEligiblePayamsWithDisability,
  getEligibleSchoolsWithDisability,
  getEligibleStudentsInSchool
};

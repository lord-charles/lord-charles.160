const SchoolData = require("../models/2023Data");
const CTCriteria = require("../models/CTCriteria");


exports.getEligibleLearners = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({
                success: false,
                error: "School code is required"
            });
        }

        const ctCriteria = await CTCriteria.find({ isActive: true });
        const eligibleMap = {};
        ctCriteria.forEach(c => {
            eligibleMap[c.educationType] = c.classes.map(cls => ({
                className: cls.className,
                requiresDisability: cls.requiresDisability
            }));
        });

        // Build $or array for eligible learners
        const orConditions = [];
        Object.entries(eligibleMap).forEach(([educationType, classes]) => {
            classes.forEach(cls => {
                // Male
                orConditions.push({
                    education: educationType,
                    class: cls.className,
                    gender: "M",
                    ...(cls.requiresDisability.male
                        ? { isWithDisability: true }
                        : {})
                });
                // Female
                orConditions.push({
                    education: educationType,
                    class: cls.className,
                    gender: "F",
                    ...(cls.requiresDisability.female
                        ? { isWithDisability: true }
                        : {})
                });
            });
        });

        const query = {
            code,
            $or: orConditions
        };
        const projection = {
            firstName: 1,
            middleName: 1,
            lastName: 1,
            gender: 1,
            isWithDisability: 1,
            education: 1,
            class: 1,
            code: 1,
            payam28: 1,
            county28: 1,
            state10: 1,
            school: 1
        };

        const learners = await SchoolData.find(query, projection).lean();
        res.status(200).json(learners);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch eligible learners", details: err.message });
    }
};


exports.getEligibleLearnersStats = async (req, res) => {
    try {
        const { state10, payam28, county28, code } = req.query;
        const params = {}
        if (state10) params.state10 = state10;
        if (payam28) params.payam28 = payam28;
        if (county28) params.county28 = county28;
        if (code) params.code = code;

        // Find all active CT criteria
        const ctCriteria = await CTCriteria.find({ isActive: true });
        const eligibleMap = {};
        ctCriteria.forEach(c => {
            eligibleMap[c.educationType] = c.classes.map(cls => ({
                className: cls.className,
                requiresDisability: cls.requiresDisability
            }));
        });
        // Build $or array for eligible learners
        const orConditions = [];
        Object.entries(eligibleMap).forEach(([educationType, classes]) => {
            classes.forEach(cls => {
                // Male
                orConditions.push({
                    education: educationType,
                    class: cls.className,
                    gender: "M",
                    ...(cls.requiresDisability.male
                        ? { isWithDisability: true }
                        : {})
                });
                // Female
                orConditions.push({
                    education: educationType,
                    class: cls.className,
                    gender: "F",
                    ...(cls.requiresDisability.female
                        ? { isWithDisability: true }
                        : {})
                });
            });
        });
        // Only validated learners + filters
        const matchStage = {
            ...params,
            $or: orConditions
        };
        // Single aggregation for stats and unique code count
        const pipeline = [
            { $match: matchStage },
            {
                $facet: {
                    stats: [
                        {
                            $group: {
                                _id: {
                                    education: "$education",
                                    gender: "$gender",
                                    isWithDisability: "$isWithDisability"
                                },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    uniqueSchools: [
                        { $group: { _id: "$code" } },
                        { $count: "uniqueSchoolsCount" }
                    ],
                    states: [
                        {
                            $group: {
                                _id: "$state10",
                                total: { $sum: 1 },
                                male: {
                                    $sum: {
                                        $cond: [{ $eq: ["$gender", "M"] }, 1, 0]
                                    }
                                },
                                female: {
                                    $sum: {
                                        $cond: [{ $eq: ["$gender", "F"] }, 1, 0]
                                    }
                                },
                                lwd: {
                                    $sum: {
                                        $cond: [{ $eq: ["$isWithDisability", true] }, 1, 0]
                                    }
                                },
                                schools: { $addToSet: "$code" }
                            }
                        },
                        {
                            $project: {
                                state: "$_id",
                                total: 1,
                                male: 1,
                                female: 1,
                                lwd: "$lwd",
                                schools: { $size: "$schools" },
                                _id: 0
                            }
                        }
                    ]
                }
            }
        ];
        const aggResult = await SchoolData.aggregate(pipeline);
        const results = aggResult[0]?.stats || [];
        const uniqueSchoolsCount = aggResult[0]?.uniqueSchools[0]?.uniqueSchoolsCount || 0;
        const states = aggResult[0]?.states || [];

        // Format stats by education type
        const stats = {};
        results.forEach(r => {
            const { education, gender, isWithDisability } = r._id;
            if (!stats[education]) stats[education] = {
                total: 0,
                male: 0,
                female: 0,
                maleWithDisability: 0,
                femaleWithDisability: 0
            };
            stats[education].total += r.count;
            if (gender === "M") {
                stats[education].male += r.count;
                if (isWithDisability) stats[education].maleWithDisability += r.count;
            }
            if (gender === "F") {
                stats[education].female += r.count;
                if (isWithDisability) stats[education].femaleWithDisability += r.count;
            }
        });
        // Overall summary
        let overall = {
            total: 0,
            male: 0,
            female: 0,
            maleWithDisability: 0,
            femaleWithDisability: 0
        };
        Object.values(stats).forEach(s => {
            overall.total += s.total;
            overall.male += s.male;
            overall.female += s.female;
            overall.maleWithDisability += s.maleWithDisability;
            overall.femaleWithDisability += s.femaleWithDisability;
        });
        res.status(200).json({ overall, byEducation: stats, totalSchools: uniqueSchoolsCount, states });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch eligible learners stats", details: err.message });
    }
};

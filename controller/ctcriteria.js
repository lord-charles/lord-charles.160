const CTCriteria = require("../models/CTCriteria");

// Create new CT Criteria
exports.createCTCriteria = async (req, res) => {
    try {
        const academicYear = parseInt(req.body.academicYear, 10);
        if (!academicYear) {
            return res.status(400).json({ error: "academicYear is required" });
        }
        const ctCriteria = new CTCriteria({
            ...req.body,
            academicYear,
            targeting: cleanTargeting(req.body.targeting),
            createdBy: req.authUser?.username || req.body.createdBy,
        });
        await ctCriteria.save();
        res.status(201).json(ctCriteria);
    } catch (err) {
        res.status(400).json({ error: "Failed to create CT Criteria", details: err.message });
    }
};

const TARGET_KEYS = ["ownership", "states", "counties", "payams"];

// Keep only known targeting lists, de-duplicated
const cleanTargeting = (t = {}) =>
    Object.fromEntries(
        TARGET_KEYS.map((k) => [
            k,
            Array.isArray(t[k]) ? [...new Set(t[k].filter(Boolean).map(String))] : [],
        ])
    );

// Get CT Criteria (?year= limits to one academic year)
exports.getAllCTCriteria = async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10);
        const criteria = await CTCriteria.find(year ? { academicYear: year } : {}).sort({
            tranche: 1,
            educationType: 1,
        });
        res.status(200).json(criteria);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch CT Criteria", details: err.message });
    }
};

// Get CT Criteria by ID
exports.getCTCriteriaById = async (req, res) => {
    try {
        const { id } = req.params;
        const criteria = await CTCriteria.findById(id);
        if (!criteria) return res.status(404).json({ error: "CT Criteria not found" });
        res.status(200).json(criteria);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch CT Criteria", details: err.message });
    }
};

// Update CT Criteria
exports.updateCTCriteria = async (req, res) => {
    try {
        const { id } = req.params;
        const update = { ...req.body, updatedBy: req.authUser?.username || req.body.updatedBy };
        if (update.targeting) update.targeting = cleanTargeting(update.targeting);
        if (update.academicYear !== undefined) {
            update.academicYear = parseInt(update.academicYear, 10);
            if (!update.academicYear) {
                return res.status(400).json({ error: "academicYear must be a year" });
            }
        }
        const updated = await CTCriteria.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
        });
        if (!updated) return res.status(404).json({ error: "CT Criteria not found" });
        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ error: "Failed to update CT Criteria", details: err.message });
    }
};

// Delete CT Criteria
exports.deleteCTCriteria = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CTCriteria.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: "CT Criteria not found" });
        res.status(200).json({ message: "CT Criteria deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete CT Criteria", details: err.message });
    }
};

// Copy every criteria of one year into another (empty) year
exports.copyCTCriteria = async (req, res) => {
    try {
        const fromYear = parseInt(req.body.fromYear, 10);
        const toYear = parseInt(req.body.toYear, 10);
        if (!fromYear || !toYear || fromYear === toYear) {
            return res.status(400).json({ error: "Choose two different years" });
        }
        if (await CTCriteria.exists({ academicYear: toYear })) {
            return res.status(409).json({
                error: `${toYear} already has criteria. Remove them first or edit them directly.`,
            });
        }
        const source = await CTCriteria.find({ academicYear: fromYear }).lean();
        if (!source.length) {
            return res.status(404).json({ error: `${fromYear} has no criteria to copy` });
        }
        const by = req.authUser?.username;
        const copies = source.map(({ _id, createdAt, updatedAt, __v, ...c }) => ({
            ...c,
            academicYear: toYear,
            // Copies start inactive so nothing changes until someone reviews them
            isActive: false,
            createdBy: by,
            updatedBy: by,
        }));
        const created = await CTCriteria.insertMany(copies);
        res.status(201).json({ copied: created.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to copy CT Criteria", details: err.message });
    }
};

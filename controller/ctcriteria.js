const CTCriteria = require("../models/CTCriteria");

// Create new CT Criteria
exports.createCTCriteria = async (req, res) => {
    try {
        const ctCriteria = new CTCriteria(req.body);
        await ctCriteria.save();
        res.status(201).json(ctCriteria);
    } catch (err) {
        res.status(400).json({ error: "Failed to create CT Criteria", details: err.message });
    }
};

// Get all CT Criteria
exports.getAllCTCriteria = async (req, res) => {
    try {
        const criteria = await CTCriteria.find();
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
        const updated = await CTCriteria.findByIdAndUpdate(id, req.body, { new: true });
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

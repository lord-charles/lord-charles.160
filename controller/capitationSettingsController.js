const CapitationSettings = require("../models/capitationSettings");

// Utility: ensure tranche percentages are reasonable (optional business rule)
function validateTranchePercentages(settings) {
  const collect = (rules = []) =>
    rules.every((r) => {
      if (!r.trancheDistribution) return true;
      const {
        tranche1Pct = 0,
        tranche2Pct = 0,
        tranche3Pct = 0,
      } = r.trancheDistribution;
      const sum =
        Number(tranche1Pct) + Number(tranche2Pct) + Number(tranche3Pct);
      return sum === 100;
    });

  const capexOk = collect(settings.capitalSpend?.rules);
  const opexOk = collect(settings.capitationGrants?.rules);
  return capexOk && opexOk;
}

// Normalize payload: ensure tranche-specific inflation fields exist per rule,
// and migrate legacy fields if present.
function normalizeInflationFields(settings) {
  if (!settings || typeof settings !== "object") return settings;

  const normalizeRules = (rules = []) =>
    (Array.isArray(rules) ? rules : []).map((rule) => {
      const r = { ...rule };
      r.trancheDistribution = { ...(r.trancheDistribution || {}) };

      // Legacy: rule-level approvedInflationCorrectionPct
      const legacyRuleInfl = r.approvedInflationCorrectionPct;
      // Legacy: trancheDistribution.approvedInflationCorrectionPct
      const legacyTrancheInfl =
        r.trancheDistribution.approvedInflationCorrectionPct;

      const inferred =
        legacyRuleInfl !== undefined
          ? Number(legacyRuleInfl)
          : legacyTrancheInfl !== undefined
          ? Number(legacyTrancheInfl)
          : undefined;

      // If any legacy single inflation value exists, apply to all tranches
      if (!Number.isNaN(inferred) && inferred !== undefined) {
        r.trancheDistribution.tranche1InflationCorrectionPct = inferred;
        r.trancheDistribution.tranche2InflationCorrectionPct = inferred;
        r.trancheDistribution.tranche3InflationCorrectionPct = inferred;
      }

      // Ensure fields exist with numeric defaults
      const td = r.trancheDistribution;
      td.tranche1InflationCorrectionPct = Number(
        td.tranche1InflationCorrectionPct || 0
      );
      td.tranche2InflationCorrectionPct = Number(
        td.tranche2InflationCorrectionPct || 0
      );
      td.tranche3InflationCorrectionPct = Number(
        td.tranche3InflationCorrectionPct || 0
      );

      // Cleanup legacy properties
      delete r.approvedInflationCorrectionPct;
      delete r.trancheDistribution.approvedInflationCorrectionPct;

      return r;
    });

  const normalized = { ...settings };
  if (normalized.capitationGrants?.rules) {
    normalized.capitationGrants = {
      ...normalized.capitationGrants,
      rules: normalizeRules(normalized.capitationGrants.rules),
    };
  }
  if (normalized.capitalSpend?.rules) {
    normalized.capitalSpend = {
      ...normalized.capitalSpend,
      rules: normalizeRules(normalized.capitalSpend.rules),
    };
  }

  return normalized;
}

// GET /capitation-settings
const getAllSettings = async (req, res) => {
  try {
    const { year } = req.query;
    const query = {};
    if (year) query.academicYear = parseInt(year);
    const docs = await CapitationSettings.find(query).sort({
      academicYear: -1,
    });
    return res.status(200).json(docs);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching settings", error: err.message });
  }
};

// GET /capitation-settings/:id
const getSettingsById = async (req, res) => {
  try {
    const doc = await CapitationSettings.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Settings not found" });
    return res.status(200).json(doc);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching settings", error: err.message });
  }
};

// GET /capitation-settings/by-year/:year
const getSettingsByYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (Number.isNaN(year))
      return res.status(400).json({ message: "Invalid year" });
    const doc = await CapitationSettings.findOne({ academicYear: year });
    if (!doc)
      return res.status(404).json({ message: "Settings not found for year" });
    return res.status(200).json(doc);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching settings", error: err.message });
  }
};

// POST /capitation-settings
const createSettings = async (req, res) => {
  try {
    const payload = normalizeInflationFields(req.body || {});
    if (!payload.academicYear) {
      return res.status(400).json({ message: "academicYear is required" });
    }
    // Optional tranche validation
    if (!validateTranchePercentages(payload)) {
      return res
        .status(400)
        .json({ message: "Each rule's tranches must sum to 100%" });
    }
    const created = await CapitationSettings.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    // Handle unique index violation for academicYear
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Settings for academicYear already exist" });
    }
    return res
      .status(500)
      .json({ message: "Error creating settings", error: err.message });
  }
};

// PUT /capitation-settings/:id
const updateSettingsById = async (req, res) => {
  try {
    const payload = normalizeInflationFields(req.body || {});
    if (!validateTranchePercentages(payload)) {
      return res
        .status(400)
        .json({ message: "Each rule's tranches must sum to 100%" });
    }
    const updated = await CapitationSettings.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updated)
      return res.status(404).json({ message: "Settings not found" });
    return res.status(200).json(updated);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error updating settings", error: err.message });
  }
};

// DELETE /capitation-settings/:id
const deleteSettingsById = async (req, res) => {
  try {
    const deleted = await CapitationSettings.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Settings not found" });
    return res.status(200).json({ message: "Settings deleted" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error deleting settings", error: err.message });
  }
};

// PUT /capitation-settings/upsert-by-year/:year
const upsertByYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (Number.isNaN(year))
      return res.status(400).json({ message: "Invalid year" });
    const payload = normalizeInflationFields({
      ...(req.body || {}),
      academicYear: year,
    });

    // Debug logging
    console.log(`Upserting settings for year ${year}`);
    console.log("Payload keys:", Object.keys(payload));
    console.log(
      "Custom groups in payload:",
      Object.keys(payload).filter(
        (key) =>
          ![
            "capitationGrants",
            "capitalSpend",
            "requirements",
            "disbursement",
            "fundingTypes",
            "notes",
            "academicYear",
            "version",
            "effectiveFrom",
            "effectiveTo",
          ].includes(key)
      )
    );

    if (!validateTranchePercentages(payload)) {
      return res
        .status(400)
        .json({ message: "Each rule's tranches must sum to 100%" });
    }
    const updated = await CapitationSettings.findOneAndUpdate(
      { academicYear: year },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    console.log("Updated document keys:", Object.keys(updated.toObject()));
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error in upsertByYear:", err);
    return res
      .status(500)
      .json({ message: "Error upserting settings", error: err.message });
  }
};

// PUT /capitation-settings/add-funding-group/:year
const addFundingGroup = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (Number.isNaN(year))
      return res.status(400).json({ message: "Invalid year" });

    const { groupName, rules } = req.body;
    if (!groupName || !rules) {
      return res
        .status(400)
        .json({ message: "groupName and rules are required" });
    }

    // Find existing settings
    const settings = await CapitationSettings.findOne({ academicYear: year });
    if (!settings) {
      return res.status(404).json({ message: "Settings not found for year" });
    }

    // Add the new funding group
    settings[groupName] = { rules: normalizeInflationFields({ rules }).rules };

    // Validate tranche percentages for the new group
    if (!validateTranchePercentages({ [groupName]: { rules } })) {
      return res
        .status(400)
        .json({ message: "Each rule's tranches must sum to 100%" });
    }

    await settings.save();
    return res.status(200).json(settings);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error adding funding group", error: err.message });
  }
};

module.exports = {
  getAllSettings,
  getSettingsById,
  getSettingsByYear,
  createSettings,
  updateSettingsById,
  deleteSettingsById,
  upsertByYear,
  addFundingGroup,
};

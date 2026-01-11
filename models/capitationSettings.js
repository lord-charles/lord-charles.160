const mongoose = require("mongoose");

// Generic requirement schema (supports both scan + data flags, or only data)
const RequirementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "SDP", "Budget", "SGB", "Attendance"
    scanRequired: { type: Boolean, default: false },
    dataPostedRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

// Ownership options
const OwnershipSettingsSchema = new mongoose.Schema(
  {
    faithBased: { type: Boolean, default: false },
    public: { type: Boolean, default: true },
    private: { type: Boolean, default: false },
    community: { type: Boolean, default: true },
  },
  { _id: false }
);

// Operational status settings
const OperationalSettingsSchema = new mongoose.Schema(
  {
    schoolOperationalRequired: { type: Boolean, default: true },
  },
  { _id: false }
);

// Tranche distribution settings
const TrancheDistributionSchema = new mongoose.Schema(
  {
    tranche1Pct: { type: Number, required: true },
    tranche2Pct: { type: Number, required: true },
    tranche3Pct: { type: Number, required: true },
    tranche1InflationCorrectionPct: { type: Number, default: 0 },
    tranche2InflationCorrectionPct: { type: Number, default: 0 },
    tranche3InflationCorrectionPct: { type: Number, default: 0 },
  },
  { _id: false }
);

// Per school-type grant rule - Dynamic for any school type
const GrantRuleSchema = new mongoose.Schema(
  {
    schoolType: { type: String, required: true },
    currency: { type: String, required: true },
    amountPerLearner: { type: Number, required: true },
    amountPerSchool: { type: Number, required: true },
    exchangeRateToSSP: { type: Number, required: true },
    trancheDistribution: {
      type: TrancheDistributionSchema,
      required: true,
    },
  },
  { _id: false }
);

// Disbursement settings
const DisbursementSettingsSchema = new mongoose.Schema(
  {
    bank: { type: Boolean, default: false },
    stateMinistry: { type: Boolean, default: false },
    stateAnchor: { type: Boolean, default: false },
    thirdPartyAgents: { type: Boolean, default: false },
  },
  { _id: false }
);

// Funding types
const FundingTypesSchema = new mongoose.Schema(
  {
    capitationGrants: { type: Boolean, default: false },
    otherIncomes: { type: Boolean, default: false },
    otherDonors: { type: Boolean, default: false },
  },
  { _id: false }
);

// Complete funding group schema with all configurations
const FundingGroupSchema = new mongoose.Schema(
  {
    // Group metadata
    displayName: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["OPEX", "CAPEX", "CUSTOM"],
      required: true,
    },

    // Scope and versioning (per group)
    version: { type: String },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },

    // Requirements (per group)
    requirements: {
      items: [RequirementSchema],
      ownershipAllowed: OwnershipSettingsSchema,
      operational: OperationalSettingsSchema,
    },

    // Grant rules for this group
    rules: [GrantRuleSchema],

    // Disbursement settings (per group)
    disbursement: DisbursementSettingsSchema,

    // Funding types (per group)
    fundingTypes: FundingTypesSchema,

    // Notes (per group)
    notes: { type: String },

    // Status
    isActive: { type: Boolean, default: true },
  },
  { _id: false, timestamps: true }
);

const CapitationSettingsSchema = new mongoose.Schema(
  {
    // Global scope and versioning
    academicYear: { type: Number, required: true },
    version: { type: String },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },

    // Dynamic funding groups - each group has complete configuration
    fundingGroups: {
      type: Map,
      of: FundingGroupSchema,
      default: () => new Map(),
    },

    // Global notes
    notes: { type: String },
  },
  {
    timestamps: true,
    strict: false,
  }
);

CapitationSettingsSchema.index({ academicYear: 1 }, { unique: true });

module.exports = mongoose.model("CapitationSettings", CapitationSettingsSchema);

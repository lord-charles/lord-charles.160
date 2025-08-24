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

// Tranche distribution settings (percentages sum may be validated in app logic)
const TrancheDistributionSchema = new mongoose.Schema(
  {
    tranche1Pct: { type: Number, default: 70 },
    tranche2Pct: { type: Number, default: 20 },
    tranche3Pct: { type: Number, default: 10 },
    tranche1InflationCorrectionPct: { type: Number, default: 0 },
    tranche2InflationCorrectionPct: { type: Number, default: 0 },
    tranche3InflationCorrectionPct: { type: Number, default: 0 },
  },
  { _id: false }
);

// Per school-type grant rule (OPEX / CAPEX)
const GrantRuleSchema = new mongoose.Schema(
  {
    schoolType: { type: String, enum: ["PRI", "SEC", "ALP"], required: true },
    currency: { type: String, default: "SSP" },
    amountPerLearner: { type: Number, default: 0 },
    amountPerSchool: { type: Number, default: 0 },
    exchangeRateToSSP: { type: Number, default: 1 },
    trancheDistribution: { type: TrancheDistributionSchema, default: () => ({}) },
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
    capitationGrants: { type: Boolean, default: true }, // CG's
    otherIncomes: { type: Boolean, default: false },
    otherDonors: { type: Boolean, default: false },
  },
  { _id: false }
);

const CapitationSettingsSchema = new mongoose.Schema(
  {
    // Scope and versioning
    academicYear: { type: Number, required: true },
    version: { type: String },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },

    // Requirements
    requirements: {
      // Items that have both scan + data posted requirements
      items: {
        type: [RequirementSchema],
        default: () => [
          { name: "SDP", scanRequired: true, dataPostedRequired: true },
          { name: "Budget", scanRequired: true, dataPostedRequired: true },
          { name: "SGB", scanRequired: true, dataPostedRequired: true },
          { name: "Attendance", scanRequired: false, dataPostedRequired: true },
          { name: "Enrolment", scanRequired: false, dataPostedRequired: true },
          { name: "Accountability", scanRequired: true, dataPostedRequired: true },
        ],
      },
      ownershipAllowed: { type: OwnershipSettingsSchema, default: () => ({}) },
      operational: { type: OperationalSettingsSchema, default: () => ({}) },
    },

    // OPEX (Capitation Grants)
    capitationGrants: {
      rules: {
        type: [GrantRuleSchema],
        default: () => [
          {
            schoolType: "PRI",
            currency: "SSP",
            amountPerLearner: 200,
            amountPerSchool: 2000,
            exchangeRateToSSP: 1,
            trancheDistribution: { tranche1Pct: 70, tranche2Pct: 20, tranche3Pct: 10, tranche1InflationCorrectionPct: 0, tranche2InflationCorrectionPct: 0, tranche3InflationCorrectionPct: 0 },
          },
          {
            schoolType: "SEC",
            currency: "SSP",
            amountPerLearner: 300,
            amountPerSchool: 3000,
            exchangeRateToSSP: 1,
            trancheDistribution: { tranche1Pct: 70, tranche2Pct: 20, tranche3Pct: 10, tranche1InflationCorrectionPct: 15, tranche2InflationCorrectionPct: 15, tranche3InflationCorrectionPct: 15 },
          },
          {
            schoolType: "ALP",
            currency: "SSP",
            amountPerLearner: 200,
            amountPerSchool: 2000,
            exchangeRateToSSP: 1,
            trancheDistribution: { tranche1Pct: 70, tranche2Pct: 20, tranche3Pct: 10, tranche1InflationCorrectionPct: 0, tranche2InflationCorrectionPct: 0, tranche3InflationCorrectionPct: 0 },
          },
        ],
      },
    },

    // CAPEX (Capital Spend)
    capitalSpend: {
      rules: {
        type: [GrantRuleSchema],
        default: () => [
          {
            schoolType: "PRI",
            currency: "USD",
            amountPerLearner: 20,
            amountPerSchool: 200,
            exchangeRateToSSP: 100,
            trancheDistribution: { tranche1Pct: 70, tranche2Pct: 20, tranche3Pct: 10, tranche1InflationCorrectionPct: 0, tranche2InflationCorrectionPct: 0, tranche3InflationCorrectionPct: 0 },
          },
          {
            schoolType: "SEC",
            currency: "USD",
            amountPerLearner: 30,
            amountPerSchool: 300,
            exchangeRateToSSP: 100,
            trancheDistribution: { tranche1Pct: 70, tranche2Pct: 20, tranche3Pct: 10, tranche1InflationCorrectionPct: 0, tranche2InflationCorrectionPct: 0, tranche3InflationCorrectionPct: 0 },
          },
          {
            schoolType: "ALP",
            currency: "USD",
            amountPerLearner: 20,
            amountPerSchool: 200,
            exchangeRateToSSP: 100,
            trancheDistribution: { tranche1Pct: 70, tranche2Pct: 20, tranche3Pct: 10, tranche1InflationCorrectionPct: 0, tranche2InflationCorrectionPct: 0, tranche3InflationCorrectionPct: 0 },
          },
        ],
      },
    },

    // Disbursement and funding types
    disbursement: { type: DisbursementSettingsSchema, default: () => ({}) },
    fundingTypes: { type: FundingTypesSchema, default: () => ({ capitationGrants: true }) },

    // Notes / freeform config
    notes: { type: String },
  },
  { timestamps: true }
);

CapitationSettingsSchema.index({ academicYear: 1 }, { unique: true });

module.exports = mongoose.model("CapitationSettings", CapitationSettingsSchema);

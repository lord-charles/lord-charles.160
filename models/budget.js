const mongoose = require("mongoose");

const RevenueSchema = new mongoose.Schema({
  type: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  sourceCode: { type: String, required: true },
  group: { type: String, enum: ["OPEX", "CAPEX"], required: true },
});

const BudgetItemSchema = new mongoose.Schema({
  budgetCode: { type: String, required: true },
  description: { type: String, required: true },
  neededItems: [{ type: String }],
  units: { type: Number, required: true },
  unitCostSSP: { type: Number, required: true },
  totalCostSSP: { type: Number, required: true },
  fundingSource: { type: String, required: true },
  monthActivityToBeCompleted: { type: String, required: true },
  subCommitteeResponsible: { type: String, required: true },
  adaptationCostPercentageLWD: { type: String },
  impact: { type: String },
});

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  categoryName: { type: String, required: true },
  categoryCode: { type: String, required: true },
  items: [BudgetItemSchema],
});

// BudgetGroupSchema
const BudgetGroupSchema = new mongoose.Schema({
  group: { type: String, enum: ["OPEX", "CAPEX"], required: true },
  categories: [CategorySchema],
});

// BudgetSchema
const BudgetSchema = new mongoose.Schema({
  submittedAmount: { type: Number, required: true },
  preparedBy: { type: String, required: true },
  reviewedBy: { type: String, required: true },
  reviewDate: { type: Date, required: true },
  previousYearLedgerAccountedFor: { type: Boolean, default: false },
  groups: [BudgetGroupSchema],
});

// MetaSchema
const MetaSchema = new mongoose.Schema({
  classLevels: [{ type: String, required: true }],
  estimateLearnerEnrolment: { type: Number, required: true },
  latestAttendance: { type: Number, required: true }, // Calculated
  teachers: {
    estimatedFemale: { type: Number, required: true },
    estimatedMale: { type: Number, required: true },
    estimatedFemaleDisabled: { type: Number },
    estimatedMaleDisabled: { type: Number },
  },
  classrooms: {
    permanent: { type: Number, required: true },
    temporary: { type: Number },
    openAir: { type: Number },
  },
  governance: {
    SGB: { type: Boolean, required: true },
    SDP: { type: Boolean, required: true },
    budgetSubmitted: { type: Boolean, required: true },
    bankAccount: { type: Boolean, required: true },
  },
});

// MainSchema
const MainSchema = new mongoose.Schema({
  code: { type: String, required: true },
  year: { type: Number, required: true },
  schoolOwnerShip: { type: String },
  schoolType: { type: String },
  schoolName: { type: String },
  meta: { type: MetaSchema, required: true },
  budget: { type: BudgetSchema, required: true },
  revenues: [RevenueSchema],
});

module.exports = mongoose.model("Budget", MainSchema);

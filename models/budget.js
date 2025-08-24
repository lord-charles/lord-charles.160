const mongoose = require("mongoose");

const RevenueSchema = new mongoose.Schema({
  type: { type: String },
  category: { type: String },
  description: { type: String },
  amount: { type: Number },
  sourceCode: { type: String },
  group: { type: String, enum: ["OPEX", "CAPEX"] },
});

const BudgetItemSchema = new mongoose.Schema({
  budgetCode: { type: String },
  description: { type: String },
  neededItems: [{ type: String }],
  units: { type: Number },
  unitCostSSP: { type: Number },
  totalCostSSP: { type: Number },
  fundingSource: { type: String },
  monthActivityToBeCompleted: { type: String },
});

const CategorySchema = new mongoose.Schema({
  categoryName: { type: String },
  categoryCode: { type: String },
  items: [BudgetItemSchema],
});

// BudgetGroupSchema
const BudgetGroupSchema = new mongoose.Schema({
  group: { type: String, enum: ["OPEX", "CAPEX"] },
  categories: [CategorySchema],
});
 
// BudgetSchema
const BudgetSchema = new mongoose.Schema({
  submittedAmount: { type: Number },
  reviewedBy: { type: String },
  reviewDate: { type: Date },
  previousYearLedgerAccountedFor: { type: Boolean, default: false },
  groups: [BudgetGroupSchema],
});

// MetaSchema
const MetaSchema = new mongoose.Schema({
  classLevels: [{ type: String }],
  estimateLearnerEnrolment: { type: Number },
  latestAttendance: { type: Number },
  learners: {
    estimatedFemale: { type: Number },
    estimatedMale: { type: Number },
    estimatedFemaleDisabled: { type: Number },
    estimatedMaleDisabled: { type: Number },
  },
  teachers: {
    estimatedFemale: { type: Number },
    estimatedMale: { type: Number },
    estimatedFemaleDisabled: { type: Number },
    estimatedMaleDisabled: { type: Number },
  },
  classrooms: {
    permanent: { type: Number },
    temporary: { type: Number },
    openAir: { type: Number },
  },
  governance: {
    SGB: { type: Boolean },
    SDP: { type: Boolean },
    budgetSubmitted: { type: Boolean },
    bankAccount: { type: Boolean },
  },
  subCommitteeResponsible: {
    subCommitteeName: { type: String },
    chairperson: { type: String },
    responsibilities: { type: String },
  },
  // adaptationCostPercentageLWD: { type: String },
  impact: { type: String },
  preparation: {
    preparedBy: { type: String },
    preparationDate: { type: String },
    submittedBy: { type: String },
  },
});

// MainSchema
const MainSchema = new mongoose.Schema({
  code: { type: String },
  year: { type: Number },
  ownership: { type: String },
  schoolType: { type: String },
  school: { type: String },
  state10: { type: String },
  county28: { type: String },
  payam28: { type: String },
  meta: { type: MetaSchema },
  budget: { type: BudgetSchema },
  revenues: [RevenueSchema],
});

MainSchema.index({ code: 1 });
MainSchema.index({ year: 1 });

module.exports = mongoose.model("Budget", MainSchema);

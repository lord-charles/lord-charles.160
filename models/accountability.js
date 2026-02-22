const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Accounting Entry Schema for detailed fund accounting
const accountingEntrySchema = new Schema(
  {
    field: { type: String, required: true }, // e.g., "Teaching Materials", "Infrastructure", etc.
    value: { type: Number, required: true }, // Amount spent/allocated
    comment: { type: String }, // Additional notes/justification
    category: { type: String, default: "General" }, // OPEX, CAPEX, etc.
    dateRecorded: { type: Date, default: Date.now },
    recordedBy: { type: String }, // Who recorded this entry
  },
  { _id: true }
);

// Accountability Schema
const accountabilitySchema = new Schema({
  bankInstructed: { type: Boolean, default: false },
  returnedFunds: {
    amount: { type: Number, default: 0 },
    returnDate: { type: Date },
    reason: { type: String },
    recordedBy: { type: String },
  },
  heldFunds: {
    amount: { type: Number, default: 0 },
    heldBy: { type: String },
    reason: { type: String },
    dateHeld: { type: Date },
    recordedBy: { type: String },
  },
  waivedAmount: { type: Number, default: 0 },
  heldBy: { type: String }, // Deprecated - use heldFunds.heldBy
  heldAmount: { type: Number, default: 0 }, // Deprecated - use heldFunds.amount
  receivedBySchool: { type: Number, default: 0 },
  reviewedBy: {
    name: { type: String },
    designation: { type: String },
    reviewDate: { type: Date },
  },
  preparedBy: {
    name: { type: String },
    designation: { type: String },
    prepareDate: { type: Date },
  },
  // New field for detailed accounting entries
  accountingEntries: { type: [accountingEntrySchema], default: [] },
  // Suppliers (when disbursed through State Anchor)
  suppliers: [
    {
      name: { type: String },
      supplies: { type: String }, // What they supply
      contact: { type: String },
      amount: { type: Number },
      addedAt: { type: Date, default: Date.now },
      addedBy: { type: String },
    },
  ],
});

// Revenue Schema
const revenueSchema = new Schema({
  type: { type: String, default: "Revenue" },
  category: { type: String, default: "Not specified" },
  categoryCode: { type: String, default: "NS" },
  code: { type: String },
  group: { type: String, default: "OPEX" },
  description: { type: String, default: "No description" },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: "SSP" },
  dateReceived: { type: Date },
  accountability: {
    status: { type: String, default: "Not specified" },
    accountedPercentage: { type: String, default: "0%" },
    issues: { type: String },
  },
  attachments: { type: [String], default: [] },
});

// Expenditure Schema
const expenditureSchema = new Schema({
  category: { type: String, default: "Not specified" },
  categoryCode: { type: String, default: "NS" },
  code: { type: String },
  group: { type: String, default: "OPEX" },
  description: { type: String, default: "No description" },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: "SSP" },
  budgetCode: { type: String },
  dateSpent: { type: Date },
  attachments: { type: [String], default: [] },
});

// Tranche Schema
const trancheSchema = new Schema({
  name: { type: String },
  // Optional funding group this tranche belongs to (e.g., "opexTest", "capexTest")
  fundingGroup: { type: String },
  amountDisbursed: { type: Number, default: 0 },
  currency: { type: String, default: "SSP" },
  dateDisbursed: { type: Date },
  paidThrough: {
    type: String,
    enum: [
      "Bank Transfer",
      "Bank", // legacy
      "State Anchor",
      "Third Party Agents",
      "Pay Agent", // legacy
      "Mobile Money",
      "SMoE",
      "SMoF",
      "", // legacy/empty
    ],
    default: "",
  },
  inflationCorrection: { type: Number, default: 0 },
  previousTrancheLedgerAccountedFor: { type: Boolean },
  previousTranchLedgerAccountedForPercentage: { type: Number },
  approval: {
    approvedBy: { type: String },
    approverName: { type: String },
    approvalDate: { type: Date },
    status: { type: String, default: "Pending" },
    remarks: { type: String },
  },
  amountApproved: { type: Number, default: 0 },
  paidBy: { type: String, default: "Unknown" },
  revenues: { type: [revenueSchema], default: [] },
  expenditures: { type: [expenditureSchema], default: [] },
  fundsAccountability: { type: accountabilitySchema, default: () => ({}) },
});

// Financial Summary Schema
const financialSummarySchema = new Schema({
  openingBalance: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalExpenditure: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
  unaccountedBalance: { type: Number, default: 0 },
  previousYearLedgerAccountedFor: { type: Boolean, default: true },
  percentageAccountedPreviousYear: { type: Number, default: 0 },
});

// Main Schema
const accountabilityMainSchema = new Schema({
  code: { type: String },
  academicYear: { type: Number },
  state10: { type: String },
  county28: { type: String },
  payam28: { type: String },
  schoolName: { type: String },
  schoolType: { type: String },
  ownership: { type: String },
  financialSummary: { type: financialSummarySchema },
  tranches: { type: [trancheSchema], default: [] },
  notes: { type: String },
});

module.exports = mongoose.model("Accountability", accountabilityMainSchema);

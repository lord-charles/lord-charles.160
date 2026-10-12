const mongoose = require("mongoose");

// Who did what to which account. Written by middlewares/auditLog.js.
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorUsername: { type: String, default: null },
  targetType: { type: String, default: null },
  targetId: { type: String, default: null },
  targetUsername: { type: String, default: null },
  // Names of the fields sent with the change (values are not stored)
  fields: [String],
  reason: { type: String, default: null },
  statusCode: Number,
  ip: String,
  timestamp: { type: Date, default: Date.now, index: true },
});

// Keep one year of history
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

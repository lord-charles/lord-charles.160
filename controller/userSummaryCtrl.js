const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const AuditLog = require("../models/auditLog");

// Same exclusion as the Users list (getUsers): teachers are managed elsewhere
const TEACHER_TYPES = [
  "Teacher",
  "HeadTeacher",
  "ClassTeacher",
  "VolunteerTeacher",
  "DeputyHeadTeacher",
  "SeniorTeacher",
];
const SUPER_ADMIN_TYPES = ["SuperAdmin", "superadmin"];
const STATES = [
  "AAA", "CES", "EES", "JGL", "LKS", "NBG", "PAA",
  "RAA", "UNS", "UTY", "WBG", "WES", "WRP",
];
const DAY = 24 * 3600 * 1000;

const card = (id, label, value, definition, extra = {}) => ({
  id,
  label,
  value,
  definition,
  ...extra,
});

/**
 * GET /user/users/summary
 * Summary cards for the User Management page, computed on the server so the
 * figures match the Users list (non-teacher accounts).
 */
const getUserSummary = asyncHandler(async (req, res) => {
  const now = Date.now();
  const d1 = new Date(now - DAY);
  const d30 = new Date(now - 30 * DAY);
  const d90 = new Date(now - 90 * DAY);

  const base = { userType: { $nin: TEACHER_TYPES } };
  const enabled = { ...base, isBlocked: { $ne: true } };

  const privilegedOr = [
    { userType: { $in: SUPER_ADMIN_TYPES } },
    { isAdmin: true },
    {
      "role.permissions": { $in: ["Users", "Roles"] },
      "role.roles": "write",
    },
  ];

  const [
    total,
    blocked,
    active30,
    dormant90,
    firstLogin,
    superAdmins,
    adminFlag,
    userManagers,
    privileged,
    assignedStates,
    failedLogins24h,
  ] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments({ ...base, isBlocked: true }),
    User.countDocuments({ ...enabled, lastLoginAt: { $gte: d30 } }),
    User.countDocuments({
      ...enabled,
      createdAt: { $lt: d90 },
      $or: [{ lastLoginAt: { $lt: d90 } }, { lastLoginAt: null }],
    }),
    User.findOne({ lastLoginAt: { $ne: null } })
      .sort({ lastLoginAt: 1 })
      .select("lastLoginAt")
      .lean(),
    User.countDocuments({ ...enabled, userType: { $in: SUPER_ADMIN_TYPES } }),
    User.countDocuments({ ...enabled, isAdmin: true }),
    User.countDocuments({ ...enabled, ...privilegedOr[2] }),
    User.countDocuments({ ...enabled, $or: privilegedOr }),
    User.distinct("statesAsigned", enabled),
    AuditLog.countDocuments({ action: "login_failed", timestamp: { $gte: d1 } }),
  ]);

  // Sign-ins are only recorded from the day lastLoginAt tracking was deployed
  const trackingSince = firstLogin?.lastLoginAt || null;
  const trackedDays = trackingSince ? (now - trackingSince) / DAY : 0;

  const covered = STATES.filter((s) => assignedStates.includes(s));
  const unknownStateValues = assignedStates.filter(
    (s) => s && !STATES.includes(s)
  );

  res.status(200).json({
    asOf: new Date(now).toISOString(),
    trackingSince,
    cards: [
      card("total_accounts", "Total accounts", total,
        "All non-teacher accounts. Blocked accounts cannot sign in.", {
          subValues: [
            { label: "Enabled", value: total - blocked },
            { label: "Blocked", value: blocked },
          ],
        }),
      card("active_30d", "Active, last 30 days",
        trackingSince ? active30 : null,
        "Enabled accounts that signed in during the last 30 days.",
        trackingSince
          ? trackedDays < 30
            ? { note: `Sign-ins recorded since ${trackingSince.toISOString().slice(0, 10)}` }
            : {}
          : { unavailableReason: "No sign-ins recorded yet" }),
      card("dormant_90d", "Inactive over 90 days",
        trackedDays >= 90 ? dormant90 : null,
        "Enabled accounts older than 90 days with no sign-in in the last 90 days.",
        trackedDays >= 90
          ? { severity: dormant90 > 0 ? "warning" : "none" }
          : {
              unavailableReason: trackingSince
                ? `Needs 90 days of sign-in history (recorded since ${trackingSince.toISOString().slice(0, 10)})`
                : "No sign-ins recorded yet",
            }),
      card("privileged", "Privileged accounts", privileged,
        "Enabled accounts that are Super Admin, have the admin flag, or can change users or roles.", {
          subValues: [
            { label: "Super Admin type", value: superAdmins },
            { label: "Admin flag", value: adminFlag },
            { label: "Users/Roles write", value: userManagers },
          ],
        }),
      card("state_coverage", "States covered", covered.length,
        "States with at least one enabled account assigned.", {
          total: STATES.length,
          missing: STATES.filter((s) => !covered.includes(s)),
          unknownValues: unknownStateValues,
        }),
      card("failed_logins_24h", "Failed sign-ins, 24 h", failedLogins24h,
        "Sign-in attempts with a wrong username or password in the last 24 hours (web and mobile).", {
          severity: failedLogins24h >= 50 ? "warning" : "none",
        }),
    ],
  });
});

module.exports = { getUserSummary };

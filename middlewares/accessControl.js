const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

/**
 * Central access control for /express/*.
 *
 * Every request carrying a Bearer token is authenticated and checked against
 * the user's role: role.permissions lists the modules a user can open and
 * role.roles says whether that access is "read" or "write". SuperAdmin
 * bypasses module checks.
 *
 * The mobile app (SAMS-APP) does not send tokens yet, so the endpoints it
 * writes to are marked `legacy` and still accept anonymous requests, with
 * privileged fields stripped. Set REQUIRE_AUTH_ALL=true once the app sends
 * tokens to close that gap.
 */

const LEGACY_JWT_SECRET = "charles-works-smart";

const getJwtSecret = () =>
  process.env.JWT_SECRET || process.env.SECRET || LEGACY_JWT_SECRET;

if (!process.env.JWT_SECRET && !process.env.SECRET) {
  console.warn(
    "[accessControl] JWT_SECRET is not set; falling back to the legacy secret. Set JWT_SECRET in .env."
  );
}

const SUPER_ADMIN_TYPES = ["SuperAdmin", "superadmin"];
const TEACHER_TYPES = [
  "Teacher",
  "HeadTeacher",
  "ClassTeacher",
  "VolunteerTeacher",
  "DeputyHeadTeacher",
  "SeniorTeacher",
];
// Fields only a user manager may set on another account
const PRIVILEGED_USER_FIELDS = [
  "role",
  "isAdmin",
  "statesAsigned",
  "isBlocked",
  "passwordHash",
];

const isSuperAdmin = (user) => SUPER_ADMIN_TYPES.includes(user?.userType);

const hasModuleAccess = (user, modules, level = "read") => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const permissions = Array.isArray(user.role?.permissions)
    ? user.role.permissions
    : [];
  const levels = Array.isArray(user.role?.roles) ? user.role.roles : [];
  const list = Array.isArray(modules) ? modules : [modules];
  if (!list.some((m) => permissions.includes(m))) return false;
  // write implies read
  if (level === "write") return levels.includes("write");
  return levels.includes("read") || levels.includes("write");
};

const W = "write";
const R = "read";

/**
 * [method, path regex (relative to /express), module(s) | special, level, options]
 * - legacy: anonymous requests allowed (mobile app) unless REQUIRE_AUTH_ALL
 * - modules "*": any authenticated user
 * Routes not listed are open (reads and query-style POSTs).
 */
const RULES = [
  // ---- Users & roles ----
  ["GET", /^\/user\/users\/get-all\/?$/, ["Users"], R],
  ["GET", /^\/user\/users\/get-email\/?$/, ["Users"], R],
  ["GET", /^\/user\/users\/get\/all\/count\/?$/, ["Users"], R],
  ["POST", /^\/user\/register\/?$/, "userWrite", W, { legacy: true }],
  ["PATCH", /^\/user\/users\/update\/[^/]+\/?$/, "userWrite", W, { legacy: true }],
  ["PATCH", /^\/user\/update\/bulk\/?$/, "userWrite", W, { legacy: true }],
  ["DELETE", /^\/user\/users\/delete-user\/[^/]+\/?$/, ["Users"], W],
  ["PUT", /^\/user\/users\/[^/]+\/(block|unblock)\/?$/, ["Users"], W],
  ["GET", /^\/roles\/?$/, ["Users", "Roles"], R],
  ["POST", /^\/roles\/?$/, ["Roles", "Users"], W],
  ["PUT", /^\/roles\/[^/]+\/?$/, ["Roles", "Users"], W],
  ["DELETE", /^\/roles\/[^/]+\/?$/, ["Roles", "Users"], W],

  // ---- Schools ----
  ["POST", /^\/school-data\/school\/?$/, ["Schools"], W],
  ["PATCH", /^\/school-data\/school\/[^/]+\/?$/, ["Schools"], W],
  ["DELETE", /^\/school-data\/school\/[^/]+\/?$/, ["Schools"], W],
  ["POST", /^\/school-data\/[^/]+\/enrollment\/complete\/?$/, ["Schools", "Progress"], W],
  ["POST", /^\/school-committe\/createOrUpdateSchoolCommitte\/?$/, ["Schools"], W, { legacy: true }],
  ["POST", /^\/census\/?$/, ["Schools"], W, { legacy: true }],
  ["PUT", /^\/census\/[^/]+\/?$/, ["Schools"], W],
  ["DELETE", /^\/census\/[^/]+\/?$/, ["Schools"], W],
  ["POST", /^\/census\/[^/]+\/(submit|validate)\/?$/, ["Schools"], W],
  ["POST", /^\/data-set\/(updateSchoolData|updateSchoolsDocuments)\/?$/, ["Schools"], W],

  // ---- Live enrollment ----
  ["POST", /^\/registration-period\/create\/?$/, ["Live Enrollment", "Schools"], W],
  ["PATCH", /^\/registration-period\/update\/[^/]+\/?$/, ["Live Enrollment", "Schools"], W],
  ["DELETE", /^\/registration-period\/period\/[^/]+\/?$/, ["Live Enrollment", "Schools"], W],
  ["PATCH", /^\/registration-period\/period\/[^/]+\/restore\/?$/, ["Live Enrollment", "Schools"], W],

  // ---- Learners ----
  ["POST", /^\/data-set\/register-student-2024\/?$/, ["Learners", "Live Enrollment"], W, { legacy: true }],
  ["POST", /^\/data-set\/registerLearnerDuringSync\/?$/, ["Learners", "Live Enrollment"], W, { legacy: true }],
  ["PATCH", /^\/data-set\/2023_data\/students\/[^/]+\/?$/, ["Learners"], W, { legacy: true }],
  ["PATCH", /^\/data-set\/2023_data\/update\/bulk\/?$/, ["Learners"], W, { legacy: true }],
  ["PATCH", /^\/data-set\/2023_data\/update\/bulkStates\/?$/, ["Learners"], W],
  ["DELETE", /^\/data-set\/student\/delete\/[^/]+\/?$/, ["Learners"], W],
  ["PATCH", /^\/data-set\/updateSchoolDataLearnerUniqueID\/?$/, ["Learners"], W],
  ["POST", /^\/data-set\/updateDocuments\/?$/, ["Learners"], W],

  // ---- Attendance ----
  ["POST", /^\/attendance\/markAttendanceBulk\/?$/, ["Attendance"], W, { legacy: true }],
  ["POST", /^\/attendance\/markPresentAttendance\/?$/, ["Attendance"], W],

  // ---- Cash transfers ----
  ["POST", /^\/ct\/?$/, ["Cash Transfers"], W, { legacy: true }],
  ["PATCH", /^\/ct\/[^/]+\/?$/, ["Cash Transfers"], W],
  ["DELETE", /^\/ct\/[^/]+\/?$/, ["Cash Transfers"], W],
  ["POST", /^\/ct\/disburse\/[^/]+\/?$/, ["Cash Transfers"], W, { legacy: true }],
  ["POST", /^\/ct\/criteria\/?$/, ["Cash Transfers"], W],
  ["PATCH", /^\/ct\/criteria\/[^/]+\/?$/, ["Cash Transfers"], W],
  ["DELETE", /^\/ct\/criteria\/[^/]+\/?$/, ["Cash Transfers"], W],
  ["POST", /^\/disability-eligibility\/validateLwd\/[^/]+\/?$/, ["Cash Transfers"], W, { legacy: true }],

  // ---- Capitation grants ----
  ["POST", /^\/sbrt\/?$/, ["Capitation Grants"], W, { legacy: true }],
  ["PATCH", /^\/sbrt\/[^/]+\/?$/, ["Capitation Grants"], W],
  ["POST", /^\/budget\/?$/, ["Capitation Grants"], W],
  ["PATCH", /^\/budget\/[^/]+(\/unreview)?\/?$/, ["Capitation Grants"], W],
  ["DELETE", /^\/budget\/[^/]+\/?$/, ["Capitation Grants"], W],
  ["POST", /^\/budget\/[^/]+\/(review|documents)\/?$/, ["Capitation Grants"], W],
  ["DELETE", /^\/budget\/[^/]+\/documents\/.+$/, ["Capitation Grants"], W],
  ["POST", /^\/budget-codes\/?$/, ["Capitation Grants"], W],
  ["PUT", /^\/budget-codes\/[^/]+\/?$/, ["Capitation Grants"], W],
  ["DELETE", /^\/budget-codes\/[^/]+\/?$/, ["Capitation Grants"], W],
  ["POST", /^\/capitation-settings\/?$/, ["Capitation Grants"], W],
  ["PUT", /^\/capitation-settings\/.+$/, ["Capitation Grants"], W],
  ["DELETE", /^\/capitation-settings\/[^/]+\/?$/, ["Capitation Grants"], W],
  ["POST", /^\/accountability\/?$/, ["Capitation Grants"], W],
  ["POST", /^\/accountability\/[^/]+\/(suppliers|accounting)\/?$/, ["Capitation Grants"], W],
  ["PUT", /^\/accountability\/.+$/, ["Capitation Grants"], W],
  ["PATCH", /^\/accountability\/.+$/, ["Capitation Grants"], W],
  ["DELETE", /^\/accountability\/.+$/, ["Capitation Grants"], W],
];

const findRule = (method, path) =>
  RULES.find(([m, re]) => m === method && re.test(path));

const deny = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const authenticate = async (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return { user: null };
  const token = header.slice(7).trim();
  if (!token) return { user: null };

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (e) {
    return { error: "Session expired or invalid. Please log in again." };
  }
  if (!decoded?.userId) return { error: "Invalid token." };

  const user = await User.findById(decoded.userId)
    .select("-passwordHash")
    .lean();
  if (!user) return { error: "User not found." };
  if (user.isBlocked) return { error: "Your account is blocked.", status: 403 };
  return { user };
};

/**
 * Users may be written by a "Users" manager, or by a "Teachers" manager /
 * anonymous mobile client when the target is a teacher account and no
 * privileged field is touched.
 */
const authorizeUserWrite = async (req, user) => {
  const fullAccess =
    isSuperAdmin(user) || hasModuleAccess(user, "Users", "write");
  const body = req.body || {};
  const isBulk = req.path.startsWith("/user/update/bulk");
  const fields = isBulk ? body.updateFields || {} : body;

  // Only a SuperAdmin can create or promote SuperAdmins / admins
  const wantsSuperAdmin =
    SUPER_ADMIN_TYPES.includes(fields.userType) || fields.isAdmin === true;
  if (wantsSuperAdmin && !isSuperAdmin(user)) {
    return "Only a SuperAdmin can grant SuperAdmin or admin rights.";
  }

  let targetIds = [];
  if (req.method === "PATCH") {
    targetIds = isBulk
      ? Array.isArray(body.ids)
        ? body.ids
        : []
      : [req.path.split("/").filter(Boolean).pop()];
    // Nobody but a SuperAdmin may modify a SuperAdmin account
    const targets = await User.find({ _id: { $in: targetIds } })
      .select("userType")
      .lean()
      .catch(() => []);
    if (!isSuperAdmin(user) && targets.some((t) => isSuperAdmin(t))) {
      return "Only a SuperAdmin can modify a SuperAdmin account.";
    }
    if (fullAccess) return null;
    if (targets.some((t) => !TEACHER_TYPES.includes(t.userType))) {
      return "You can only modify teacher accounts.";
    }
  } else if (fullAccess) {
    return null;
  }

  // Limited path: teacher accounts only, no privileged fields
  const canTeachers =
    !user || hasModuleAccess(user, "Teachers", "write");
  if (!canTeachers) return "You do not have write access to Users.";
  if (fields.userType && !TEACHER_TYPES.includes(fields.userType)) {
    return "You can only create or assign teacher user types.";
  }
  for (const f of PRIVILEGED_USER_FIELDS) delete fields[f];
  return null;
};

const accessControl = async (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  try {
    const auth = await authenticate(req);
    if (auth.error) return deny(res, auth.status || 401, auth.error);
    req.authUser = auth.user;
    if (auth.user) {
      req.user = req.user || { userId: String(auth.user._id), details: auth.user };
    }

    const rule = findRule(req.method, req.path);
    if (!rule) return next();

    const [, , modules, level, opts = {}] = rule;
    const user = auth.user;
    const requireAll = process.env.REQUIRE_AUTH_ALL === "true";

    if (!user && !(opts.legacy && !requireAll)) {
      return deny(res, 401, "Authentication required.");
    }

    if (modules === "userWrite") {
      const err = await authorizeUserWrite(req, user);
      if (err) return deny(res, 403, err);
      return next();
    }

    // Anonymous legacy requests (mobile app) skip module checks
    if (!user) return next();

    if (!hasModuleAccess(user, modules, level)) {
      return deny(
        res,
        403,
        level === "write"
          ? "You have read-only access to this module."
          : "You do not have access to this module.",
        { requiredModule: modules, requiredLevel: level }
      );
    }
    next();
  } catch (error) {
    console.error("[accessControl] error:", error);
    return deny(res, 500, "Access check failed.");
  }
};

module.exports = {
  accessControl,
  getJwtSecret,
  hasModuleAccess,
  isSuperAdmin,
  TEACHER_TYPES,
};

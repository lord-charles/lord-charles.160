/**
 * Which mobile app modules a user can open.
 *
 * Source of truth is the user's role: permissions named "Mobile: <Module>"
 * (set in the dashboard under Roles & Permissions). Users whose role has no
 * mobile permission yet keep the defaults the app used to hard-code by user
 * type, so nothing changes for existing accounts until their role is set up.
 */

const MOBILE_MODULES = {
  enrolment: "Mobile: Enrolment",
  cashTransfer: "Mobile: Cash Transfers",
  lwd: "Mobile: LWD",
  census: "Mobile: Census",
  sdpBudget: "Mobile: SDP & Budget",
};

const ALL = Object.keys(MOBILE_MODULES);
const SUPER_ADMIN_TYPES = ["SuperAdmin", "superadmin"];

// Previous app behaviour, per user type (screens/Home/index.js)
const legacyDefaults = (userType) => {
  if (SUPER_ADMIN_TYPES.includes(userType)) return ALL;
  const modules = [];
  if (!["Teacher", "HeadTeacher", "ct", "lwd"].includes(userType)) modules.push("enrolment");
  if (["ct", "lwd"].includes(userType)) modules.push("cashTransfer");
  if (["ct", "lwd", "disability-champion", "data-supervisor"].includes(userType)) modules.push("lwd");
  if (["HeadTeacher", "data-supervisor"].includes(userType)) modules.push("census");
  if (userType === "HeadTeacher") modules.push("sdpBudget");
  return modules;
};

/**
 * @returns {{ modules: string[], source: "role" | "default" }}
 */
const mobileAccessFor = (user) => {
  if (!user) return { modules: [], source: "default" };
  if (SUPER_ADMIN_TYPES.includes(user.userType)) return { modules: ALL, source: "default" };

  const permissions = Array.isArray(user.role?.permissions) ? user.role.permissions : [];
  const fromRole = ALL.filter((m) => permissions.includes(MOBILE_MODULES[m]));
  const roleHasMobile = permissions.some((p) => String(p).startsWith("Mobile: "));

  return roleHasMobile
    ? { modules: fromRole, source: "role" }
    : { modules: legacyDefaults(user.userType), source: "default" };
};

module.exports = { MOBILE_MODULES, mobileAccessFor };

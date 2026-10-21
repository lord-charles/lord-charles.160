const AuditLog = require("../models/auditLog");

/**
 * Records user-management actions and sign-ins once the response is sent.
 * Mounted on /express after accessControl so req.authUser is known.
 */

// [method, path regex (relative to /express), action, targetType]
const AUDITED = [
  ["POST", /^\/user\/login\/?$/, "login", "user"],
  ["POST", /^\/user\/register\/?$/, "user_create", "user"],
  ["PATCH", /^\/user\/users\/update\/([^/]+)\/?$/, "user_update", "user"],
  ["PATCH", /^\/user\/update\/bulk\/?$/, "user_bulk_update", "user"],
  ["DELETE", /^\/user\/users\/delete-user\/([^/]+)\/?$/, "user_delete", "user"],
  ["PUT", /^\/user\/users\/([^/]+)\/block\/?$/, "user_block", "user"],
  ["PUT", /^\/user\/users\/([^/]+)\/unblock\/?$/, "user_unblock", "user"],
  ["POST", /^\/roles\/?$/, "role_create", "role"],
  ["PUT", /^\/roles\/([^/]+)\/?$/, "role_update", "role"],
  ["DELETE", /^\/roles\/([^/]+)\/?$/, "role_delete", "role"],
  ["POST", /^\/promotion\/runs\/?$/, "promotion_run", "promotion"],
  ["POST", /^\/data-set\/learners\/transfer\/?$/, "learner_transfer", "learner"],
  ["POST", /^\/promotion\/runs\/([^/]+)\/undo\/?$/, "promotion_undo", "promotion"],
];

const SECRET_FIELDS = ["password", "confirmPassword", "passwordHash"];

const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  "";

const auditLog = (req, res, next) => {
  const match = AUDITED.find(
    ([method, re]) => method === req.method && re.test(req.path)
  );
  if (!match) return next();

  const [, re, action, targetType] = match;
  res.on("finish", () => {
    const ok = res.statusCode < 400;
    // Only failed sign-ins are interesting for other actions' failures
    if (!ok && action !== "login") return;

    const body = req.body || {};
    const actor = req.authUser;
    const isLogin = action === "login";
    const fields = isLogin
      ? []
      : Object.keys(action === "user_bulk_update" ? body.updateFields || {} : body)
          .filter((f) => !SECRET_FIELDS.includes(f));

    AuditLog.create({
      action: isLogin ? (ok ? "login_success" : "login_failed") : action,
      actorId: actor?._id || null,
      actorUsername: actor?.username || (isLogin ? body.username : null) || null,
      targetType,
      targetId: req.path.match(re)?.[1] || (Array.isArray(body.ids) ? body.ids.join(",") : null),
      targetUsername: isLogin || action === "user_create" ? body.username || null : null,
      fields,
      reason: body.reason || null,
      statusCode: res.statusCode,
      ip: clientIp(req),
    }).catch((err) => console.error("[auditLog] write failed:", err.message));
  });
  next();
};

module.exports = { auditLog, clientIp };

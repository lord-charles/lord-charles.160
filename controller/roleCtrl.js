const Role = require("../models/roleModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");

const VALID_LEVELS = ["read", "write"];

const validateRoleInput = ({ name, permissions, roles }) => {
  if (!name || !String(name).trim()) return "Role name is required";
  if (!Array.isArray(permissions) || permissions.length === 0)
    return "Select at least one module";
  if (
    !Array.isArray(roles) ||
    roles.length === 0 ||
    roles.some((r) => !VALID_LEVELS.includes(r))
  )
    return "Access level must be read and/or write";
  return null;
};

// Create a new role
const createRole = asyncHandler(async (req, res) => {
  try {
    const invalid = validateRoleInput(req.body);
    if (invalid) throw new Error(invalid);

    const name = String(req.body.name).trim();
    const { permissions, roles } = req.body;

    // Check if role already exists
    const roleExists = await Role.findOne({ name });
    if (roleExists) {
      throw new Error("Role already exists");
    }

    // Create new role
    const role = await Role.create({
      name,
      permissions,
      roles,
    });

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Get all roles, with how many users currently hold each one
const getRoles = asyncHandler(async (req, res) => {
  const [roles, counts] = await Promise.all([
    Role.find({}).sort({ name: 1 }).lean(),
    User.aggregate([
      { $match: { "role.name": { $exists: true, $ne: null } } },
      { $group: { _id: "$role.name", count: { $sum: 1 } } },
    ]),
  ]);
  const byName = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json(roles.map((r) => ({ ...r, userCount: byName[r.name] || 0 })));
});

// Update a role and sync the copy embedded in every user that holds it
const updateRole = asyncHandler(async (req, res) => {
  const invalid = validateRoleInput(req.body);
  if (invalid) {
    res.status(400);
    throw new Error(invalid);
  }

  const role = await Role.findById(req.params.id);
  if (!role) {
    res.status(404);
    throw new Error("Role not found");
  }

  const name = String(req.body.name).trim();
  if (name !== role.name && (await Role.exists({ name }))) {
    res.status(400);
    throw new Error("Another role already uses that name");
  }

  const previousName = role.name;
  role.name = name;
  role.permissions = req.body.permissions;
  role.roles = req.body.roles;
  await role.save();

  const synced = await User.updateMany(
    { "role.name": previousName },
    {
      $set: {
        role: {
          name: role.name,
          permissions: role.permissions,
          roles: role.roles,
        },
      },
    }
  );

  res.json({ success: true, data: role, usersUpdated: synced.modifiedCount });
});

// Delete role (only when no user still holds it)
const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) {
    res.status(404);
    throw new Error("Role not found");
  }

  const assigned = await User.countDocuments({ "role.name": role.name });
  if (assigned > 0) {
    res.status(409);
    throw new Error(
      `${assigned} user(s) still have this role. Reassign them before deleting it.`
    );
  }

  await role.deleteOne();
  res.json(role);
});

module.exports = {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
};

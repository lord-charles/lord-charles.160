const Role = require("../models/roleModel");
const asyncHandler = require("express-async-handler");

// Create a new role
const createRole = asyncHandler(async (req, res) => {
  try {
    const { name, permissions, roles } = req.body;

    // Check if role already exists
    const roleExists = await Role.findOne({ name });
    if (roleExists) {
      res.status(400);
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

// Get all roles
const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find({});
  res.json(roles);
});

// Delete  role
const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findByIdAndDelete(req.params.id);
  if (!role) {
    res.status(404);
    throw new Error("Role not found");
  }
  res.json(role);
});

module.exports = {
  createRole,
  getRoles,
  deleteRole,
};

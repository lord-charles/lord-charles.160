const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return next("There is no token attached to header");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const userId = decoded?.userId ?? null;
    if (!userId) {
      return next("Token does not contain user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      return next("User not found for the given token");
    }

    req.user = { userId, details: user };
    next();
  } catch (error) {
    return next("Not Authorized token expired, Please Login again");
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user.isAdmin) {
    return next("You are not an admin");
  }
  next();
});

module.exports = { authMiddleware, isAdmin };

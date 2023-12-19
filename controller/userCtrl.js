const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validateMongodbId = require("../utils/validateMongodbId");
const sendEmail = require("./emailCtl");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");

//Register AI CHECKED
const createUser = asyncHandler(async (req, res) => {
  const {
    firstname,
    lastname,
    username,
    email,
    phoneNumber,
    password,
    isAdmin,
    userType,
    dutyAssigned,
    statesAsigned,
  } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = new User({
    firstname,
    lastname,
    username,
    email,
    phoneNumber,
    passwordHash: await bcrypt.hash(password, 10),
    isAdmin,
    userType,
    dutyAssigned,
    statesAsigned,
  });

  await user.save();

  res.status(200).json({ user, message: "User created" });
});

//login AI CHECKED
const logIn = asyncHandler(async (req, res) => {
  const secret = process.env.SECRET;
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });

  if (!user) {
    res.status(404).send("username!");
    return;
  }

  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    const token = jwt.sign(
      {
        userId: user.id,
        isAdmin: user.isAdmin,
        statesAsigned: user.statesAsigned,
        dutyAssigned: user.dutyAssigned,
        userType: user.userType,
      },
      secret,
      { expiresIn: "1d" }
    );
    res.status(200).send({ user: user.username, token });
  } else {
    res.status(404).send("Wrong password!");
  }
});

//get users
const getUsers = asyncHandler(async (req, res) => {
  const { sort } = req.query;
  const sortOptions = {};

  if (
    sort &&
    [
      "firstname",
      "lastname",
      "email",
      "mobile",
      "dateJoined",
      "isAdmin",
      "isBlocked",
    ].includes(sort)
  ) {
    sortOptions[sort] = 1;
  } else {
    sortOptions["dateJoined"] = -1;
  }

  let users = await User.find({}, "-__v -passwordHash")
    .sort(sortOptions)
    .lean();

  if (sort === "isAdmin") {
    users = users.filter((user) => user[sort]); // filter based on sort field
  }

  if (sort === "isBlocked") {
    users = users.filter((user) => user[sort]); // filter based on sort field
  }
  res.status(200).json(users);
});

//get users by id
const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  validateMongodbId(userId);
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  res.status(200).json(user);
});

//get users by id
const getUserByEmail = asyncHandler(async (req, res) => {
  const { search } = req.query;

  if (!search) {
    return res.status(400).json({ message: "Search parameter is missing." });
  }

  const results = await User.find({
    email: { $regex: new RegExp(`^${search.toLowerCase()}`, "i") },
  }).select("email _id");

  if (results.length === 0) {
    return res.status(404).json({ message: "No results found." });
  }

  res.status(200).json(results);
});

//update user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    firstname,
    lastname,
    email,
    mobile,
    password,
    username,
    statesAsigned,
    dutyAssigned,
    userType,
    isAdmin,
  } = req.body;
  validateMongodbId(id);
  const updatedFields = {
    firstname,
    lastname,
    email,
    mobile,
    username,
    statesAsigned,
    dutyAssigned,
    userType,
    isAdmin,
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
  };

  const user = await User.findByIdAndUpdate(id, updatedFields, { new: true });

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  res.status(200).json(user);
});

//delete users
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }
  res.status(200).send({ message: "user deleted!" });
});

//verify token
const verifyToken = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(404).send("There is no token attached to header");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const userId = decoded?.userId ?? null;
    if (!userId) {
      return res.status(404).send("Token does not contain user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found for the given token");
    }
    res.status(200).json({ message: "authorized", user });
  } catch (error) {
    return res
      .status(404)
      .send("Not Authorized token expired, Please Login again");
  }
});

//get userCount
const getUserCount = asyncHandler(async (req, res) => {
  const usersCount = await User.countDocuments();
  res.status(200).send({ usersCount });
});

//block user
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      isBlocked: true,
    },
    { new: true }
  );
  if (!user) {
    res.status(404).send("user not found");
  } else {
    res.status(200).send(user);
  }
});

//unblock user
const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      isBlocked: false,
    },
    { new: true }
  );
  if (!user) {
    res.status(404).send("user not found");
  } else {
    res.status(200).send(user);
  }
});

//updatePassword
const updateUserDetails = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
    new: true,
  });
  res.json(updatedUser);
});

//forgotPassword
const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ message: "User not found." });
  } else {
    const token = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    // const resetUrl = `${req.protocol}://${req.get(
    //   "host"
    // )}/users/resetPassword/${token}`;
    const data = {
      to: email,
      subject: "Password Reset Request",
      html: `
          <html>
            <head>
              <style>
                h1 {
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0;
                  padding: 0;
                }
                h4 {
                  font-size: 14px;
                  font-weight: 400;
                  margin: 0;
                  padding: 0;
                }
                p {
                  font-size: 14px;
                  font-weight: 400;
                  margin: 0;
                  padding: 0;
                }
                a {
                  color: #0366d6;
                  text-decoration: none;
                }
              </style>
            </head>
            <body>
              <h1>Dear ${email},</h1>
              <p>
                We hope this email finds you well. Our records indicate that you recently requested a password reset. 
                To reset your password, please follow the Code below:
              </p>
             <h4><a href="">${token}</a></h4>
              <p>
                If you did not request this password reset, please ignore this email and your password will remain unchanged. 
                Your account security is our top priority, and we are committed to ensuring that all user information remains confidential.
              </p>
              <h4>
                If you have any questions or concerns, please do not hesitate to reach out to our support team. 
                They are available 24/7 and will be happy to assist you.
              </h4>
            </body>
          </html>
        `,
    };
    sendEmail(data);
    res.status(200).json({
      success: true,
      message: "Password reset email sent.",
      token: token,
    });
  }
});

//reset password
const resetPassword = asyncHandler(async (req, res) => {
  const token = req.params.token;
  const password = req.body.password;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetToken: { $gt: Date.now() },
  });
  if (!user) {
    res.status(404).json({ message: "token expired, please try again later" });
  } else {
    user.passwordHash = bcrypt.hashSync(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.status(200).json({ message: "password updated successfully", user });
  }
});

const saveAddress = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  validateMongodbId(userId);
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      address: req?.body?.address,
    },
    {
      new: true,
    }
  );
  res.json(updatedUser);
});

module.exports = {
  createUser,
  logIn,
  getUsers,
  getUserById,
  getUserByEmail,
  deleteUser,
  verifyToken,
  getUserCount,
  updateUser,
  blockUser,
  unblockUser,
  updateUserDetails,
  forgotPassword,
  resetPassword,
  saveAddress,
};

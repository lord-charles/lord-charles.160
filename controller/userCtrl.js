const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validateMongodbId = require("../utils/validateMongodbId");
const sendEmail = require("./emailCtl");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");

//Register CHECKED
const createUser = asyncHandler(async (req, res) => {
  const {
    firstname,
    lastname,
    email,
    username,
    phoneNumber,
    isAdmin,
    address,
    userType,
    dutyAssigned,
    statesAsigned,
    county28,
    payam28,
    state10,
    school,
    code,
    year,
    source,
    schoolCode,
    teacherCode,
    teacherHrisCode,
    position,
    category,
    workStatus,
    gender,
    dob,
    active,
    nationalNo,
    salaryGrade,
    refugee,
    countryOfOrigin,
    trainingLevel,
    professionalQual,
    notes,
    teacherUniqueID,
    teachersEstNo,
    password,
    middleName,
    modifiedBy,
    disabilities,
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
    year,
    schoolCode,
    teacherCode,
    teacherHrisCode,
    position,
    category,
    workStatus,
    gender,
    dob,
    active,
    nationalNo,
    salaryGrade,
    refugee,
    countryOfOrigin,
    trainingLevel,
    professionalQual,
    notes,
    teacherUniqueID,
    teachersEstNo,
    address,
    county28,
    payam28,
    state10,
    school,
    code,
    source,
    middleName,
    modifiedBy,
    disabilities,
  });

  await user.save();

  res.status(200).json({ user, message: "User created" });
});

//login CHECKED
const logIn = asyncHandler(async (req, res) => {
  const secret = process.env.SECRET;
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  console.log(user);

  if (!user) {
    res.status(404).json({ message: "Wrong username!" });
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
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
      },
      secret,
      { expiresIn: "1d" }
    );
    res.status(200).json({ user: user.username, token });
  } else {
    res.status(404).json({ message: "Wrong password!" });
  }
});

const getUsers = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      username,
      phoneNumber,
      isAdmin,
      userType,
      county28,
      payam28,
      state10,
      school,
      code,
      position,
      category,
      workStatus,
      gender,
      dob,
      active,
      dateJoined,
      middleName,
      modifiedBy,
      disabilities,
    } = req.body;

    // Create the query object
    const query = buildQuery(
      firstname,
      lastname,
      username,
      phoneNumber,
      isAdmin,
      userType,
      county28,
      payam28,
      state10,
      school,
      code,
      position,
      category,
      workStatus,
      gender,
      dob,
      active,
      dateJoined,
      middleName,
      modifiedBy,
      disabilities
    );

    // Fetch documents based on the query
    const response = await User.find(query);

    res.status(200).json(response);
  } catch (error) {
    console.log("Error fetching dataset:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Function to build the query object
const buildQuery = (
  firstname,
  lastname,
  username,
  phoneNumber,
  isAdmin,
  userType,
  county28,
  payam28,
  state10,
  school,
  code,
  position,
  category,
  workStatus,
  gender,
  dob,
  active,
  dateJoined
) => {
  const query = {};

  // Helper function to add a query condition
  const addQueryCondition = (field, value) => {
    if (value !== undefined && value !== null && value !== "") {
      query[field] = value;
    }
  };

  addQueryCondition("firstname", firstname);
  addQueryCondition("lastname", lastname);
  addQueryCondition("username", username);
  addQueryCondition("phoneNumber", phoneNumber);
  addQueryCondition("isAdmin", isAdmin);
  addQueryCondition("userType", userType);
  addQueryCondition("county28", county28);
  addQueryCondition("payam28", payam28);
  addQueryCondition("state10", state10);
  addQueryCondition("school", school);
  addQueryCondition("code", code);
  addQueryCondition("position", position);
  addQueryCondition("category", category);
  addQueryCondition("workStatus", workStatus);
  addQueryCondition("gender", gender);
  addQueryCondition("dob", dob);
  addQueryCondition("active", active);
  addQueryCondition("dateJoined", dateJoined);

  return query;
};

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

const getUsersBySchool = async (req, res) => {
  try {
    const { school } = req.query;

    // Check if the school parameter is provided
    if (!school) {
      return res
        .status(400)
        .json({ success: false, message: "School parameter is required." });
    }

    // Create a query object to find users by school
    const query = {
      school: school,
    };

    // Specify the fields to include in the projection
    const projection = {
      firstname: 1,
      lastname: 1,
      username: 1,
      userType: 1,
      dutyAssigned: 1,
      statesAsigned: 1,
      county28: 1,
      payam28: 1,
      state10: 1,
      school: 1,
      code: 1,
      year: 1,
      workStatus: 1,
      gender: 1,
      salaryGrade: 1,
      trainingLevel: 1,
      professionalQual: 1,
    };

    // Fetch users based on the query and projection
    const users = await User.find(query).select(projection).lean().exec(); // Using lean() for better performance

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users by school:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

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
    username,
    phoneNumber,
    isAdmin,
    address,
    userType,
    dutyAssigned,
    statesAsigned,
    county28,
    payam28,
    state10,
    school,
    code,
    year,
    source,
    schoolCode,
    teacherCode,
    teacherHrisCode,
    position,
    category,
    workStatus,
    gender,
    dob,
    active,
    nationalNo,
    salaryGrade,
    refugee,
    countryOfOrigin,
    trainingLevel,
    professionalQual,
    notes,
    teacherUniqueID,
    teachersEstNo,
    middleName,
    modifiedBy,
    disabilities,
  } = req.body;
  validateMongodbId(id);
  const updatedFields = {
    firstname,
    lastname,
    email,
    username,
    phoneNumber,
    isAdmin,
    address,
    userType,
    dutyAssigned,
    statesAsigned,
    county28,
    payam28,
    state10,
    school,
    code,
    year,
    source,
    schoolCode,
    teacherCode,
    teacherHrisCode,
    position,
    category,
    workStatus,
    gender,
    dob,
    active,
    nationalNo,
    salaryGrade,
    refugee,
    countryOfOrigin,
    trainingLevel,
    professionalQual,
    notes,
    teacherUniqueID,
    teachersEstNo,
    middleName,
    modifiedBy,
    disabilities,
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

const payamSchoolDownload = async (req, res) => {
  try {
    const { payam28, page } = req.body;

    // Input validation
    if (!payam28) {
      return res
        .status(400)
        .json({ success: false, error: "payam28 is required" });
    }

    const PAGE_SIZE = 1000;
    const PROJECTION_FIELDS = {
      firstname: 1,
      lastname: 1,
      middleName: 1,
      username: 1,
      userType: 1,
      dutyAssigned: 1,
      statesAsigned: 1,
      county28: 1,
      payam28: 1,
      state10: 1,
      school: 1,
      code: 1,
      year: 1,
      workStatus: 1,
      gender: 1,
      salaryGrade: 1,
      trainingLevel: 1,
      professionalQual: 1,
    };

    // Calculate skip value based on pagination
    const skip = (page - 1) * PAGE_SIZE;

    // Aggregation pipeline to match, project, skip, and limit documents
    const pipeline = [
      { $match: { payam28 } },
      { $project: PROJECTION_FIELDS },
      { $skip: skip },
      { $limit: PAGE_SIZE },
    ];

    // Execute the aggregation pipeline
    const schoolData = await User.aggregate(pipeline);

    // Count the total number of documents matching the query
    const totalCount = await User.countDocuments({ payam28 });

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Calculate the number of remaining trips
    const remainingTrips = totalPages - page;

    res.status(200).json({
      success: true,
      data: schoolData,
      totalCount,
      totalPages,
      remainingTrips,
    });
  } catch (error) {
    console.error("Error fetching school data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

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
  getUsersBySchool,
  payamSchoolDownload,
};

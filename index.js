const app = require("express")();
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const { notFound, errorHandler } = require("./middlewares/error-handler");
const { cacheMiddleware } = require("./middlewares/cacheMiddleware");
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 9000;
const dbConnect = require("./config/dbConnect");

// Routes
const dataSet = require("./routes/dataset");
const usersRouter = require("./routes/userAuth");
const schoolCommitte = require("./routes/committe");
const sbrt = require("./routes/sbrt");
const sbpn = require("./routes/sbpn");
const reportRoutes = require("./routes/report");
const attendance = require("./routes/attendance");
const registrationPeriod = require("./routes/registrationPeriods");
const schoolData = require("./routes/school-data");
const budgetRoutes = require("./routes/budgetRoutes");
const roleRoutes = require("./routes/roleRoute");
const accountabilityRoutes = require("./routes/accountabilityRoutes");
const budgetCodesRoutes = require("./routes/budgetCodes");
const ct = require("./routes/ct");

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SAMS API Documentation",
      version: "1.0.0",
      description:
        "SAMS REST API documentation. This API provides endpoints for managing learner enrollment, learner attendance, user authentication, school committees, and various administrative functions.",
      contact: {
        name: "SAMS Development Team",
        email: "mgichure@strathmore.edu",
        url: "https://github.com/your-repo/SAMS",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development Server",
      },
      {
        url: "https://api.ssams.org",
        description: "Production Server",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Connect to Database
dbConnect();

// Apply Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Apply cache middleware to all routes (10 minutes cache)
app.use(cacheMiddleware(600));

// API Routes
app.use("/express/data-set", dataSet);
app.use("/express/user", usersRouter);
app.use("/express/school-committe", schoolCommitte);
app.use("/express/sbrt", sbrt);
app.use("/express/sb/pn", sbpn);
app.use("/express/report", reportRoutes);
app.use("/express/attendance", attendance);
app.use("/express/registration-period", registrationPeriod);
app.use("/express/school-data", schoolData);
app.use("/express/budget", budgetRoutes);
app.use("/express/roles", roleRoutes);
app.use("/express/accountability", accountabilityRoutes);
app.use("/express/budget-codes", budgetCodesRoutes);
app.use("/express/ct", ct);

// Swagger Documentation Route
app.use("/express/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});

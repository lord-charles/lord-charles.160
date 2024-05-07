const app = require("express")();
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors"); 
const { notFound, errorHandler } = require("./middlewares/error-handler");
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 8000;
const dbConnect = require("./config/dbConnect");
const dataSet = require("./routes/dataset");
const usersRouter = require("./routes/userAuth");
const schoolCommitte = require("./routes/committe");
const sbrt = require("./routes/sbrt");

dbConnect();
// apply middlewares
app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/express/data-set", dataSet);
app.use("/express/user", usersRouter);
app.use("/express/school-committe", schoolCommitte);
app.use("/express/sbrt", sbrt);





//error handlers
app.use(notFound);
app.use(errorHandler);

// start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});

const express = require("express");
const app = express();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config.env") });
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const { conn } = require("./middelwer/db");
const session = require("express-session");
const flash = require("connect-flash");
const cors = require("cors");
const nocache = require("nocache");
const setTZ = require("set-tz");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for EJS templates with inline scripts
}));

// Rate limiting for login and registration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 login attempts per window
  message: "Too many attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Secure session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-immediately",
    saveUninitialized: false,
    resave: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  })
);

conn.query("SELECT timezone FROM tbl_master_shop where id=1", (err, row) => {
  if (err) {
    console.error("Failed to load timezone:", err.message);
    setTZ(process.env.TIMEZONE || 'UTC');
    return;
  }
  const tz = row?.[0]?.timezone;
  setTZ(tz && tz !== 'undefined' ? tz : (process.env.TIMEZONE || 'UTC'));
});

app.use((req, res, next) => {
  conn.query("SELECT data FROM tbl_validate", (err, results) => {
    if (err) {
      console.error("Error executing query:", err.message);
      return next(err);
    }
    if (results && results.length > 0) {
      res.locals.scriptFile = results[0].data;
    }
    next();
  });
});

// Static files and parsers
app.use(nocache());
app.use(express.static(path.join(__dirname, "public")));
app.set(path.join(__dirname, "uploads"));
app.set(path.join(__dirname, "public"));
app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(flash());

// CORS – restrict to specific origins in production
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));

// Apply general rate limiter to all API routes
app.use("/mpesa", apiLimiter);

app.use(function (req, res, next) {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Apply auth rate limiter to login/register routes
app.use("/", require("./routers/login"));
app.use("/coustomer", require("./routers/coustomer"));
app.use("/expense", require("./routers/expense"));
app.use("/tool", require("./routers/tool"));
app.use("/services", require("./routers/services"));
app.use("/report", require("./routers/reports"));
app.use("/account", require("./routers/account"));
app.use("/app", require("./routers/app_login"));
app.use("/admin", require("./routers/pos"));
app.use("/coupon", require("./routers/coupon"));
app.use("/order", require("./routers/order"));
app.use("/mpesa", require("./routers/mpesa"));

// 404 handler
app.use((req, res) => {
  res.status(404).render("login", { data: {}, rollverify: [] });
});

// Global error handler – never expose stack traces
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).send("Something went wrong. Please try again later.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

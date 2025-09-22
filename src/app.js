import "dotenv/config";
import express from "express";
import path from "path";
import ejsMate from "ejs-mate";
import routes from "./routes/web.js";
import { fileURLToPath } from "url";
import session from "express-session";
import apiRoutes from "./routes/api.js";
import flash from "connect-flash";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import cors from "cors";
import cron from "node-cron";                       // ✅ Tambah ini
import { checkExpiredAndLimit } from "./cron/checkExpiredAndLimit.js"; // ✅ Import job

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Konfigurasi CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "access_token"],
  credentials: true
}));

// EJS
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Public
app.use(express.static(path.join(__dirname, "./public")));

// Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());
app.use(methodOverride("_method"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "rahasia_anda",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  next();
});

app.use((req, res, next) => {
  res.locals.API_BASE_URL = process.env.API_BASE_URL;
  next();
});

// ✅ Routes
app.use("/", routes);
app.use("/api", apiRoutes);

cron.schedule("1 0 * * *", async () => {
  console.log("🕑 Cronjob start - Check Expired & Limit (00:01 WIB)");
  await checkExpiredAndLimit();
}, {
  timezone: "Asia/Jakarta"
});


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

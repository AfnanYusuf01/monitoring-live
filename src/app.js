import "dotenv/config"; // load .env
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
import cors from "cors"; // ✅ tambahkan ini

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Konfigurasi CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // ganti sesuai domain frontend kamu
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "access_token"],
  credentials: true // kalau pakai cookie/session dari frontend
}));

// EJS
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Public assets
app.use(express.static(path.join(__dirname, "./public")));

// ✅ Parser body dulu
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());
app.use(methodOverride("_method"));

// ✅ Session harus sebelum routes
app.use(
  session({
    secret: process.env.SESSION_SECRET || "rahasia_anda",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // true kalau pakai https
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user; // kirim ke semua view
  next();
});

app.use((req, res, next) => {
  res.locals.API_BASE_URL = process.env.API_BASE_URL;
  next();
});

// ✅ Routes terakhir
app.use("/", routes);
app.use("/api", apiRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

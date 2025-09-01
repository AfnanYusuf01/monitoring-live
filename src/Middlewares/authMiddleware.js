// middlewares/authMiddleware.js
import multer from "multer";
import {PrismaClient} from "@prisma/client";
// Configure multer for file upload
const storage = multer.memoryStorage();
const prisma = new PrismaClient();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file CSV yang diizinkan"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;

export const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  req.user = req.session.user;
  next();
};

export const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  next();
};

export const requireApiLogin = (req, res, next) => {
  if (!req.session.user) {
    res.setHeader(
      "WWW-Authenticate",
      'Session realm="Access to API", charset="UTF-8"'
    );
    return res.status(401).json({
      error: "Unauthorized",
      message: "Anda harus login untuk mengakses API ini",
    });
  }
  req.user = req.session.user;
  next();
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.session.user;

    if (!user) {
      res.setHeader(
        "WWW-Authenticate",
        'Session realm="Access to API", charset="UTF-8"'
      );
      return res.status(401).json({
        error: "Unauthorized",
        message: "Anda harus login untuk mengakses API ini",
      });
    }

    if (!["user", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Role user tidak valid",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Anda tidak memiliki izin untuk mengakses resource ini",
      });
    }

    next();
  };
};

// TAMBAHKAN MIDDLEWARE BARU UNTUK WEB ROUTES
export const requireWebRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    if (!["user", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).render("pages/403", {
        navbar: "Forbidden",
        message: "Role user tidak valid",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).render("pages/403", {
        navbar: "Forbidden",
        message: "Anda tidak memiliki izin untuk mengakses halaman ini",
      });
    }

    next();
  };
};


export const checkActiveSubscription = async (req, res, next) => {
  try {
    const user = req.session.user;
    const userId = user.id // pastikan user sudah login
    const now = new Date();

    // Ambil subscription aktif terbaru
    const activeSub = await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: "active",
        endDate: {gt: now},
      },
      include: {subscription: true},
      orderBy: {endDate: "desc"},
    });

    if (!activeSub) {
      return res.status(403).json({
        message: "Anda tidak memiliki paket aktif saat ini.",
        status: "expired",
      });
    }

    const subscription = activeSub.subscription;

    // Hitung jumlah akun user
    const userAccountsCount = await prisma.akun.count({
      where: {userId},
    });

    if (userAccountsCount >= subscription.limitAkun) {
      return res.status(403).json({
        message: "Slot akun Anda telah penuh.",
        remainingSlots: 0,
      });
    }

    // Tambahkan data subscription ke request agar bisa dipakai di controller
    req.activeSubscription = activeSub;
    req.remainingSlots = subscription.limitAkun - userAccountsCount;

    next(); // lanjut ke controller
  } catch (error) {
    console.error("❌ Error middleware checkActiveSubscription:", error);
    res.status(500).json({message: "Terjadi kesalahan server"});
  }
};
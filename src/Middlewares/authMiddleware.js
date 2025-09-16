
import fs from "fs";
import path from "path";
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

// Error handler untuk upload gambar
export const handleImageUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File gambar terlalu besar. Maksimal 5MB.' 
      });
    }
  } else if (error.message.includes('Hanya file gambar yang diizinkan')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  next(error);
};

export const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/payment-proofs/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + extension);
  }
});

// Filter untuk file CSV
export const csvFileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file CSV yang diizinkan"), false);
  }
};

export const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/svg+xml"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diizinkan (JPG, JPEG, PNG, GIF, BMP, WEBP, SVG)"), false);
  }
};

// Middleware upload untuk CSV (disimpan di memory)
const uploadCSV = multer({
  storage: storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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


// export const checkActiveSubscription = async (req, res, next) => {
//   try {
//     const user = req.session.user;
//     const userId = user.session.id; // pastikan user sudah login
//     const now = new Date();

//     // Ambil subscription aktif terbaru
//     const activeSub = await prisma.userSubscription.findFirst({
//       where: {
//         userId,
//         status: "active",
//         endDate: {gt: now},
//       },
//       include: {subscription: true},
//       orderBy: {endDate: "desc"},
//     });

//     if (!activeSub) {
//       return res.status(403).json({
//         message: "Anda tidak memiliki paket aktif saat ini.",
//         status: "expired",
//       });
//     }

//     const subscription = activeSub.subscription;

//     // Hitung jumlah akun user
//     const userAccountsCount = await prisma.akun.count({
//       where: {userId},
//     });

//     if (userAccountsCount >= subscription.limitAkun) {
//       return res.status(403).json({
//         message: "Slot akun Anda telah penuh.",
//         remainingSlots: 0,
//       });
//     }

//     // Tambahkan data subscription ke request agar bisa dipakai di controller
//     req.activeSubscription = activeSub;
//     req.remainingSlots = subscription.limitAkun - userAccountsCount;

//     next(); // lanjut ke controller
//   } catch (error) {
//     console.error("❌ Error middleware checkActiveSubscription:", error);
//     res.status(500).json({message: "Terjadi kesalahan server"});
//   }
// };


export const checkActiveSubscription = async (req, res, next) => {
  const user = req.session.user;
  const subscriptionId = parseInt(req.params.subscriptionId);

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Silakan login terlebih dahulu" });
  }

  // Kalau role admin/superadmin → skip pengecekan
  if (["superadmin", "admin"].includes(user.role)) {
    return next();
  }

  if (isNaN(subscriptionId)) {
    return res
      .status(400)
      .json({ success: false, message: "ID subscription tidak valid" });
  }

  try {
    // Ambil paket subscription yg dipilih
    const selectedSubscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!selectedSubscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription tidak ditemukan" });
    }

    // Ambil semua subscription user yang aktif
    const activeSubscriptions = await prisma.userSubscription.findMany({
      where: {
        userId: user.id,
        status: "active",
      },
      include: {
        subscription: true,
      },
    });

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Anda belum memiliki subscription aktif",
      });
    }

    // Kalau paket ada durasi, cek apakah sama
    if (selectedSubscription.duration > 0) {
      const sameSubscription = activeSubscriptions.find(
        (s) => s.subscriptionId === subscriptionId
      );

      if (!sameSubscription) {
        return res.status(403).json({
          success: false,
          message:
            "Anda sudah punya subscription aktif lain. Tidak bisa akses data ini.",
        });
      }
    }

    // ✅ Kalau lolos semua cek → lanjut ke route
    next();
  } catch (err) {
    console.error("❌ Error cek user subscription:", err);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};


// middleware/checkExpiredAndLimit.js
export const checkExpiredAndLimit = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return next(); // kalau belum login → lanjut aja

    const now = new Date();
    console.log("terload disini");

    // 1. Update subscription expired
    const userSubs = await prisma.userSubscription.findMany({
      where: { userId: user.id },
    });
    // console.log(userSubs);

    for (const sub of userSubs) {
      if (sub.status === "active" && sub.endDate < now) {
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: { status: "expired" },
        });
        console.log(`⚠️ Subscription ${sub.id} user ${user.id} expired`);
      }
    }

    // 2. Ambil ulang subscription aktif (setelah update)
    const activeSubs = await prisma.userSubscription.findMany({
      where: {
        userId: user.id,
        status: "active",
      },
    });

    // Hitung total limit akun dari semua subscription aktif
    const totalLimit = activeSubs.reduce((sum, sub) => sum + (sub.limitAkun || 0), 0);

    // 3. Hitung jumlah akun aktif user
    const akunUser = await prisma.akun.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" }, // biar yg lama dipertahankan
    });

    const totalAkun = akunUser.length;

    if (totalAkun > totalLimit) {
      // Hapus akun yang lebih baru (soft delete)
      const excess = totalAkun - totalLimit;
      const akunToDelete = akunUser.slice(-excess); // ambil paling akhir

      await prisma.akun.updateMany({
        where: { id: { in: akunToDelete.map(a => a.id) } },
        data: { deletedAt: new Date() },
      });

      console.log(
        `⚠️ User ${user.id} punya ${totalAkun} akun, limit aktif ${totalLimit}. ${excess} akun dihapus.`
      );
    }

    next();
  } catch (err) {
    console.error("❌ Error checkExpiredAndLimit:", err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

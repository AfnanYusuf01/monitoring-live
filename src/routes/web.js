// routes/web.js
import express from "express";
import upload from "../Middlewares/authMiddleware.js";
import {PrismaClient} from "@prisma/client";
import AuthController from "../controllers/AuthController.js";
import {
  requireLogin,
  requireWebRole,
  redirectIfLoggedIn,
  checkActiveSubscription,
} from "../Middlewares/authMiddleware.js";

import {
  renderAccountManagement,
  renderAddAccount,
  renderEditAccount,
  importAkunFromCSV,
} from "../controllers/AkunController.js";

import {
  renderUserManagement,
  renderAddUser,
  renderEditUser,
} from "../controllers/ManagementUserController.js";

import {
  getstudioById,
  renderStudioManagement,
  renderAddStudio,
  renderEditStudio,
  renderDetailStudio,
} from "../controllers/ManagementStudioController.js";

import {
  renderSubscriptionManagement,
  renderAddSubscription,
  renderEditSubscription,
} from "../controllers/ManagementSubscription.js";

import {
  renderUserSubscriptionManagement,
  renderAddUserSubscription,
  renderEditUserSubscription,
} from "../controllers/ManagementUserSubscription.js";

import {
  renderCheckout,
  createOrder,
} from "../controllers/ManagementOrderController.js";

import {
  renderAffiliatePage,
  renderEditAffiliatePage,
  renderAffiliateManagement,
} from "../controllers/AffiliateControler.js";

import {renderPerformanceLiveStream} from "../controllers/PerformanceLiveStreamController.js";

const router = express.Router();
const prisma = new PrismaClient();

/* ============================================================
   AUTH CONTROLLER (Login, Logout, Register, Profile)
============================================================ */
router.get("/login", redirectIfLoggedIn, AuthController.index);
router.post("/login", redirectIfLoggedIn, AuthController.login);
router.get("/forget-password", AuthController.forgetPasswordPage);
router.post("/forget-password", AuthController.forgetPassword);
router.get("/reset-password/:token", AuthController.resetPasswordPage);
router.post("/reset-password", AuthController.resetPassword);
router.get("/logout", AuthController.logout);
router.post("/register", AuthController.register);

router.get("/sign-in", redirectIfLoggedIn, (req, res) => {
  res.render("pages/sign-in");
});
router.get("/sign-up", redirectIfLoggedIn, (req, res) => {
  res.render("pages/sign-up");
});
router.get("/profile", requireLogin, (req, res) => {
  res.render("pages/profile", {navbar: "Profile"});
});
router.get("/profile", requireLogin, AuthController.profile);
router.post("/profile/update", requireLogin, AuthController.updateProfile);

/* ============================================================
   DASHBOARD & STATIC PAGES
============================================================ */

router.get("/monitoring-live", requireLogin, (req, res) => {
  res.render("pages/monitoring-live", {navbar: "Monitoring-Live"});
});
router.get("/cek-pembayaran", requireLogin, (req, res) => {
  res.render("pages/cek-pembayaran", {navbar: "Cek-Pembayaran"});
});
router.get("/histori-live", requireLogin, (req, res) => {
  res.render("pages/histori-live", {navbar: "Histori-Live"});
});
router.get("/monitoring-product", requireLogin, (req, res) => {
  res.render("pages/monitoring-product", {navbar: "Monitoring-Product"});
});
router.get("/studio-monitoring", requireLogin, (req, res) => {
  res.render("pages/studio/studio-index", {navbar: "Manitoring By Studio"});
});

/* ============================================================
   AKUN CONTROLLER (Account Management)
============================================================ */
router.get("/account-management", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const akunList = await prisma.akun.findMany({
      where: {
        deletedAt: null,
        userId: userId,
      },
    });
    res.render("pages/account/account-management", {
      navbar: "Account-Management",
      akunList,
    });
  } catch (err) {
    res.status(500).render("pages/500", {
      navbar: "Account-Management",
      error: "Gagal memuat data akun",
    });
  }
});

router.get("/account-management/add", requireLogin, (req, res) => {
  res.render("pages/account/account-management-add", {
    navbar: "Account-Management",
  });
});

router.get("/account-management/edit/:id", requireLogin, async (req, res) => {
  try {
    const {id} = req.params;
    const userId = req.session.user.id;

    const akun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
      },
    });

    if (!akun) {
      return res.redirect("/account-management");
    }
    res.render("pages/account/account-management-edit", {
      navbar: "Account-Management",
      akun,
    });
  } catch (err) {
    res.redirect("/account-management");
  }
});

router.get("/account-management/add", requireLogin, renderAddAccount);
router.post(
  "/akun/import",
  upload.single("csvFile"),
  requireLogin,
  importAkunFromCSV
);

router.get("/dashboard", requireLogin, (req, res) => {
  console.log("Current User di session:", req.session.user);
  res.redirect("/account-management");
});

router.get("/add", requireLogin, renderAddAccount);
router.get("/edit/:id", requireLogin, renderEditAccount);

/* ============================================================
   USER MANAGEMENT CONTROLLER - HANYA SUPERADMIN
============================================================ */
// Gunakan requireWebRole dengan parameter ['superadmin']
router.get(
  "/user-management",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderUserManagement
);
router.get(
  "/user-management/add",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderAddUser
);
router.get(
  "/user-management/edit/:id",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderEditUser
);

/* ============================================================
   STUDIO MANAGEMENT CONTROLLER
============================================================ */
router.get("/studio/:id", requireLogin, getstudioById);
router.get("/studio-management", requireLogin, renderStudioManagement);
router.get("/studio-management/add", requireLogin, renderAddStudio);
router.get("/studio-management/edit/:id", requireLogin, renderEditStudio);
router.get("/studio-management/detail/:id", requireLogin, renderDetailStudio);

/* ============================================================
   SUBCRIBTIONS MANAGEMENT CONTROLLER
============================================================ */

router.get(
  "/subscription-management",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderSubscriptionManagement
);
router.get(
  "/subscription-management/add",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderAddSubscription
);
router.get(
  "/subscription-management/edit/:id",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderEditSubscription
);

/* ============================================================
   USER SUBSCRIPTIONS MANAGEMENT CONTROLLER
============================================================ */

router.get(
  "/user-subscription-management",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderUserSubscriptionManagement
);

router.get(
  "/user-subscription-management/add",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderAddUserSubscription
);

router.get(
  "/user-subscription-management/edit/:id",
  requireLogin,
  requireWebRole(["superadmin"]),
  renderEditUserSubscription
);

/* ============================================================
   USER ORDER MANAGEMENT CONTROLLER
============================================================ */

router.get("/order-management", requireLogin, (req, res) => {
  res.render("pages/order-management", {navbar: "Order-Management"});
});

/* ============================================================
   HALAMAN END USER
============================================================ */

router.get("/", (req, res) => {
  // Cek apakah ada user yang login di session
  const user = req.session.user || null;

  res.render("landing-page", {
    navbar: "Monitoring By Studio",
    user: user, // kirimkan ke view
  });
});

router.get("/subscription/checkout/:id", renderCheckout);
router.post("/subscription/buy/:id", requireLogin, createOrder);
router.get("/subscription/checkout/:id_add/:id", (req, res) => {
  const {id_add, id} = req.params;

  // simpan ke cookie dengan masa berlaku 7 hari
  res.cookie("id_aff", id_add, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: false,
  });
  res.cookie("id_sub", id, {maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: false});

  // redirect ke halaman checkout (frontend)
  res.redirect(`/subscription/checkout/${id}`);
});

router.get("/affiliate", requireLogin, renderAffiliatePage);
router.get("/affiliate/edit/:id", requireLogin, renderEditAffiliatePage);
router.get("/affiliate-management", requireLogin, renderAffiliateManagement);

router.get("/performance", requireLogin, renderPerformanceLiveStream);

router.get("/thank-you", requireLogin, async (req, res) => {
  try {
    // Ambil parameter dari query string
    const {merchantOrderId, resultCode, reference} = req.query;

    console.log("Payment data received:", {
      merchantOrderId,
      resultCode,
      reference,
    });

    // Dapatkan data order dari database
    let orderData = null;
    let priceData = null;
    let paymentStatus = "unknown";

    if (merchantOrderId) {
      orderData = await prisma.order.findUnique({
        where: {transactionId: merchantOrderId},
        include: {
          userSubscription: {
            include: {
              subscription: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  duration: true,
                },
              },
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (orderData) {
        // Ambil status pembayaran dari database, bukan dari resultCode
        paymentStatus = orderData.status;

        if (
          orderData.userSubscription &&
          orderData.userSubscription.subscription
        ) {
          priceData = {
            subscriptionName: orderData.userSubscription.subscription.name,
            price: orderData.userSubscription.subscription.price,
            duration: orderData.userSubscription.subscription.duration,
            orderDate: orderData.createdAt,
          };
        }
      }
    }

    // Tentukan pesan berdasarkan status dari database
    let statusMessage = "Status pembayaran tidak diketahui.";
    let isPaymentSuccess = false;
    let isPaymentPending = false;

    switch (paymentStatus) {
      case "paid":
        isPaymentSuccess = true;
        statusMessage = "Pembayaran berhasil! Terima kasih telah berlangganan.";
        break;
      case "pending":
        isPaymentPending = true;
        statusMessage =
          "Pembayaran sedang diproses. Silakan tunggu konfirmasi.";
        break;
      case "failed":
        statusMessage = "Pembayaran gagal. Silakan coba lagi.";
        break;
      default:
        statusMessage = "Status pembayaran tidak diketahui.";
    }

    res.render("thank-you", {
      navbar: "thank-you",
      paymentStatus: paymentStatus, // Pass paymentStatus separately
      paymentData: {
        success: isPaymentSuccess,
        pending: isPaymentPending,
        merchantOrderId: merchantOrderId || "Tidak tersedia",
        resultCode: resultCode || "Tidak tersedia", // Masih ditampilkan sebagai info tambahan
        reference: reference || "Tidak tersedia",
        message: statusMessage,
        price: priceData,
        status: paymentStatus, // Status dari database
      },
    });
  } catch (error) {
    console.error("Error processing thank-you page:", error);
    res.render("thank-you", {
      navbar: "thank-you",
      paymentStatus: "error",
      paymentData: {
        success: false,
        pending: false,
        merchantOrderId: "Error",
        resultCode: "Error",
        reference: "Error",
        message: "Terjadi kesalahan dalam memproses informasi pembayaran",
        price: null,
        status: "error",
      },
    });
  }
});

export default router;

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


const router = express.Router();
const prisma = new PrismaClient();

/* ============================================================
   AUTH CONTROLLER (Login, Logout, Register, Profile)
============================================================ */
router.get("/login", redirectIfLoggedIn, AuthController.index);
router.post("/login", redirectIfLoggedIn, AuthController.login);
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



router.get("/dashboard", requireLogin, (req, res) => {
  res.render("pages/dashboard", {navbar: "Dashboard"});
});
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
      where: {userId: userId},
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
router.post("/akun/import", upload.single("csvFile"), importAkunFromCSV);

router.get("/dashboard", requireLogin, (req, res) => {
  console.log("Current User di session:", req.session.user);
  res.render("pages/dashboard", {navbar: "Dashboard"});
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
router.get("/thank-you", requireLogin, (req, res) => {
  res.render("thank-you", {navbar: "/thank-you"});
});


export default router;

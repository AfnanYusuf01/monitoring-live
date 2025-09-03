// routes/api.js
import express from "express";
import upload from "../Middlewares/authMiddleware.js";
import {requireApiLogin} from "../Middlewares/authMiddleware.js";
import AuthController from "../controllers/AuthController.js";
import {
  importAkunFromCSV,
  downloadCSVTemplate,
  checkUserSubscription,
  getAllAkun,
  getAkunById,
  updateAkun,
  deleteAkun,
  createAkun,
} from "../controllers/AkunController.js";
import {getShopeeData} from "../controllers/MonitoringLiveController.js";
import {getDataPembayaran} from "../controllers/CekPembayaranController.js";
import {getLiveHistory} from "../controllers/HistoriLiveController.js";
import {getShopeeProducts} from "../controllers/MonitoringProductController.js";
import {
  requireLogin,
  checkActiveSubscription,
} from "../Middlewares/authMiddleware.js";
import {
  index,
  show,
  store,
  update,
  destroy,
} from "../controllers/ManagementUserController.js";
import {
  getAllStudios,
  getAkunStudioById,
  indexStudio,
  getStudio,
  postStudios,
  putStudio,
  delStudio,
} from "../controllers/ManagementStudioController.js";

import {
  indexSubscription,
  showSubscription,
  storeSubscription,
  updateSubscription,
  destroySubscription,
} from "../controllers/ManagementSubscription.js";
import {
  indexUserSubscription,
  showUserSubscription,
  storeUserSubscription,
  updateUserSubscription,
  destroyUserSubscription,
} from "../controllers/ManagementUserSubscription.js";

import {
  indexOrder,
  showOrder,
  storeOrder,
  updateOrder,
  destroyOrder,
  checkSubscription,
  duitkuCallback,
} from "../controllers/ManagementOrderController.js";

// Import controller affiliate
import {
  indexAffiliate,
  showAffiliate,
  storeAffiliate,
  updateAffiliate,
  destroyAffiliate,
  updateKomisiStatus
} from "../controllers/AffiliateControler.js";

import {
  indexPerformance,
  showPerformance,
  storePerformance,
  updatePerformance,
  destroyPerformance,
} from "../controllers/PerformanceLiveStreamController.js";

const router = express.Router();

// ============================================================
// NOTE: Semua route API bisa diproteksi pakai middleware login
// router.use(requireLogin);
// ============================================================

/* ============================================================
   AKUN CONTROLLER (CRUD Akun + Import CSV)
============================================================ */
router.get("/akun", getAllAkun);
router.post("/akun", checkActiveSubscription, requireApiLogin, createAkun);
router.get("/akun/:id",   requireApiLogin,   getAkunById);
router.put("/akun/:id",   requireApiLogin,   updateAkun);
router.delete("/akun/:id",   requireApiLogin,   deleteAkun);
router.post("/akun/import",   requireApiLogin,   upload.single("csvFile"), importAkunFromCSV);
router.get("/download-csv-template",   requireApiLogin,   requireLogin, downloadCSVTemplate);

/* ============================================================
   USER MANAGEMENT CONTROLLER
============================================================ */
router.get("/users",   requireApiLogin,   index);
router.get("/users/:id",   requireApiLogin,   show);
router.post("/users",   requireApiLogin,   store);
router.put("/users/:id",   requireApiLogin,   update);
router.delete("/users/:id",   requireApiLogin,   destroy);

/* ============================================================
   AFFILIATE CONTROLLER
============================================================ */
router.get("/affiliates", requireApiLogin, indexAffiliate);
router.get("/affiliates/:id", requireApiLogin, showAffiliate);
router.post("/affiliates", requireApiLogin, storeAffiliate);
router.put("/affiliates/:id", requireApiLogin, updateAffiliate);
router.delete("/affiliates/:id", requireApiLogin, destroyAffiliate);
router.post("/affiliate/register", requireApiLogin, storeAffiliate);
router.post("/affiliate-orders/:affiliateOrderId/status", requireApiLogin, updateKomisiStatus);


/* ============================================================
   MONITORING LIVE CONTROLLER
============================================================ */
router.get("/shopee-data",   requireApiLogin,   getShopeeData);

/* ============================================================
   CEK PEMBAYARAN CONTROLLER
============================================================ */
router.post("/cek-pembayaran",   requireApiLogin,   getDataPembayaran);

/* ============================================================
   HISTORI LIVE CONTROLLER
============================================================ */
router.post("/history",   requireApiLogin,   getLiveHistory);

/* ============================================================
   MONITORING PRODUCT CONTROLLER
============================================================ */
router.post("/products",   requireApiLogin,   getShopeeProducts);

/* ============================================================
   MANAGEMENT STUDIO  CONTROLLER
============================================================ */
router.get("/studios",    requireApiLogin,   getAllStudios);
router.get("/studio/:id",   requireApiLogin,   getAkunStudioById);
router.get("/studios",   requireApiLogin,   indexStudio);
router.get("/studios/:id",   requireApiLogin,   getStudio);
router.post("/studios",   requireApiLogin,   postStudios);
router.put("/studios/:id",   requireApiLogin,   putStudio);
router.delete("/studios/:id",   requireApiLogin,   delStudio);

/* ============================================================
   MANAGEMENT SUBSCRIPTIONS  CONTROLLER
============================================================ */
router.get("/subscriptions", indexSubscription);
router.get("/subscriptions/:id", showSubscription);
router.post("/subscriptions", storeSubscription);
router.put("/subscriptions/:id", updateSubscription);
router.delete("/subscriptions/:id", destroySubscription);

/* ============================================================
   MANAGEMENT USER SUBSCRIPTIONS CONTROLLER
============================================================ */
router.get("/user-subscriptions", indexUserSubscription);
router.get("/user-subscriptions/:id", showUserSubscription);
router.post("/user-subscriptions", storeUserSubscription);
router.put("/user-subscriptions/:id", updateUserSubscription);
router.delete("/user-subscriptions/:id", destroyUserSubscription);

/* ============================================================
   MANAGEMENT ORDERS CONTROLLER
============================================================ */
router.get("/orders", indexOrder);
router.get("/orders/:id", showOrder);
router.post("/orders", storeOrder);
router.put("/orders/:id", updateOrder);
router.delete("/orders/:id", destroyOrder);

router.post("/duitku/callback", duitkuCallback);
router.get("/check-subscription", requireApiLogin, checkUserSubscription);

router.post("/login", AuthController.loginApi);
router.post("/register", AuthController.registerApi);
router.post("/logout", AuthController.logoutApi);

router.get("/check-subscription/:subscriptionId", requireApiLogin, checkSubscription);

/* ============================================================
   PERFORMANCE LIVE STREAM ROUTES
============================================================ */
router.get("/performance-live-streams", requireApiLogin, indexPerformance);
router.get("/performance-live-streams/:id", requireApiLogin, showPerformance);
router.post("/performance-live-streams", requireApiLogin, storePerformance);
router.put("/performance-live-streams/:id", requireApiLogin, updatePerformance);
router.delete("/performance-live-streams/:id", requireApiLogin, destroyPerformance);

export default router;
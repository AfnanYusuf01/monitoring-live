// routes/api.js
import express from "express";
import axios from "axios";
import upload from "../Middlewares/authMiddleware.js";
import crypto from "crypto";
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
  createAkunViaAPI,
} from "../controllers/AkunController.js";
import {getShopeeData} from "../controllers/MonitoringLiveController.js";
import {getDataPembayaran, getDataPembayaranStudio, postDataPembayaran} from "../controllers/CekPembayaranController.js";
import {getLiveHistory, getStudioLiveHistory, postLiveHistory} from "../controllers/HistoriLiveController.js";
import {getShopeeProducts} from "../controllers/MonitoringProductController.js";
import {
  requireLogin,
  checkActiveSubscription,
  // checkSubscription,
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
  indexPayment,
  showPayment,
  storePayment,
  updatePayment,
  destroyPayment,
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
createAffiliateStat,
} from "../controllers/PerformanceController.js";

import {
  indexPrice,
  showPrice,
  storePrice,
  updatePrice,
  destroyPrice,
} from "../controllers/ManagementPriceController.js";

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
router.get("/akun/:id",  checkActiveSubscription, requireApiLogin,   getAkunById);
router.put("/akun/:id",  checkActiveSubscription, requireApiLogin,   updateAkun);
router.delete("/akun/:id", checkActiveSubscription,  requireApiLogin,   deleteAkun);
router.post("/akun/import", checkActiveSubscription,   requireApiLogin,   upload.single("csvFile"), importAkunFromCSV);
router.get("/download-csv-template",  checkActiveSubscription, requireApiLogin,   requireLogin, downloadCSVTemplate);
router.post('/akun/create', createAkunViaAPI);

/* ============================================================
   USER MANAGEMENT CONTROLLER
============================================================ */
router.get("/users", checkActiveSubscription,  requireApiLogin,   index);
router.get("/users/:id", checkActiveSubscription,  requireApiLogin,   show);
router.post("/users",  checkActiveSubscription, requireApiLogin,   store);
router.put("/users/:id", checkActiveSubscription,  requireApiLogin,   update);
router.delete("/users/:id", checkActiveSubscription,  requireApiLogin,   destroy);

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
router.get("/shopee-data", checkActiveSubscription, requireApiLogin, getShopeeData);

/* ============================================================
   CEK PEMBAYARAN CONTROLLER
============================================================ */
router.post("/cek-pembayaran/:id_studio", checkActiveSubscription,  requireApiLogin,   getDataPembayaran);
router.post("/cek-pembayaran-studio",  requireApiLogin,   getDataPembayaranStudio);
router.post("/post-cek-pembayaran", checkActiveSubscription,  requireApiLogin,   postDataPembayaran);

/* ============================================================
   HISTORI LIVE CONTROLLER
============================================================ */
router.post("/history",  checkActiveSubscription, requireApiLogin,   getLiveHistory);
router.post("/historyPost",  checkActiveSubscription, requireApiLogin,   postLiveHistory);
router.post("/histori_studio", checkActiveSubscription,  requireApiLogin,   getStudioLiveHistory);

/* ============================================================
   MONITORING PRODUCT CONTROLLER
============================================================ */
router.post("/products", checkActiveSubscription,  requireApiLogin,   getShopeeProducts);

/* ============================================================
   MANAGEMENT STUDIO  CONTROLLER
============================================================ */
router.get("/studios", checkActiveSubscription,   requireApiLogin,   getAllStudios);
router.get("/studio/:id", checkActiveSubscription,  requireApiLogin,   getAkunStudioById);
router.get("/studios_akun",  checkActiveSubscription, requireApiLogin,   indexStudio);
router.get("/studios/:id", checkActiveSubscription,  requireApiLogin,   getStudio);
router.post("/studios",  checkActiveSubscription, requireApiLogin,   postStudios);
router.put("/studios/:id", checkActiveSubscription,  requireApiLogin,   putStudio);
router.delete("/studios/:id", checkActiveSubscription,  requireApiLogin,   delStudio);

/* ============================================================
   MANAGEMENT SUBSCRIPTIONS  CONTROLLER
============================================================ */
router.get("/subscriptions", indexSubscription);
router.get("/subscriptions/:id", checkActiveSubscription, showSubscription);
router.post("/subscriptions", checkActiveSubscription, storeSubscription);
router.put("/subscriptions/:id", checkActiveSubscription, updateSubscription);
router.delete("/subscriptions/:id", checkActiveSubscription, destroySubscription);

/* ============================================================
   MANAGEMENT USER SUBSCRIPTIONS CONTROLLER
============================================================ */
router.get("/user-subscriptions", indexUserSubscription);
router.get("/user-subscriptions/:id", showUserSubscription);
router.post("/user-subscriptions", storeUserSubscription);
router.put("/user-subscriptions/:id",updateUserSubscription);
router.delete("/user-subscriptions/:id",destroyUserSubscription);

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

router.post("/affiliate-stats", createAffiliateStat);



router.get("/payment-methods", async (req, res) => {
  try {
    const merchantCode = process.env.DUITKU_MERCHANT_CODE || "DS24664";
    const apiKey = process.env.DUITKU_API_KEY || "df89c57c7b398dcb79a2a61aaad61145";

    const amount = req.query.amount || 1000000; // Default amount

    // ✅ Signature benar
    const signatureString = merchantCode + amount + apiKey;
    const signature = crypto
      .createHash("md5")
      .update(signatureString)
      .digest("hex");
      const response = await axios.get(
      "https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod",
      {
         params: {
            merchantcode: merchantCode,
            amount: amount,
            signature: signature,
         },
      }
      );

      console.log("👉 Response status:", response.status);
      console.log("👉 Response headers:", response.headers);
      console.log("👉 Response data:", response.data);

      res.json({
      success: true,
      data: response.data,
      });

  } catch (error) {
    console.error("Error fetching payment methods:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil metode pembayaran",
      error: error.response?.data || error.message,
    });
  }
});

// API Routes
router.get("/prices", requireApiLogin, indexPrice);
router.get("/prices/:id", requireApiLogin, showPrice);
router.post("/prices", requireApiLogin, storePrice);
router.put("/prices/:id", requireApiLogin, updatePrice);
router.delete("/prices/:id", requireApiLogin, destroyPrice);

router.get("/payments", indexPayment);
router.get("/payments/:id", requireApiLogin, showPayment);
router.post("/payments", requireApiLogin, storePayment);
router.put("/payments/:id", requireApiLogin, updatePayment);
router.delete("/payments/:id", requireApiLogin, destroyPayment);

export default router;
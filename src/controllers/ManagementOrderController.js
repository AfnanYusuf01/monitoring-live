import pkg from "@prisma/client";
import axios from "axios";
import crypto from "crypto";
import config from "../config/duitku.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";


const {PrismaClient, OrderStatus} = pkg;

const prisma = new PrismaClient();

// Get all orders
export async function indexOrder(req, res) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        userSubscription: {
          include: {user: true, subscription: true},
        },
      },
      orderBy: {createdAt: "desc"},
    });

    res.status(200).json({
      status: "success",
      message: "List of orders retrieved successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
}

// Get single order
export async function showOrder(req, res) {
  try {
    const {id} = req.params;
    const order = await prisma.order.findUnique({
      where: {id: parseInt(id)},
      include: {
        userSubscription: {
          include: {user: true, subscription: true},
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch order",
      error: error.message,
    });
  }
}

// Create new order
export async function storeOrder(req, res) {
  try {
    const {userSubscriptionId, amount, status, paymentMethod, transactionId} =
      req.body;

    if (!userSubscriptionId || !amount) {
      return res.status(400).json({
        status: "error",
        message: "userSubscriptionId and amount are required",
      });
    }

    // cek userSubscription valid
    const checkUserSub = await prisma.userSubscription.findUnique({
      where: {id: parseInt(userSubscriptionId)},
    });
    if (!checkUserSub) {
      return res.status(404).json({
        status: "error",
        message: "UserSubscription not found",
      });
    }

    // validasi status enum
    if (status && !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status. Allowed: ${Object.values(OrderStatus).join(
          ", "
        )}`,
      });
    }

    const order = await prisma.order.create({
      data: {
        userSubscriptionId: parseInt(userSubscriptionId),
        amount: parseFloat(amount),
        status: status || OrderStatus.pending,
        paymentMethod,
        transactionId,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create order",
      error: error.message,
    });
  }
}

// Update order
export async function updateOrder(req, res) {
  try {
    const {id} = req.params;
    const {userSubscriptionId, amount, status, paymentMethod, transactionId} =
      req.body;

    if (userSubscriptionId) {
      const checkUserSub = await prisma.userSubscription.findUnique({
        where: {id: parseInt(userSubscriptionId)},
      });
      if (!checkUserSub) {
        return res.status(404).json({
          status: "error",
          message: "UserSubscription not found",
        });
      }
    }

    // validasi status enum
    if (status && !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status. Allowed: ${Object.values(OrderStatus).join(
          ", "
        )}`,
      });
    }

    const order = await prisma.order.update({
      where: {id: parseInt(id)},
      data: {
        userSubscriptionId: userSubscriptionId
          ? parseInt(userSubscriptionId)
          : undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        status,
        paymentMethod,
        transactionId,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }
    res.status(500).json({
      status: "error",
      message: "Failed to update order",
      error: error.message,
    });
  }
}

// Delete order
export async function destroyOrder(req, res) {
  try {
    const {id} = req.params;
    const orderId = parseInt(id);

    // Hapus affiliate orders terkait terlebih dahulu
    await prisma.affiliateOrder.deleteMany({
      where: { orderId: orderId }
    });

    // Hapus order
    await prisma.order.delete({
      where: { id: orderId },
    });

    res.status(200).json({
      status: "success",
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to delete order",
      error: error.message,
    });
  }
}

export const renderCheckout = async (req, res) => {
  const subscriptionId = parseInt(req.params.id); // <--- pakai "id"
  if (isNaN(subscriptionId)) {
    return res.status(400).send("ID tidak valid");
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: {id: subscriptionId},
    });
    const userCount =  await prisma.order.count()
const uniquenumber = userCount % 1000
    if (!subscription) return res.status(404).send("Paket tidak ditemukan");

    // Cek user yang sedang login
    const user = req.session.user || null; // jika pakai session
    // const user = req.user || null; // jika pakai middleware passport/next-auth
    console.log("📦 Data Subscription:", subscription);
    // Kirim data subscription + user ke view
    res.render("checkout", {subscription, user,uniquenumber});
  } catch (err) {
    console.error("❌ Error saat ambil subscription:", err);
    res.status(500).send("Terjadi kesalahan server");
  }
};

export const renderCustomCheckout = async (req, res) => {
  try {
    const accounts = parseInt(req.query.accounts);
    const durationMonth = parseInt(req.query.duration); // dalam bulan

    if (isNaN(accounts) || isNaN(durationMonth)) {
      return res
        .status(400)
        .send("Parameter accounts dan duration harus angka");
    }

    // Ambil subscription template yg is_custom = true
    const baseSubscription = await prisma.subscription.findFirst({
      where: {is_custom: true},
      select: {id: true, name: true, description: true}, // cukup ambil ID
    });

    if (!baseSubscription) {
      return res
        .status(404)
        .send("Template custom subscription tidak ditemukan");
    }

    // Cari skema harga untuk jumlah akun
    const priceScheme = await prisma.price.findFirst({
      where: {
        formAkun: {lte: accounts}, // angka
        toAkun: {gte: accounts}, // angka
      },
    });

    // const priceScheme = await prisma.price.findFirst();
    if (!priceScheme) {
      return res
        .status(404)
        .send("Skema harga tidak ditemukan untuk jumlah akun ini");
    }

    // Hitung harga
  
      // priceScheme.priceMount * durationMonth/30;
  const accountPrice = priceScheme.priceAkun * accounts 
  const price = accountPrice * durationMonth/30
    // Convert bulan ke hari
    const durationDays = durationMonth;

    console.log("durasi", durationDays);
    // Data subscription final
    const subscription = {
      subscriptionId: baseSubscription.id, // hanya id dari template
      name: "Custom Plan",
      description: `Paket custom ${durationMonth} bulan dengan ${accounts} akun`,
      price,
      duration: durationDays,
      limitAkun: accounts,
      komisi: baseSubscription.komisi,
    };

    const user = req.session.user || null;

    console.log("📦 Data Custom Subscription:", subscription);

    res.render("checkout", {subscription, user});
  } catch (err) {
    console.error("❌ Error saat buat custom subscription:", err);
    res.status(500).send("Terjadi kesalahan server");
  }
};


const sendWhatsApp = async (number, message) => {
  try {
    const res = await axios.post(
      process.env.STARSENDER_API_URL,
      {
        to: number.startsWith("62") ? number : "62" + number.replace(/^0/, ""),
        message: message,
        messageType: "text",
        deviceId: parseInt(process.env.STARSENDER_DEVICE_ID, 10),
      },
      {
        headers: {
          Authorization: process.env.STARSENDER_TOKEN, // tanpa "Bearer"
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📨 Starsender response:", res.data);
    return res.data;
  } catch (err) {
    console.error(
      "❌ Error kirim WhatsApp:",
      err.response?.data || err.message
    );
    throw err;
  }
};

export const createOrderManual = async (req, res) => {
  try {
    const method = req.query.method;
    const userId = req.session.user.id;
    const fixedPrice = parseInt(req.query.price, 10); // basis 10

    // Ambil subscription ID dari parameter route
    const subscriptionId = parseInt(req.params.id);

    // Ambil data custom dari query (jika ada)
    const customPrice = req.query.price ? parseInt(req.query.price) : null;
    const customLimitAkun = req.query.limitAkun
      ? parseInt(req.query.limitAkun)
      : null;
    const customDuration = req.query.duration
      ? parseInt(req.query.duration)
      : null;

    console.log("👉 Subscription ID:", subscriptionId);
    console.log("👉 Query Price:", customPrice);
    console.log("👉 Query LimitAkun:", customLimitAkun);
    console.log("👉 Query Duration:", customDuration);

    // Ambil subscription dari database
    let subscription = await prisma.subscription.findUnique({
      where: {id: parseInt(subscriptionId)},
    });

    if (!subscription) return res.status(404).send("Paket tidak ditemukan");

    // ✅ CEK: Jika subscription adalah custom (is_custom = true)
    if (subscription.is_custom) {
      console.log("✅ Subscription Custom ditemukan");

      // Validasi bahwa semua parameter custom harus ada
      if (!customPrice || !customLimitAkun || !customDuration) {
        return res.status(400).json({
          message:
            "Untuk paket custom, harga, limit akun, dan durasi harus diisi",
        });
      }

      // Override field dengan query param untuk custom subscription
      subscription = {
        ...subscription,
        price: customPrice,
        limitAkun: customLimitAkun,
        duration: customDuration,
      };

      console.log("✅ Subscription Custom:", subscription);
    } else {
      console.log("✅ Subscription Normal:", subscription);
    }

    // ✅ Pastikan price tidak null, set ke 0 jika null
    if (subscription.price === null || subscription.price === undefined) {
      subscription.price = 0;
    }

    // ✅ CEK: Jika harga subscription = 0, cek apakah user sudah pernah membeli
    if (subscription.price === 0) {
      // Cek apakah user sudah pernah membeli subscription dengan harga 0
      const existingFreeOrder = await prisma.order.findFirst({
        where: {
          userSubscription: {
            userId: userId,
          },
          amount: 0,
          status: {
            in: ["paid"], // Cek yang sudah berhasil dibayar
          },
        },
      });

      if (existingFreeOrder) {
        return res.status(400).json({
          message:
            "Anda sudah pernah membeli paket gratis. Tidak dapat membeli paket gratis lebih dari sekali.",
        });
      }

      // Juga cek di UserSubscription untuk memastikan
      const existingFreeSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId: userId,
          subscription: {
            price: 0,
          },
          status: "active",
        },
      });

      if (existingFreeSubscription) {
        return res.status(400).json({
          message:
            "Anda sudah memiliki paket gratis aktif. Tidak dapat membeli paket gratis lebih dari sekali.",
        });
      }
    }

    // ✅ LOGIKA AFFILIATE - Mulai pengecekan cookie
    let affiliateId = null;

    // Cek apakah ada cookie affiliate dan subscription yang sesuai
    const affiliateIdFromCookie =
      req.cookies?.id_aff && !isNaN(req.cookies.id_aff)
        ? parseInt(req.cookies.id_aff)
        : null;

    const subscriptionIdFromCookie =
      req.cookies?.id_sub && !isNaN(req.cookies.id_sub)
        ? parseInt(req.cookies.id_sub)
        : null;

    console.log("🍪 Cookie Affiliate ID:", affiliateIdFromCookie);
    console.log("🍪 Cookie Subscription ID:", subscriptionIdFromCookie);

    if (affiliateIdFromCookie && subscriptionIdFromCookie) {
      // Cek apakah subscription yang dibeli sama dengan yang di cookie
      if (subscription.id === subscriptionIdFromCookie) {
        affiliateId = affiliateIdFromCookie;
        console.log("✅ Menggunakan affiliate dari cookie:", affiliateId);
      } else {
        console.log(
          "❌ Subscription tidak cocok dengan cookie, cari affiliate terbaru"
        );

        // Cari affiliate terbaru dari order dengan subscription yang sama
        const recentOrder = await prisma.order.findFirst({
          where: {
            userSubscription: {
              userId: userId,
              subscriptionId: subscription.id,
            },
            affiliateId: {not: null},
          },
          orderBy: {createdAt: "desc"},
          include: {
            affiliate: true,
          },
        });

        if (recentOrder && recentOrder.affiliateId) {
          affiliateId = recentOrder.affiliateId;
          console.log(
            "✅ Menggunakan affiliate dari order terbaru:",
            affiliateId
          );
        }
      }
    } else if (affiliateIdFromCookie) {
      // Jika hanya ada affiliate cookie tanpa subscription cookie
      affiliateId = affiliateIdFromCookie;
      console.log(
        "✅ Menggunakan affiliate dari cookie (tanpa sub check):",
        affiliateId
      );
    } else {
      // Cari affiliate terbaru jika tidak ada cookie
      const recentOrder = await prisma.order.findFirst({
        where: {
          userSubscription: {
            userId: userId,
            subscriptionId: subscription.id,
          },
          affiliateId: {not: null},
        },
        orderBy: {createdAt: "desc"},
        include: {
          affiliate: true,
        },
      });

      if (recentOrder && recentOrder.affiliateId) {
        affiliateId = recentOrder.affiliateId;
        console.log(
          "✅ Menggunakan affiliate dari order terbaru:",
          affiliateId
        );
      }
    }

    // ✅ CEK: Jika harga subscription = 0, langsung redirect ke thank you
    if (subscription.price === 0) {
      console.log("🎯 Harga 0 - Langsung buat subscription aktif");

      // Buat UserSubscription langsung aktif
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (subscription.duration || 0));

      const userSub = await prisma.userSubscription.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          startDate,
          endDate,
          status: "active", // Langsung aktif
          limitAkun: subscription.limitAkun || 0,
        },
        include: {
          user: true,
          subscription: true,
        },
      });

      // Buat Order dengan status paid
      const orderId = "TRX-" + Date.now();
      const order = await prisma.order.create({
        data: {
          userSubscriptionId: userSub.id,
          amount: 0, // Pastikan 0
          status: "paid", // Langsung paid
          paymentMethod: "free",
          transactionId: orderId,
          affiliateId: affiliateId || null,
        },
      });

      // Jika ada affiliate, buat affiliate order
      if (affiliateId) {
        await prisma.affiliateOrder.create({
          data: {
            affiliateId: affiliateId,
            orderId: order.id,
            komisi: 0,
            status: "approved",
          },
        });
        console.log("💰 Affiliate order dibuat (free, komisi 0)");
      }

      console.log("✅ Free subscription berhasil dibuat");

      // === Kirim email konfirmasi free subscription ===
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const appUrl = process.env.APP_URL || "https://monitor.kol-kit.my.id/";

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: userSub.user.email,
          subject: "Berhasil Mendapatkan Free Subscription",
          html: `
            <p>Halo ${userSub.user.name || "Customer"},</p>
            <p>Anda telah berhasil mendapatkan paket gratis <strong>${
              userSub.subscription.name
            }</strong>.</p>
            <p>Subscription Anda sekarang aktif dan dapat digunakan.</p>
            
            <p><strong>Link Akses Aplikasi:</strong></p>
            <p><a href="${appUrl}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login ke Aplikasi</a></p>
            
            <p>Atau salin link berikut di browser Anda:</p>
            <p>${appUrl}/login</p>
            
            <p>Terima kasih telah bergabung!</p>
            <br>
            <p>Hormat kami,<br>Tim Support</p>
          `,
        });
        console.log("📧 Email sukses terkirim (free subscription)");
      } catch (mailErr) {
        console.error("❌ Gagal kirim email free subscription:", mailErr.message);
      }

      // === Render halaman thank-you-free (bukan redirect) ===
      return res.json({
        success: true,
        redirect: "/thank-you-free",
        orderId,
        subscription: userSub.subscription,
      });
    }

    // ✅ CEK: Jika subscription duration = 0 (paket tambahan akun)
    if (subscription.duration === 0) {
      const activeSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId: userId,
          status: "active",
        },
      });

      if (!activeSubscription) {
        return res.status(400).json({
          message:
            "Anda harus memiliki subscription aktif terlebih dahulu sebelum membeli paket tambahan akun",
        });
      }
    }

    // Buat UserSubscription (pakai subscription yang sudah di-set di atas)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (subscription.duration || 0));

    const userSub = await prisma.userSubscription.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        startDate,
        endDate,
        status: "canceled",
        limitAkun: subscription.limitAkun || 0,
      },
    });

    // Buat Order dengan affiliateId jika ada - PASTIKAN amount TIDAK NULL
    const orderId = "TRX-" + Date.now();
    const order = await prisma.order.create({
      data: {
        userSubscriptionId: userSub.id,
        amount: fixedPrice || 0, // Pastikan tidak null
        status: "pending",
        paymentMethod: method,
        transactionId: orderId,
        affiliateId: affiliateId,
      },
    });

    // Jika ada affiliate, buat juga affiliate order
    if (affiliateId) {
      const komisiAmount =
        ((fixedPrice || 0) * (subscription.komisi || 0));

      await prisma.affiliateOrder.create({
        data: {
          affiliateId: affiliateId,
          orderId: order.id,
          komisi: komisiAmount,
          status: "pending",
        },
      });

      console.log("💰 Affiliate order dibuat dengan komisi:", komisiAmount);
    }

    // ✅ KIRIM EMAIL DETAIL ORDER SEBELUM RETURN
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Format harga untuk tampilan
      const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(order.amount);

      // Ambil 3 digit terakhir untuk petunjuk transfer
      const lastThreeDigits = order.amount % 1000;
      const paddedLastThree = lastThreeDigits.toString().padStart(3, '0');
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: req.session.user.email,
        subject: `Detail Pesanan - ${order.transactionId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Checkout Berhasil</h2>
            <p>Halo ${req.session.user.name || "Customer"},</p>
            <p>Berikut adalah detail pesanan Anda:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Nomor Invoice</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.transactionId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Produk</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${subscription.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Total Pembayaran</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formattedPrice}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Status</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #e67e22;">Pending</td>
              </tr>
            </table>
            
            <h3 style="color: #333; margin-top: 30px;">Informasi Transfer</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Rekening</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">BCA</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">No Rekening</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">1310493453</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Atas nama</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">Yuli Naelul Muna</td>
              </tr>
            </table>
            
            <h3 style="color: #333; margin-top: 30px;">Cara Pembayaran</h3>
            <p>Lakukan transfer hingga 3 digit angka terakhir sesuai total pembayaran yaitu Rp. ${paddedLastThree}. Bila jumlahnya tidak sesuai dengan invoice, sistem tidak bisa mengenali pembayaranmu.</p>
            
            <p>Setelah melakukan transfer, jika dalam 15 menit belum mendapat pesan whatsapp yang berisi akses Shoptik, maka konfirmasikan pembayaranmu melalui link dibawah ini:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="https://streamo.d/confirm" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Konfirmasi Pembayaran</a>
            </p>
            
            <p>Best regards,<br>Indosofthouse Team</p>
          </div>
        `,
      });
      console.log("📧 Email detail order berhasil dikirim");
    } catch (mailErr) {
      console.error("❌ Gagal mengirim email detail order:", mailErr.message);
      // Jangan return error di sini, karena order sudah berhasil dibuat
    }

    // Signature dan payload Duitku (sama seperti sebelumnya)
    const paymentAmount = (subscription.price || 0).toString();
    const payload = {
      merchantCode: config.merchantCode,
      paymentAmount: paymentAmount,
      paymentMethod: method,
      OrderId: order.transactionId,
      productDetails: subscription.name,
      customerVaName: req.session.user.name || "Customer",
      email: req.session.user.email,
      phoneNumber: req.session.user.nomor_wa || "08123456789",
    };

    return res.json({
      success: true,
      redirect: `/checkout-manual?transactionId=${order.transactionId}`,
      order,
    });

  } catch (error) {
    console.error(
      "❌ Error createOrder:",
      error.response?.data || error.message
    );
    res.status(500).send("Terjadi kesalahan saat membuat order");
  }
};

export const createOrder = async (req, res) => {
  try {
    const method = req.query.method;
    const userId = req.session.user.id;

    // Ambil subscription ID dari parameter route
    const subscriptionId = parseInt(req.params.id);

    // Ambil data custom dari query (jika ada)
    const customPrice = req.query.price ? parseInt(req.query.price) : null;
    const customLimitAkun = req.query.limitAkun
      ? parseInt(req.query.limitAkun)
      : null;
    const customDuration = req.query.duration
      ? parseInt(req.query.duration)
      : null;

    console.log("👉 Subscription ID:", subscriptionId);
    console.log("👉 Query Price:", customPrice);
    console.log("👉 Query LimitAkun:", customLimitAkun);
    console.log("👉 Query Duration:", customDuration);

    // Ambil subscription dari database

    let subscription = await prisma.subscription.findUnique({
      where: {id: parseInt(subscriptionId)},
    });

    // console.log("sampai sini")
    if (!subscription) return res.status(404).send("Paket tidak ditemukan");

    // ✅ CEK: Jika subscription adalah custom (is_custom = true)
    if (subscription.is_custom) {
      console.log("✅ Subscription Custom ditemukan");

      // Validasi bahwa semua parameter custom harus ada
      if (!customPrice || !customLimitAkun || !customDuration) {
        return res.status(400).json({
          message:
            "Untuk paket custom, harga, limit akun, dan durasi harus diisi",
        });
      }

      // Override field dengan query param untuk custom subscription
      subscription = {
        ...subscription,
        price: customPrice,
        limitAkun: customLimitAkun,
        duration: customDuration,
      };

      console.log("✅ Subscription Custom:", subscription);
    } else {
      console.log("✅ Subscription Normal:", subscription);
    }

    // ✅ Pastikan price tidak null, set ke 0 jika null
    if (subscription.price === null || subscription.price === undefined) {
      subscription.price = 0;
    }

    // ✅ CEK: Jika harga subscription = 0, cek apakah user sudah pernah membeli
    if (subscription.price === 0) {
      // Cek apakah user sudah pernah membeli subscription dengan harga 0
      const existingFreeOrder = await prisma.order.findFirst({
        where: {
          userSubscription: {
            userId: userId,
          },
          amount: 0,
          status: {
            in: ["paid"], // Cek yang sudah berhasil dibayar
          },
        },
      });

      if (existingFreeOrder) {
        return res.status(400).json({
          message:
            "Anda sudah pernah membeli paket gratis. Tidak dapat membeli paket gratis lebih dari sekali.",
        });
      }

      // Juga cek di UserSubscription untuk memastikan
      const existingFreeSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId: userId,
          subscription: {
            price: 0,
          },
          status: "active",
        },
      });

      if (existingFreeSubscription) {
        return res.status(400).json({
          message:
            "Anda sudah memiliki paket gratis aktif. Tidak dapat membeli paket gratis lebih dari sekali.",
        });
      }
    }

    // ✅ LOGIKA AFFILIATE - Mulai pengecekan cookie
    let affiliateId = null;

    // Cek apakah ada cookie affiliate dan subscription yang sesuai
    const affiliateIdFromCookie =
      req.cookies?.id_aff && !isNaN(req.cookies.id_aff)
        ? parseInt(req.cookies.id_aff)
        : null;

    const subscriptionIdFromCookie =
      req.cookies?.id_sub && !isNaN(req.cookies.id_sub)
        ? parseInt(req.cookies.id_sub)
        : null;

    console.log("🍪 Cookie Affiliate ID:", affiliateIdFromCookie);
    console.log("🍪 Cookie Subscription ID:", subscriptionIdFromCookie);

    if (affiliateIdFromCookie && subscriptionIdFromCookie) {
      // Cek apakah subscription yang dibeli sama dengan yang di cookie
      if (subscription.id === subscriptionIdFromCookie) {
        affiliateId = affiliateIdFromCookie;
        console.log("✅ Menggunakan affiliate dari cookie:", affiliateId);
      } else {
        console.log(
          "❌ Subscription tidak cocok dengan cookie, cari affiliate terbaru"
        );

        // Cari affiliate terbaru dari order dengan subscription yang sama
        const recentOrder = await prisma.order.findFirst({
          where: {
            userSubscription: {
              userId: userId,
              subscriptionId: subscription.id,
            },
            affiliateId: {not: null},
          },
          orderBy: {createdAt: "desc"},
          include: {
            affiliate: true,
          },
        });

        if (recentOrder && recentOrder.affiliateId) {
          affiliateId = recentOrder.affiliateId;
          console.log(
            "✅ Menggunakan affiliate dari order terbaru:",
            affiliateId
          );
        }
      }
    } else if (affiliateIdFromCookie) {
      // Jika hanya ada affiliate cookie tanpa subscription cookie
      affiliateId = affiliateIdFromCookie;
      console.log(
        "✅ Menggunakan affiliate dari cookie (tanpa sub check):",
        affiliateId
      );
    } else {
      // Cari affiliate terbaru jika tidak ada cookie
      const recentOrder = await prisma.order.findFirst({
        where: {
          userSubscription: {
            userId: userId,
            subscriptionId: subscription.id,
          },
          affiliateId: {not: null},
        },
        orderBy: {createdAt: "desc"},
        include: {
          affiliate: true,
        },
      });

      if (recentOrder && recentOrder.affiliateId) {
        affiliateId = recentOrder.affiliateId;
        console.log(
          "✅ Menggunakan affiliate dari order terbaru:",
          affiliateId
        );
      }
    }

    // ✅ CEK: Jika harga subscription = 0, langsung redirect ke thank you
    if (subscription.price === 0) {
      console.log("🎯 Harga 0 - Langsung buat subscription aktif");

      // Buat UserSubscription langsung aktif
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (subscription.duration || 0));

      const userSub = await prisma.userSubscription.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          startDate,
          endDate,
          status: "active", // Langsung aktif
          limitAkun: subscription.limitAkun || 0,
        },
        include: {
          user: true,
          subscription: true,
        },
      });

      // Buat Order dengan status paid
      const orderId = "TRX-" + Date.now();
      const order = await prisma.order.create({
        data: {
          userSubscriptionId: userSub.id,
          amount: 0, // Pastikan 0
          status: "paid", // Langsung paid
          paymentMethod: "free",
          transactionId: orderId,
          affiliateId: affiliateId || null,
        },
      });

      // Jika ada affiliate, buat affiliate order
      if (affiliateId) {
        await prisma.affiliateOrder.create({
          data: {
            affiliateId: affiliateId,
            orderId: order.id,
            komisi: 0,
            status: "approved",
          },
        });
        console.log("💰 Affiliate order dibuat (free, komisi 0)");
      }

      console.log("✅ Free subscription berhasil dibuat");

      // === Kirim email konfirmasi free subscription ===
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const appUrl = process.env.APP_URL || "https://monitor.kol-kit.my.id/";

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: userSub.user.email,
          subject: "Berhasil Mendapatkan Free Subscription",
          html: `
            <p>Halo ${userSub.user.name || "Customer"},</p>
            <p>Anda telah berhasil mendapatkan paket gratis <strong>${
              userSub.subscription.name
            }</strong>.</p>
            <p>Subscription Anda sekarang aktif dan dapat digunakan.</p>
            
            <p><strong>Link Akses Aplikasi:</strong></p>
            <p><a href="${appUrl}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login ke Aplikasi</a></p>
            
            <p>Atau salin link berikut di browser Anda:</p>
            <p>${appUrl}/login</p>
            
            <p>Terima kasih telah bergabung!</p>
            <br>
            <p>Hormat kami,<br>Tim Support</p>
          `,
        });
        console.log("📧 Email sukses terkirim (free subscription)");
      } catch (mailErr) {
        console.error("❌ Gagal kirim email free subscription:", mailErr.message);
      }

      // === Render halaman thank-you-free (bukan redirect) ===
      return res.json({
        success: true,
        redirect: "/thank-you-free",
        orderId,
        subscription: userSub.subscription,
      });
    }


    // ✅ CEK: Jika subscription duration = 0 (paket tambahan akun)
    if (subscription.duration === 0) {
      const activeSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId: userId,
          status: "active",
        },
      });

      if (!activeSubscription) {
        return res.status(400).json({
          message:
            "Anda harus memiliki subscription aktif terlebih dahulu sebelum membeli paket tambahan akun",
        });
      }
    }

    // Buat UserSubscription (pakai subscription yang sudah di-set di atas)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (subscription.duration || 0));

    const userSub = await prisma.userSubscription.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        startDate,
        endDate,
        status: "canceled",
        limitAkun: subscription.limitAkun || 0,
      },
    });

    // Buat Order dengan affiliateId jika ada - PASTIKAN amount TIDAK NULL
    const orderId = "TRX-" + Date.now();
    const order = await prisma.order.create({
      data: {
        userSubscriptionId: userSub.id,
        amount: subscription.price || 0, // Pastikan tidak null
        status: "pending",
        paymentMethod: method,
        transactionId: orderId,
        affiliateId: affiliateId,
      },
    });

    // Jika ada affiliate, buat juga affiliate order
    if (affiliateId) {
      const komisiAmount =
        ((subscription.price || 0) * (subscription.komisi || 0)) / 100;

      await prisma.affiliateOrder.create({
        data: {
          affiliateId: affiliateId,
          orderId: order.id,
          komisi: komisiAmount,
          status: "pending",
        },
      });

      console.log("💰 Affiliate order dibuat dengan komisi:", komisiAmount);
    }

    // Signature dan payload Duitku (sama seperti sebelumnya)
    const paymentAmount = (subscription.price || 0).toString();
    const signatureString =
      config.merchantCode + orderId + paymentAmount + config.apiKey;

    const signature = crypto
      .createHash("md5")
      .update(signatureString)
      .digest("hex");

    const payload = {
      merchantCode: config.merchantCode,
      paymentAmount: paymentAmount,
      paymentMethod: method,
      merchantOrderId: orderId,
      productDetails: subscription.name,
      customerVaName: req.session.user.name || "Customer",
      email: req.session.user.email,
      phoneNumber: req.session.user.nomor_wa || "08123456789",
      callbackUrl: config.callbackUrl,
      returnUrl: config.returnUrl,
      signature: signature,
    };

    console.log("📤 Payload ke Duitku:", payload);

    const duitkuUrl = config.passport
      ? "https://passport.duitku.com/webapi/api/merchant/v2/inquiry"
      : "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";

    const response = await axios.post(duitkuUrl, payload, {
      headers: {"Content-Type": "application/json"},
    });

    if (response.data && response.data.paymentUrl) {
      return res.json({paymentUrl: response.data.paymentUrl});
    } else {
      return res
        .status(400)
        .json({message: "Gagal membuat transaksi", response: response.data});
    }
  } catch (error) {
    console.error(
      "❌ Error createOrder:",
      error.response?.data || error.message
    );
    res.status(500).send("Terjadi kesalahan saat membuat order");
  }
};

export const duitkuCallback = async (req, res) => {
  try {
    console.log("📥 Callback diterima:", req.body);

    const merchantCode = req.body.merchantCode;
    const merchantOrderId = req.body.merchantOrderId;
    const amount = req.body.amount;
    const signature = req.body.signature;

    const signatureString =
      merchantCode + amount + merchantOrderId + config.apiKey;
    const validSignature = crypto
      .createHash("md5")
      .update(signatureString)
      .digest("hex");

    console.log("🔑 Signature Dihitung:", validSignature);

    if (signature.toLowerCase() !== validSignature.toLowerCase()) {
      console.warn("❌ Signature tidak valid");
      return res.status(400).send("Invalid signature");
    }

    // Cari order dengan include data yang diperlukan
    const order = await prisma.order.findUnique({
      where: {transactionId: merchantOrderId},
      include: {
        userSubscription: {
          include: {
            user: true,
            subscription: true,
          },
        },
        affiliateOrders: true,
      },
    });

    console.log("📦 Order ditemukan:", order?.id);

    if (!order) {
      console.warn("⚠️ Order tidak ditemukan:", merchantOrderId);
      return res.status(404).send("Order tidak ditemukan");
    }

    // Tentukan status berdasarkan resultCode
    let newStatus = "pending";
    if (req.body.resultCode === "00") newStatus = "paid";
    else if (req.body.resultCode === "01") newStatus = "failed";
    else if (req.body.resultCode === "02") newStatus = "expired";

    console.log(`🔄 Update status order ${order.id} → ${newStatus}`);

    // Update status order
    await prisma.order.update({
      where: {id: order.id},
      data: {status: newStatus},
    });

    // Jika pembayaran berhasil, update status UserSubscription menjadi active
    if (newStatus === "paid") {
      console.log(
        `✅ Update UserSubscription ${order.userSubscription.id} menjadi active`
      );

      await prisma.userSubscription.update({
        where: {id: order.userSubscription.id},
        data: {status: "active"},
      });

      // Update status affiliate order menjadi approved
      if (order.affiliateOrders.length > 0) {
        await prisma.affiliateOrder.updateMany({
          where: {orderId: order.id},
          data: {status: "approved"},
        });
        console.log("✅ Affiliate order status updated to approved");
      }

      const user = order.userSubscription.user;
      const purchasedSubscription = order.userSubscription.subscription;

      console.log("💰 Pembayaran berhasil, kirim notifikasi");

      // Kirim notifikasi email
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const appUrl = process.env.APP_URL || "https://monitor.kol-kit.my.id/";

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Pembayaran Berhasil - Akses Akun Anda",
          html: `
            <p>Halo ${user.name || "Customer"},</p>
            <p>Pembayaran paket <strong>${
              purchasedSubscription.name
            }</strong> sebesar Rp${order.amount} telah berhasil.</p>
            <p>Subscription Anda sekarang aktif dan dapat digunakan.</p>
            
            <p><strong>Link Akses Aplikasi:</strong></p>
            <p><a href="${appUrl}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login ke Aplikasi</a></p>
            
            <p>Atau salin link berikut di browser Anda:</p>
            <p>${appUrl}/login</p>
            
            <p>Terima kasih telah berlangganan!</p>
            <br>
            <p>Hormat kami,<br>Tim Support</p>
          `,
        });
        console.log("📧 Email sukses terkirim");
      } catch (mailErr) {
        console.error("❌ Gagal kirim email:", mailErr.message);
      }

      // Kirim WhatsApp jika ada nomor
      if (user.nomor_wa) {
        try {
          const formattedAmount = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
          }).format(order.amount);

          const appUrl =
            process.env.APP_URL || "https://monitor.kol-kit.my.id/";

          const whatsappMessage = `🌟 *PEMBAYARAN BERHASIL* 🌟

Halo ${user.name || "Pelanggan Setia"}! 

Pembayaran Anda telah berhasil diproses.

📋 *Detail Transaksi:*
➤ Order ID: ${merchantOrderId}
➤ Paket: ${purchasedSubscription.name}
➤ Jumlah: ${formattedAmount}
➤ Status: ✅ BERHASIL
➤ Subscription: ✅ AKTIF

🔗 *Akses Aplikasi:*
${appUrl}

Subscription Anda sekarang aktif dan dapat digunakan.

Terima kasih telah mempercayai layanan kami! 🚀

*Tim Support*`;

          await sendWhatsApp(user.nomor_wa, whatsappMessage);
          console.log("✅ WhatsApp terkirim ke:", user.nomor_wa);
        } catch (waError) {
          console.error("❌ Gagal kirim WhatsApp:", waError.message);
        }
      }
    }

    console.log("✅ Callback berhasil diproses untuk order:", merchantOrderId);
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error callback:", err);
    res.status(200).send("OK");
  }
};

export const checkSubscription = async (req, res) => {
  const user = req.session.user;
  const subscriptionId = parseInt(req.params.subscriptionId);

  if (!user)
    return res
      .status(401)
      .json({success: false, message: "Silakan login terlebih dahulu"});
  if (isNaN(subscriptionId))
    return res
      .status(400)
      .json({success: false, message: "ID subscription tidak valid"});

  try {
    // Ambil paket subscription yg dipilih
    const selectedSubscription = await prisma.subscription.findUnique({
      where: {id: subscriptionId},
    });

    if (!selectedSubscription) {
      return res
        .status(404)
        .json({success: false, message: "Subscription tidak ditemukan"});
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
      // user belum punya subscription aktif
      if (selectedSubscription.duration === 0) {
        return res.json({
          success: true,
          type: "no-duration",
          message: "Apakah ingin menambahkan limit akun?",
        });
      }
      return res.json({
        success: true,
        message: "Belum memiliki subscription aktif",
      });
    }

    // Cek apakah paket yang dipilih punya durasi atau tidak
    if (selectedSubscription.duration === 0) {
      // Ini paket tanpa durasi (hanya tambah limit akun)
      return res.json({
        success: true,
        type: "add-limit",
        message: "Apakah ingin menambahkan limit akun?",
        data: activeSubscriptions,
      });
    }

    // Kalau punya durasi > 0, cek normal
    const sameSubscription = activeSubscriptions.find(
      (s) => s.subscriptionId === subscriptionId
    );

    if (sameSubscription) {
      return res.json({
        success: true,
        type: "same",
        message:
          "Anda telah memiliki subscription ini, apakah anda ingin memperpanjang durasi subscription?",
        data: sameSubscription,
      });
    } else {
      // Subscription aktif tapi berbeda
      const sub = activeSubscriptions[0];
      return res.json({
        success: true,
        type: "different",
        message: `Anda memiliki subscription "${
          sub.subscription.name
        }" yang aktif sampai ${
          sub.endDate.toISOString().split("T")[0]
        } dengan limit akun ${
          sub.subscription.limitAkun
        }. Apakah anda ingin mengganti subscription?`,
        data: sub,
      });
    }
  } catch (err) {
    console.error("❌ Error cek user subscription:", err);
    return res
      .status(500)
      .json({success: false, message: "Terjadi kesalahan server"});
  }
};


// Get all payments
export async function indexPayment(req, res) {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: {
        id: "asc",
      },
    });
    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
}

// Get single payment
export async function showPayment(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
}

// Create new payment
export async function storePayment(req, res) {
  try {
    const { nameService, status } = req.body;

    // Validasi
    if (!nameService) {
      return res.status(400).json({ error: "Nama layanan harus diisi" });
    }

    const payment = await prisma.payment.create({
      data: {
        nameService,
        status: status === "true" || status === true,
      },
    });

    res.json(payment);
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
}

// Update payment
export async function updatePayment(req, res) {
  try {
    const { id } = req.params;
    const { nameService, status } = req.body;

    const payment = await prisma.payment.update({
      where: { id: parseInt(id) },
      data: {
        nameService,
        status: status === "true" || status === true,
      },
    });

    res.json(payment);
  } catch (error) {
    console.error("Error updating payment:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.status(500).json({ error: "Failed to update payment" });
  }
}

// Delete payment
export async function destroyPayment(req, res) {
  try {
    const { id } = req.params;
    const paymentId = parseInt(id);

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    res.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.status(500).json({
      error: "Failed to delete payment",
      message: error.message,
    });
  }
}


  export const showInvoice = async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Ambil data order dari database
      const order = await prisma.order.findUnique({
        where: { transactionId: orderId },
        include: {
          userSubscription: {
            include: {
              subscription: true,
              user: true
            }
          },
          affiliate: true
        }
      });
      
      if (!order) {
        return res.status(404).send("Order tidak ditemukan");
      }
      
      // Hitung waktu kadaluarsa (1 hari dari created order)
      const expiryDate = new Date(order.createdAt);
      expiryDate.setDate(expiryDate.getDate() + 1);
      
      // Format data untuk ditampilkan
      const invoiceData = {
        orderId: order.transactionId,
        createdAt: order.createdAt,
        expiryDate: expiryDate,
        status: order.status,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        subscription: order.userSubscription.subscription.name,
        customerName: order.userSubscription.user.name,
        customerEmail: order.userSubscription.user.email
      };
      
      // Render halaman invoice dengan data yang diperlukan
      res.render('invoice', { 
        invoice: invoiceData,
        title: `Invoice #${order.transactionId}`
      });
      
    } catch (error) {
      console.error("❌ Error showInvoice:", error.message);
      res.status(500).send("Terjadi kesalahan saat memuat invoice");
    }
  };


// Konfigurasi multer untuk upload file gambar
const storage = multer.diskStorage({
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

// Filter file untuk hanya menerima gambar
const imageFileFilter = (req, file, cb) => {
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

// Buat middleware upload untuk gambar
export const uploadImage = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware error handling untuk upload gambar
export const handleImageUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File terlalu besar. Maksimal 5MB.' 
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Terlalu banyak file yang diupload.' 
      });
    }
  } else if (error.message.includes('Hanya file gambar yang diizinkan')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  next(error);
};

// GET controller
export const getConfirmPayment = async (req, res) => {
  try {
    const { transactionId } = req.query;
    
    // Cek apakah ada user yang login di session
    const user = req.session.user;
    if (!user) {
      return res.redirect(`/login?redirect=/confirm-payment?transactionId=${transactionId}`);
    }
    
    // Cari order berdasarkan transactionId
    const order = await prisma.order.findUnique({
      where: { transactionId },
      include: {
        userSubscription: {
          include: {
            user: true,
            subscription: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).render('error', { 
        message: 'Transaksi tidak ditemukan',
        user
      });
    }
    
    // Pastikan user hanya bisa mengakses order miliknya sendiri
    if (order.userSubscription.userId !== user.id && user.role !== 'admin') {
      return res.status(403).render('error', { 
        message: 'Akses ditolak. Ini bukan transaksi Anda.',
        user
      });
    }
    
    res.render("form-confirm", {
      user,
      order,
      transactionId
    });
  } catch (error) {
    console.error("Error in confirm-payment route:", error);
    res.status(500).render('error', { 
      message: 'Terjadi kesalahan server',
      user: req.session.user || null
    });
  }
};

export const postConfirmPayment = async (req, res) => {
  try {
    const {
      transactionId,
      invoiceNumber,
      product,
      amount,
      senderName,
      senderEmail,
      accountNumber,
      bankOrigin,
      bankTarget,
      notes
    } = req.body;

    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Anda harus login untuk mengkonfirmasi pembayaran' });
    }

    // Validasi data yang diperlukan
    if (!transactionId || !invoiceNumber || !product || !amount || !senderName || 
        !senderEmail || !accountNumber || !bankOrigin || !bankTarget || !req.file) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Cari order berdasarkan transactionId
    const order = await prisma.order.findUnique({
      where: { transactionId },
      include: {
        userSubscription: {
          include: {
            user: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    // Pastikan user hanya bisa mengkonfirmasi order miliknya sendiri
    if (order.userSubscription.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak. Ini bukan transaksi Anda.' });
    }

    // Generate one-time token
    const token = crypto.randomBytes(32).toString('hex');

    // Simpan data konfirmasi pembayaran ke database dengan token
    const confirmPayment = await prisma.confirmPayment.create({
      data: {
        orderId: order.id,
        product,
        tagihanProduct: amount.toString(),
        senderName,
        senderEmail,
        bankOrigin,
        bankTarget,
        amount: parseFloat(amount),
        notes: notes || '',
        buktiTf: req.file.path,
        token: token
      }
    });

    // ✅ KIRIM EMAIL KE ADMIN DENGAN FOTO BUKTI TRANSFER
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Ambil semua admin email
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'admin'
        },
        select: {
          email: true
        }
      });

      const adminEmails = adminUsers.map(admin => admin.email);

      if (adminEmails.length > 0) {
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        
        // URL dengan one-time token
        const paymentSuccessUrl = `${appUrl}/verify-payment-token?transactionId=${transactionId}&token=${token}`;
        
        // Baca file bukti transfer
        let attachment = null;
        try {
          if (fs.existsSync(req.file.path)) {
            attachment = {
              filename: `bukti-transfer-${transactionId}${path.extname(req.file.originalname)}`,
              path: req.file.path,
              contentType: req.file.mimetype
            };
          }
        } catch (fileError) {
          console.error("❌ Gagal membaca file bukti transfer:", fileError.message);
        }

        // Siapkan data email
        const mailOptions = {
          from: process.env.SMTP_FROM,
          to: adminEmails.join(','),
          subject: `Konfirmasi Pembayaran Baru - ${transactionId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Konfirmasi Pembayaran Baru</h2>
              <p>Halo Admin,</p>
              <p>Terjadi konfirmasi pembayaran baru yang perlu dicek:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Nomor Invoice</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${transactionId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Produk</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Jumlah Tagihan</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">Rp ${parseFloat(amount).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Nama Pengirim</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${senderName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Email Pengirim</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${senderEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Bank Asal</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${bankOrigin}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Bank Tujuan</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${bankTarget}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Nomor Rekening</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${accountNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Keterangan</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${notes || 'Tidak ada keterangan'}</td>
                </tr>
              </table>

              <p><strong>PENTING:</strong> Link di bawah ini hanya dapat digunakan sekali saja!</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${paymentSuccessUrl}" 
                   style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;"
                   onclick="return confirm('Apakah Anda yakin ingin memverifikasi pembayaran ini? Link ini hanya dapat digunakan sekali.');">
                  Verifikasi Pembayaran
                </a>
              </p>
              
              <p><small>Atau salin link berikut: ${paymentSuccessUrl}</small></p>
              
              <p><strong>Bukti Transfer:</strong></p>
              <p>File bukti transfer terlampir dalam email ini.</p>
              
              ${attachment ? `
              <p style="text-align: center; margin: 20px 0;">
                <img src="cid:buktiTransfer" alt="Bukti Transfer" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; padding: 5px;" />
                <br>
                <small>Preview bukti transfer</small>
              </p>
              ` : ''}
              
              <p>Silakan verifikasi pembayaran ini dengan mengklik tombol di atas.</p>
              
              <p>Best regards,<br>Sistem Notifikasi</p>
            </div>
          `,
        };

        // Tambahkan attachment jika file ada
        if (attachment) {
          mailOptions.attachments = [
            {
              filename: attachment.filename,
              path: attachment.path,
              contentType: attachment.contentType
            },
            // Juga embed gambar dalam email untuk preview
            {
              filename: `preview-${attachment.filename}`,
              path: attachment.path,
              cid: 'buktiTransfer', // Content ID untuk embedding
              contentType: attachment.contentType
            }
          ];
        }

        await transporter.sendMail(mailOptions);
        console.log("📧 Email notifikasi dengan bukti transfer berhasil dikirim ke admin");
      }
    } catch (mailErr) {
      console.error("❌ Gagal mengirim email notifikasi ke admin:", mailErr.message);
      // Jangan return error di sini, karena konfirmasi pembayaran sudah berhasil disimpan
    }

   return res.render('succes-confirm', {
      transactionId,
      order,
      user: req.session.user,
      alert: {
        type: 'success',
        message: 'Konfirmasi berhasil! Tunggu sebentar untuk diverifikasi oleh admin'
      }
    });
    
  } catch (error) {
    console.error("Error in confirm-payment POST route:", error);
    
    // Render halaman form-confirm dengan error alert
    return res.render('form-confirm', {
      transactionId: req.body.transactionId,
      user: req.session.user,
      alert: {
        type: 'error',
        message: 'Terjadi kesalahan server'
      }
    });
  }
};

// Export dengan nama yang sama untuk menghindari error
export const handleMulterError = handleImageUploadError;

export const verifyPaymentToken = async (req, res) => {
  try {
    const { transactionId, token } = req.query;
    console.log("🔍 Debug: verifyPaymentToken called with:", { transactionId, token });
    
    if (!transactionId || !token) {
      console.log("❌ Debug: Missing parameters");
      return res.status(400).render('verify-user', { 
        success: false,
        message: 'Parameter tidak lengkap',
        data: null
      });
    }
    
    // Cari konfirmasi pembayaran berdasarkan token dan transactionId
    console.log("🔍 Debug: Searching for confirmPayment with token:", token);
    const confirmPayment = await prisma.confirmPayment.findFirst({
      where: {
        token: token,
        order: {
          transactionId: transactionId
        }
      },
      include: {
        order: {
          include: {
            userSubscription: {
              include: {
                subscription: true,
                user: true
              }
            }
          }
        }
      }
    });
    
    console.log("🔍 Debug: confirmPayment found:", confirmPayment);
    
    if (!confirmPayment) {
      console.log("❌ Debug: confirmPayment not found");
      return res.status(404).render('verify-user', { 
        success: false,
        message: 'Token tidak valid atau sudah digunakan',
        data: null
      });
    }
    
    // Periksa apakah token sudah digunakan
    if (confirmPayment.isUsed) {
      console.log("❌ Debug: Token already used");
      return res.status(400).render('verify-user', { 
        success: false,
        message: 'Token sudah digunakan sebelumnya',
        data: null
      });
    }
    
    // Tandai token sebagai digunakan
    console.log("🔍 Debug: Marking token as used");
    await prisma.confirmPayment.update({
      where: { id: confirmPayment.id },
      data: { isUsed: true }
    });
    
    // Update status order menjadi paid
    console.log("🔍 Debug: Updating order status to paid");
    await prisma.order.update({
      where: { id: confirmPayment.order.id },
      data: { status: 'paid' }
    });
    
    // ✅ UPDATE USER SUBSCRIPTION MENJADI ACTIVE
    console.log("🔍 Debug: Updating user subscription to active");
    
    // Hitung tanggal mulai dan berakhir subscription
    const startDate = new Date();
    const endDate = new Date();
    
    // Ambil durasi subscription
    let subscriptionDuration = 30;
    if (confirmPayment.order.userSubscription && confirmPayment.order.userSubscription.subscription) {
      subscriptionDuration = confirmPayment.order.userSubscription.subscription.duration || 30;
    }
    
    console.log("🔍 Debug: Subscription duration:", subscriptionDuration);
    endDate.setDate(startDate.getDate() + subscriptionDuration);
    
    // Update user subscription menjadi active
    const updatedSubscription = await prisma.userSubscription.update({
      where: { id: confirmPayment.order.userSubscriptionId },
      data: { 
        status: 'active',
        startDate: startDate,
        endDate: endDate
      }
    });
    
    console.log("✅ Debug: User subscription updated successfully:", updatedSubscription);
    
    // ✅ KIRIM EMAIL KONFIRMASI KE USER
    try {
      console.log("🔍 Debug: Preparing to send confirmation email");
      const user = await prisma.user.findUnique({
        where: { id: confirmPayment.order.userSubscription.userId }
      });
      
      if (user && user.email) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: 'Pembayaran Anda Telah Diverifikasi',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Pembayaran Berhasil Diverifikasi!</h2>
              <p>Halo ${user.name || 'Pelanggan'},</p>
              <p>Pembayaran untuk transaksi <strong>${transactionId}</strong> telah berhasil diverifikasi oleh sistem.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">No. Transaksi</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${transactionId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Status</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #28a745;">Aktif</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Mulai Berlaku</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${startDate.toLocaleDateString('id-ID')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Berlaku Hingga</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${endDate.toLocaleDateString('id-ID')}</td>
                </tr>
              </table>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Akses Dashboard Anda
                </a>
              </p>
              
              <p>Terima kasih telah melakukan pembayaran. Subscription Anda sekarang aktif dan dapat digunakan.</p>
              
              <p>Best regards,<br>Tim Support</p>
            </div>
          `
        });
        console.log("✅ Debug: Email konfirmasi berhasil dikirim ke user");
      }
    } catch (emailError) {
      console.error("❌ Debug: Gagal mengirim email konfirmasi:", emailError.message);
    }
    
    console.log("✅ Debug: All operations completed successfully");
    
    // Format data untuk ditampilkan di view
    const orderData = {
      transactionId: confirmPayment.order.transactionId,
      amount: confirmPayment.order.amount,
      status: 'paid',
      subscription: {
        name: confirmPayment.order.userSubscription.subscription.name,
        duration: confirmPayment.order.userSubscription.subscription.duration,
        price: confirmPayment.order.userSubscription.subscription.price
      },
      user: {
        name: confirmPayment.order.userSubscription.user.name,
        email: confirmPayment.order.userSubscription.user.email
      },
      startDate: startDate.toLocaleDateString('id-ID'),
      endDate: endDate.toLocaleDateString('id-ID')
    };
    
    // ✅ RENDER VIEW VERIFY-USER DENGAN DATA ORDER
    return res.status(200).render('verify-user', { 
      success: true,
      message: 'Verifikasi pembayaran berhasil. Status order dan subscription telah diperbarui.',
      data: orderData
    });
    
  } catch (error) {
    console.error("❌ Debug: Error in verifyPaymentToken:", error);
    console.error("❌ Debug: Error stack:", error.stack);
    
    return res.status(500).render('verify-user', { 
      success: false,
      message: 'Terjadi kesalahan server',
      data: null
    });
  }
};
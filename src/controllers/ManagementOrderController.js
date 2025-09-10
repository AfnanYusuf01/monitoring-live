import pkg from "@prisma/client";
import axios from "axios";
import crypto from "crypto";
import config from "../config/duitku.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

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

    if (!subscription) return res.status(404).send("Paket tidak ditemukan");

    // Cek user yang sedang login
    const user = req.session.user || null; // jika pakai session
    // const user = req.user || null; // jika pakai middleware passport/next-auth
    console.log("📦 Data Subscription:", subscription);
    // Kirim data subscription + user ke view
    res.render("checkout", {subscription, user});
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


    if (!priceScheme) {
      return res
        .status(404)
        .send("Skema harga tidak ditemukan untuk jumlah akun ini");
    }

    // Hitung harga
    const price =
      priceScheme.priceAkun * accounts +
      priceScheme.priceMount * durationMonth/30;

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
      });

      // Buat Order dengan status paid - PASTIKAN amount TIDAK NULL
      const orderId = "TRX-" + Date.now();
      const order = await prisma.order.create({
        data: {
          userSubscriptionId: userSub.id,
          amount: 0, // Pastikan 0, bukan null
          status: "paid", // Langsung paid
          paymentMethod: "free",
          transactionId: orderId,
          affiliateId: affiliateId, // Tetap gunakan affiliateId jika ada
        },
      });

      // Jika ada affiliate, buat juga affiliate order (walaupun harga 0)
      if (affiliateId) {
        const komisiAmount = 0; // Pastikan 0 karena harga 0

        await prisma.affiliateOrder.create({
          data: {
            affiliateId: affiliateId,
            orderId: order.id,
            komisi: komisiAmount, // Akan menjadi 0 karena harga 0
            status: "approved", // Langsung approved untuk free order
          },
        });

        console.log("💰 Affiliate order dibuat dengan komisi:", komisiAmount);
      }

      console.log("✅ Free subscription berhasil dibuat");

      // Redirect langsung ke thank you page
      return res.redirect(
        `/thank-you?merchantOrderId=${orderId}&resultCode=00&reference=FREE_SUBSCRIPTION`
      );
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

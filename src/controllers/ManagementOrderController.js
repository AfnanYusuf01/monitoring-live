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

    await prisma.order.delete({
      where: {id: parseInt(id)},
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

    // Kirim data subscription + user ke view
    res.render("checkout", {subscription, user});
  } catch (err) {
    console.error("❌ Error saat ambil subscription:", err);
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
    const subscriptionId = parseInt(req.params.id);
    const method = req.query.method; // metode pembayaran dipilih user
      const userId = req.session.user.id;

    // ambil paket
    const subscription = await prisma.subscription.findUnique({
      where: {id: subscriptionId},
    });
    if (!subscription) return res.status(404).send("Paket tidak ditemukan");

    // ✅ CEK: Jika subscription duration = 0 (paket tambahan akun)
    if (subscription.duration === 0) {
      // Cek apakah user sudah punya UserSubscription active
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

    // buat UserSubscription (status pending)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + subscription.duration);

    const userSub = await prisma.userSubscription.create({
      data: {
        userId,
        subscriptionId,
        startDate,
        endDate,
        status: "canceled",
      },
    });

    // buat Order
    const orderId = "TRX-" + Date.now();
    const order = await prisma.order.create({
      data: {
        userSubscriptionId: userSub.id,
        amount: subscription.price,
        status: "pending",
        paymentMethod: method,
        transactionId: orderId,
      },
    });

    const paymentAmount = subscription.price.toString(); // harus string
    const signatureString =
      config.merchantCode + orderId + paymentAmount + config.apiKey;

    const signature = crypto
      .createHash("md5")
      .update(signatureString)
      .digest("hex");

    //console.log("🔑 String before hash:", signatureString);
    console.log("🔑 Local Signature:", signature);

    // payload ke duitku
    const payload = {
      merchantCode: config.merchantCode,
      paymentAmount: paymentAmount,
      paymentMethod: method,
      merchantOrderId: orderId,
      productDetails: subscription.id,
      customerVaName: req.user.name || "Customer",
      email: req.user.email,
      phoneNumber: "08123456789", // bisa ambil dari user profile
      callbackUrl: config.callbackUrl,
      returnUrl: config.returnUrl,
      signature: signature,
    };

    console.log("📤 Payload ke Duitku:", payload);

    // pilih endpoint sesuai env
    const duitkuUrl = config.passport
      ? "https://passport.duitku.com/webapi/api/merchant/v2/inquiry"
      : "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";

    //console.log("🌐 Endpoint Duitku:", duitkuUrl);

    // request ke duitku
    const response = await axios.post(duitkuUrl, payload, {
      headers: {"Content-Type": "application/json"},
    });

    //console.log("📥 Response dari Duitku:", response.data);

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
    const reference = req.body.reference;
    const statusCode = req.body.statusCode;
    const signature = req.body.signature;
    const paymentAmount = req.body.paymentAmount;
    const subscriptionIdOrder = parseInt(req.body.productDetails);

    console.log("📥 Callback amount diterima:", amount);

    const signatureString =
      merchantCode +
      amount +
      merchantOrderId +
      config.apiKey;
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
      where: { transactionId: merchantOrderId },
      include: {
        userSubscription: {
          include: {
            user: true,
            subscription: true,
          },
        },
        affiliate: true, // Include data affiliate jika ada
      },
    });

    console.log("📦 Order ditemukan:", order?.id);

    if (!order) {
      console.warn("⚠️ Order tidak ditemukan:", merchantOrderId);
      return res.status(404).send("Order tidak ditemukan");
    }

    // Tentukan status
    let newStatus = "pending";
    if (req.body.resultCode === "00") newStatus = "paid";
    else if (req.body.resultCode === "01") newStatus = "failed";
    else if (req.body.resultCode === "02") newStatus = "expired";

    console.log(`🔄 Update status order ${order.id} → ${newStatus}`);

    // Update status order
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    });

    // Logika untuk mengelola UserSubscription ketika pembayaran berhasil
    if (newStatus === "paid") {
      const user = order.userSubscription.user;
      const purchasedSubscription = await prisma.subscription.findUnique({
        where: { id: subscriptionIdOrder },
      });

      if (!purchasedSubscription) {
        console.warn("⚠️ Subscription tidak ditemukan:", subscriptionIdOrder);
        return res.status(404).send("Subscription tidak ditemukan");
      }

      // 1. CEK: Apakah user punya UserSubscription dengan status = "active" ?
      const activeUserSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId: user.id,
          status: "active",
        },
        include: {
          subscription: true,
        },
      });

      if (!activeUserSubscription) {
        // ──> JIKA TIDAK ADA: Buat/Update UserSubscription baru
        const newEndDate =
          purchasedSubscription.duration > 0
            ? new Date(
                new Date().setDate(
                  new Date().getDate() + purchasedSubscription.duration
                )
              )
            : new Date(new Date().setFullYear(new Date().getFullYear() + 10));

        await prisma.userSubscription.update({
          where: { id: order.userSubscription.id },
          data: {
            status: "active",
            subscription: { connect: { id: subscriptionIdOrder } },
            limitAkun: purchasedSubscription.limitAkun,
            startDate: new Date(),
            endDate: newEndDate,
          },
        });
        console.log("✅ UserSubscription baru diaktifkan");
      } else {
        // ──> JIKA ADA: User sudah punya subscription aktif
        if (purchasedSubscription.duration === 0) {
          // 2. JIKA YA (paket tambahan akun): Update limitAkun
          const newLimitAkun =
            (activeUserSubscription.limitAkun || 0) +
            purchasedSubscription.limitAkun;

          await prisma.userSubscription.update({
            where: { id: activeUserSubscription.id },
            data: {
              limitAkun: newLimitAkun,
            },
          });
          console.log(`➕ Limit akun ditambah menjadi: ${newLimitAkun}`);
        } else {
          // ──> JIKA TIDAK (subscription utama)
          if (activeUserSubscription.subscriptionId === subscriptionIdOrder) {
            // 3. JIKA SAMA (paket yang sama): Perpanjang endDate
            const currentDuration =
              activeUserSubscription.subscription?.duration || 0;
            const newEndDate = new Date(activeUserSubscription.endDate);
            newEndDate.setDate(
              newEndDate.getDate() + purchasedSubscription.duration
            );

            await prisma.userSubscription.update({
              where: { id: activeUserSubscription.id },
              data: {
                endDate: newEndDate,
              },
            });
            console.log("⏰ Durasi subscription diperpanjang");
          } else {
            // ──> JIKA BERBEDA (paket berbeda): Update ke subscription baru
            const newEndDate =
              purchasedSubscription.duration > 0
                ? new Date(
                    new Date().setDate(
                      new Date().getDate() + purchasedSubscription.duration
                    )
                  )
                : new Date(
                    new Date().setFullYear(new Date().getFullYear() + 10)
                  );

            await prisma.userSubscription.update({
              where: { id: activeUserSubscription.id },
              data: {
                subscription: { connect: { id: subscriptionIdOrder } },
                limitAkun: purchasedSubscription.limitAkun,
                startDate: new Date(),
                endDate: newEndDate,
              },
            });
            console.log("🔄 Subscription diganti dengan yang baru");
          }
        }
      }

      // ✅ CEK AFFILIATE: Jika ada cookie affiliate dan subscription ID cocok
      const affiliateCookie = req.cookies?.id_aff;
      const subscriptionCookie = req.cookies?.id_sub;
      
      if (affiliateCookie && subscriptionCookie) {
        const affiliateId = parseInt(affiliateCookie);
        const subscriptionIdFromCookie = parseInt(subscriptionCookie);
        
        // Pastikan subscription yang dibeli sesuai dengan cookie
        if (subscriptionIdOrder === subscriptionIdFromCookie) {
          try {
            // Cek apakah affiliate valid
            const affiliate = await prisma.affiliate.findUnique({
              where: { id: affiliateId },
              include: { user: true }
            });
            
            if (affiliate) {
              // Hitung komisi berdasarkan persentase dari subscription
              const komisiAmount = purchasedSubscription.price * (purchasedSubscription.komisi / 100);
              
              // Buat affiliate order
              await prisma.affiliateOrder.create({
                data: {
                  affiliateId: affiliateId,
                  orderId: order.id,
                  komisi: komisiAmount,
                  status: "pending"
                }
              });
              
              // Update total komisi affiliate
              await prisma.affiliate.update({
                where: { id: affiliateId },
                data: {
                  komisi: {
                    increment: komisiAmount
                  }
                }
              });
              
              console.log(`✅ Affiliate order created for affiliate ID: ${affiliateId}`);
              
              // Hapus cookie setelah digunakan
              res.clearCookie("id_aff");
              res.clearCookie("id_sub");
            }
          } catch (affiliateError) {
            console.error("❌ Error creating affiliate order:", affiliateError);
            // Jangan ganggu flow utama jika ada error di affiliate
          }
        }
      }

      // Kirim notifikasi email
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionIdOrder },
      });

      console.log(
        `📧 Kirim email ke ${user.email} untuk paket ${subscription.name}`
      );

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

        const appUrl = process.env.APP_URL || 'https://monitor.kol-kit.my.id/';
        
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Pembayaran Berhasil - Akses Akun Anda",
          html: `
            <p>Halo ${user.name || "Customer"},</p>
            <p>Pembayaran paket <strong>${subscription.name}</strong> sebesar Rp${order.amount} telah berhasil.</p>
            <p>Anda sekarang dapat mengakses akun Anda dengan fitur premium yang telah Anda beli.</p>
            
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

          const appUrl = process.env.APP_URL || 'https://monitor.kol-kit.my.id/';

          const whatsappMessage = `🌟 *PEMBAYARAN BERHASIL* 🌟

Halo ${user.name || "Pelanggan Setia"}! 

Pembayaran Anda telah berhasil diproses.

📋 *Detail Transaksi:*
➤ Order ID: ${merchantOrderId}
➤ Paket: ${subscription.name}
➤ Jumlah: ${formattedAmount}
➤ Status: ✅ BERHASIL

🔗 *Akses Aplikasi:*
${appUrl}

Silakan login untuk mulai menggunakan layanan premium kami.

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

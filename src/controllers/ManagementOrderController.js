import pkg from "@prisma/client";
import axios from "axios";
import crypto from "crypto";
import config from "../config/duitku.js";
import dotenv from "dotenv";

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

export const createOrder = async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const method = req.query.method; // metode pembayaran dipilih user
    const userId = req.user.id;

    // ambil paket
    const subscription = await prisma.subscription.findUnique({
      where: {id: subscriptionId},
    });
    if (!subscription) return res.status(404).send("Paket tidak ditemukan");

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

    //console.log("✅ UserSubscription dibuat:", userSub);

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

    // Membuat order
    //     // const signatureString = config.merchantCode + orderId + paymentAmount + config.apiKey;
    // const signatureString = config.merchantCode + paymentAmount + orderId + config.apiKey;
    // const signature = crypto.createHash("md5").update(signatureString).digest("hex");

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
    const reference = req.body.reference;
    const statusCode = req.body.statusCode;
    const signature = req.body.signature;
    const paymentAmount = req.body.paymentAmount;
    const subscriptionIdOrder = parseInt(req.body.productDetails);

    console.log("📥 Callback amount diterima:", req.body.amount);

    const signatureString =
      req.body.merchantCode +
      req.body.amount +
      req.body.merchantOrderId +
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

    // Cari order dengan include user data untuk mendapatkan nomor WhatsApp
    const order = await prisma.order.findUnique({
      where: {transactionId: merchantOrderId},
      include: {
        userSubscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                nomor_wa: true,
              },
            },
            subscription: true,
          },
        },
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
      where: {id: order.id},
      data: {status: newStatus},
    });

    // Logika untuk mengelola UserSubscription ketika pembayaran berhasil
    if (newStatus === "paid") {
      const currentUserSubscription = order.userSubscription;
      const user = order.userSubscription.user;
      const purchasedSubscription = await prisma.subscription.findUnique({
        where: {id: subscriptionIdOrder},
      });

      if (!purchasedSubscription) {
        console.warn("⚠️ Subscription tidak ditemukan:", subscriptionIdOrder);
        return res.status(404).send("Subscription tidak ditemukan");
      }

      // Cari subscription aktif user yang sudah ada
      const existingActiveSubscription =
        await prisma.userSubscription.findFirst({
          where: {
            userId: currentUserSubscription.userId,
            status: "active",
          },
        });

      // 1. Jika user belum memiliki subscription aktif
      if (!existingActiveSubscription) {
        // Aktifkan subscription yang baru dibeli
        await prisma.userSubscription.update({
          where: {id: currentUserSubscription.id},
          data: {
            status: "active",
            startDate: new Date(),
            endDate:
              purchasedSubscription.duration > 0
                ? new Date(
                    new Date().setDate(
                      new Date().getDate() + purchasedSubscription.duration
                    )
                  )
                : null,
          },
        });
        console.log("✅ Subscription pertama diaktifkan");
      } else {
        // 2. Jika user sudah memiliki subscription aktif
        if (purchasedSubscription.duration === 0) {
          // Paket tanpa durasi (hanya tambah limit akun)
          console.log("➕ Paket tanpa durasi - menambahkan limit akun");
          // Logika tambah limit akun bisa ditambahkan di sini
        } else {
          // Paket dengan durasi
          if (
            existingActiveSubscription.subscriptionId === subscriptionIdOrder
          ) {
            // 3. Subscription sama - tambah durasi
            const newEndDate = new Date(existingActiveSubscription.endDate);
            newEndDate.setDate(
              newEndDate.getDate() + purchasedSubscription.duration
            );

            await prisma.userSubscription.update({
              where: {id: existingActiveSubscription.id},
              data: {
                endDate: newEndDate,
              },
            });

            // Nonaktifkan subscription yang baru dibuat
            await prisma.userSubscription.update({
              where: {id: currentUserSubscription.id},
              data: {status: "canceled"},
            });
            console.log("⏰ Durasi subscription diperpanjang");
          } else {
            // 4. Subscription berbeda - ganti dengan yang baru
            // Nonaktifkan subscription lama
            await prisma.userSubscription.update({
              where: {id: existingActiveSubscription.id},
              data: {status: "expired"},
            });

            // Aktifkan subscription yang baru
            const newEndDate = new Date();
            newEndDate.setDate(
              newEndDate.getDate() + purchasedSubscription.duration
            );

            await prisma.userSubscription.update({
              where: {id: currentUserSubscription.id},
              data: {
                subscriptionId: subscriptionIdOrder,
                startDate: new Date(),
                endDate: newEndDate,
                status: "active",
              },
            });
            console.log("🔄 Subscription diganti dengan yang baru");
          }
        }
      }

      // Kirim WhatsApp ke user jika memiliki nomor WhatsApp
      if (user.nomor_wa) {
        try {
          const formattedAmount = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
          }).format(order.amount);

          const endDateFormatted =
            purchasedSubscription.duration > 0
              ? new Date(
                  new Date().setDate(
                    new Date().getDate() + purchasedSubscription.duration
                  )
                ).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Tidak ada batas waktu";

          const whatsappMessage = `🌟 *PEMBAYARAN BERHASIL* 🌟

Halo ${user.name || "Pelanggan Setia"}! 

Kami senang memberitahukan bahwa pembayaran Anda telah berhasil diproses.

📋 *Detail Transaksi:*
➤ Order ID: ${merchantOrderId}
➤ Paket: ${purchasedSubscription.name}
➤ Jumlah: ${formattedAmount}
➤ Metode: ${order.paymentMethod}
➤ Status: ✅ BERHASIL

📅 *Masa Aktif:*
${
  purchasedSubscription.duration > 0
    ? `Berlaku hingga: ${endDateFormatted}`
    : "Paket tanpa batas waktu"
}

Terima kasih telah mempercayai layanan kami! 🚀

Untuk pertanyaan atau bantuan, hubungi customer service kami.

Salam hangat,
Tim Layanan Pelanggan`;

          await sendWhatsApp(user.nomor_wa, whatsappMessage);
          console.log("✅ WhatsApp terkirim ke:", user.nomor_wa);
        } catch (waError) {
          console.error("❌ Gagal kirim WhatsApp:", waError.message);
          // Jangan throw error, lanjutkan proses meski WhatsApp gagal
        }
      } else {
        console.log("ℹ️ User tidak memiliki nomor WhatsApp yang terdaftar");
      }

      // Kirim email notifikasi
      console.log(
        `📧 Kirim email ke ${user.email} untuk paket ${purchasedSubscription.name}`
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

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .success-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Pembayaran Berhasil!</h1>
                <p>Terima kasih telah berlangganan layanan kami</p>
              </div>
              <div class="content">
                <p>Halo <strong>${user.name || "Pelanggan Setia"}</strong>,</p>
                <p>Pembayaran untuk paket langganan Anda telah berhasil diproses. Berikut detail transaksi Anda:</p>
                
                <div class="details">
                  <div class="success-badge">✅ PEMBAYARAN BERHASIL</div>
                  <p><strong>Order ID:</strong> ${merchantOrderId}</p>
                  <p><strong>Paket:</strong> ${purchasedSubscription.name}</p>
                  <p><strong>Jumlah:</strong> Rp ${new Intl.NumberFormat(
                    "id-ID"
                  ).format(order.amount)}</p>
                  <p><strong>Metode Pembayaran:</strong> ${
                    order.paymentMethod
                  }</p>
                  <p><strong>Tanggal Transaksi:</strong> ${new Date().toLocaleDateString(
                    "id-ID",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}</p>
                  ${
                    purchasedSubscription.duration > 0
                      ? `
                  <p><strong>Masa Aktif:</strong> Berlaku hingga ${new Date(
                    new Date().setDate(
                      new Date().getDate() + purchasedSubscription.duration
                    )
                  ).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</p>
                  `
                      : "<p><strong>Masa Aktif:</strong> Paket tanpa batas waktu</p>"
                  }
                </div>

                <p>Kini Anda dapat menikmati semua fitur premium dari paket ${
                  purchasedSubscription.name
                }. Jika ada pertanyaan atau membutuhkan bantuan, jangan ragu untuk menghubungi kami.</p>
                
                <p>Selamat menggunakan layanan kami! 🚀</p>
              </div>
              <div class="footer">
                <p>© 2024 Nama Perusahaan Anda. All rights reserved.</p>
                <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: `✅ Pembayaran Berhasil - ${purchasedSubscription.name}`,
          html: emailHtml,
        });
        console.log("📧 Email sukses terkirim");
      } catch (mailErr) {
        console.error("❌ Gagal kirim email:", mailErr.message);
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

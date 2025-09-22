import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

// Fungsi untuk mengirim email
const sendEmailNotification = async (user, subject, message, transactionId, subscription) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">${subject}</h2>
        <p>Halo ${user.name || 'Pelanggan'},</p>
        ${message}
        ${transactionId ? `<p><strong>No. Transaksi:</strong> ${transactionId}</p>` : ''}
        ${subscription ? `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Paket Subscription</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${subscription.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Masa Aktif</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('id-ID') : '-'}</td>
            </tr>
          </table>
        ` : ''}
        <p style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Akses Dashboard Anda
          </a>
        </p>
        <p>Terima kasih telah menggunakan layanan kami.</p>
        <p>Best regards,<br>Tim Support</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: subject,
      html: emailTemplate
    });

    console.log(`✅ Email notifikasi berhasil dikirim ke ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Gagal mengirim email ke ${user.email}:`, error);
    return false;
  }
};

// Fungsi untuk mengirim WhatsApp (sesuaikan dengan implementasi Anda)
const sendWhatsAppNotification = async (phoneNumber, message) => {
  try {
    // Implementasi pengiriman WhatsApp sesuai dengan library/service yang Anda gunakan
    // Contoh pseudocode:
    // await whatsappService.sendMessage(phoneNumber, message);
    console.log(`📤 WhatsApp dikirim ke ${phoneNumber}: ${message.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.error(`❌ Gagal mengirim WhatsApp ke ${phoneNumber}:`, error);
    return false;
  }
};

export const checkExpiredAndLimit = async () => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    console.log(`🔄 Cron dimulai pada ${now.toISOString()}`);

    // 1. Ambil semua user subscription yang aktif
    const activeSubscriptions = await prisma.userSubscription.findMany({
      where: { status: "active" },
      include: {
        user: true,
        subscription: true
      }
    });

    for (const sub of activeSubscriptions) {
      console.log(`🔍 Memeriksa subscription ${sub.id} untuk user ${sub.user.name}`);

      // Pastikan endDate ada dan merupakan Date object
      if (!sub.endDate) continue;
      
      const endDate = new Date(sub.endDate);
      const nowDate = new Date();

      // ---- Cek subscription yang akan expired dalam 3 hari ----
      if (endDate <= threeDaysLater && endDate > nowDate) {
        const daysUntilExpiry = Math.ceil((endDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 3) {
          console.log(`⚠️ Subscription ${sub.id} akan expired dalam ${daysUntilExpiry} hari`);

          // Kirim notifikasi akan expired
          const emailSubject = `Peringatan: Subscription Anda Akan Berakhir dalam ${daysUntilExpiry} Hari`;
          const emailMessage = `
            <p>Subscription Anda akan berakhir dalam <strong>${daysUntilExpiry} hari</strong>.</p>
            <p>Silakan perpanang subscription Anda untuk terus menikmati layanan kami tanpa gangguan.</p>
          `;

          // Kirim email
          await sendEmailNotification(
            sub.user, 
            emailSubject, 
            emailMessage,
            sub.order_id,
            {
              name: sub.subscription.name,
              endDate: endDate
            }
          );

          // Kirim WhatsApp
          const whatsappMessage = `⚠️ *PERINGATAN: SUBSCRIPTION AKAN BERAKHIR*

Halo ${sub.user.name || 'Pelanggan'},

Subscription Anda untuk paket *${sub.subscription.name}* akan berakhir dalam *${daysUntilExpiry} hari* (${endDate.toLocaleDateString('id-ID')}).

Silakan perpanang subscription Anda untuk menghindari gangguan layanan.

Terima kasih,
Tim Support`;

          if (sub.user.phone_number) {
            await sendWhatsAppNotification(sub.user.phone_number, whatsappMessage);
          }
        }
      }

      // ---- Cek subscription yang sudah expired ----
      if (endDate <= nowDate) {
        console.log(`⚠️ Subscription ${sub.id} sudah expired`);

        // Update status menjadi expired
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: { status: "expired" }
        });

        // Kirim notifikasi expired
        const emailSubject = "Pemberitahuan: Subscription Anda Telah Berakhir";
        const emailMessage = `
          <p>Subscription Anda telah berakhir pada <strong>${endDate.toLocaleDateString('id-ID')}</strong>.</p>
          <p>Akun-akun yang terkait dengan subscription ini mungkin akan terpengaruh. Silakan perpanang subscription Anda untuk mengaktifkan kembali layanan.</p>
        `;

        // Kirim email
        await sendEmailNotification(
          sub.user, 
          emailSubject, 
          emailMessage,
          sub.order_id,
          {
            name: sub.subscription.name,
            endDate: endDate
          }
        );

        // Kirim WhatsApp
        const whatsappMessage = `❌ *SUBSCRIPTION TELAH BERAKHIR*

Halo ${sub.user.name || 'Pelanggan'},

Subscription Anda untuk paket *${sub.subscription.name}* telah berakhir pada ${endDate.toLocaleDateString('id-ID')}.

Akun-akun yang terkait mungkin akan terpengaruh. Silakan perpanang subscription Anda untuk mengaktifkan kembali layanan.

Terima kasih,
Tim Support`;

        if (sub.user.phone_number) {
          await sendWhatsAppNotification(sub.user.phone_number, whatsappMessage);
        }
      }
    }

    // ---- Hitung ulang limit dan hapus akun excess (kode original) ----
    const users = await prisma.user.findMany();

    for (const user of users) {
      console.log(`🔄 Menghitung limit untuk user ${user.id}`);

      // Hitung ulang subscription aktif
      const activeSubs = await prisma.userSubscription.findMany({
        where: { userId: user.id, status: "active" },
      });

      const totalLimit = activeSubs.reduce(
        (sum, sub) => sum + (sub.limitAkun || 0),
        0
      );

      // Hitung jumlah akun aktif user
      const akunUser = await prisma.akun.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });

      const totalAkun = akunUser.length;

      if (totalAkun > totalLimit) {
        const excess = totalAkun - totalLimit;
        const akunToDelete = akunUser.slice(-excess);

        for (const akun of akunToDelete) {
          const newId = Date.now() + Math.floor(Math.random() * 1000);
          await prisma.akun.update({
            where: { id: akun.id },
            data: {
              id: newId,
              deletedAt: new Date(),
              studioId: null,
            },
          });
        }

        console.log(
          `⚠️ User ${user.id} punya ${totalAkun} akun, limit aktif ${totalLimit}. ${excess} akun dihapus.`
        );

        // Kirim notifikasi penghapusan akun
        const emailSubject = "Pemberitahuan: Penyesuaian Jumlah Akun";
        const emailMessage = `
          <p>Karena subscription Anda telah berakhir, sistem telah menyesuaikan jumlah akun aktif sesuai dengan limit yang tersedia.</p>
          <p><strong>${excess} akun</strong> telah dinonaktifkan karena melebihi limit subscription aktif.</p>
          <p>Total akun aktif sekarang: <strong>${totalLimit}</strong></p>
        `;

        await sendEmailNotification(user, emailSubject, emailMessage);

        const whatsappMessage = `📊 *PENYESUAIAN JUMLAH AKUN*

Halo ${user.name || 'Pelanggan'},

Karena perubahan status subscription, sistem telah menonaktifkan ${excess} akun yang melebihi limit.

Total akun aktif sekarang: ${totalLimit}

Silakan periksa dashboard Anda untuk detail lebih lanjut.

Terima kasih,
Tim Support`;

        if (user.phone_number) {
          await sendWhatsAppNotification(user.phone_number, whatsappMessage);
        }
      }
    }

    console.log("✅ Cron selesai cek semua user dan subscription");
  } catch (err) {
    console.error("❌ Cron Error checkExpiredAndLimit:", err);
  }
};
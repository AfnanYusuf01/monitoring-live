import {PrismaClient} from "@prisma/client";
const prisma = new PrismaClient();
import fs from "fs";
import Papa from "papaparse";
import axios from "axios";

// Fungsi untuk mengambil data profil Shopee
const fetchShopeeProfile = async (cookie) => {
  try {
    // format cookie supaya rapi
    const cookies = cookie
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");

    const response = await axios.get(
      "https://affiliate.shopee.co.id/api/v3/user/profile",
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "affiliate-program-type": "1",
          priority: "u=1, i",
          referer: "https://affiliate.shopee.co.id/dashboard",
          "sec-ch-ua":
            '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
          cookie: cookies, // gunakan cookies yang sudah diformat
        },
      }
    );

    if (response.data.code === 0) {
      return {
        success: true,
        data: response.data.data,
      };
    } else if (response.data.code === 30002) {
      return {
        success: false,
        error: "Cookie incorrect",
        code: response.data.code,
      };
    } else {
      return {
        success: false,
        error: response.data.msg || "Gagal mengambil data profil",
        code: response.data.code,
      };
    }
  } catch (error) {
    console.error("❌ Error Shopee:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

const fetchShopeeCookieStatus = async (cookie) => {
  try {
    // format cookie supaya rapi
    const cookies = cookie
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");

    const response = await axios.get(
      "https://affiliate.shopee.co.id/api/v3/user/check_program_permission?program_type=2",
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "affiliate-program-type": "1",
          priority: "u=1, i",
          referer: "https://affiliate.shopee.co.id/dashboard",
          "sec-ch-ua":
            '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
          cookie: cookies, // gunakan cookies yang sudah diformat
        },
      }
    );

    // Handle response sesuai struktur yang kamu kasih
    if (response.data.code === 0) {
      return {
        success: true,
        data: response.data.data, // { has_permission: true }
      };
    } else if (response.data.code === 30002) {
      return {
        success: false,
        error: "Cookie incorrect",
        code: response.data.code,
      };
    } else {
      return {
        success: false,
        error: response.data.msg || "Gagal mengecek permission",
        code: response.data.code,
      };
    }
  } catch (error) {
    console.error("❌ Error Shopee:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

const checkCookieStatus = async (cookie) => {
  try {
    const result = await fetchShopeeCookieStatus(cookie);
    return {
      status: result.success ? "active" : "logout",
      error: result.error,
      code: result.code,
      data: result.data,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    };
  }
};


export const renderAccountManagement = async (req, res) => {
  try {
      const userId = req.session.user.id;
    const akun = await prisma.akun.findMany({
      where: {
        userId: userId,
        deletedAt: null, // Hanya tampilkan yang tidak dihapus
      },
    });

    // Tambahkan status cookie untuk setiap akun
    const akunWithStatus = await Promise.all(
      akun.map(async (account) => {
        const cookieStatus = await checkCookieStatus(account.cookie);
        return {
          ...account,
          cookie_status: cookieStatus.status,
          cookie_error: cookieStatus.error,
        };
      })
    );

    res.render("pages/account-management", {
      navbar: "Account-Management",
      akunList: akunWithStatus,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

export const renderAddAccount = (req, res) => {
  res.render("pages/account-management-add", {
    navbar: "Account-Management",
  });
};

export const renderEditAccount = async (req, res) => {
  const {id} = req.params;
    const userId = req.session.user.id;

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
        deletedAt: null, // Hanya bisa edit yang tidak dihapus
      },
    });

    if (!akun) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Akun tidak ditemukan atau tidak memiliki akses",
      });
    }

    // Cek status cookie untuk akun yang akan diedit
    const cookieStatus = await checkCookieStatus(akun.cookie);

    res.render("pages/account-management-edit", {
      navbar: "Account-Management",
      akun: {
        ...akun,
        cookie_status: cookieStatus.status,
        cookie_error: cookieStatus.error,
      },
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

export const getAllAkun = async (req, res) => {
  try {
    console.log("👉 getAllAkun dipanggil");

    if (!req.session.user?.id) {
      return res.status(401).json({ error: "Unauthorized: req.user kosong" });
    }

    const userId = req.session.user.id;
    console.log("🔎 userId:", userId);

    const akun = await prisma.akun.findMany({
      where: {
        userId: userId,
        deletedAt: null,
      },
    });

    console.log("📦 Data akun:", akun);

    const akunWithStatus = await Promise.all(
      akun.map(async (account) => {
        try {
          const cookieStatus = await checkCookieStatus(account.cookie);

          return {
            ...account,
            id: account.id.toString(), // 🟢 fix BigInt jadi string
            cookie_status: cookieStatus.status,
            cookie_error: cookieStatus.error,
          };
        } catch (err) {
          console.error(
            `❌ Gagal check cookie akun ${account.id}:`,
            err.message
          );

          return {
            ...account,
            id: account.id.toString(), // 🟢 fix BigInt jadi string
            cookie_status: "error",
            cookie_error: err.message,
          };
        }
      })
    );

    res.json(akunWithStatus);
  } catch (err) {
    console.error("🔥 Error di getAllAkun:", err.message);
    res.status(500).json({ error: err.message });
  }
};


// ✅ helper biar BigInt bisa dikirim lewat JSON
function serializeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export const createAkun = async (req, res) => {
  const { cookie } = req.body;
  const userId = req.session.user.id;

  if (!cookie) {
    return res.status(400).json({ error: "Cookie wajib diisi" });
  }

  try {
    // Ambil data profil dari Shopee API
    const profileResult = await fetchShopeeProfile(cookie);

    if (!profileResult.success) {
      if (profileResult.code === 30002) {
        const nama_akun = `Akun Shopee ${Date.now()}`;

        const akun = await prisma.akun.create({
          data: {
            id: BigInt(Date.now()), // fallback id unik
            nama_akun,
            email: null,
            phone: null,
            cookie,
            userId: userId,
          },
        });

        return res.json({
          message: "Akun berhasil dibuat, namun cookie tidak valid",
          akun: serializeBigInt(akun), // ✅ ubah BigInt ke string
          cookie_status: "logout",
          warning: "Cookie tidak valid, silakan perbarui cookie",
        });
      } else {
        return res.status(400).json({
          error: "Gagal mengambil data profil Shopee",
          detail: profileResult.error,
        });
      }
    }

    const profileData = profileResult.data;
    const nama_akun = profileData.shopee_user_name || `Akun Shopee ${Date.now()}`;
    const email = profileData.email || null;
    const phone = profileData.phone || null;
    const akunId = BigInt(profileData.user_id);

    const akun = await prisma.akun.create({
      data: {
        id: akunId,
        nama_akun,
        email,
        phone,
        cookie,
        userId: userId,
      },
    });

    res.json({
      message: "Akun berhasil dibuat",
      akun: serializeBigInt(akun), // ✅ ubah BigInt ke string
      profile: profileData,
      cookie_status: "active",
    });
  } catch (err) {
    if (err.code === "P2002") {
      const target = err.meta?.target;
      if (target?.includes("email")) {
        return res.status(400).json({ error: "Email sudah digunakan oleh akun lain" });
      }
      if (target?.includes("phone")) {
        return res.status(400).json({ error: "Nomor telepon sudah digunakan oleh akun lain" });
      }
      if (target?.includes("PRIMARY")) {
        return res.status(400).json({ error: "Akun dengan user_id ini sudah ada" });
      }
    }
    res.status(500).json({ error: err.message });
  }
};


export const getAkunById = async (req, res) => {
  const {id} = req.params;
    const userId = req.session.user.id;

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
        deletedAt: null, // Hanya ambil yang tidak dihapus
      },
    });

    if (!akun)
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});

    // Tambahkan status cookie
    const cookieStatus = await checkCookieStatus(akun.cookie);

    res.json({
      ...akun,
      cookie_status: cookieStatus.status,
      cookie_error: cookieStatus.error,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

export const updateAkun = async (req, res) => {
  const { id } = req.params;
  const { nama_akun } = req.body;
  const userId = req.session.user.id;

  try {
    // Cek apakah akun milik user yang login
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingAkun) {
      return res
        .status(404)
        .json({ message: "Akun tidak ditemukan atau tidak memiliki akses" });
    }

    // Update hanya nama_akun
    const akun = await prisma.akun.update({
      where: { id: BigInt(id) },
      data: { nama_akun },
    });

    res.json({
      message: "Nama akun berhasil diupdate",
      akun: {
        ...akun,
        id: akun.id.toString(), // ✅ ubah BigInt ke string
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteAkun = async (req, res) => {
  const {id} = req.params;
  const userId = req.session.user.id;

  try {
    // Cari akun milik user
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id, 10), // atau BigInt kalau id besar
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingAkun) {
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});
    }

    // Buat id baru unik (misalnya pakai timestamp + random)
    const newId = Date.now();

    // Update akun: ganti id, set deletedAt, dan hapus relasi studioId
    await prisma.akun.update({
      where: {id: existingAkun.id},
      data: {
        id: newId,
        deletedAt: new Date(),
        studioId: null, // hilangkan relasi studio
      },
    });

    res.json({
      message: "Akun berhasil dihapus (soft delete & lepas dari studio)",
    });
  } catch (err) {
    console.error("❌ Error deleteAkun:", err);
    res.status(500).json({error: err.message});
  }
};



export const downloadCSVTemplate = (req, res) => {
  const csvData = "cookie\nSPC_IU=...\nSPC_IU=...";

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="template-akun-shopee.csv"'
  );

  res.send(csvData);
};

export const importAkunFromCSV = async (req, res) => {
  try {
    const userId = req.session.user.id;

    if (!req.file) {
      return res.status(400).json({error: "File CSV belum diupload"});
    }

    // Pastikan file adalah CSV
    if (!req.file.originalname.endsWith('.csv') && req.file.mimetype !== 'text/csv') {
      return res.status(400).json({error: "Hanya file CSV yang diizinkan"});
    }

    const csvText = req.file.buffer.toString("utf8");

    // Bersihkan teks CSV dari karakter yang tidak diinginkan
    const cleanedCsvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
    if (!cleanedCsvText) {
      return res.status(400).json({error: "File CSV kosong"});
    }

    // Split manual berdasarkan baris baru (karena cookie mengandung koma)
    const lines = cleanedCsvText.split('\n').filter(line => line.trim() !== '');
    
    // Hapus header jika ada
    const header = lines[0].toLowerCase().trim();
    const startIndex = header.includes('cookie') ? 1 : 0;
    
    const cookies = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        cookies.push({ cookie: line });
      }
    }

    console.log("Extracted cookies:", cookies.length);

    if (cookies.length === 0) {
      return res.status(400).json({error: "Tidak ada cookie yang ditemukan dalam file CSV"});
    }

    // Cek subscription aktif
    const now = new Date();
    const activeSub = await prisma.userSubscription.findFirst({
      where: {userId, status: "active", endDate: {gt: now}},
      orderBy: {endDate: "desc"},
    });

    if (!activeSub) {
      return res.status(403).json({
        message: "Tidak ada paket aktif. Tidak bisa menambahkan akun.",
      });
    }

    const limitAkun = activeSub.limitAkun;
    const currentAccountsCount = await prisma.akun.count({
      where: {userId, deletedAt: null},
    });
    const remainingSlots = limitAkun - currentAccountsCount;

    if (remainingSlots <= 0) {
      return res.status(403).json({
        message: "Slot akun sudah penuh. Tidak bisa menambahkan akun baru.",
      });
    }

    let createdCount = 0;
    let failedCount = 0;
    const failedRows = [];

    for (const [index, row] of cookies.entries()) {
      if (createdCount >= remainingSlots) {
        failedRows.push({
          row: index + 2, 
          reason: "Slot akun tidak mencukupi"
        });
        break;
      }

      const cookie = row.cookie ? row.cookie.trim() : '';
      if (!cookie) {
        failedCount++;
        failedRows.push({row: index + 2, reason: "Cookie kosong"});
        continue;
      }

      try {
        // Ambil data profil dari Shopee API
        const profileResult = await fetchShopeeProfile(cookie);

        let nama_akun, email, phone, akunId;

        if (!profileResult.success) {
          // Jika cookie invalid (code 30002), tetap buat akun dengan data kosong
          if (profileResult.code === 30002) {
            nama_akun = `Akun Shopee ${Date.now()}`;
            email = null;
            phone = null;
            akunId = BigInt(Date.now() + index); // fallback ID dengan timestamp + index (konversi ke BigInt)
            failedRows.push({
              row: index + 2,
              reason: "Cookie tidak valid, akun dibuat dengan status logout",
            });
          } else {
            // Untuk error lainnya, skip baris ini
            failedCount++;
            failedRows.push({
              row: index + 2,
              reason: `Gagal mengambil profil: ${profileResult.error}`,
            });
            continue;
          }
        } else {
          const profileData = profileResult.data;
          nama_akun = profileData.shopee_user_name || `Akun Shopee ${Date.now()}`;
          email = profileData.email || null;
          phone = profileData.phone || null;
          
          // ✅ Gunakan user_id dari Shopee jika tersedia, jika tidak gunakan timestamp yang unik
          akunId = profileData.user_id ? BigInt(profileData.user_id) : BigInt(Date.now() + index);
        }

        await prisma.akun.create({
          data: {
            id: akunId, // ✅ Gunakan ID yang sudah ditentukan (BigInt)
            nama_akun,
            email,
            phone,
            cookie,
            userId: userId,
          },
        });

        createdCount++;

        // Delay kecil untuk menghindari rate limiting
        if (index < cookies.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        failedCount++;
        let reason = "Error tidak diketahui";

        if (err.code === "P2002") {
          const target = err.meta?.target;
          if (target?.includes("email")) {
            reason = "Email sudah digunakan";
          } else if (target?.includes("phone")) {
            reason = "Nomor telepon sudah digunakan";
          } else if (target?.includes("PRIMARY")) {
            reason = "Akun dengan ID ini sudah ada";
          } else {
            reason = "Data duplikat";
          }
        } else {
          reason = err.message;
        }

        failedRows.push({row: index + 2, reason});
      }
    }

    return res.json({
      message: `Proses import selesai. Berhasil: ${createdCount}, Gagal: ${failedCount}`,
      totalImported: createdCount,
      totalFailed: failedCount,
      failedRows: failedRows,
      remainingSlots: limitAkun - currentAccountsCount - createdCount,
    });
  } catch (err) {
    console.error("Gagal mengimpor CSV:", err);
    return res.status(500).json({
      error: "Gagal mengimpor CSV",
      details: err.message,
    });
  }
};

export const checkUserSubscription = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();

    // Ambil semua user subscriptions
    const userSubs = await prisma.userSubscription.findMany({
      where: {userId},
      include: {subscription: true},
      orderBy: {endDate: "desc"},
    });

    if (!userSubs || userSubs.length === 0) {
      return res.json({
        canAddAccount: false,
        message: "Tidak ada paket",
        status: "no_subscription",
        activeSubscriptions: [],
        totalActiveSubscriptions: 0,
      });
    }

    // Update status subscriptions yang sudah expired
    const expiredSubs = userSubs.filter(
      (sub) => sub.status === "active" && sub.endDate <= now
    );

    if (expiredSubs.length > 0) {
      await prisma.userSubscription.updateMany({
        where: {
          id: {in: expiredSubs.map((sub) => sub.id)},
        },
        data: {status: "expired"},
      });
      console.log(
        `✅ Updated ${expiredSubs.length} expired subscriptions to expired`
      );
    }

    // Ambil subscriptions yang masih active setelah update
    const activeSubs = userSubs.filter(
      (sub) => sub.status === "active" && sub.endDate > now
    );

    // Hitung total limitAkun dari semua subscriptions aktif
    const totalLimitAkun = activeSubs.reduce((total, sub) => {
      return total + (sub.limitAkun || 0);
    }, 0);

    // Hitung jumlah akun user yang aktif
    const userAccountsCount = await prisma.akun.count({
      where: {userId, deletedAt: null},
    });

    const remainingSlots = totalLimitAkun - userAccountsCount;

    // Format data semua subscriptions untuk response (aktif dan tidak aktif)
    const allSubscriptions = userSubs.map((sub) => ({
      id: sub.id,
      subscriptionId: sub.subscription?.id,
      name: sub.subscription?.name || "Unknown",
      price: sub.subscription?.price || 0,
      limitAkun: sub.limitAkun,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
      daysRemaining: Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24)),
      isActive: sub.status === "active" && sub.endDate > now,
    }));

    // Format hanya subscriptions aktif
    const activeSubscriptions = allSubscriptions.filter((sub) => sub.isActive);

    if (activeSubs.length === 0) {
      return res.json({
        canAddAccount: false,
        message: "Tidak ada paket aktif",
        status: "expired",
        remainingSlots: 0,
        totalLimitAkun: 0,
        userAccountsCount,
        allSubscriptions,
        activeSubscriptions: [],
        totalActiveSubscriptions: 0,
      });
    }

    return res.json({
      canAddAccount: remainingSlots > 0,
      remainingSlots,
      totalLimitAkun,
      userAccountsCount,
      status: "active",
      allSubscriptions,
      activeSubscriptions,
      totalActiveSubscriptions: activeSubs.length,
      subscription:
        activeSubs.length > 0
          ? {
              id: activeSubs[0].subscription.id,
              name: activeSubs[0].subscription.name,
              price: activeSubs[0].subscription.price,
              endDate: activeSubs[0].endDate,
            }
          : null,
    });
  } catch (err) {
    console.error("❌ Error in checkUserSubscription:", err);
    res.status(500).json({message: "Terjadi kesalahan server"});
  }
};

// Endpoint untuk restore akun yang dihapus
export const restoreAkun = async (req, res) => {
  const {id} = req.params;
    const userId = req.session.user.id;

  try {
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
        deletedAt: {not: null}, // Hanya yang sudah dihapus
      },
    });

    if (!existingAkun) {
      return res.status(404).json({message: "Akun tidak ditemukan"});
    }

    await prisma.akun.update({
      where: {id: BigInt(id)},
      data: {deletedAt: null},
    });

    res.json({message: "Akun berhasil dipulihkan"});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

// Endpoint khusus untuk mengecek status cookie
export const checkCookieStatusEndpoint = async (req, res) => {
  const {id} = req.params;
    const userId = req.session.user.id;

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
        deletedAt: null,
      },
    });

    if (!akun) {
      return res.status(404).json({message: "Akun tidak ditemukan"});
    }

    const cookieStatus = await checkCookieStatus(akun.cookie);

    res.json({
      id: akun.id,
      nama_akun: akun.nama_akun,
      cookie_status: cookieStatus.status,
      error: cookieStatus.error,
      code: cookieStatus.code,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};
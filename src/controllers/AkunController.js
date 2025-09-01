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

// Fungsi untuk mengecek status cookie
const checkCookieStatus = async (cookie) => {
  try {
    const profileResult = await fetchShopeeProfile(cookie);
    return {
      status: profileResult.success ? "active" : "logout",
      error: profileResult.error,
      code: profileResult.code,
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
    const userId = req.user.id;
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
  const userId = req.user.id;

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
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

    if (!req.user) {
      return res.status(401).json({error: "Unauthorized: req.user kosong"});
    }

    const userId = req.user.id;
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
            cookie_status: "error",
            cookie_error: err.message,
          };
        }
      })
    );

    res.json(akunWithStatus);
  } catch (err) {
    console.error("🔥 Error di getAllAkun:", err.message);
    res.status(500).json({error: err.message});
  }
};

export const createAkun = async (req, res) => {
  const {cookie} = req.body;
  const userId = req.user.id;

  if (!cookie) {
    return res.status(400).json({error: "Cookie wajib diisi"});
  }

  try {
    // Ambil data profil dari Shopee API
    const profileResult = await fetchShopeeProfile(cookie);

    if (!profileResult.success) {
      // Jika cookie invalid, tetap buat akun tapi beri status logout
      if (profileResult.code === 30002) {
        const nama_akun = `Akun Shopee ${Date.now()}`;

        const akun = await prisma.akun.create({
          data: {
            nama_akun,
            email: null,
            phone: null,
            cookie,
            userId: userId,
          },
        });

        return res.json({
          message: "Akun berhasil dibuat, namun cookie tidak valid",
          akun: akun,
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

    // Gunakan shopee_user_name sebagai nama_akun jika tersedia
    const nama_akun =
      profileData.shopee_user_name || `Akun Shopee ${Date.now()}`;
    const email = profileData.email || null;
    const phone = profileData.phone || null;

    const akun = await prisma.akun.create({
      data: {
        nama_akun,
        email,
        phone,
        cookie,
        userId: userId,
      },
    });

    res.json({
      message: "Akun berhasil dibuat",
      akun: akun,
      profile: profileData,
      cookie_status: "active",
    });
  } catch (err) {
    // Handle error unique constraint
    if (err.code === "P2002") {
      const target = err.meta?.target;
      if (target?.includes("email")) {
        return res
          .status(400)
          .json({error: "Email sudah digunakan oleh akun lain"});
      }
      if (target?.includes("phone")) {
        return res
          .status(400)
          .json({error: "Nomor telepon sudah digunakan oleh akun lain"});
      }
    }
    res.status(500).json({error: err.message});
  }
};

export const getAkunById = async (req, res) => {
  const {id} = req.params;
  const userId = req.user.id;

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
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
  const {id} = req.params;
  const {nama_akun, cookie} = req.body;
  const userId = req.user.id;

  try {
    // Cek apakah akun milik user yang login
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingAkun) {
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});
    }

    // Jika cookie diupdate, ambil data profil baru
    let updateData = {nama_akun};
    let profileData = null;
    let cookieStatus = "active";

    if (cookie && cookie !== existingAkun.cookie) {
      const profileResult = await fetchShopeeProfile(cookie);

      if (profileResult.success) {
        profileData = profileResult.data;
        updateData = {
          ...updateData,
          cookie,
          email: profileData.email || null,
          phone: profileData.phone || null,
          nama_akun: profileData.shopee_user_name || nama_akun,
        };
      } else {
        // Jika cookie invalid, tetap update tapi set email/phone ke null
        if (profileResult.code === 30002) {
          updateData = {
            ...updateData,
            cookie,
            email: null,
            phone: null,
          };
          cookieStatus = "logout";
        } else {
          return res.status(400).json({
            error: "Gagal memverifikasi cookie baru",
            detail: profileResult.error,
          });
        }
      }
    }

    const akun = await prisma.akun.update({
      where: {id: parseInt(id)},
      data: updateData,
    });

    res.json({
      message:
        cookieStatus === "logout"
          ? "Cookie diperbarui, namun cookie tidak valid"
          : "Akun berhasil diupdate",
      akun: akun,
      profile: profileData,
      cookie_status: cookieStatus,
      warning:
        cookieStatus === "logout"
          ? "Cookie tidak valid, silakan perbarui cookie"
          : undefined,
    });
  } catch (err) {
    // Handle error unique constraint
    if (err.code === "P2002") {
      const target = err.meta?.target;
      if (target?.includes("email")) {
        return res
          .status(400)
          .json({error: "Email sudah digunakan oleh akun lain"});
      }
      if (target?.includes("phone")) {
        return res
          .status(400)
          .json({error: "Nomor telepon sudah digunakan oleh akun lain"});
      }
    }
    res.status(500).json({error: err.message});
  }
};

export const deleteAkun = async (req, res) => {
  const {id} = req.params;
  const userId = req.user.id;

  try {
    // Cek apakah akun milik user yang login
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingAkun) {
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});
    }

    // Soft delete: set deletedAt timestamp
    await prisma.akun.update({
      where: {id: parseInt(id)},
      data: {deletedAt: new Date()},
    });

    res.json({message: "Akun berhasil dihapus"});
  } catch (err) {
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
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({error: "File CSV belum diupload"});
    }

    const csvText = req.file.buffer.toString("utf8");

    const {data, errors} = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: "CSV tidak valid",
        details: errors.map((e) => e.message),
      });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({error: "CSV kosong atau tidak terbaca"});
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

    for (const [index, row] of data.entries()) {
      if (createdCount >= remainingSlots) break;

      const cookie = row.cookie?.trim();
      if (!cookie) {
        failedCount++;
        failedRows.push({row: index + 2, reason: "Cookie kosong"});
        continue;
      }

      try {
        // Ambil data profil dari Shopee API
        const profileResult = await fetchShopeeProfile(cookie);

        let nama_akun, email, phone;

        if (!profileResult.success) {
          // Jika cookie invalid (code 30002), tetap buat akun dengan data kosong
          if (profileResult.code === 30002) {
            nama_akun = `Akun Shopee ${Date.now()}`;
            email = null;
            phone = null;
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
          nama_akun =
            profileData.shopee_user_name || `Akun Shopee ${Date.now()}`;
          email = profileData.email || null;
          phone = profileData.phone || null;
        }

        await prisma.akun.create({
          data: {
            nama_akun,
            email,
            phone,
            cookie,
            userId: userId,
          },
        });

        createdCount++;

        // Delay kecil untuk menghindari rate limiting
        if (index < data.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        failedCount++;
        let reason = "Error tidak diketahui";

        if (err.code === "P2002") {
          if (err.meta?.target?.includes("email")) {
            reason = "Email sudah digunakan";
          } else if (err.meta?.target?.includes("phone")) {
            reason = "Nomor telepon sudah digunakan";
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
    const userId = req.user.id;
    const now = new Date();

    const userSubs = await prisma.userSubscription.findMany({
      where: {userId},
      include: {subscription: true},
      orderBy: {endDate: "desc"},
    });

    if (!userSubs || userSubs.length === 0) {
      return res.json({
        canAddAccount: false,
        message: "Tidak ada paket",
      });
    }

    const activeSub = userSubs.find(
      (sub) => sub.status === "active" && sub.endDate > now
    );

    if (!activeSub) {
      return res.json({
        canAddAccount: false,
        message: "Tidak ada paket aktif",
        status: "expired",
      });
    }

    const userAccountsCount = await prisma.akun.count({
      where: {userId, deletedAt: null}, // Hitung hanya yang tidak dihapus
    });

    const remainingSlots = activeSub.limitAkun - userAccountsCount;

    return res.json({
      canAddAccount: remainingSlots > 0,
      remainingSlots,
      limitAkun: activeSub.limitAkun,
      status: activeSub.status,
      subscription: {
        id: activeSub.subscription.id,
        name: activeSub.subscription.name,
        price: activeSub.subscription.price,
        endDate: activeSub.endDate,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({message: "Terjadi kesalahan server"});
  }
};

// Endpoint untuk restore akun yang dihapus
export const restoreAkun = async (req, res) => {
  const {id} = req.params;
  const userId = req.user.id;

  try {
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
        deletedAt: {not: null}, // Hanya yang sudah dihapus
      },
    });

    if (!existingAkun) {
      return res.status(404).json({message: "Akun tidak ditemukan"});
    }

    await prisma.akun.update({
      where: {id: parseInt(id)},
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
  const userId = req.user.id;

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
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

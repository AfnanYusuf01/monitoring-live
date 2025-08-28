import {PrismaClient} from "@prisma/client";
const prisma = new PrismaClient();
import fs from "fs";
import Papa from "papaparse";

export const renderAccountManagement = async (req, res) => {
  try {
    const userId = req.user.id; // Dapatkan ID user yang login
    const akun = await prisma.akun.findMany({
      where: {userId: userId}, // Hanya ambil akun milik user yang login
    });
    res.render("pages/account-management", {
      navbar: "Account-Management",
      akunList: akun,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

// Render halaman tambah akun
export const renderAddAccount = (req, res) => {
  res.render("pages/account-management-add", {
    navbar: "Account-Management",
  });
};

// Render halaman edit akun
export const renderEditAccount = async (req, res) => {
  const {id} = req.params;
  const userId = req.user.id; // Dapatkan ID user yang login

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId, // Pastikan akun milik user yang login
      },
    });

    if (!akun) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Akun tidak ditemukan atau tidak memiliki akses",
      });
    }

    res.render("pages/account-management-edit", {
      navbar: "Account-Management",
      akun: akun,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

// Ambil semua akun
export const getAllAkun = async (req, res) => {
  try {
    const userId = req.user.id; // Dapatkan ID user yang login
    const akun = await prisma.akun.findMany({
      where: {userId: userId}, // Hanya ambil akun milik user yang login
    });
    res.json(akun);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

export const createAkun = async (req, res) => {
  const {nama_akun, cookie} = req.body;
  const userId = req.user.id; // Dapatkan ID user yang login

  try {
    const akun = await prisma.akun.create({
      data: {
        nama_akun,
        cookie,
        userId: userId, // Set user ID yang membuat akun
      },
    });
    res.json(akun);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

// Ambil 1 akun berdasarkan ID
export const getAkunById = async (req, res) => {
  const {id} = req.params;
  const userId = req.user.id; // Dapatkan ID user yang login

  try {
    const akun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId, // Pastikan akun milik user yang login
      },
    });

    if (!akun)
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});
    res.json(akun);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

// Update akun
export const updateAkun = async (req, res) => {
  const {id} = req.params;
  const {nama_akun, cookie} = req.body;
  const userId = req.user.id; // Dapatkan ID user yang login

  try {
    // Cek apakah akun milik user yang login
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
      },
    });

    if (!existingAkun) {
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});
    }

    const akun = await prisma.akun.update({
      where: {id: parseInt(id)},
      data: {nama_akun, cookie},
    });
    res.json(akun);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

// Delete akun
export const deleteAkun = async (req, res) => {
  const {id} = req.params;
  const userId = req.user.id; // Dapatkan ID user yang login

  try {
    // Cek apakah akun milik user yang login
    const existingAkun = await prisma.akun.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
      },
    });

    if (!existingAkun) {
      return res
        .status(404)
        .json({message: "Akun tidak ditemukan atau tidak memiliki akses"});
    }

    await prisma.akun.delete({
      where: {id: parseInt(id)},
    });
    res.json({message: "Akun berhasil dihapus"});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

export const downloadCSVTemplate = (req, res) => {
  const csvData =
    "nama_akun,cookie\nContoh Akun,SPC_IU=...\nAkun Lain,SPC_IU=...";

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

    // Ambil subscription aktif terbaru
    const now = new Date();
    const activeSub = await prisma.userSubscription.findFirst({
      where: {userId, status: "active", endDate: {gt: now}},
      include: {subscription: true},
      orderBy: {endDate: "desc"},
    });

    if (!activeSub) {
      return res.status(403).json({
        message: "Tidak ada paket aktif. Tidak bisa menambahkan akun.",
      });
    }

    const subscription = activeSub.subscription;

    // Hitung akun saat ini
    const currentAccountsCount = await prisma.akun.count({where: {userId}});
    const remainingSlots = subscription.limitAkun - currentAccountsCount;

    if (remainingSlots <= 0) {
      return res.status(403).json({
        message: "Slot akun sudah penuh. Tidak bisa menambahkan akun baru.",
      });
    }

    let createdCount = 0;

    for (const row of data) {
      if (createdCount >= remainingSlots) break; // Stop jika sudah mencapai limit
      if (!row.nama_akun || !row.cookie) continue; // Skip jika data kosong

      try {
        await prisma.akun.create({
          data: {
            nama_akun: row.nama_akun.trim(),
            cookie: row.cookie.trim(),
            userId: userId,
          },
        });
        createdCount++;
      } catch (err) {
        // Skip jika gagal
        continue;
      }
    }

    return res.json({
      message: `Proses import selesai. Berhasil membuat ${createdCount} akun.`,
      totalImported: createdCount,
      remainingSlots:
        subscription.limitAkun - currentAccountsCount - createdCount,
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

    // Ambil semua subscription user
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

    // Cek paket aktif
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

    const subscription = activeSub.subscription;

    // Hitung jumlah akun user untuk paket ini
    const userAccountsCount = await prisma.akun.count({
      where: {userId},
    });

    const remainingSlots = subscription.limitAkun - userAccountsCount;

    return res.json({
      canAddAccount: remainingSlots > 0,
      remainingSlots,
      status: activeSub.status, // 'active'
      subscription: {
        id: subscription.id,
        name: subscription.name,
        price: subscription.price,
        limitAkun: subscription.limitAkun,
        endDate: activeSub.endDate,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({message: "Terjadi kesalahan server"});
  }
};
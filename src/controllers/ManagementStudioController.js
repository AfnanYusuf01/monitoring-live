import {PrismaClient} from "@prisma/client";
import {getShopeeDataByAkunList} from "./MonitoringLiveController.js";

const prisma = new PrismaClient();

export const getstudioById = (req, res) => {
  const {id} = req.params;
  res.render("pages/monitoring-live-studio", {
    navbar: "Management-Studio",
    studioId: id,
  });
};

export const renderAddStudio = async (req, res) => {
  try {
      const userId = req.session.user.id; // Dapatkan ID user yang login

    // ambil semua akun milik user yang login
    const akunList = await prisma.akun.findMany({
      where: {
        deletedAt: null,
        userId: userId,
      },
      select: {
        id: true,
        nama_akun: true,
        cookie: true,
        createdAt: true,
        studioId: true,
      },
      orderBy: {nama_akun: "asc"},
    });

    res.render("pages/studio/studios-management-add", {
      navbar: "Studio Management",
      akunList,
    });
  } catch (error) {
    console.error("Error fetching akun:", error);
    res.status(500).send("Gagal memuat data akun");
  }
};

export const renderStudioManagement = async (req, res) => {
  try {
      const userId = req.session.user.id; // Dapatkan ID user yang login

    const studios = await prisma.studio.findMany({
      where: {userId: userId}, // Hanya ambil studio milik user yang login
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            createdAt: true,
          },
        },
      },
    });

    const successMessage = req.query.success || null;

    res.render("pages/studio/studios-management", {
      navbar: "Management Studio",
      studios: studios,
      successMessage: successMessage,
    });
  } catch (error) {
    console.error("Error fetching studios:", error);
    res.status(500).render("pages/500", {
      navbar: "Management Studio",
      message: "Gagal memuat data studio",
    });
  }
};

export const renderEditStudio = async (req, res) => {
  const {id} = req.params;
    const userId = req.session.user.id; // Dapatkan ID user yang login

  try {
    // Get studio data dengan filter user ID
    const studio = await prisma.studio.findFirst({
      where: {
        id: parseInt(id),
        userId: userId, // Pastikan studio milik user yang login
      },
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            createdAt: true,
          },
        },
      },
    });

    if (!studio) {
      return res.status(404).render("pages/404", {
        navbar: "Management Studio",
        message: "Studio tidak ditemukan atau tidak memiliki akses",
      });
    }

    // Get all available accounts milik user yang login
    const allAccounts = await prisma.akun.findMany({
            where: {
        deletedAt: null,
        userId: userId,
      },
      select: {
        id: true,
        nama_akun: true,
        createdAt: true,
        studioId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.render("pages/studio/studios-management-edit", {
      navbar: "Management Studio",
      studio: studio,
      akunList: allAccounts,
    });
  } catch (error) {
    console.error("Error fetching studio:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data studio",
    });
  }
};

export const renderDetailStudio = async (req, res) => {
  const {id} = req.params;
    const userId = req.session.user.id; // Dapatkan ID user yang login

  try {
    // Get studio data dengan filter user ID
    const studio = await prisma.studio.findFirst({
      where: {
        id: parseInt(id),
        userId: userId, // Pastikan studio milik user yang login
      },
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!studio) {
      return res.status(404).render("pages/404", {
        navbar: "Management Studio",
        message: "Studio tidak ditemukan atau tidak memiliki akses",
      });
    }

    res.render("pages/studio/studios-management-detail", {
      navbar: "Studio Management",
      studio: studio,
    });
  } catch (error) {
    console.error("Error fetching studio detail:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data detail studio",
    });
  }
};

function formatGmv(value) {
  if (isNaN(value)) return "0";

  if (value >= 1_000_000) {
    // Jika jutaan
    let juta = (value / 1_000_000).toFixed(2);
    // Hapus trailing .00
    juta = juta.replace(/\.00$/, "");
    return juta + " Juta";
  } else if (value >= 1000) {
    // Format ribuan
    return value.toLocaleString("id-ID");
  } else {
    return value.toString();
  }
}


// API Functions
export const getAllStudios = async (req, res) => {
  try {
      const userId = req.session.user.id; // Dapatkan ID user yang login

    const studios = await prisma.studio.findMany({
      where: {userId: userId}, // Hanya ambil studio milik user yang login
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            cookie: true,
            createdAt: true,
          },
          orderBy: {createdAt: "desc"},
        },
      },
      orderBy: {id: "asc"},
    });

    const studioSummary = await Promise.all(
      studios.map(async (studio) => {
        const shopeeData = await getShopeeDataByAkunList(studio.akun);

        let totalPlacedGmv = 0;
        let totalDitonton = 0;
        let totalLikes = 0;
        let liveCount = 0;
        let notLiveCount = 0;

        for (const akunData of shopeeData) {
          if (akunData.statusText === "Sedang Live") {
            liveCount++;

            // Buang simbol kecuali angka, titik, koma
            let cleaned = (akunData.placedGmv || "0")
              .toString()
              .replace(/[^0-9.,]+/g, "");

            // Hilangkan titik ribuan → "11.324,00" jadi "11324,00"
            cleaned = cleaned.replace(/\./g, "");

            // Ubah koma desimal → "11324,00" jadi "11324.00"
            cleaned = cleaned.replace(/,/g, ".");

            const gmvNumber = parseFloat(cleaned);

            totalPlacedGmv += isNaN(gmvNumber) ? 0 : gmvNumber;

            // Likes & Ditonton hanya dihitung jika sedang live
            totalDitonton += akunData.ditonton || 0;
            totalLikes += akunData.likes || 0;
          } else {
            notLiveCount++;
          }
        }

        return {
          id: studio.id,
          nama_studio: studio.nama_studio,
          total_akun: studio.akun.length,
          total_placedGmv: formatGmv(totalPlacedGmv),
          total_ditonton: totalDitonton,
          total_like: totalLikes,
          jumlah_live: {
            live: liveCount,
            tidak_live: notLiveCount,
          },
        };
      })
    );

    res.json({
      success: true,
      message: "Data studio berhasil diambil",
      data: studioSummary,
    });
  } catch (error) {
    console.error("Error fetching studios:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat data studio & akun",
      error: error.message,
    });
  }
};


export const getAkunStudioById = async (req, res) => {
  try {
    const {id} = req.params;
      const userId = req.session.user.id; // Dapatkan ID user yang login

    // ambil studio beserta akun dengan filter user ID
    const studio = await prisma.studio.findFirst({
      where: {
        id: Number(id),
        userId: userId, // Pastikan studio milik user yang login
      },
      include: {
        akun: true,
      },
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio tidak ditemukan atau tidak memiliki akses",
      });
    }

    const shopeeData = await getShopeeDataByAkunList(studio.akun);

    const resultArray = shopeeData.map((akunData) => {
      return {
        nama: akunData.nama,
        placedGmv: akunData.placedGmv,
        pesanan: akunData.pesanan,
        confirmedItemSold: akunData.confirmedItemSold,
        atc: akunData.atc,
        views: akunData.views,
        ditonton: akunData.ditonton,
        likes: akunData.likes,
        comments: akunData.comments,
        shares: akunData.shares,
        durasiFormatted: akunData.durasiFormatted,
        statusText: akunData.statusText,
        pelanggaran: akunData.pelanggaran,
      };
    });

    res.json({
      success: true,
      message: "Data akun studio berhasil diambil",
      studio: {
        id: studio.id,
        nama_studio: studio.nama_studio,
        total_akun: studio.akun.length,
      },
      data: resultArray,
    });
  } catch (error) {
    console.error("Error fetching studio akun:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat data akun studio",
      error: error.message,
    });
  }
};

export const renderStudioById = async (req, res) => {
  try {
    const {id} = req.params;
      const userId = req.session.user.id; // Dapatkan ID user yang login

    const studio = await prisma.studio.findFirst({
      where: {
        id: Number(id),
        userId: userId, // Pastikan studio milik user yang login
      },
      include: {
        akun: {
          select: {
            id: true,
            nama_akun: true,
            cookie: true,
            createdAt: true,
          },
          orderBy: {createdAt: "desc"},
        },
      },
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio tidak ditemukan atau tidak memiliki akses",
      });
    }

    const shopeeData = await getShopeeDataByAkunList(studio.akun);

    let totalPlacedGmv = 0;
    let totalDitonton = 0;
    let totalLikes = 0;
    let liveCount = 0;
    let notLiveCount = 0;

    for (const akunData of shopeeData) {
      const gmvNumber = Number(
        (akunData.placedGmv || "0").toString().replace(/[^0-9,-]+/g, "")
      );
      totalPlacedGmv += isNaN(gmvNumber) ? 0 : gmvNumber;

      totalDitonton += akunData.ditonton || 0;
      totalLikes += akunData.likes || 0;

      if (akunData.statusText === "Sedang Live") {
        liveCount++;
      } else {
        notLiveCount++;
      }
    }

    const summary = {
      id: studio.id,
      nama_studio: studio.nama_studio,
      total_akun: studio.akun.length,
      total_placedGmv: totalPlacedGmv.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
      }),
      total_ditonton: totalDitonton,
      total_like: totalLikes,
      jumlah_live: {
        live: liveCount,
        tidak_live: notLiveCount,
      },
    };

    res.json({
      success: true,
      message: "Data studio berhasil diambil",
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching studio by ID:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat data studio",
      error: error.message,
    });
  }
};

export async function indexStudio(req, res) {
  try {
      const userId = req.session.user.id; // Dapatkan ID user yang login

    const studios = await prisma.studio.findMany({
      where: {userId: userId}, // Hanya ambil studio milik user yang login
      include: {
        akun: true,
      },
    });
    res.json(studios);
  } catch (error) {
    console.error("Error fetching studios:", error);
    res.status(500).json({error: "Failed to fetch studios"});
  }
}

export async function getStudio(req, res) {
  try {
    const {id} = req.params;
      const userId = req.session.user.id; // Dapatkan ID user yang login

    const studio = await prisma.studio.findFirst({
      where: {
        id: parseInt(id),
        userId: userId, // Pastikan studio milik user yang login
      },
      include: {
        akun: true,
      },
    });

    if (!studio) {
      return res.status(404).json({error: "Studio not found or no access"});
    }

    res.json(studio);
  } catch (error) {
    console.error("Error fetching studio:", error);
    res.status(500).json({error: "Failed to fetch studio"});
  }
}

export async function postStudios(req, res) {
  try {
    const {nama_studio, catatan, akun} = req.body;
      const userId = req.session.user.id; // Dapatkan ID user yang login

    if (!nama_studio) {
      return res.status(400).json({error: "nama_studio is required"});
    }

    // Validasi: Pastikan semua akun yang dipilih milik user yang login
    if (akun && akun.length > 0) {
      const userAkun = await prisma.akun.findMany({
        where: {
          id: {in: akun.map((a) => a.id)},
          userId: userId,
          deletedAt: null,
        },
      });

      if (userAkun.length !== akun.length) {
        return res
          .status(403)
          .json({error: "Some accounts don't belong to you"});
      }
    }

    const studio = await prisma.studio.create({
      data: {
        nama_studio,
        catatan: catatan || null,
        userId: userId, // Set user ID yang membuat studio
        akun: akun?.length
          ? {
              connect: akun.map((a) => ({id: a.id})),
            }
          : undefined,
      },
      include: {
        akun: true,
      },
    });

    res.json(studio);
  } catch (error) {
    console.error("Error creating studio:", error);
    res.status(500).json({error: "Failed to create studio"});
  }
}

export async function putStudio(req, res) {
  try {
    const {id} = req.params;
    const {nama_studio, catatan, akun} = req.body;
      const userId = req.session.user.id; // Dapatkan ID user yang login

    // Cek apakah studio milik user yang login
    const existingStudio = await prisma.studio.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
      },
    });

    if (!existingStudio) {
      return res.status(404).json({error: "Studio not found or no access"});
    }

    // Validasi: Pastikan semua akun yang dipilih milik user yang login
    if (akun && akun.length > 0) {
      const userAkun = await prisma.akun.findMany({
        where: {
          id: {in: akun.map((a) => a.id)},
          userId: userId,
          deletedAt: null,
        },
      });

      if (userAkun.length !== akun.length) {
        return res
          .status(403)
          .json({error: "Some accounts don't belong to you"});
      }
    }

    const studio = await prisma.studio.update({
      where: {id: parseInt(id)},
      data: {
        nama_studio,
        catatan: catatan || null,
        akun: {
          set: akun?.map((a) => ({id: a.id})) || [],
        },
      },
      include: {
        akun: true,
      },
    });

    res.json(studio);
  } catch (error) {
    console.error("Error updating studio:", error);
    res.status(500).json({error: "Failed to update studio"});
  }
}

export async function delStudio(req, res) {
  try {
    const {id} = req.params;
      const userId = req.session.user.id; // Dapatkan ID user yang login

    // Cek apakah studio milik user yang login
    const existingStudio = await prisma.studio.findFirst({
      where: {
        id: parseInt(id),
        userId: userId,
      },
    });

    if (!existingStudio) {
      return res.status(404).json({error: "Studio not found or no access"});
    }

    await prisma.studio.delete({
      where: {id: parseInt(id)},
    });

    res.json({message: "Studio deleted successfully"});
  } catch (error) {
    console.error("Error deleting studio:", error);
    if (error.code === "P2025") {
      return res.status(404).json({error: "Studio not found"});
    }
    res.status(500).json({error: "Failed to delete studio"});
  }
}

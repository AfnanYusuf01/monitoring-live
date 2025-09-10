import { PrismaClient, KomisiStatus } from "@prisma/client";
const prisma = new PrismaClient();

/* =========================
   WEB RENDERING CONTROLLER
========================= */

// Render halaman affiliate dashboard atau registration form
export const renderAffiliatePage = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const successMessage = req.query.success || null;

    // Cek apakah user sudah menjadi affiliate
    const affiliate = await prisma.affiliate.findFirst({
      where: {userId: parseInt(userId)},
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        affiliateOrders: {
          include: {
            order: {
              include: {
                userSubscription: {
                  include: {
                    subscription: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Jika sudah menjadi affiliate, tampilkan dashboard
    if (affiliate) {
      // Hitung total komisi berdasarkan rumus: amountOrder * komisiSubscription
      const totalKomisi = affiliate.affiliateOrders.reduce(
        (total, affiliateOrder) => {
          if (
            affiliateOrder.order &&
            affiliateOrder.order.userSubscription &&
            affiliateOrder.order.userSubscription.subscription
          ) {
            const orderAmount = affiliateOrder.order.amount || 0;
            const subscriptionKomisi =
              affiliateOrder.order.userSubscription.subscription.komisi || 0;
            return total + orderAmount * subscriptionKomisi;
          }
          return total;
        },
        0
      );

      // Hitung komisi yang sudah dibayar (hanya yang statusnya 'paid')
      const totalDibayar = affiliate.affiliateOrders.reduce(
        (total, affiliateOrder) => {
          if (
            affiliateOrder.status === "paid" &&
            affiliateOrder.order &&
            affiliateOrder.order.userSubscription &&
            affiliateOrder.order.userSubscription.subscription
          ) {
            const orderAmount = affiliateOrder.order.amount || 0;
            const subscriptionKomisi =
              affiliateOrder.order.userSubscription.subscription.komisi || 0;
            return total + orderAmount * subscriptionKomisi;
          }
          return total;
        },
        0
      );

      // Dapatkan data subscriptions untuk ditampilkan, filter out invalid ones
      const allSubscriptions = await prisma.subscription.findMany({
        where: {
          komisi: {not: null},
        },
      });

      return res.render("pages/affiliate/affiliate-dashboard", {
        navbar: "Affiliate",
        affiliate,
        subscriptions: allSubscriptions,
        totalKomisi,
        totalDibayar,
        availableKomisi: totalKomisi - totalDibayar,
        successMessage,
        APP_BASE_URL: process.env.APP_URL || "http://localhost:3000",
      });
    }

    // Jika belum menjadi affiliate, tampilkan form pendaftaran
    const user = await prisma.user.findUnique({
      where: {id: parseInt(userId)},
      select: {
        id: true,
        name: true,
        email: true,
        nomor_wa: true,
      },
    });

    res.render("pages/affiliate/affiliate-registration", {
      navbar: "Affiliate",
      user,
      successMessage,
    });
  } catch (error) {
    console.error("Error rendering affiliate page:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat halaman affiliate",
    });
  }
};
// Render halaman edit affiliate
export const renderEditAffiliatePage = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const successMessage = req.query.success || null;

    const affiliate = await prisma.affiliate.findFirst({
      where: { 
        id: parseInt(id),
        userId: parseInt(userId)
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nomor_wa: true
          }
        }
      }
    });

    if (!affiliate) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Affiliate tidak ditemukan",
      });
    }

    res.render("pages/affiliate/affiliate-edit", {
      navbar: "Edit Data Affiliate",
      affiliate,
      successMessage
    });
  } catch (error) {
    console.error("Error rendering edit affiliate page:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat form edit affiliate",
    });
  }
};

async function fetchSubscriptions() {
  try {
    const APP_BASE_URL = process.env.APP_URL || "http://localhost:3000";
    const url = `${APP_BASE_URL}/api/subscriptions`;

    console.log("👉 Fetching from:", url);

    const response = await fetch(url);

    console.log("👉 Response status:", response.status);
    console.log("👉 Response ok:", response.ok);

    const text = await response.text(); // ambil plain text dulu
    console.log("👉 Raw response text:", text);

    let data;
    try {
      data = JSON.parse(text); // coba parse manual
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError.message);
      return [];
    }

    console.log("👉 Parsed JSON:", data);

    return data.data || [];
  } catch (error) {
    console.error("❌ Error fetching subscriptions:", error);
    return [];
  }
}


export const renderAffiliateManagement = async (req, res) => {
  try {
    // Cek role user dari session
    if (req.session.user.role !== 'superadmin') {
      return res.status(403).render("pages/403", {
        navbar: "Akses Ditolak",
        message: "Anda tidak memiliki akses ke halaman ini"
      });
    }

    // Ambil data affiliate orders dengan relasi yang diperlukan
    const affiliateOrders = await prisma.affiliateOrder.findMany({
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        order: {
          include: {
            userSubscription: {
              include: {
                subscription: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Hitung komisi yang benar untuk setiap affiliate order
    const affiliateOrdersWithCalculatedKomisi = affiliateOrders.map(order => {
      let calculatedKomisi = 0;
      
      // Hitung komisi berdasarkan rumus: priceSubscription * komisiSubscription
      if (order.order && order.order.userSubscription && order.order.userSubscription.subscription) {
        const subscription = order.order.userSubscription.subscription;
        calculatedKomisi = subscription.price * subscription.komisi;
      }
      
      return {
        ...order,
        calculatedKomisi // Tambahkan field komisi yang sudah dihitung dengan benar
      };
    });

    // Ambil juga data affiliates untuk bagian lain dari halaman
    const affiliates = await prisma.affiliate.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nomor_wa: true
          }
        },
        affiliateOrders: {
          include: {
            order: {
              include: {
                userSubscription: {
                  include: {
                    subscription: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Hitung total komisi untuk setiap affiliate
    const affiliatesWithCalculatedKomisi = affiliates.map(affiliate => {
      // Hitung total komisi (semua affiliate orders)
      const totalKomisi = affiliate.affiliateOrders.reduce((total, affiliateOrder) => {
        if (affiliateOrder.order && affiliateOrder.order.userSubscription && affiliateOrder.order.userSubscription.subscription) {
          const subscription = affiliateOrder.order.userSubscription.subscription;
          return total + (subscription.price * subscription.komisi);
        }
        return total;
      }, 0);
      
      // Hitung total yang sudah dibayar (hanya affiliate orders dengan status 'paid')
      const totalDibayar = affiliate.affiliateOrders.reduce((total, affiliateOrder) => {
        if (affiliateOrder.status === 'paid' && affiliateOrder.order && affiliateOrder.order.userSubscription && affiliateOrder.order.userSubscription.subscription) {
          const subscription = affiliateOrder.order.userSubscription.subscription;
          return total + (subscription.price * subscription.komisi);
        }
        return total;
      }, 0);
      
      // Hitung komisi yang belum dibayar
      const komisiBelumDibayar = totalKomisi - totalDibayar;
      
      return {
        ...affiliate,
        totalKomisi,
        totalDibayar,
        komisiBelumDibayar
      };
    });

    const successMessage = req.query.success || null;

    res.render("pages/affiliate/affiliate-management", {
      navbar: "Affiliate Management",
      affiliates: affiliatesWithCalculatedKomisi,
      affiliateOrders: affiliateOrdersWithCalculatedKomisi,
      KomisiStatus,
      successMessage,
    });
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat data affiliate",
    });
  }
};

// Render form untuk user mendaftar sebagai affiliate
export const renderAffiliateRegistration = async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Cek apakah user sudah menjadi affiliate
    const existingAffiliate = await prisma.affiliate.findFirst({
      where: { userId: parseInt(userId) },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (existingAffiliate) {
      return res.render("pages/affiliate/affiliate-already-registered", {
        navbar: "Affiliate",
        affiliate: existingAffiliate,
        message: "Anda sudah terdaftar sebagai affiliate"
      });
    }

    // Dapatkan data user untuk pre-fill form
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        nomor_wa: true
      }
    });

    res.render("pages/affiliate/affiliate-registration", {
      navbar: "Daftar Affiliate",
      user,
    });
  } catch (error) {
    console.error("Error rendering affiliate registration:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat form pendaftaran affiliate",
    });
  }
};

// Render dashboard affiliate untuk user
export const renderAffiliateDashboard = async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const affiliate = await prisma.affiliate.findFirst({
      where: { userId: parseInt(userId) },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        affiliateOrders: {
          include: {
            order: {
              include: {
                userSubscription: {
                  include: {
                    subscription: {
                      select: {
                        name: true,
                        price: true,
                        komisi: true
                      }
                    },
                    user: {
                      select: {
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!affiliate) {
      return res.redirect('/affiliate/register');
    }

    // Hitung total komisi berdasarkan rumus: priceSubscription * komisiSubscription
    const totalKomisi = affiliate.affiliateOrders.reduce((total, affiliateOrder) => {
      if (affiliateOrder.order && affiliateOrder.order.userSubscription && affiliateOrder.order.userSubscription.subscription) {
        const subscription = affiliateOrder.order.userSubscription.subscription;
        return total + (subscription.price * subscription.komisi);
      }
      return total;
    }, 0);

    // Hitung komisi yang sudah dibayar (hanya yang statusnya 'paid')
    const totalDibayar = affiliate.affiliateOrders.reduce((total, affiliateOrder) => {
      if (affiliateOrder.status === 'paid' && affiliateOrder.order && affiliateOrder.order.userSubscription && affiliateOrder.order.userSubscription.subscription) {
        const subscription = affiliateOrder.order.userSubscription.subscription;
        return total + (subscription.price * subscription.komisi);
      }
      return total;
    }, 0);

    res.render("pages/affiliate/affiliate-dashboard", {
      navbar: "Dashboard Affiliate",
      affiliate,
      totalKomisi,
      totalDibayar,
      availableKomisi: totalKomisi - totalDibayar // Komisi yang belum dibayar
    });
  } catch (error) {
    console.error("Error rendering affiliate dashboard:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat dashboard affiliate",
    });
  }
};

// Render Edit Form (untuk user mengedit data mereka sendiri)
export const renderEditAffiliate = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    const affiliate = await prisma.affiliate.findFirst({
      where: { 
        id: parseInt(id),
        userId: parseInt(userId) // Pastikan user hanya bisa edit data mereka sendiri
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nomor_wa: true
          }
        }
      }
    });

    if (!affiliate) {
      return res.status(404).render("pages/404", {
        navbar: "",
        message: "Affiliate tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    res.render("pages/affiliate/affiliate-edit", {
      navbar: "Edit Data Affiliate",
      affiliate,
    });
  } catch (error) {
    console.error("Error fetching edit form:", error);
    res.status(500).render("pages/500", {
      navbar: "",
      message: "Gagal memuat form edit affiliate",
    });
  }
};

/* =========================
   API CONTROLLER
========================= */

// Get all affiliates (hanya admin)
export const indexAffiliate = async (req, res) => {
  try {
    // Cek role admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya admin yang dapat mengakses data ini"
      });
    }

    const affiliates = await prisma.affiliate.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            nomor_wa: true
          }
        },
        affiliateOrders: {
          include: {
            order: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      status: "success",
      message: "List affiliate berhasil diambil",
      data: affiliates,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal fetch data affiliate",
      error: error.message,
    });
  }
};

// Get single affiliate (user hanya bisa akses data mereka sendiri, admin bisa akses semua)
export const showAffiliate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    let whereClause = { id: parseInt(id) };
    
    // Jika bukan admin, hanya bisa akses data sendiri
    if (userRole !== 'admin') {
      whereClause.userId = parseInt(userId);
    }

    const affiliate = await prisma.affiliate.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            nomor_wa: true
          }
        },
        affiliateOrders: {
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
        }
      }
    });

    if (!affiliate) {
      return res.status(404).json({
        status: "error",
        message: "Affiliate tidak ditemukan"
      });
    }

    res.json({
      status: "success",
      message: "Data affiliate berhasil diambil",
      data: affiliate,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal fetch data affiliate",
      error: error.message,
    });
  }
};

// Create new affiliate (user mendaftar sendiri)
export const storeAffiliate = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      metodeBayar,
      provider,
      nomorTujuan,
      namaPemilik
    } = req.body;

    // Cek apakah user sudah menjadi affiliate
    const existingAffiliate = await prisma.affiliate.findFirst({
      where: { userId: parseInt(userId) }
    });

    if (existingAffiliate) {
      return res.status(400).json({
        status: "error",
        message: "Anda sudah terdaftar sebagai affiliate"
      });
    }

    // Mulai transaksi untuk update user dan create affiliate
    const result = await prisma.$transaction(async (prisma) => {
      // Update user menjadi affiliate
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { isAffiliate: true }
      });

      // Create affiliate record
      const affiliate = await prisma.affiliate.create({
        data: {
          userId: parseInt(userId),
          metodeBayar: metodeBayar || null,
          provider: provider || null,
          nomorTujuan: nomorTujuan || null,
          namaPemilik: namaPemilik || null,
          komisi: 0,
          totalDibayar: 0
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return affiliate;
    });

    res.status(201).json({
      status: "success",
      message: "Anda berhasil terdaftar sebagai affiliate",
      data: result,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "User tidak ditemukan"
      });
    }
    
    res.status(500).json({
      status: "error",
      message: "Gagal mendaftar sebagai affiliate",
      error: error.message,
    });
  }
};

// Update affiliate (user hanya bisa update data mereka sendiri)
export const updateAffiliate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    const {
      metodeBayar,
      provider,
      nomorTujuan,
      namaPemilik
    } = req.body;

    let whereClause = { id: parseInt(id) };
    
    // Jika bukan admin, hanya bisa update data sendiri
    if (userRole !== 'admin') {
      whereClause.userId = parseInt(userId);
    }

    const affiliate = await prisma.affiliate.update({
      where: whereClause,
      data: {
        metodeBayar: metodeBayar !== undefined ? metodeBayar : undefined,
        provider: provider !== undefined ? provider : undefined,
        nomorTujuan: nomorTujuan !== undefined ? nomorTujuan : undefined,
        namaPemilik: namaPemilik !== undefined ? namaPemilik : undefined,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      status: "success",
      message: "Data affiliate berhasil diupdate",
      data: affiliate,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Affiliate tidak ditemukan atau Anda tidak memiliki akses"
      });
    }
    
    res.status(500).json({
      status: "error",
      message: "Gagal update affiliate",
      error: error.message,
    });
  }
};

// Delete affiliate (hanya admin)
export const destroyAffiliate = async (req, res) => {
  try {
    // Cek role admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya admin yang dapat menghapus affiliate"
      });
    }

    const { id } = req.params;

    // Mulai transaksi untuk menghapus affiliate dan update user
    await prisma.$transaction(async (prisma) => {
      // Dapatkan data affiliate untuk mendapatkan userId
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: parseInt(id) },
        select: { userId: true }
      });

      if (!affiliate) {
        throw new Error("Affiliate tidak ditemukan");
      }

      // Hapus semua affiliateOrders yang terkait dengan affiliate
      await prisma.affiliateOrder.deleteMany({
        where: { affiliateId: parseInt(id) }
      });

      // Update semua order yang memiliki affiliateId ini menjadi null
      await prisma.order.updateMany({
        where: { affiliateId: parseInt(id) },
        data: { affiliateId: null }
      });

      // Hapus affiliate
      await prisma.affiliate.delete({
        where: { id: parseInt(id) }
      });

      // Update user menjadi non-affiliate
      await prisma.user.update({
        where: { id: affiliate.userId },
        data: { isAffiliate: false }
      });
    });

    res.json({
      status: "success",
      message: "Affiliate berhasil dihapus dan user diupdate menjadi non-affiliate",
    });
  } catch (error) {
    if (error.code === "P2025" || error.message === "Affiliate tidak ditemukan") {
      return res.status(404).json({
        status: "error",
        message: "Affiliate tidak ditemukan"
      });
    }
    
    res.status(500).json({
      status: "error",
      message: "Gagal menghapus affiliate",
      error: error.message,
    });
  }
};



export const handleAffiliateOrder = async (orderId, affiliateId, amount) => {
  try {
    // Dapatkan data order lengkap dengan subscription
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        userSubscription: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!order || !order.userSubscription || !order.userSubscription.subscription) {
      throw new Error("Order atau data subscription tidak ditemukan");
    }

    // Hitung komisi berdasarkan rumus: priceSubscription * komisiSubscription
    const subscription = order.userSubscription.subscription;
    const komisi = subscription.price * subscription.komisi;

    // Buat record di AffiliateOrder dengan status pending
    await prisma.affiliateOrder.create({
      data: {
        affiliateId: parseInt(affiliateId),
        orderId: parseInt(orderId),
        komisi: komisi, // Simpan nilai komisi yang dihitung
        status: KomisiStatus.pending // Default status
      }
    });

    // Update saldo komisi affiliate (tambahkan ke saldo tersedia)
    await prisma.affiliate.update({
      where: { id: parseInt(affiliateId) },
      data: {
        komisi: { increment: komisi }
      }
    });

    console.log(`Komisi affiliate sebesar ${komisi} berhasil ditambahkan untuk order ${orderId}`);
  } catch (error) {
    console.error("Error handling affiliate order:", error);
    throw error;
  }
};

// Update status komisi affiliate (hanya admin)
export const updateKomisiStatus = async (req, res) => {
  try {
    // Cek role admin
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya admin yang dapat mengubah status komisi"
      });
    }

    const { affiliateOrderId } = req.params;
    const { status } = req.body;

    // Validasi status
    if (!Object.values(KomisiStatus).includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Status komisi tidak valid"
      });
    }

    const affiliateOrder = await prisma.affiliateOrder.findUnique({
      where: { id: parseInt(affiliateOrderId) },
      include: {
        affiliate: true,
        order: {
          include: {
            userSubscription: {
              include: {
                subscription: true
              }
            }
          }
        }
      }
    });

    if (!affiliateOrder) {
      return res.status(404).json({
        status: "error",
        message: "Affiliate order tidak ditemukan"
      });
    }

    // Hitung komisi yang benar berdasarkan subscription
    let calculatedKomisi = 0;
    if (affiliateOrder.order && affiliateOrder.order.userSubscription && affiliateOrder.order.userSubscription.subscription) {
      const subscription = affiliateOrder.order.userSubscription.subscription;
      calculatedKomisi = subscription.price * subscription.komisi;
    }

    // Jika nilai komisi di database berbeda dengan perhitungan, update nilainya
    if (affiliateOrder.komisi !== calculatedKomisi) {
      await prisma.affiliateOrder.update({
        where: { id: parseInt(affiliateOrderId) },
        data: { komisi: calculatedKomisi }
      });
    }

    // Jika status diubah menjadi 'paid', update saldo affiliate
    if (status === 'paid' && affiliateOrder.status !== 'paid') {
      await prisma.affiliate.update({
        where: { id: affiliateOrder.affiliateId },
        data: {
          komisi: { decrement: calculatedKomisi },
          totalDibayar: { increment: calculatedKomisi },
          lastPaidAt: new Date()
        }
      });
    }
    
    // Jika status sebelumnya 'paid' dan diubah ke status lain, kembalikan saldo
    if (affiliateOrder.status === 'paid' && status !== 'paid') {
      await prisma.affiliate.update({
        where: { id: affiliateOrder.affiliateId },
        data: {
          komisi: { increment: calculatedKomisi },
          totalDibayar: { decrement: calculatedKomisi }
        }
      });
    }

    // Update status affiliate order
    const updatedAffiliateOrder = await prisma.affiliateOrder.update({
      where: { id: parseInt(affiliateOrderId) },
      data: { status },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
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

    res.json({
      status: "success",
      message: "Status komisi berhasil diupdate",
      data: updatedAffiliateOrder,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengupdate status komisi",
      error: error.message,
    });
  }
};

// Get semua affiliate orders (hanya admin)
export const getAffiliateOrders = async (req, res) => {
  try {
    // Cek role admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak. Hanya admin yang dapat mengakses data ini"
      });
    }

    const { status } = req.query;
    
    let whereClause = {};
    if (status && Object.values(KomisiStatus).includes(status)) {
      whereClause.status = status;
    }

    const affiliateOrders = await prisma.affiliateOrder.findMany({
      where: whereClause,
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
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
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      status: "success",
      message: "List affiliate orders berhasil diambil",
      data: affiliateOrders,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Gagal fetch data affiliate orders",
      error: error.message,
    });
  }
};
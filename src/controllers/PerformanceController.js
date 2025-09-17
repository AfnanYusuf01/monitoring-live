import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();



// Fungsi fetch profil Shopee (bisa pakai yg sudah ada biar DRY)
const fetchShopeeProfile = async (cookie) => {
  try {
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
          referer: "https://affiliate.shopee.co.id/dashboard",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
          cookie: cookies,
        },
      }
    );

    if (response.data.code === 0) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data.msg || "Gagal ambil profil Shopee",
      code: response.data.code,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const createAffiliateStat = async (req, res) => {
  try {
    const { access_token } = req.headers;
    const requestDataArray = req.body; // Sekarang menerima array

    if (!access_token) {
      return res.status(401).json({
        success: false,
        message: "Access token diperlukan",
      });
    }
    
    if (!Array.isArray(requestDataArray) || requestDataArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Body request harus berupa array yang tidak kosong",
      });
    }

    // Validasi setiap item dalam array
    for (const item of requestDataArray) {
      if (!item.cookie) {
        return res.status(400).json({
          success: false,
          message: "Cookie Shopee wajib diisi di setiap item body",
        });
      }
    }

    // Cari user berdasarkan access_token
    const user = await prisma.user.findUnique({
      where: { access_token },
      include: {
        userSubscriptions: {
          where: {
            status: 'active',
            endDate: {
              gt: new Date()
            }
          }
        },
        akun: true
      }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Cek apakah user memiliki subscription aktif
    if (user.userSubscriptions.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Tidak ada subscription aktif",
      });
    }

    // Kelompokkan data berdasarkan cookie untuk menghindari fetch profil berulang
    const cookieGroups = {};
    requestDataArray.forEach(item => {
      if (!cookieGroups[item.cookie]) {
        cookieGroups[item.cookie] = [];
      }
      cookieGroups[item.cookie].push(item);
    });

    const results = [];
    let totalInserted = 0;
    let totalDuplicates = 0;

    // Proses setiap kelompok cookie
    for (const [cookie, items] of Object.entries(cookieGroups)) {
      // Fetch profil Shopee untuk dapat accountId
      const profileResult = await fetchShopeeProfile(cookie);
      if (!profileResult.success) {
        results.push({
          cookie: cookie,
          success: false,
          message: "Gagal mengambil profil Shopee",
          error: profileResult.error,
          code: profileResult.code || null,
        });
        continue;
      }

      const accountId = String(profileResult.data.user_id);
      
      // Cek apakah accountId sudah ada di database
      const existingAkun = await prisma.akun.findFirst({
        where: {
          userId: user.id,
          id: BigInt(accountId)
        }
      });

      // Jika akun sudah ada, update cookie-nya
      if (existingAkun) {
        await prisma.akun.update({
          where: { id: BigInt(accountId) },
          data: { cookie: cookie }
        });
      } else {
        // Jika akun belum ada, buat akun baru
        await prisma.akun.create({
          data: {
            id: BigInt(accountId),
            nama_akun: profileResult.data.username || `Shopee-${accountId}`,
            email: profileResult.data.email || null,
            cookie: cookie,
            userId: user.id
          }
        });
      }

      // Ekstrak data statistik dari setiap item
      const statDataArray = items.map(item => {
        const { cookie: itemCookie, ...statData } = item;
        return statData;
      });

      // Cek data yang sudah ada untuk menghindari duplikasi
      const existingRecords = await prisma.affiliateStat.findMany({
        where: {
          accountId: accountId,
          ymd: {
            in: statDataArray.map(d => new Date(d.ymd))
          }
        },
        select: {
          ymd: true
        }
      });

      // Filter data yang belum ada di database
      const existingYmdSet = new Set(existingRecords.map(r => r.ymd.toISOString().split('T')[0]));
      const newData = statDataArray.filter(d => !existingYmdSet.has(d.ymd));

      if (newData.length === 0) {
        results.push({
          accountId,
          success: true,
          message: "Semua data sudah ada di database, tidak ada data baru yang disimpan",
          inserted: 0,
          duplicates: statDataArray.length,
          akunStatus: existingAkun ? 'updated' : 'created'
        });
        totalDuplicates += statDataArray.length;
        continue;
      }

      // Simpan hanya data yang baru
      const created = await prisma.affiliateStat.createMany({
        data: newData.map((d) => ({
          accountId,
          ymd: new Date(d.ymd),
          clicks: d.clicks,
          cvByOrder: d.cv_by_order,
          orderCvr: d.order_cvr,
          orderAmount: BigInt(d.order_amount),
          totalCommission: BigInt(d.total_commission),
          totalIncome: BigInt(d.total_income),
          newBuyer: d.new_buyer,
          programType: d.program_type,
          itemSold: d.item_sold,
          estCommission: BigInt(d.est_commission),
          estIncome: BigInt(d.est_income),
          userId: user.id,
        })),
      });

      totalInserted += created.count;
      totalDuplicates += (statDataArray.length - created.count);
      
      results.push({
        accountId,
        success: true,
        message: "Affiliate stats berhasil disimpan",
        inserted: created.count,
        duplicates: statDataArray.length - created.count,
        akunStatus: existingAkun ? 'updated' : 'created'
      });
    }

    // Periksa jika ada hasil yang gagal
    const hasFailures = results.some(result => !result.success);
    
    if (hasFailures) {
      return res.status(207).json({ // 207 Multi-Status
        success: false,
        message: "Beberapa data gagal diproses",
        data: results,
        summary: {
          totalProcessed: requestDataArray.length,
          totalInserted,
          totalDuplicates,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        meta: {
          userId: user.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Semua affiliate stats berhasil disimpan",
      data: results,
      summary: {
        totalProcessed: requestDataArray.length,
        totalInserted,
        totalDuplicates,
        successful: results.length,
        failed: 0
      },
      meta: {
        userId: user.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("❌ Error createAffiliateStat:", err.message);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

export const getAffiliateStats = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "User tidak terautentikasi",
      });
    }

    // Hitung tanggal 7 hari terakhir
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // 1. Ambil user dengan studio dan akun-akunnya (hanya yang punya studio)
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        studio: {
          include: {
            akun: true // Hanya ambil data akun saja
          }
        }
      },
    });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Kumpulkan semua ID akun dari studio user ini saja
    const allAkunIds = [];
    
    // Akun dari studio saja (tidak termasuk akun tanpa studio)
    userData.studio.forEach(studio => {
      studio.akun.forEach(akun => {
        allAkunIds.push(akun.id.toString());
      });
    });

    // Jika tidak ada akun sama sekali, kembalikan data kosong
    if (allAkunIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Data affiliate stats berhasil diambil",
        data: {
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days: 7
          },
          studios: [],
          summary: {
            totalStudios: 0,
            totalAkun: 0,
            totalStats: {
              clicks: 0,
              cvByOrder: 0,
              orderCvr: 0,
              orderAmount: 0,
              totalCommission: 0,
              totalIncome: 0,
              newBuyer: 0,
              programType: 0,
              itemSold: 0,
              estCommission: 0,
              estIncome: 0,
              akunCount: 0,
            }
          }
        },
        meta: {
          userId: user.id,
          userName: user.name,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 2. Ambil affiliate stats untuk semua akun user ini dalam periode 7 hari
    const affiliateStats = await prisma.affiliateStat.findMany({
      where: {
        accountId: {
          in: allAkunIds
        },
        ymd: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        ymd: 'asc'
      }
    });

    // Kelompokkan data per studio
    const studioStats = {};
    const allDailyStats = {};

    // Inisialisasi semua tanggal dalam 7 hari terakhir
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      allDailyStats[dateKey] = {
        date: dateKey,
        clicks: 0,
        cvByOrder: 0,
        orderCvr: 0,
        orderAmount: 0,
        totalCommission: 0,
        totalIncome: 0,
        newBuyer: 0,
        programType: 0,
        itemSold: 0,
        estCommission: 0,
        estIncome: 0,
        akunCount: 0
      };
    }

    // Proses studio yang dimiliki user
    userData.studio.forEach((studio) => {
      const studioId = studio.id;
      const studioName = studio.nama_studio || "Studio tanpa nama";

      if (!studioStats[studioId]) {
        studioStats[studioId] = {
          studioId,
          studioName,
          totalStats: {
            clicks: 0,
            cvByOrder: 0,
            orderCvr: 0,
            orderAmount: 0,
            totalCommission: 0,
            totalIncome: 0,
            newBuyer: 0,
            programType: 0,
            itemSold: 0,
            estCommission: 0,
            estIncome: 0,
            akunCount: 0,
          },
          dailyStats: JSON.parse(JSON.stringify(allDailyStats)),
          akunList: []
        };
      }

      // Proses setiap akun dalam studio
      studio.akun.forEach((akun) => {
        // Tambahkan akun ke list
        studioStats[studioId].akunList.push({
          id: akun.id.toString(),
          nama_akun: akun.nama_akun,
          email: akun.email
        });

        // Cari affiliate stats untuk akun ini
        const akunStats = affiliateStats.filter(stat => stat.accountId === akun.id.toString());
        
        // Hitung statistik untuk akun ini
        akunStats.forEach((stat) => {
          const statDate = stat.ymd.toISOString().split('T')[0];
          
          if (studioStats[studioId].dailyStats[statDate]) {
            studioStats[studioId].dailyStats[statDate].clicks += stat.clicks;
            studioStats[studioId].dailyStats[statDate].cvByOrder += stat.cvByOrder;
            studioStats[studioId].dailyStats[statDate].orderCvr += stat.orderCvr;
            studioStats[studioId].dailyStats[statDate].orderAmount += Number(stat.orderAmount);
            studioStats[studioId].dailyStats[statDate].totalCommission += Number(stat.totalCommission);
            studioStats[studioId].dailyStats[statDate].totalIncome += Number(stat.totalIncome);
            studioStats[studioId].dailyStats[statDate].newBuyer += stat.newBuyer;
            studioStats[studioId].dailyStats[statDate].programType += stat.programType;
            studioStats[studioId].dailyStats[statDate].itemSold += stat.itemSold;
            studioStats[studioId].dailyStats[statDate].estCommission += Number(stat.estCommission);
            studioStats[studioId].dailyStats[statDate].estIncome += Number(stat.estIncome);
            studioStats[studioId].dailyStats[statDate].akunCount++;
          }

          // Tambahkan ke total stats
          studioStats[studioId].totalStats.clicks += stat.clicks;
          studioStats[studioId].totalStats.cvByOrder += stat.cvByOrder;
          studioStats[studioId].totalStats.orderCvr += stat.orderCvr;
          studioStats[studioId].totalStats.orderAmount += Number(stat.orderAmount);
          studioStats[studioId].totalStats.totalCommission += Number(stat.totalCommission);
          studioStats[studioId].totalStats.totalIncome += Number(stat.totalIncome);
          studioStats[studioId].totalStats.newBuyer += stat.newBuyer;
          studioStats[studioId].totalStats.programType += stat.programType;
          studioStats[studioId].totalStats.itemSold += stat.itemSold;
          studioStats[studioId].totalStats.estCommission += Number(stat.estCommission);
          studioStats[studioId].totalStats.estIncome += Number(stat.estIncome);
        });

        studioStats[studioId].totalStats.akunCount++;
      });
    });

    // Konversi dailyStats menjadi array dan urutkan berdasarkan tanggal
    const formattedStudioStats = Object.values(studioStats).map(studio => ({
      ...studio,
      dailyStats: Object.values(studio.dailyStats)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    }));

    return res.status(200).json({
      success: true,
      message: "Data affiliate stats berhasil diambil",
      data: {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days: 7
        },
        studios: formattedStudioStats,
        summary: {
          totalStudios: formattedStudioStats.length,
          totalAkun: userData.studio.reduce((acc, studio) => acc + studio.akun.length, 0),
          totalStats: formattedStudioStats.reduce((acc, studio) => ({
            clicks: acc.clicks + studio.totalStats.clicks,
            cvByOrder: acc.cvByOrder + studio.totalStats.cvByOrder,
            orderCvr: acc.orderCvr + studio.totalStats.orderCvr,
            orderAmount: acc.orderAmount + studio.totalStats.orderAmount,
            totalCommission: acc.totalCommission + studio.totalStats.totalCommission,
            totalIncome: acc.totalIncome + studio.totalStats.totalIncome,
            newBuyer: acc.newBuyer + studio.totalStats.newBuyer,
            programType: acc.programType + studio.totalStats.programType,
            itemSold: acc.itemSold + studio.totalStats.itemSold,
            estCommission: acc.estCommission + studio.totalStats.estCommission,
            estIncome: acc.estIncome + studio.totalStats.estIncome,
            akunCount: acc.akunCount + studio.totalStats.akunCount,
          }), {
            clicks: 0,
            cvByOrder: 0,
            orderCvr: 0,
            orderAmount: 0,
            totalCommission: 0,
            totalIncome: 0,
            newBuyer: 0,
            programType: 0,
            itemSold: 0,
            estCommission: 0,
            estIncome: 0,
            akunCount: 0
          })
        }
      },
      meta: {
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error("❌ Error getAffiliateStatsByStudio:", err.message);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};


export const getAffiliateStatsByStudioId = async (req, res) => {
  try {
    const user = req.session.user;
    const { studio_id } = req.params;
    const { startDate, endDate } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "User tidak terautentikasi",
      });
    }

    // Validasi input
    if (!studio_id) {
      return res.status(400).json({
        success: false,
        message: "Studio ID harus diisi",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date dan end date harus diisi",
      });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal tidak valid",
      });
    }

    // 1. Cek apakah studio milik user
    const studio = await prisma.studio.findFirst({
      where: {
        id: parseInt(studio_id),
        userId: user.id
      },
      include: {
        akun: {
          where: {
            deletedAt: null
          },
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio tidak ditemukan atau tidak memiliki akses",
      });
    }

    // 2. Ambil semua ID akun dalam studio
    const akunIds = studio.akun.map(akun => akun.id.toString());

    if (akunIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada akun dalam studio ini",
        data: {
          studio: {
            id: studio.id,
            nama_studio: studio.nama_studio,
            catatan: studio.catatan
          },
          period: {
            startDate: startDate,
            endDate: endDate
          },
          affiliateStats: [],
          summary: {
            totalAkun: 0,
            totalStats: {
              clicks: 0,
              cvByOrder: 0,
              orderCvr: 0,
              orderAmount: 0,
              totalCommission: 0,
              totalIncome: 0,
              newBuyer: 0,
              programType: 0,
              itemSold: 0,
              estCommission: 0,
              estIncome: 0
            }
          }
        }
      });
    }

    // 3. Ambil affiliate stats untuk semua akun dalam periode yang diminta
    const affiliateStats = await prisma.affiliateStat.findMany({
      where: {
        accountId: {
          in: akunIds
        },
        ymd: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [
        { accountId: 'asc' },
        { ymd: 'asc' }
      ]
    });

    // 4. Buat mapping untuk info akun
    const akunMap = {};
    studio.akun.forEach(akun => {
      akunMap[akun.id.toString()] = {
        id: akun.id.toString(),
        nama_akun: akun.nama_akun,
        email: akun.email,
        phone: akun.phone
      };
    });

    // 5. Format data per tanggal per akun
    const formattedStats = [];
    const summary = {
      clicks: 0,
      cvByOrder: 0,
      orderCvr: 0,
      orderAmount: 0,
      totalCommission: 0,
      totalIncome: 0,
      newBuyer: 0,
      programType: 0,
      itemSold: 0,
      estCommission: 0,
      estIncome: 0
    };

    affiliateStats.forEach(stat => {
      const accountInfo = akunMap[stat.accountId];
      
      if (accountInfo) {
        const statData = {
          account: accountInfo,
          date: stat.ymd.toISOString().split('T')[0],
          clicks: stat.clicks,
          cvByOrder: stat.cvByOrder,
          orderCvr: stat.orderCvr,
          orderAmount: Number(stat.orderAmount),
          totalCommission: Number(stat.totalCommission),
          totalIncome: Number(stat.totalIncome),
          newBuyer: stat.newBuyer,
          programType: stat.programType,
          itemSold: stat.itemSold,
          estCommission: Number(stat.estCommission),
          estIncome: Number(stat.estIncome)
        };

        formattedStats.push(statData);

        // Update summary
        summary.clicks += stat.clicks;
        summary.cvByOrder += stat.cvByOrder;
        summary.orderCvr += stat.orderCvr;
        summary.orderAmount += Number(stat.orderAmount);
        summary.totalCommission += Number(stat.totalCommission);
        summary.totalIncome += Number(stat.totalIncome);
        summary.newBuyer += stat.newBuyer;
        summary.programType += stat.programType;
        summary.itemSold += stat.itemSold;
        summary.estCommission += Number(stat.estCommission);
        summary.estIncome += Number(stat.estIncome);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Data affiliate stats berhasil diambil",
      data: {
        studio: {
          id: studio.id,
          nama_studio: studio.nama_studio,
          catatan: studio.catatan
        },
        period: {
          startDate: startDate,
          endDate: endDate
        },
        affiliateStats: formattedStats,
        summary: {
          totalAkun: studio.akun.length,
          totalStats: summary
        }
      },
      meta: {
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error("❌ Error getAffiliateStatsByStudioId:", err.message);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};
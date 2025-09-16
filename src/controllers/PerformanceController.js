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
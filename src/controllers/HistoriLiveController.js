// controllers/HistoriLiveController.js
import axios from "axios";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

// Helper functions
// Ganti fungsi formatRupiah dengan yang ini
function formatRupiah(amount) {
  // Format tanpa karakter non-breaking space
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount).replace(/\u00A0/g, ' '); // Ganti non-breaking space dengan regular space
}

function formatDuration(startTime) {
  // Handle jika startTime tidak ada
  if (!startTime) return "00:00:00";

  // Convert ke number jika berupa string
  const startTimeNum =
    typeof startTime === "string" ? parseInt(startTime) : startTime;

  // Handle timestamp dalam detik (bukan milidetik)
  const startTimeMs =
    startTimeNum < 1000000000000 ? startTimeNum * 1000 : startTimeNum;

  const startDate = new Date(startTimeMs);
  const now = new Date();

  // Handle invalid date
  if (isNaN(startDate.getTime())) return "00:00:00";

  const durasiMs = now - startDate;
  const jam = Math.floor(durasiMs / (1000 * 60 * 60));
  const menit = Math.floor((durasiMs % (1000 * 60 * 60)) / (1000 * 60));
  const detik = Math.floor((durasiMs % (1000 * 60)) / 1000);

  return `${jam.toString().padStart(2, "0")}:${menit
    .toString()
    .padStart(2, "0")}:${detik.toString().padStart(2, "0")}`;
}

function getStatusText(status) {
  switch (status) {
    case 1:
      return "Sedang Live";
    case 2:
      return "Tidak Live";
    default:
      return "Status Tidak Diketahui";
  }
}

function parseCookies(cookieString) {
  return cookieString
    .split(";")
    .map((c) => c.trim())
    .join("; ");
}

function getShopeeHeaders(cookies) {
  return {
    accept: "application/json",
    "accept-language": "en-GB,en;q=0.9,ar;q=0.8,id;q=0.7,en-US;q=0.6,ms;q=0.5",
    "content-type": "application/json",
    dnt: "1",
    language: "en",
    priority: "u=1, i",
    referer: "https://creator.shopee.co.id/insight/live/list",
    "sec-ch-ua":
      '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "x-env": "live",
    "x-region": "id",
    "x-region-domain": "co.id",
    "x-region-timezone": "+0700",
    cookie: cookies,
  };
}

export const getLiveHistory = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: "Account ID is required" });
    }

    // Ambil data dari database berdasarkan accountId
    const historyData = await prisma.history.findMany({
      where: {
        akunId: BigInt(accountId)
      },
      include: {
        pelanggaran: true // Include data pelanggaran yang terkait
      },
      orderBy: {
        tanggal: 'desc' // Urutkan dari yang terbaru
      }
    });

    // Format data sesuai dengan response yang diharapkan
    const formattedResults = historyData.map((item, index) => ({
      No: index + 1,
      Nama: item.nama,
      Session: item.session.toString(),
      GMV: item.gmv,
      Ord: item.ord,
      CO: item.co,
      Act: item.act,
      View: item.view,
      Viewer: item.viewer,
      Like: item.like,
      Comnt: item.comnt,
      Shere: item.shere,
      Tanggal: item.tanggal ? item.tanggal.toISOString() : null,
      Durasi: item.durasi,
      Status: item.status === "Sedang_Live" ? "Sedang Live" : "Tidak Live",
      Pelanggaran: {
        jumlah: item.pelanggaran?.jumlah || 0,
        judul: item.pelanggaran?.judul || []
      }
    }));

    return res.json(formattedResults);
  } catch (error) {
    console.error("Error in getLiveHistory:", error);
    return res.status(500).json({
      error: "Failed to get live history from database",
      detail: error.message,
    });
  }
};


// Tambahkan ini di awal file untuk handle BigInt serialization
BigInt.prototype.toJSON = function() {
  return this.toString();
};

export const postLiveHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Ambil semua akun milik user
    const accounts = await prisma.akun.findMany({
      where: { 
        userId: parseInt(userId),
        cookie: { not: null } // Hanya ambil akun yang memiliki cookie
      }
    });

    if (!accounts.length) {
      return res.status(404).json({ error: "No accounts found for this user or accounts have no cookies" });
    }

    const allHistoryResults = [];

    // Process each account
    for (const account of accounts) {
      try {
        // ambil session list dari Shopee
        const initialSessionData = await getShopeeSessions(account.cookie);
        if (!initialSessionData?.total) continue;

        const allSessionsData = await getShopeeSessions(account.cookie, initialSessionData.total);
        if (!allSessionsData?.list?.length) continue;

        const historyResults = [];

        for (const [idx, session] of allSessionsData.list.entries()) {
          try {
            const sessionId = session.sessionId;

            const [liveData, sessionInfo, violations] = await Promise.all([
              getDataLive(sessionId, account.cookie),
              getDataSession(sessionId, account.cookie),
              getViolationsData(sessionId, account.cookie),
            ]);

            const mainData = liveData?.data || {};
            const engagementData = mainData.engagementData || {};
            const sessionDetail = sessionInfo?.data || {};

            const result = {
              no: idx + 1,
              nama: account.nama_akun,
              session: BigInt(sessionId),
              gmv: formatRupiah(mainData.placedGmv || 0),
              ord: mainData.placedOrder || 0,
              co: mainData.confirmedItemsSold || 0,
              act: mainData.atc || 0,
              view: mainData.views || 0,
              viewer: mainData.ccu || 0,
              like: engagementData.likes || 0,
              comnt: engagementData.comments || 0,
              shere: engagementData.shares || 0,
              tanggal: sessionDetail.lsStartTime ? new Date(sessionDetail.lsStartTime) : null,
              durasi: sessionDetail.lsStartTime
                ? formatDuration(sessionDetail.lsStartTime)
                : "00:00:00",
              status: getStatusText(mainData.status) === "Sedang Live"
                ? "Sedang_Live"
                : "Tidak_Live",
              akunId: account.id,
              pelanggaran: {
                jumlah: violations?.JumlahPelanggaran || 0,
                judul: violations?.JudulPelanggaran || [],
              },
            };

            // ✅ upsert ke DB dengan composite key yang benar
            await prisma.history.upsert({
              where: {
                akunId_session: {
                  akunId: account.id,
                  session: BigInt(sessionId),
                },
              },
              update: {
                no: result.no,
                nama: result.nama,
                gmv: result.gmv,
                ord: result.ord,
                co: result.co,
                act: result.act,
                view: result.view,
                viewer: result.viewer,
                like: result.like,
                comnt: result.comnt,
                shere: result.shere,
                tanggal: result.tanggal,
                durasi: result.durasi,
                status: result.status,
                pelanggaran: {
                  deleteMany: {}, // hapus dulu
                  create: {
                    jumlah: result.pelanggaran.jumlah,
                    judul: result.pelanggaran.judul,
                  },
                },
              },
              create: {
                no: result.no,
                nama: result.nama,
                session: result.session,
                gmv: result.gmv,
                ord: result.ord,
                co: result.co,
                act: result.act,
                view: result.view,
                viewer: result.viewer,
                like: result.like,
                comnt: result.comnt,
                shere: result.shere,
                tanggal: result.tanggal,
                durasi: result.durasi,
                status: result.status,
                akunId: result.akunId,
                pelanggaran: {
                  create: {
                    jumlah: result.pelanggaran.jumlah,
                    judul: result.pelanggaran.judul,
                  },
                },
              },
            });

            historyResults.push(result);
          } catch (error) {
            console.error(`Error processing session ${session.sessionId} for account ${account.id}:`, error);
          }
        }

        allHistoryResults.push({
          accountId: account.id.toString(), // Convert BigInt to string untuk JSON
          accountName: account.nama_akun,
          sessionsProcessed: historyResults.length,
          history: historyResults
        });

      } catch (error) {
        console.error(`Error processing account ${account.id}:`, error);
        allHistoryResults.push({
          accountId: account.id.toString(), // Convert BigInt to string untuk JSON
          accountName: account.nama_akun,
          error: error.message,
          sessionsProcessed: 0
        });
      }
    }

    return res.json({
      message: "Live history processed for all user accounts",
      totalAccounts: accounts.length,
      results: allHistoryResults
    });
  } catch (error) {
    console.error("Error in postLiveHistory:", error);
    return res.status(500).json({
      error: "Failed to get live history",
      detail: error.message,
    });
  }
};

// Main controller for studio history - Updated to use database
export const getStudioLiveHistory = async (req, res) => {
  try {
    const { accountIds } = req.body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: "Account IDs array is required" });
    }

    // Convert accountIds to numbers
    const numericAccountIds = accountIds.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (numericAccountIds.length === 0) {
      return res.status(400).json({ error: "Valid account IDs are required" });
    }

    // Ambil data dari database berdasarkan accountIds
    const historyData = await prisma.history.findMany({
      where: {
        akunId: {
          in: numericAccountIds.map(id => BigInt(id))
        }
      },
      include: {
        pelanggaran: true // Include data pelanggaran yang terkait
      },
      orderBy: {
        tanggal: 'desc' // Urutkan dari yang terbaru
      }
    });

    // Format data sesuai dengan response yang diharapkan
    const formattedResults = historyData.map(item => {
      // Get date in WIB timezone for grouping
      let tanggalGroup = null;
      if (item.tanggal) {
        tanggalGroup = getDateInWIB(item.tanggal).toISOString().split('T')[0];
      }

      return {
        Nama: item.nama,
        Session: item.session.toString(),
        GMV: parseFloat(item.gmv.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
        Ord: item.ord,
        CO: item.co,
        Act: item.act,
        View: item.view,
        Viewer: item.viewer,
        Like: item.like,
        Comnt: item.comnt,
        Shere: item.shere,
        Tanggal: item.tanggal ? item.tanggal.toISOString() : null,
        TanggalGroup: tanggalGroup, // For grouping by date in WIB timezone
        Durasi: item.durasi,
        Status: item.status === "Sedang_Live" ? "Sedang Live" : "Tidak Live",
        Pelanggaran: {
          jumlah: item.pelanggaran?.jumlah || 0,
          judul: item.pelanggaran?.judul || []
        }
      };
    });

    // Group and aggregate data by date and account
    const groupedData = groupAndAggregateDataByDate(formattedResults);

    return res.json(groupedData);
  } catch (error) {
    console.error("Error in getStudioLiveHistory:", error);
    return res.status(500).json({
      error: "Failed to get studio live history from database",
      detail: error.message,
    });
  }
};

// Helper function to get date in WIB timezone (UTC+7)
function getDateInWIB(date) {
  const utcDate = new Date(date);
  const wibDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
  return wibDate;
}

// Helper function to group and aggregate data by date
function groupAndAggregateDataByDate(data) {
  const groupedByDate = {};
  
  data.forEach(item => {
    if (!item.TanggalGroup) return;
    
    if (!groupedByDate[item.TanggalGroup]) {
      groupedByDate[item.TanggalGroup] = {
        tanggal: item.TanggalGroup,
        accounts: {},
        total: {
          GMV: 0,
          Ord: 0,
          CO: 0,
          Act: 0,
          View: 0,
          Viewer: 0,
          Like: 0,
          Comnt: 0,
          Shere: 0,
          sessions: 0
        }
      };
    }
    
    const dateGroup = groupedByDate[item.TanggalGroup];
    
    // Initialize account if not exists
    if (!dateGroup.accounts[item.Nama]) {
      dateGroup.accounts[item.Nama] = {
        GMV: 0,
        Ord: 0,
        CO: 0,
        Act: 0,
        View: 0,
        Viewer: 0,
        Like: 0,
        Comnt: 0,
        Shere: 0,
        sessions: 0
      };
    }
    
    const accountData = dateGroup.accounts[item.Nama];
    
    // Add to account totals
    accountData.GMV += item.GMV;
    accountData.Ord += item.Ord;
    accountData.CO += item.CO;
    accountData.Act += item.Act;
    accountData.View += item.View;
    accountData.Viewer += item.Viewer;
    accountData.Like += item.Like;
    accountData.Comnt += item.Comnt;
    accountData.Shere += item.Shere;
    accountData.sessions += 1;
    
    // Add to date totals
    dateGroup.total.GMV += item.GMV;
    dateGroup.total.Ord += item.Ord;
    dateGroup.total.CO += item.CO;
    dateGroup.total.Act += item.Act;
    dateGroup.total.View += item.View;
    dateGroup.total.Viewer += item.Viewer;
    dateGroup.total.Like += item.Like;
    dateGroup.total.Comnt += item.Comnt;
    dateGroup.total.Shere += item.Shere;
    dateGroup.total.sessions += 1;
  });
  
  // Convert to array format
  return Object.values(groupedByDate).sort((a, b) => 
    new Date(b.tanggal) - new Date(a.tanggal)
  );
}





// API functions
async function getShopeeSessions(cookieString, pageSize = 10) {
  const url =
    "https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/sessionList";
  const cookies = parseCookies(cookieString);

  try {
    const response = await axios.get(url, {
      params: {
        page: 1,
        pageSize,
        name: "",
        orderBy: "",
        sort: "",
      },
      headers: getShopeeHeaders(cookies),
    });

    return response.data?.data || {};
  } catch (error) {
    console.error("Error in getShopeeSessions:", error);
    return {};
  }
}

async function getDataLive(sessionId, cookieString) {
  const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/overview?sessionId=${sessionId}`;
  const cookies = parseCookies(cookieString);

  try {
    const response = await axios.get(url, {
      headers: {
        ...getShopeeHeaders(cookies),
        referer: `https://creator.shopee.co.id/dashboard/live/${sessionId}`,
        "x-traceid": "xZjw5nFdHNhd7jvSVhKHl",
      },
    });

    return response.data || {};
  } catch (error) {
    console.error("Error in getDataLive:", error);
    return {};
  }
}

async function getDataSession(sessionId, cookieString) {
  const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/sessionInfo?sessionId=${sessionId}`;
  const cookies = parseCookies(cookieString);

  try {
    const response = await axios.get(url, {
      headers: getShopeeHeaders(cookies),
    });

    return response.data || {};
  } catch (error) {
    console.error("Error in getDataSession:", error);
    return {};
  }
}

async function getViolationsData(sessionId, cookieString) {
  const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/violations?limit=100&sessionId=${sessionId}`;
  const cookies = parseCookies(cookieString);

  try {
    const response = await axios.get(url, {
      headers: {
        ...getShopeeHeaders(cookies),
        referer: `https://creator.shopee.co.id/dashboard/live/${sessionId}`,
        "x-traceid": generateTraceId(),
      },
    });

    const dataList = response.data?.data?.dataList || [];
    return {
      JumlahPelanggaran: dataList.length,
      JudulPelanggaran: dataList.map((item) => item.title || "Unknown"),
    };
  } catch (error) {
    console.error("Error in getViolationsData:", error);
    return {
      JumlahPelanggaran: 0,
      JudulPelanggaran: [],
    };
  }
}

function generateTraceId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

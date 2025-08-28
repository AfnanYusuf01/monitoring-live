// controllers/HistoriLiveController.js
import axios from "axios";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

// Helper functions
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
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

// Main controller
export const getLiveHistory = async (req, res) => {
  try {
    const {accountId} = req.body;

    if (!accountId) {
      return res.status(400).json({error: "Account ID is required"});
    }
    const userId = req.session.user.id;


    // Get account from database
    const account = await prisma.akun.findUnique({
      where: {id: parseInt(accountId)},
    });

    if (!account || !account.cookie) {
      return res
        .status(404)
        .json({error: "Account not found or invalid cookie"});
    }

    // Get initial session data to determine total count
    const initialSessionData = await getShopeeSessions(account.cookie);
    if (!initialSessionData?.total) {
      return res.json([]);
    }

    // Get all sessions with total count as pageSize
    const allSessionsData = await getShopeeSessions(
      account.cookie,
      initialSessionData.total
    );

    if (!allSessionsData?.list?.length) {
      return res.json([]);
    }

    // Process each session to get detailed data
    const historyResults = [];

    for (const session of allSessionsData.list) {
      try {
        const sessionId = session.sessionId;

        // Get all data in parallel
        const [liveData, sessionInfo, violations] = await Promise.all([
          getDataLive(sessionId, account.cookie),
          getDataSession(sessionId, account.cookie),
          getViolationsData(sessionId, account.cookie),
        ]);

        // Extract data with proper fallbacks
        const mainData = liveData?.data || {};
        const engagementData = mainData.engagementData || {};
        const sessionDetail = sessionInfo?.data || {};

        // Format the result object to match VB.NET output
        const result = {
          No: historyResults.length + 1,
          Nama: account.nama_akun,
          Session: sessionId,
          GMV: formatRupiah(mainData.placedGmv || 0),
          Ord: mainData.placedOrder || 0,
          CO: mainData.confirmedItemsSold || 0,
          Act: mainData.atc || 0,
          View: mainData.views || 0,
          Viewer: mainData.ccu || 0,
          Like: engagementData.likes || 0,
          Comnt: engagementData.comments || 0,
          Shere: engagementData.shares || 0,
          Tanggal: sessionDetail.lsStartTime
            ? new Date(sessionDetail.lsStartTime).toISOString()
            : null,
          Durasi: sessionDetail.lsStartTime
            ? formatDuration(sessionDetail.lsStartTime)
            : "00:00:00",
          Status: getStatusText(mainData.status),

          // ✅ jadikan object bukan string
          Pelanggaran: {
            jumlah: violations?.JumlahPelanggaran || 0,
            judul: violations?.JudulPelanggaran || [],
          },
        };

        historyResults.push(result);
      } catch (error) {
        console.error(`Error processing session ${session.sessionId}:`, error);
        // Continue with next session even if one fails
      }
    }

    return res.json(historyResults);
  } catch (error) {
    console.error("Error in getLiveHistory:", error);
    return res.status(500).json({
      error: "Failed to get live history",
      detail: error.message,
    });
  }
};

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

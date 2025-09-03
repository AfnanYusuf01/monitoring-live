import {PrismaClient} from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// ================= Helper Functions =================
async function getShopeeSessionId(cookieString) {
  try {
    const cookies = cookieString
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");
      

    const params = {page: 1, pageSize: 10, name: "", orderBy: "", sort: ""};

    const headers = {
      accept: "application/json",
      "content-type": "application/json",
      "accept-language":
        "en-GB,en;q=0.9,ar;q=0.8,id;q=0.7,en-US;q=0.6,ms;q=0.5",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
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
      "x-env": "live",
      "x-region": "id",
      "x-region-domain": "co.id",
      "x-region-timezone": "+0700",
      cookie: cookies,
    };

    const response = await axios.get(
      "https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/sessionList",
      {params, headers}
    );

    const sessions = response.data?.data?.list;
    if (!sessions || sessions.length === 0) return null;

    let latestSessionId = null;
    let maxStartTime = Number.MIN_SAFE_INTEGER;

    sessions.forEach((session) => {
      const startTime = Number(session.startTime);
      if (startTime > maxStartTime) {
        maxStartTime = startTime;
        latestSessionId = session.sessionId;
      }
    });

    return latestSessionId;
  } catch (err) {
    console.error("getShopeeSessionId error:", err.message);
    return null;
  }
}

async function getDataLive(sessionId, cookieString) {
  try {
    const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/overview?sessionId=${sessionId}`;
    const cookies = cookieString
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");

    const headers = {
      accept: "application/json",
      "accept-language":
        "en-GB,en;q=0.9,ar;q=0.8,id;q=0.7,en-US;q=0.6,ms;q=0.5",
      "content-type": "application/json",
      language: "en",
      priority: "u=1, i",
      referer: `https://creator.shopee.co.id/dashboard/live/${sessionId}`,
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
      "x-traceid": "xZjw5nFdHNhd7jvSVhKHl",
      cookie: cookies,
    };

    const response = await axios.get(url, {headers});
    return response.status === 200 ? response.data : null;
  } catch (err) {
    console.error("getDataLive error:", err.message);
    return null;
  }
}

async function getDataSession(sessionId, cookieString) {
  try {
    const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/sessionInfo?sessionId=${sessionId}`;
    const cookies = cookieString
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");

    const headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/json",
      language: "en",
      priority: "u=1, i",
      referer: `https://creator.shopee.co.id/dashboard/live/${sessionId}`,
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
      "x-traceid": "iCQTOun0YpKvj6DOrTbe-",
      cookie: cookies,
    };

    const response = await axios.get(url, {headers});
    return response.status === 200 ? response.data : null;
  } catch (err) {
    console.error("getDataSession error:", err.message);
    return null;
  }
}

class ViolationsResult {
  constructor() {
    this.jumlahPelanggaran = 0;
    this.judulPelanggaran = [];
  }
}

async function getViolationsData(sessionId, cookieString) {
  try {
    const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/violations?limit=100&sessionId=${sessionId}`;
    const cookies = cookieString
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");

    const headers = {
      accept: "application/json",
      "accept-language":
        "en-GB,en;q=0.9,ar;q=0.8,id;q=0.7,en-US;q=0.6,ms;q=0.5",
      "content-type": "application/json",
      dnt: "1",
      language: "en",
      priority: "u=1, i",
      referer: `https://creator.shopee.co.id/dashboard/live/${sessionId}`,
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
      "x-traceid": Math.random().toString(36).substring(2, 24),
      cookie: cookies,
    };

    const response = await axios.get(url, {headers});
    const result = new ViolationsResult();
    if (response.status === 200) {
      const dataList = response.data?.data?.dataList || [];
      result.jumlahPelanggaran = dataList.length;
      result.judulPelanggaran = dataList.map((item) => item.title);
    }
    return result;
  } catch (err) {
    console.error("getViolationsData error:", err.message);
    return new ViolationsResult();
  }
}

// ================= Controller =================
export async function getShopeeData(req, res) {
  try {
    const userId = req.session.user.id;

    const akunList = await prisma.akun.findMany({
      where: {
         deletedAt: null,
        userId: userId,
      },
    });

    const resultArray = [];

    for (const akun of akunList) {
      const cookie = akun.cookie;
      const sessionId = await getShopeeSessionId(cookie);
      if (!sessionId) continue;

      const liveData = await getDataLive(sessionId, cookie);
      const sessionInfo = await getDataSession(sessionId, cookie);
      const violations = await getViolationsData(sessionId, cookie);

      if (!liveData || !sessionInfo) continue;

      const sessionData = sessionInfo.data;
      const dataToken = liveData.data;

      if (!dataToken) continue;

      const engagement = dataToken.engagementData || {};
      const views = Number(dataToken.views) || 0;
      const placedGmv = Number(dataToken.placedGmv) || 0;
      const pesanan = Number(dataToken.placedOrder) || 0;
      const ditonton = Number(dataToken.ccu) || 0;
      const comments = Number(engagement.comments) || 0;
      const atc = Number(dataToken.atc) || 0;
      const confirmedItemSold = Number(dataToken.confirmedItemsSold) || 0;
      const likes = Number(engagement.likes) || 0;
      const shares = Number(engagement.shares) || 0;
      const status = Number(dataToken.status) || 0;
      const statusText =
        status === 1
          ? "Sedang Live"
          : status === 2
          ? "Tidak Live"
          : "Status Tidak Diketahui";

      const startTimeUnix = Number(sessionData.lsStartTime) || Date.now();
      const startTime = new Date(startTimeUnix);
      let durasi;
      if (sessionData.lsEndTime) {
        const endTime = new Date(Number(sessionData.lsEndTime));
        durasi = new Date(endTime - startTime);
      } else {
        durasi = new Date(Date.now() - startTime);
      }

      const durasiFormatted = `${String(Math.floor(durasi / 3600000)).padStart(
        2,
        "0"
      )}:${String(Math.floor((durasi % 3600000) / 60000)).padStart(
        2,
        "0"
      )}:${String(Math.floor((durasi % 60000) / 1000)).padStart(2, "0")}`;

      // ✅ bentuk pelanggaran jadi object
      const pelanggaran = {
        jumlah: violations.jumlahPelanggaran || 0,
        judul: violations.judulPelanggaran || [],
      };

      resultArray.push({
        nama: akun.nama_akun,
        placedGmv: placedGmv.toLocaleString("id-ID", {
          style: "currency",
          currency: "IDR",
        }),
        pesanan,
        confirmedItemSold,
        atc,
        views,
        ditonton,
        likes,
        comments,
        shares,
        durasiFormatted,
        statusText,
        pelanggaran, // ✅ simpan object, bukan string
      });
    }

    res.json(resultArray);
  } catch (err) {
    console.error("getShopeeData error:", err.message);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
}


// ================== Function reusable ==================
export async function getShopeeDataByAkunList(akunList) {
  const resultArray = [];

  for (const akun of akunList) {
    const cookie = akun.cookie;
    const sessionId = await getShopeeSessionId(cookie);
    if (!sessionId) continue;

    const liveData = await getDataLive(sessionId, cookie);
    const sessionInfo = await getDataSession(sessionId, cookie);
    const violations = await getViolationsData(sessionId, cookie);

    if (!liveData || !sessionInfo) continue;

    const sessionData = sessionInfo.data;
    const dataToken = liveData.data;
    if (!dataToken) continue;

    const engagement = dataToken.engagementData || {};
    const views = Number(dataToken.views) || 0;
    const placedGmv = Number(dataToken.placedGmv) || 0;
    const pesanan = Number(dataToken.placedOrder) || 0;
    const ditonton = Number(dataToken.ccu) || 0;
    const comments = Number(engagement.comments) || 0;
    const atc = Number(dataToken.atc) || 0;
    const confirmedItemSold = Number(dataToken.confirmedItemsSold) || 0;
    const likes = Number(engagement.likes) || 0;
    const shares = Number(engagement.shares) || 0;
    const status = Number(dataToken.status) || 0;
    const statusText =
      status === 1
        ? "Sedang Live"
        : status === 2
        ? "Tidak Live"
        : "Status Tidak Diketahui";

    const startTimeUnix = Number(sessionData.lsStartTime) || Date.now();
    const startTime = new Date(startTimeUnix);
    let durasi;
    if (sessionData.lsEndTime) {
      const endTime = new Date(Number(sessionData.lsEndTime));
      durasi = new Date(endTime - startTime);
    } else {
      durasi = new Date(Date.now() - startTime);
    }

    const durasiFormatted = `${String(Math.floor(durasi / 3600000)).padStart(
      2,
      "0"
    )}:${String(Math.floor((durasi % 3600000) / 60000)).padStart(
      2,
      "0"
    )}:${String(Math.floor((durasi % 60000) / 1000)).padStart(2, "0")}`;

    // ✅ bentuk pelanggaran jadi object
    const pelanggaran = {
      jumlah: violations.jumlahPelanggaran || 0,
      judul: violations.judulPelanggaran || [],
    };

    resultArray.push({
      nama: akun.nama_akun,
      placedGmv: placedGmv.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
      }),
      pesanan,
      confirmedItemSold,
      atc,
      views,
      ditonton,
      likes,
      comments,
      shares,
      durasiFormatted,
      statusText,
      pelanggaran,
    });
  }

  return resultArray;
}

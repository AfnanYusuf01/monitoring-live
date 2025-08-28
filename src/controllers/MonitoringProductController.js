import {PrismaClient} from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// ================= Helper Functions =================
const formatRupiah = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const generateTraceId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

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

async function getProductList(sessionId, cookieString, pageSize = 10) {
  try {
    const url = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/productList?sessionId=${sessionId}&productName=&productListTimeRange=0&productListOrderBy=productClicks&sort=desc&page=1&pageSize=${pageSize}`;

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
      "x-traceid": generateTraceId(),
      cookie: cookies,
    };

    const response = await axios.get(url, {headers});
    return response.status === 200 ? response.data : null;
  } catch (err) {
    console.error("getProductList error:", err.message);
    return null;
  }
}

// ================= Controller =================
export async function getShopeeProducts(req, res) {
  try {
    const {accountId} = req.body;

    if (!accountId) {
      return res.status(400).json({error: "Account ID is required"});
    }

    // Get account from database
    const account = await prisma.akun.findUnique({
      where: {id: parseInt(accountId)},
    });

    if (!account) {
      return res.status(404).json({error: "Account not found"});
    }

    if (!account.cookie) {
      return res.status(400).json({error: "Cookie not found for this account"});
    }
    //console.log(account.cookie); 

    // Get session ID
    const sessionId = await getShopeeSessionId(account.cookie);
    //console.log(sessionId);
    if (!sessionId) {
      return res.status(404).json({error: "No active session found"});
    }

    // Get initial product data to determine total count
    const initialData = await getProductList(sessionId, account.cookie);
    //console.log("inisialdat"+initialData);
    if (!initialData?.data?.total) {
      return res.status(404).json({error: "No product data available"});
    }

    // Get all product data
    const productData = await getProductList(
      sessionId,
      account.cookie,
      initialData.data.total
    );
    const productList = productData?.data?.list || [];

    // Transform data
    const transformedData = productList.map((product) => ({
      namaProduk: product.title,
      hargaMin: formatRupiah(product.minPrice),
      hargaMax: formatRupiah(product.maxPrice),
      klik: product.productClicks,
      ctr: product.ctr,
      act: product.atc,
      order: product.ordersCreated,
      revenue: formatRupiah(product.revenue),
      item: product.itemSold,
      cor: product.cor,
      confOrder: product.confirmedOrderCnt,
      confRev: formatRupiah(product.confirmedRevenue),
      confItem: product.confirmedItemSold,
      status: product.ordersCreated > 0 ? "Laris" : "Sepi",
    }));

    res.json({
      success: true,
      accountName: account.nama_akun,
      sessionId: sessionId,
      totalProducts: productList.length,
      products: transformedData,
    });
  } catch (err) {
    console.error("getShopeeProducts error:", err.message);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}

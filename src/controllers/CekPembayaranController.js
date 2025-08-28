import {PrismaClient} from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// Helper function to convert date to UNIX timestamp
function dateToUnixTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}

// Helper function to format currency as Rupiah
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Helper function to convert UNIX timestamp to readable date
function unixToDateTime(unixTimestamp) {
  return new Date(unixTimestamp * 1000).toISOString();
}

export const getDataPembayaran = async (req, res) => {
  try {
    const {tglMulai, tglSelesai, status} = req.body;

    const parsedStatus = status !== undefined && status !== null ? Number(status) : null;

    // Validate required parameters
    if (!tglMulai || !tglSelesai) {
      return res.status(400).json({
        error: "Parameter tglMulai dan tglSelesai harus diisi",
      });
    }

    // Convert dates to UNIX timestamps
    const unixMulai = dateToUnixTimestamp(new Date(tglMulai));
    const unixSelesai = dateToUnixTimestamp(new Date(tglSelesai));

    // Get all accounts from database
    const userId = req.session.user.id;

    const accounts = await prisma.akun.findMany({
      where: {
        userId: userId,
      },
    });


    const results = [];

    // Process each account
    for (const account of accounts) {
      try {
        const cookieString = account.cookie;

        // Call GetBillingList API
        const url = `https://affiliate.shopee.co.id/api/v1/payment/billing_list?order_completed_start_time=${unixMulai}&order_completed_end_time=${unixSelesai}&version=1`;

        const cookieArray = cookieString.split(";").map((c) => c.trim());
        const cookies = cookieArray.join("; ");

        const response = await axios.get(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "affiliate-program-type": "1",
            priority: "u=1, i",
            referer: "https://affiliate.shopee.co.id/payment/billing",
            "sec-ch-ua":
              '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            cookie: cookies,
          },
        });

        const result = response.data;
        //console.log("ini params : " + JSON.stringify(result));


        if (result && result.code === 0) {
          // Process each item in the list
          for (const item of result.data.list) {
            // If status is not provided, include all items
            // If status is provided, only include matching items
              if (
                parsedStatus === null ||
                item.payment_status === parsedStatus
              ) {
              // Convert payment status code to text
              let payment_status = "";
              switch (item.payment_status) {
                case 4:
                  payment_status = "Sudah Dibayar";
                  break;
                case 10:
                  payment_status = "Menunggu Pembayaran";
                  break;
                case 9:
                  payment_status = "Sedang Divalidasi";
                  break;
                default:
                  payment_status = `Status Tidak Dikenal (${item.payment_status})`;
              }

              // Convert payment channel to text
              let payment_channel = "-";
              if (
                item.payment_channel !== undefined &&
                item.payment_channel !== null
              ) {
                switch (item.payment_channel) {
                  case 1:
                    payment_channel = "ShopeePay";
                    break;
                  case 2:
                    payment_channel = "Transfer Bank";
                    break;
                  // Case 0 will show as "-"
                }
              }

              // Convert UNIX timestamps to readable dates
              const validation_review_time =
                item.validation_review_time !== "0"
                  ? unixToDateTime(item.validation_review_time)
                  : "";

              const order_completed_period_end_time =
                item.order_completed_period_end_time !== "0"
                  ? unixToDateTime(item.order_completed_period_end_time)
                  : "";

              let payment_time = "";
              if (item.payment_time !== "0") {
                if (item.payment_time.toString().length === 8) {
                  // Handle as YYYYMMDD format
                  const year = parseInt(
                    item.payment_time.toString().substring(0, 4)
                  );
                  const month =
                    parseInt(item.payment_time.toString().substring(4, 2)) - 1;
                  const day = parseInt(
                    item.payment_time.toString().substring(6, 2)
                  );
                  payment_time = new Date(year, month, day).toISOString();
                } else {
                  // Assume it's a UNIX timestamp
                  payment_time = unixToDateTime(item.payment_time);
                }
              }

              // Add to results
              results.push({
                nama_akun: account.nama_akun,
                validation_id: item.validation_id,
                total_payment_amount_dis: formatRupiah(
                  item.total_payment_amount_dis
                ),
                payment_status: payment_status,
                payment_channel: payment_channel,
                validation_review_time: validation_review_time,
                order_completed_period_end_time:
                  order_completed_period_end_time,
                payment_time: payment_time,
              });
            }
          }
        }
      } catch (error) {
        console.error(
          `Error processing account ${account.nama_akun}:`,
          error.message
        );
        // Continue with next account even if one fails
      }
    }
    // //console.log(results);

    return res.json(results);
  } catch (error) {
    console.error("Error in getDataPembayaran:", error.message);
    return res.status(500).json({
      error: "Gagal mengambil data pembayaran",
      detail: error.message,
    });
  }
};
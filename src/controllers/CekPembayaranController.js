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
    const { tglMulai, tglSelesai, status } = req.body;
    const { id_studio } = req.params;
    const parsedStatus = status !== undefined && status !== null ? Number(status) : null;

    if (!tglMulai || !tglSelesai) {
      return res.status(400).json({
        error: "Parameter tglMulai dan tglSelesai harus diisi",
      });
    }

    const unixMulai = dateToUnixTimestamp(new Date(tglMulai));
    const unixSelesai = dateToUnixTimestamp(new Date(tglSelesai));
    const userId = req.session.user.id;
    
    console.log(`Mengambil akun untuk studio ID: ${id_studio} dan user ID: ${userId}`);
    
    const accounts = await prisma.akun.findMany({
      where: { 
        userId: userId,
        studioId: parseInt(id_studio),
        deletedAt: null,
      },
    });
    
    console.log(`Jumlah akun ditemukan di studio ${id_studio}: ${accounts.length}`);

    const results = [];
    const errors = [];
    
    // PERBAIKAN: Gunakan number untuk summary
    const summary = {
      totalKomisi: 0,
      statusCount: {
        'Sudah Dibayar': 0,
        'Menunggu Pembayaran': 0,
        'Sedang Divalidasi': 0,
        'Status Tidak Dikenal': 0
      }
    };

    for (const account of accounts) {
      try {
        console.log(`Memproses akun: ${account.nama_akun}`);
        
        const cookieString = account.cookie;
        
        if (!cookieString || cookieString.trim() === '') {
          console.log(`Akun ${account.nama_akun} tidak memiliki cookie`);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: "Cookie tidak ditemukan atau kosong" }
          });
          continue;
        }

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
            "sec-ch-ua": '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            cookie: cookies,
          },
          timeout: 30000,
        });

        const result = response.data;
        console.log(`Response dari ${account.nama_akun}:`, JSON.stringify(result, null, 2));

        if (result && result.code !== 0) {
          console.log(`Error dari API untuk akun ${account.nama_akun}:`, result.msg);
          errors.push({
            nama_akun: account.nama_akun,
            error: {
              code: result.code,
              msg: result.msg,
              data: result.data
            }
          });
          continue;
        }

        if (!result.data || !result.data.list) {
          console.log(`Tidak ada data untuk akun ${account.nama_akun}`);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: "Tidak ada data pembayaran" }
          });
          continue;
        }

        console.log(`Memproses ${result.data.list.length} item untuk akun ${account.nama_akun}`);
        for (const item of result.data.list) {
          if (parsedStatus === null || item.payment_status === parsedStatus) {
            let payment_status = "";
            switch (item.payment_status) {
              case 4: payment_status = "Sudah Dibayar"; break;
              case 10: payment_status = "Menunggu Pembayaran"; break;
              case 9: payment_status = "Sedang Divalidasi"; break;
              default: payment_status = `Status Tidak Dikenal (${item.payment_status})`;
            }

            let payment_channel = "-";
            if (item.payment_channel !== undefined && item.payment_channel !== null) {
              switch (item.payment_channel) {
                case 1: payment_channel = "ShopeePay"; break;
                case 2: payment_channel = "Transfer Bank"; break;
              }
            }

            const validation_review_time = item.validation_review_time !== "0" 
              ? unixToDateTime(item.validation_review_time) : "";

            const order_completed_period_end_time = item.order_completed_period_end_time !== "0" 
              ? unixToDateTime(item.order_completed_period_end_time) : "";

            let payment_time = "";
            if (item.payment_time !== "0") {
              if (item.payment_time.toString().length === 8) {
                const year = parseInt(item.payment_time.toString().substring(0, 4));
                const month = parseInt(item.payment_time.toString().substring(4, 6)) - 1;
                const day = parseInt(item.payment_time.toString().substring(6, 8));
                payment_time = new Date(year, month, day).toISOString();
              } else {
                payment_time = unixToDateTime(item.payment_time);
              }
            }

            // PERBAIKAN: Konversi ke number sebelum menambahkan
            const amount = Number(item.total_payment_amount_dis) || 0;
            summary.totalKomisi += amount;
            
            if (payment_status.includes("Sudah Dibayar")) {
              summary.statusCount['Sudah Dibayar']++;
            } else if (payment_status.includes("Menunggu Pembayaran")) {
              summary.statusCount['Menunggu Pembayaran']++;
            } else if (payment_status.includes("Sedang Divalidasi")) {
              summary.statusCount['Sedang Divalidasi']++;
            } else {
              summary.statusCount['Status Tidak Dikenal']++;
            }

            results.push({
              nama_akun: account.nama_akun,
              validation_id: item.validation_id,
              total_payment_amount_dis: formatRupiah(amount), // Gunakan amount yang sudah dikonversi
              payment_status: payment_status,
              payment_channel: payment_channel,
              validation_review_time: validation_review_time,
              order_completed_period_end_time: order_completed_period_end_time,
              payment_time: payment_time,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing account ${account.nama_akun}:`, error.message);
        
        if (error.response && error.response.data) {
          console.error(`Response error untuk ${account.nama_akun}:`, error.response.data);
          errors.push({
            nama_akun: account.nama_akun,
            error: error.response.data
          });
        } else if (error.code === 'ECONNABORTED') {
          console.error(`Timeout untuk akun ${account.nama_akun}`);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: "Timeout: Koneksi terlalu lama" }
          });
        } else {
          console.error(`Unknown error untuk ${account.nama_akun}:`, error.message);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: error.message }
          });
        }
      }
    }

    console.log(`Total hasil: ${results.length} item`);
    console.log(`Total error: ${errors.length} akun`);
    console.log(`Summary:`, summary);
    
    return res.json({
      success: errors.length === 0,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: summary
    });
  } catch (error) {
    console.error("Error in getDataPembayaran:", error.message);
    return res.status(500).json({
      error: "Gagal mengambil data pembayaran",
      detail: error.message,
    });
  }
};

export const getDataPembayaranStudio = async (req, res) => {
  try {
    // Menentukan tanggal 7 hari terakhir
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // Format tanggal untuk logging
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    console.log(`Mengambil data pembayaran 7 hari terakhir: ${formatDate(startDate)} hingga ${formatDate(endDate)}`);
    
    // Get user ID from session
    const userId = req.session.user.id;
    
    // Get all studios and their accounts
    const studios = await prisma.studio.findMany({
      where: { 
        userId: userId,
      },
      include: {
        akun: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            nama_akun: true,
          }
        }
      }
    });
    
    console.log(`Jumlah studio ditemukan: ${studios.length}`);
    
    const results = [];
    const errors = [];

    // Fungsi untuk mengonversi string currency ke number
    const parseCurrency = (currencyString) => {
      if (!currencyString || typeof currencyString !== 'string') return 0;
      
      // Hapus karakter non-digit kecuali koma dan titik
      const numericString = currencyString
        .replace(/Rp\s?/g, '') // Hapus "Rp" dan spasi setelahnya
        .replace(/[^\d,.]/g, '') // Hapus karakter non-digit kecuali koma dan titik
        .replace(/\./g, '') // Hapus titik (pemisah ribuan)
        .replace(/,/g, '.'); // Ganti koma dengan titik untuk decimal
      
      return parseFloat(numericString) || 0;
    };

    // Process each studio
    for (const studio of studios) {
      try {
        console.log(`Memproses data untuk studio: ${studio.nama_studio}`);
        console.log(`Jumlah akun dalam studio: ${studio.akun.length}`);
        
        // Skip studio tanpa akun
        if (studio.akun.length === 0) {
          console.log(`Studio ${studio.nama_studio} tidak memiliki akun, dilewati`);
          continue;
        }
        
        // Get account IDs for this studio
        const accountIds = studio.akun.map(account => account.id);
        
        // Get payment data for all accounts in this studio
        const pembayaranData = await prisma.pembayaran.findMany({
          where: {
            akunId: { in: accountIds },
            order_completed_period_end_time: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            order_completed_period_end_time: 'desc'
          }
        });


        console.log(`Ditemukan ${pembayaranData.length} data pembayaran untuk studio ${studio.nama_studio}`);

        // Initialize summary counters
        let totalKomisi = 0;
        const statusCounts = {}; // Objek untuk menghitung jumlah per status
        
        const details = [];

        // Process each payment item
        for (const item of pembayaranData) {
          // Find the account name
          const account = studio.akun.find(acc => acc.id === item.akunId);
          
          // Parse currency value
          const amount = parseCurrency(item.total_payment_amount_dis);
          
          // Inisialisasi counter untuk status ini jika belum ada
          if (!statusCounts[item.payment_status]) {
            statusCounts[item.payment_status] = 0;
          }
          statusCounts[item.payment_status]++;
          
          // Add to details
          details.push({
            nama_akun: account?.nama_akun || "Tidak Diketahui",
            validation_id: item.validation_id,
            total_payment_amount_dis: item.total_payment_amount_dis,
            amount_numeric: amount, // Tambahkan nilai numerik untuk debugging
            payment_status: item.payment_status,
            payment_channel: item.payment_channel,
            validation_review_time: item.validation_review_time ? item.validation_review_time.toISOString() : "",
            order_completed_period_end_time: item.order_completed_period_end_time ? item.order_completed_period_end_time.toISOString() : "",
            payment_time: item.payment_time ? item.payment_time.toISOString() : "",
          });
          
          // Update summary counters berdasarkan status pembayaran
          // if (item.payment_status === "Sudah Dibayar" || item.payment_status === "SUCCESS" || item.payment_status === "PAID") {
            totalKomisi += amount;
          // }
        }

        // Add studio summary to results
        results.push({
          studio_id: studio.id,
          nama_studio: studio.nama_studio,
          jumlah_akun: studio.akun.length,
          total_komisi: totalKomisi,
          status_counts: statusCounts, // Menggunakan objek status_counts yang dinamis
          total_transaksi: pembayaranData.length,
          details: details
        });

      } catch (error) {
        console.error(`Error processing studio ${studio.nama_studio}:`, error.message);
        errors.push({
          studio_id: studio.id,
          nama_studio: studio.nama_studio,
          error: { msg: error.message }
        });
      }
    }

    console.log(`Total studio berhasil diproses: ${results.length}`);
    console.log(`Total error: ${errors.length} studio`);
    
    // Return both results and errors
    return res.json({
      success: errors.length === 0,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error in getDataPembayaran:", error.message);
    return res.status(500).json({
      error: "Gagal mengambil data pembayaran",
      detail: error.message,
    });
  }
};

// Helper function to convert status code to text
function getStatusText(statusCode) {
  switch (statusCode) {
    case 4: return "Sudah Dibayar";
    case 10: return "Menunggu Pembayaran";
    case 9: return "Sedang Divalidasi";
    default: return `Status Tidak Dikenal (${statusCode})`;
  }
}


export const postDataPembayaran = async (req, res) => {
  try {
    const { status } = req.body;
    const parsedStatus = status !== undefined && status !== null ? Number(status) : null;

    // Set fixed dates
    const tglMulai = "2023-01-01"; // Tanggal mulai fixed
    const tglSelesai = new Date().toISOString().split('T')[0]; // Tanggal selesai sekarang

    console.log(`Rentang tanggal: ${tglMulai} hingga ${tglSelesai}`);

    // Convert dates to UNIX timestamps
    const unixMulai = dateToUnixTimestamp(new Date(tglMulai));
    const unixSelesai = dateToUnixTimestamp(new Date(tglSelesai));

    // Get all accounts from database
    const userId = req.session.user.id;
    
    console.log(`Mengambil akun untuk user ID: ${userId}`);
    const accounts = await prisma.akun.findMany({
      where: { 
        userId: userId,
        deletedAt: null,
      },
    });
    
    console.log(`Jumlah akun ditemukan: ${accounts.length}`);
    accounts.forEach(account => {
      console.log(`- ${account.nama_akun} (ID: ${account.id})`);
    });

    const results = [];
    const errors = [];

    // Process each account
    for (const account of accounts) {
      try {
        console.log(`Memproses akun: ${account.nama_akun}`);
        
        const cookieString = account.cookie;
        
        // Check if cookie is valid
        if (!cookieString || cookieString.trim() === '') {
          console.log(`Akun ${account.nama_akun} tidak memiliki cookie`);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: "Cookie tidak ditemukan atau kosong" }
          });
          continue;
        }

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
            "sec-ch-ua": '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            cookie: cookies,
          },
          timeout: 30000, // Timeout 30 detik
        });

        const result = response.data;
        console.log(`Response dari ${account.nama_akun}:`, JSON.stringify(result, null, 2));

        // Check if API response contains error
        if (result && result.code !== 0) {
          console.log(`Error dari API untuk akun ${account.nama_akun}:`, result.msg);
          errors.push({
            nama_akun: account.nama_akun,
            error: {
              code: result.code,
              msg: result.msg,
              data: result.data
            }
          });
          continue; // Skip processing this account
        }

        // Check if data exists
        if (!result.data || !result.data.list) {
          console.log(`Tidak ada data untuk akun ${account.nama_akun}`);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: "Tidak ada data pembayaran" }
          });
          continue;
        }

        // Get existing validation_ids for this account
        const existingValidationIds = await prisma.pembayaran.findMany({
          where: {
            akunId: account.id,
            // Tidak perlu filter tanggal karena kita ingin cek semua data yang ada
          },
          select: {
            validation_id: true
          }
        });

        const existingIdsSet = new Set(existingValidationIds.map(item => item.validation_id));
        const newData = [];
        const updateData = [];

        // Process each item in the list
        console.log(`Memproses ${result.data.list.length} item untuk akun ${account.nama_akun}`);
        for (const item of result.data.list) {
          if (parsedStatus === null || item.payment_status === parsedStatus) {
            // Convert payment status code to text
            let payment_status = "";
            switch (item.payment_status) {
              case 4: payment_status = "Sudah Dibayar"; break;
              case 10: payment_status = "Menunggu Pembayaran"; break;
              case 9: payment_status = "Sedang Divalidasi"; break;
              default: payment_status = `Status Tidak Dikenal (${item.payment_status})`;
            }

            // Convert payment channel to text
            let payment_channel = "-";
            if (item.payment_channel !== undefined && item.payment_channel !== null) {
              switch (item.payment_channel) {
                case 1: payment_channel = "ShopeePay"; break;
                case 2: payment_channel = "Transfer Bank"; break;
              }
            }

            // Convert UNIX timestamps to readable dates
            const validation_review_time = item.validation_review_time !== "0" 
              ? unixToDateTime(item.validation_review_time) : "";

            const order_completed_period_end_time = item.order_completed_period_end_time !== "0" 
              ? unixToDateTime(item.order_completed_period_end_time) : "";

            let payment_time = "";
            if (item.payment_time !== "0") {
              if (item.payment_time.toString().length === 8) {
                const year = parseInt(item.payment_time.toString().substring(0, 4));
                const month = parseInt(item.payment_time.toString().substring(4, 6)) - 1;
                const day = parseInt(item.payment_time.toString().substring(6, 8));
                payment_time = new Date(year, month, day).toISOString();
              } else {
                payment_time = unixToDateTime(item.payment_time);
              }
            }

            const paymentData = {
              nama_akun: account.nama_akun,
              validation_id: item.validation_id,
              total_payment_amount_dis: formatRupiah(item.total_payment_amount_dis),
              payment_status: payment_status,
              payment_channel: payment_channel,
              validation_review_time: validation_review_time ? new Date(validation_review_time) : null,
              order_completed_period_end_time: order_completed_period_end_time ? new Date(order_completed_period_end_time) : null,
              payment_time: payment_time ? new Date(payment_time) : null,
            };

            // Add to results for API response
            results.push(paymentData);

            // Check if data already exists
            if (existingIdsSet.has(item.validation_id)) {
              updateData.push(paymentData);
            } else {
              newData.push({
                ...paymentData,
                akunId: account.id
              });
            }
          }
        }

        // Save to database in transaction
        if (newData.length > 0 || updateData.length > 0) {
          await prisma.$transaction(async (tx) => {
            // Insert new data
            if (newData.length > 0) {
              console.log(`Menambahkan ${newData.length} data baru untuk akun ${account.nama_akun}`);
              for (const data of newData) {
                await tx.pembayaran.create({
                  data: data
                });
              }
            }

            // Update existing data
            if (updateData.length > 0) {
              console.log(`Memperbarui ${updateData.length} data untuk akun ${account.nama_akun}`);
              for (const data of updateData) {
                await tx.pembayaran.update({
                  where: {
                    validation_id: data.validation_id
                  },
                  data: {
                    total_payment_amount_dis: data.total_payment_amount_dis,
                    payment_status: data.payment_status,
                    payment_channel: data.payment_channel,
                    validation_review_time: data.validation_review_time,
                    order_completed_period_end_time: data.order_completed_period_end_time,
                    payment_time: data.payment_time,
                    updatedAt: new Date()
                  }
                });
              }
            }
          });
        }

        console.log(`Akun ${account.nama_akun}: ${newData.length} baru, ${updateData.length} diperbarui`);

      } catch (error) {
        console.error(`Error processing account ${account.nama_akun}:`, error.message);
        
        // Handle axios errors
        if (error.response && error.response.data) {
          console.error(`Response error untuk ${account.nama_akun}:`, error.response.data);
          errors.push({
            nama_akun: account.nama_akun,
            error: error.response.data
          });
        } else if (error.code === 'ECONNABORTED') {
          console.error(`Timeout untuk akun ${account.nama_akun}`);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: "Timeout: Koneksi terlalu lama" }
          });
        } else {
          console.error(`Unknown error untuk ${account.nama_akun}:`, error.message);
          errors.push({
            nama_akun: account.nama_akun,
            error: { msg: error.message }
          });
        }
      }
    }

    console.log(`Total hasil: ${results.length} item`);
    console.log(`Total error: ${errors.length} akun`);
    
    // Return both results and errors
    return res.json({
      success: errors.length === 0,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Data berhasil disimpan: ${results.length} item diproses (${tglMulai} hingga ${tglSelesai})`
    });
  } catch (error) {
    console.error("Error in getDataPembayaran:", error.message);
    return res.status(500).json({
      error: "Gagal mengambil data pembayaran",
      detail: error.message,
    });
  }
};
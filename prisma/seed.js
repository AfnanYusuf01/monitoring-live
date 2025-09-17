import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting simplified seed...");

  // Hapus data existing dengan error handling
  console.log("🧹 Cleaning existing data...");
  
  // Urutan penghapusan yang benar sesuai dengan constraint foreign key
  const deleteOperations = [
    { model: 'affiliateOrder', operation: prisma.affiliateOrder.deleteMany() },
    { model: 'confirmPayment', operation: prisma.confirmPayment.deleteMany() },
    { model: 'order', operation: prisma.order.deleteMany() },
    { model: 'affiliateStat', operation: prisma.affiliateStat.deleteMany() },
    { model: 'pelanggaran', operation: prisma.pelanggaran.deleteMany() },
    { model: 'history', operation: prisma.history.deleteMany() },
    { model: 'pembayaran', operation: prisma.pembayaran.deleteMany() },
    { model: 'akun', operation: prisma.akun.deleteMany() },
    { model: 'userSubscription', operation: prisma.userSubscription.deleteMany() },
    { model: 'subscription', operation: prisma.subscription.deleteMany() },
    { model: 'studio', operation: prisma.studio.deleteMany() },
    { model: 'affiliate', operation: prisma.affiliate.deleteMany() },
    { model: 'payment', operation: prisma.payment.deleteMany() },
    { model: 'user', operation: prisma.user.deleteMany() },
  ];

  for (const op of deleteOperations) {
    try {
      await op.operation;
      console.log(`✓ Cleared ${op.model}`);
    } catch (error) {
      if (error.code === 'P2021') {
        console.log(`- Table ${op.model} doesn't exist yet, skipping delete`);
      } else {
        console.log(`Error clearing ${op.model}:`, error.message);
      }
    }
  }

  // Hash passwords
  console.log("🔐 Hashing passwords...");
  const password = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  // 1️⃣ Buat users (hanya 3 user)
  console.log("👥 Creating users...");
  const users = [];
  
  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPassword,
      name: "Administrator",
      nomor_wa: faker.phone.number(),
      role: "superadmin",
      isAffiliate: false,
    },
  });
  users.push(admin);
  
  // Regular user
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      password: password,
      name: "Regular User",
      nomor_wa: faker.phone.number(),
      role: "user",
      isAffiliate: false,
    },
  });
  users.push(user);
  
  // Affiliate user
  const affiliateUser = await prisma.user.create({
    data: {
      email: "affiliate@example.com",
      password: password,
      name: "Affiliate User",
      nomor_wa: faker.phone.number(),
      role: "user",
      isAffiliate: true,
    },
  });
  users.push(affiliateUser);

  // 2️⃣ Buat affiliate hanya untuk affiliate user
  console.log("💰 Creating affiliate...");
  const affiliate = await prisma.affiliate.create({
    data: {
      userId: affiliateUser.id,
      komisi: 500000,
      totalDibayar: 250000,
      metodeBayar: "Bank Transfer",
      provider: "BCA",
      nomorTujuan: faker.finance.accountNumber(),
      namaPemilik: affiliateUser.name,
    },
  });

  // 3️⃣ Buat studio untuk setiap user
  console.log("🎬 Creating studios...");
  const studios = [];
  for (const user of users) {
    const studio = await prisma.studio.create({
      data: {
        nama_studio: `${user.name}'s Studio`,
        catatan: faker.lorem.sentence(),
        userId: user.id,
      },
    });
    studios.push(studio);
  }

  // 4️⃣ Buat akun (masing-masing studio punya 1-2 akun)
  console.log("📱 Creating akuns...");
  const akuns = [];
  for (const studio of studios) {
    const akunCount = studio.userId === affiliateUser.id ? 2 : 1;
    for (let i = 0; i < akunCount; i++) {
      const akun = await prisma.akun.create({
        data: {
          id: faker.number.bigInt({ min: 1000, max: 9999 }),
          nama_akun: `${faker.person.firstName()}_${faker.number.int(100)}`,
          email: faker.internet.email(),
          phone: faker.phone.number(),
          cookie: faker.string.alphanumeric(50),
          studioId: studio.id,
          userId: studio.userId,
        },
      });
      akuns.push(akun);
    }
  }

  // 5️⃣ Subscriptions
  console.log("📦 Creating subscriptions...");
  const subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        name: "Basic Plan",
        description: "Paket basic untuk 30 hari dengan 3 akun",
        price: 100000,
        duration: 30,
        limitAkun: 3,
        komisi: 20000,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Premium Plan",
        description: "Paket premium untuk 60 hari dengan 10 akun",
        price: 200000,
        duration: 60,
        limitAkun: 10,
        komisi: 40000,
      },
    }),
  ]);

  // 6️⃣ User subscriptions (hanya untuk regular user)
  console.log("🎫 Creating user subscriptions...");
  const userSubscription = await prisma.userSubscription.create({
    data: {
      userId: user.id,
      subscriptionId: subscriptions[0].id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari dari sekarang
      status: "active",
      limitAkun: subscriptions[0].limitAkun,
    },
  });

  // 7️⃣ Order untuk user subscription
  console.log("🛒 Creating order...");
  const order = await prisma.order.create({
    data: {
      userSubscriptionId: userSubscription.id,
      amount: subscriptions[0].price,
      status: "paid",
      paymentMethod: "midtrans",
      transactionId: `trx_${faker.string.alphanumeric(10)}`,
      affiliateId: affiliate.id,
    },
  });

  // 8️⃣ Affiliate order
  console.log("💸 Creating affiliate order...");
  try {
    const affiliateOrder = await prisma.affiliateOrder.create({
      data: {
        affiliateId: affiliate.id,
        orderId: order.id,
        komisi: subscriptions[0].komisi,
        status: "pending",
      },
    });
    console.log("✓ Affiliate order created");
  } catch (error) {
    if (error.code === 'P2021' || error.code === 'P2003') {
      console.log("- AffiliateOrder table doesn't exist yet, skipping");
    } else {
      console.log("Error creating affiliate order:", error.message);
    }
  }

  // 9️⃣ History data untuk setiap akun
  console.log("📊 Creating history data...");
  for (const akun of akuns) {
    try {
      const history = await prisma.history.create({
        data: {
          no: faker.number.int({ min: 1, max: 100 }),
          nama: faker.person.fullName(),
          session: faker.number.bigInt({ min: 1000, max: 9999 }),
          gmv: faker.commerce.price(),
          ord: faker.number.int({ min: 0, max: 50 }),
          co: faker.number.int({ min: 0, max: 20 }),
          act: faker.number.int({ min: 0, max: 100 }),
          view: faker.number.int({ min: 0, max: 1000 }),
          viewer: faker.number.int({ min: 0, max: 500 }),
          like: faker.number.int({ min: 0, max: 200 }),
          comnt: faker.number.int({ min: 0, max: 50 }),
          shere: faker.number.int({ min: 0, max: 30 }),
          tanggal: faker.date.recent({ days: 7 }),
          durasi: `${faker.number.int({ min: 10, max: 120 })} menit`,
          status: faker.helpers.arrayElement(["Sedang_Live", "Tidak_Live"]),
          akunId: akun.id,
        },
      });

      // Buat pelanggaran untuk beberapa history
      if (faker.datatype.boolean()) {
        await prisma.pelanggaran.create({
          data: {
            jumlah: faker.number.int({ min: 1, max: 5 }),
            judul: JSON.stringify([faker.lorem.words(3), faker.lorem.words(2)]),
            historyId: history.id,
          },
        });
      }
    } catch (error) {
      console.log("Error creating history:", error.message);
    }
  }

  // 🔟 Pembayaran data
  console.log("💳 Creating pembayaran data...");
  for (const akun of akuns) {
    try {
      await prisma.pembayaran.create({
        data: {
          id: faker.number.bigInt({ min: 10000, max: 99999 }),
          nama_akun: akun.nama_akun,
          validation_id: `val_${faker.string.alphanumeric(10)}`,
          total_payment_amount_dis: faker.commerce.price({ min: 10000, max: 500000 }),
          payment_status: faker.helpers.arrayElement(["success", "pending", "failed"]),
          payment_channel: faker.helpers.arrayElement(["bank_transfer", "credit_card", "e_wallet"]),
          validation_review_time: faker.date.recent({ days: 5 }),
          order_completed_period_end_time: faker.date.soon({ days: 10 }),
          payment_time: faker.date.recent({ days: 3 }),
          akunId: akun.id,
        },
      });
    } catch (error) {
      console.log("Error creating pembayaran:", error.message);
    }
  }

  // 1️⃣1️⃣ AffiliateStat data untuk affiliate user
  console.log("📈 Creating affiliate stats...");
  try {
    await prisma.affiliateStat.create({
      data: {
        accountId: `acc_${faker.string.alphanumeric(8)}`,
        ymd: faker.date.recent({ days: 30 }),
        clicks: faker.number.int({ min: 10, max: 1000 }),
        cvByOrder: faker.number.int({ min: 1, max: 50 }),
        orderCvr: faker.number.int({ min: 1, max: 20 }),
        orderAmount: faker.number.bigInt({ min: 100000, max: 10000000 }),
        totalCommission: faker.number.bigInt({ min: 10000, max: 1000000 }),
        totalIncome: faker.number.bigInt({ min: 50000, max: 5000000 }),
        newBuyer: faker.number.int({ min: 0, max: 20 }),
        programType: faker.number.int({ min: 1, max: 3 }),
        itemSold: faker.number.int({ min: 0, max: 100 }),
        estCommission: faker.number.bigInt({ min: 10000, max: 1000000 }),
        estIncome: faker.number.bigInt({ min: 50000, max: 5000000 }),
        userId: affiliateUser.id,
      },
    });
  } catch (error) {
    console.log("Error creating affiliate stat:", error.message);
  }

  // 1️⃣2️⃣ Payment data
  console.log("🏦 Creating payment methods...");
  try {
    await prisma.payment.createMany({
      data: [
        { nameService: "Bank Transfer", status: true },
        { nameService: "E-Wallet", status: true },
        { nameService: "Credit Card", status: false },
      ],
    });
  } catch (error) {
    console.log("Error creating payment methods:", error.message);
  }

  console.log("✅ Simplified seeding completed!");
  console.log("📊 Statistics:");
  console.log(`   Users: ${users.length}`);
  console.log(`   Affiliates: 1`);
  console.log(`   Studios: ${studios.length}`);
  console.log(`   Akuns: ${akuns.length}`);
  console.log(`   Subscriptions: ${subscriptions.length}`);
  console.log(`   User Subscriptions: 1`);
  console.log(`   Orders: 1`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
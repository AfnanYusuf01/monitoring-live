import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting simplified seed...");

  // Hapus data existing
  console.log("🧹 Cleaning existing data...");
  await prisma.affiliateOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.userSubscription.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.performanceLiveStream.deleteMany();
  await prisma.akun.deleteMany();
  await prisma.studio.deleteMany();
  await prisma.affiliate.deleteMany();
  await prisma.user.deleteMany();

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
          id: faker.number.int({ min: 1000, max: 9999 }),
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
  const affiliateOrder = await prisma.affiliateOrder.create({
    data: {
      affiliateId: affiliate.id,
      orderId: order.id,
      komisi: subscriptions[0].komisi,
      status: "pending",
    },
  });

  // 9️⃣ Performance live stream (hanya 1-2 data per akun)
  console.log("📊 Creating performance live stream data...");
  for (const akun of akuns) {
    const performance = await prisma.performanceLiveStream.create({
      data: {
        title: faker.commerce.productName() + " Live Stream",
        startTime: faker.date.recent({ days: 7 }),
        durationMs: faker.number.int({ min: 300000, max: 3600000 }),
        statusCode: faker.number.int({ min: 1, max: 3 }),
        conversionRate: faker.number.float({ min: 0, max: 0.05, precision: 0.0001 }),
        totalViews: faker.number.int({ min: 10, max: 200 }),
        totalLikes: faker.number.int({ min: 0, max: 50 }),
        followersGrowth: faker.number.int({ min: -5, max: 20 }),
        productClicks: faker.number.int({ min: 0, max: 10 }),
        uniqueViewers: faker.number.int({ min: 5, max: 50 }),
        peakViewers: faker.number.int({ min: 1, max: 10 }),
        avgViewDuration: faker.number.float({ min: 10000, max: 180000, precision: 0.1 }),
        totalComments: faker.number.int({ min: 0, max: 10 }),
        addToCart: faker.number.int({ min: 0, max: 5 }),
        placedOrders: faker.number.int({ min: 0, max: 3 }),
        placedSalesAmount: faker.number.float({ min: 0, max: 50000, precision: 0.01 }),
        confirmedOrders: faker.number.int({ min: 0, max: 2 }),
        confirmedSalesAmount: faker.number.float({ min: 0, max: 30000, precision: 0.01 }),
        akunId: akun.id,
      },
    });
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
  console.log(`   Affiliate Orders: 1`);
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
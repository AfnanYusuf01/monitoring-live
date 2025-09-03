import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting extensive seed...");

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

  // 1️⃣ Buat users
  console.log("👥 Creating users...");
  const users = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: i === 1 ? "admin@example.com" : `user${i}@example.com`,
        password: i === 1 ? adminPassword : password,
        name: i === 1 ? "Administrator" : faker.person.fullName(),
        nomor_wa: faker.phone.number(),
        role: i === 1 ? "superadmin" : "user",
        isAffiliate: i % 3 === 0,
      },
    });
    users.push(user);
  }

  // 2️⃣ Buat affiliates
  console.log("💰 Creating affiliates...");
  const affiliates = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].isAffiliate) {
      const affiliate = await prisma.affiliate.create({
        data: {
          userId: users[i].id,
          komisi: faker.number.float({ min: 0, max: 1000000, precision: 0.01 }),
          totalDibayar: faker.number.float({ min: 0, max: 500000, precision: 0.01 }),
          metodeBayar: faker.helpers.arrayElement(["Bank Transfer", "E-Wallet", "Cash"]),
          provider: faker.helpers.arrayElement(["BCA", "BRI", "BNI", "Mandiri", "Gopay", "OVO"]),
          nomorTujuan: faker.finance.accountNumber(),
          namaPemilik: users[i].name,
        },
      });
      affiliates.push(affiliate);
    }
  }

  // 3️⃣ Buat studios
  console.log("🎬 Creating studios...");
  const studios = [];
  for (const user of users) {
    const studioCount = faker.number.int({ min: 1, max: 2 });
    for (let i = 0; i < studioCount; i++) {
      const studio = await prisma.studio.create({
        data: {
          nama_studio: `${faker.company.name()} Studio`,
          catatan: faker.lorem.sentence(),
          userId: user.id,
        },
      });
      studios.push(studio);
    }
  }

  // 4️⃣ Buat akun (dengan id manual)
  console.log("📱 Creating akuns...");
  const akuns = [];
  for (const studio of studios) {
    const akunCount = faker.number.int({ min: 2, max: 3 });
    for (let i = 0; i < akunCount; i++) {
      const akun = await prisma.akun.create({
        data: {
          id: faker.number.int({ min: 1000, max: 999999 }), // 🔑 generate id manual
          nama_akun: `${faker.person.firstName()}_${faker.number.int(1000)}`,
          email: faker.internet.email(),
          phone: faker.phone.number(),
          cookie: faker.string.alphanumeric(100),
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
    prisma.subscription.create({
      data: {
        name: "Pro Plan",
        description: "Paket pro untuk 90 hari dengan unlimited akun",
        price: 300000,
        duration: 90,
        limitAkun: 999,
        komisi: 60000,
      },
    }),
  ]);

  // 6️⃣ User subscriptions
  console.log("🎫 Creating user subscriptions...");
  const userSubscriptions = [];
  for (const user of users.slice(1)) {
    const subscription = faker.helpers.arrayElement(subscriptions);
    const startDate = faker.date.recent({ days: 60 });
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (subscription.duration || 30));

    const userSub = await prisma.userSubscription.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        startDate,
        endDate,
        status: faker.helpers.arrayElement(["active", "expired", "canceled"]),
        limitAkun: subscription.limitAkun,
      },
    });
    userSubscriptions.push(userSub);
  }

  // 7️⃣ Orders
  console.log("🛒 Creating orders...");
  const orders = [];
  for (const userSub of userSubscriptions) {
    const orderCount = faker.number.int({ min: 1, max: 2 });
    for (let i = 0; i < orderCount; i++) {
      const hasAffiliate = affiliates.length > 0 && faker.datatype.boolean({ probability: 0.3 });
      const affiliate = hasAffiliate ? faker.helpers.arrayElement(affiliates) : null;

      const order = await prisma.order.create({
        data: {
          userSubscriptionId: userSub.id,
          amount: subscriptions.find(s => s.id === userSub.subscriptionId)?.price || 100000,
          status: faker.helpers.arrayElement(["pending", "paid", "failed"]),
          paymentMethod: faker.helpers.arrayElement(["midtrans", "bank_transfer", "gopay", "ovo"]),
          transactionId: `trx_${faker.string.alphanumeric(10)}`,
          affiliateId: affiliate?.id || null,
        },
      });
      orders.push(order);
    }
  }

  // 8️⃣ Affiliate orders
  console.log("💸 Creating affiliate orders...");
  const affiliateOrders = [];
  for (const order of orders) {
    if (order.affiliateId) {
      const subscription = subscriptions.find(s => 
        userSubscriptions.find(us => us.id === order.userSubscriptionId)?.subscriptionId === s.id
      );
      if (subscription) {
        const affiliateOrder = await prisma.affiliateOrder.create({
          data: {
            affiliateId: order.affiliateId,
            orderId: order.id,
            komisi: subscription.komisi,
            status: faker.helpers.arrayElement(["pending", "approved", "paid", "canceled"]),
          },
        });
        affiliateOrders.push(affiliateOrder);
      }
    }
  }

  // 9️⃣ Performance live stream
  console.log("📊 Creating performance live stream data...");
  const performances = [];
  for (const akun of akuns) {
    const performanceCount = faker.number.int({ min: 3, max: 5 });
    for (let i = 0; i < performanceCount; i++) {
      const startTime = faker.date.recent({ days: 30 });
      const performance = await prisma.performanceLiveStream.create({
        data: {
          title: faker.commerce.productName() + " Live Stream",
          startTime,
          durationMs: faker.number.int({ min: 300000, max: 7200000 }),
          statusCode: faker.number.int({ min: 1, max: 3 }),
          conversionRate: faker.number.float({ min: 0, max: 0.1, precision: 0.0001 }),
          totalViews: faker.number.int({ min: 10, max: 1000 }),
          totalLikes: faker.number.int({ min: 0, max: 500 }),
          followersGrowth: faker.number.int({ min: -50, max: 200 }),
          productClicks: faker.number.int({ min: 0, max: 100 }),
          uniqueViewers: faker.number.int({ min: 5, max: 500 }),
          peakViewers: faker.number.int({ min: 1, max: 100 }),
          avgViewDuration: faker.number.float({ min: 10000, max: 360000, precision: 0.1 }),
          totalComments: faker.number.int({ min: 0, max: 100 }),
          addToCart: faker.number.int({ min: 0, max: 50 }),
          placedOrders: faker.number.int({ min: 0, max: 20 }),
          placedSalesAmount: faker.number.float({ min: 0, max: 1000000, precision: 0.01 }),
          confirmedOrders: faker.number.int({ min: 0, max: 15 }),
          confirmedSalesAmount: faker.number.float({ min: 0, max: 800000, precision: 0.01 }),
          akunId: akun.id,
        },
      });
      performances.push(performance);
    }
  }

  console.log("✅ Extensive seeding completed!");
  console.log("📊 Statistics:");
  console.log(`   Users: ${users.length}`);
  console.log(`   Affiliates: ${affiliates.length}`);
  console.log(`   Studios: ${studios.length}`);
  console.log(`   Akuns: ${akuns.length}`);
  console.log(`   Subscriptions: ${subscriptions.length}`);
  console.log(`   User Subscriptions: ${userSubscriptions.length}`);
  console.log(`   Orders: ${orders.length}`);
  console.log(`   Affiliate Orders: ${affiliateOrders.length}`);
  console.log(`   Performance Records: ${performances.length}`);
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

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashPassword = (plain) => bcrypt.hashSync(plain, 10);

  // ===== User =====
  await prisma.user.createMany({
    data: [
      {
        email: "admin@example.com",
        password: hashPassword("admin123"),
        name: "Administrator",
        role: "superadmin",
      },
      {
        email: "user1@example.com",
        password: hashPassword("user123"),
        name: "Afnan Yusuf",
        role: "user",
      },
      {
        email: "user2@example.com",
        password: hashPassword("user456"),
        name: "Budi Santoso",
        role: "user",
      },
    ],
    skipDuplicates: true,
  });

  // ✅ Ambil user
  const admin = await prisma.user.findFirst({ where: { role: "superadmin" } });
  const user1 = await prisma.user.findUnique({ where: { email: "user1@example.com" } });

  if (!admin || !user1) throw new Error("❌ User admin / user1 tidak ditemukan");

  // ===== Studio untuk admin =====
  await prisma.studio.createMany({
    data: [
      { nama_studio: "Studio 1", userId: admin.id },
      { nama_studio: "Studio 2", userId: admin.id },
      { nama_studio: "Studio 3", userId: admin.id },
    ],
    skipDuplicates: true,
  });

  // Ambil studio kembali
  const studios = await prisma.studio.findMany({ where: { userId: admin.id }, orderBy: { id: "asc" } });
  const [studio1, studio2, studio3] = studios;

  // ===== Akun =====
  await prisma.akun.createMany({
    data: [
      { nama_akun: "Bukan Kw", cookie: "4a58", studioId: studio1?.id, userId: admin.id },
      { nama_akun: "Yulinaelul", cookie: "60", studioId: studio2?.id, userId: admin.id },
      { nama_akun: "Zam zam", cookie: "_2.1755805660", studioId: studio3?.id, userId: admin.id },
      { nama_akun: "Siti", cookie: "5$j22$l0$h4952815", studioId: studio3?.id, userId: admin.id },
    ],
    skipDuplicates: true,
  });

  // ===== Subscription Plans =====
  await prisma.subscription.createMany({
    data: [
      { name: "Basic", description: "Paket Basic 30 hari", price: 100000, limitAkun: 1 },
      { name: "Premium", description: "Paket Premium 90 hari", price: 250000, limitAkun: 5 },
      { name: "Enterprise", description: "Paket Enterprise 1 tahun", price: 800000, limitAkun: 20 },
    ],
    skipDuplicates: true,
  });

  // Ambil subscription Basic (pakai findFirst karena name bukan unique)
  const basic = await prisma.subscription.findFirst({ where: { name: "Basic" } });

  if (!basic) throw new Error("❌ Subscription Basic tidak ditemukan");

  // ===== UserSubscription untuk user1 =====
  const userSub = await prisma.userSubscription.create({
    data: {
      userId: user1.id,
      subscriptionId: basic.id,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 hari
      status: "active",
      duration: 30,
      limitAkun: basic.limitAkun,
    },
  });

  // ===== Order untuk userSubscription =====
  await prisma.order.create({
    data: {
      userSubscriptionId: userSub.id,
      amount: basic.price,
      status: "paid",
      paymentMethod: "manual",
      transactionId: "TRX123456",
    },
  });

  console.log("✅ Seeding selesai");
}

main()
  .catch(async (e) => {
    console.error("❌ Error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export const checkExpiredAndLimit = async () => {
  try {
    const now = new Date();

    // 1. Ambil semua user
    const users = await prisma.user.findMany();

    for (const user of users) {
      console.log(`🔄 Cron cek user ${user.id}`);

      // ---- Update subscription expired ----
      const userSubs = await prisma.userSubscription.findMany({
        where: { userId: user.id },
      });

      for (const sub of userSubs) {
        if (sub.status === "active" && sub.endDate < now) {
          await prisma.userSubscription.update({
            where: { id: sub.id },
            data: { status: "expired" },
          });
          console.log(`⚠️ Subscription ${sub.id} user ${user.id} expired`);
        }
      }

      // ---- Hitung ulang subscription aktif ----
      const activeSubs = await prisma.userSubscription.findMany({
        where: { userId: user.id, status: "active" },
      });

      const totalLimit = activeSubs.reduce(
        (sum, sub) => sum + (sub.limitAkun || 0),
        0
      );

      // ---- Hitung jumlah akun aktif user ----
      const akunUser = await prisma.akun.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });

      const totalAkun = akunUser.length;

      if (totalAkun > totalLimit) {
        const excess = totalAkun - totalLimit;
        const akunToDelete = akunUser.slice(-excess);

        for (const akun of akunToDelete) {
          const newId = Date.now() + Math.floor(Math.random() * 1000);
          await prisma.akun.update({
            where: { id: akun.id },
            data: {
              id: newId,
              deletedAt: new Date(),
              studioId: null,
            },
          });
        }

        console.log(
          `⚠️ User ${user.id} punya ${totalAkun} akun, limit aktif ${totalLimit}. ${excess} akun dihapus.`
        );
      }
    }

    console.log("✅ Cron selesai cek semua user");
  } catch (err) {
    console.error("❌ Cron Error checkExpiredAndLimit:", err);
  }
};

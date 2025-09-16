/*
  Warnings:

  - You are about to drop the `performancelivestream` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `performancelivestream` DROP FOREIGN KEY `PerformanceLiveStream_akunId_fkey`;

-- DropTable
DROP TABLE `performancelivestream`;

-- CreateTable
CREATE TABLE `AffiliateStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` VARCHAR(191) NULL,
    `ymd` DATETIME(3) NOT NULL,
    `clicks` INTEGER NOT NULL,
    `cvByOrder` INTEGER NOT NULL,
    `orderCvr` INTEGER NOT NULL,
    `orderAmount` BIGINT NOT NULL,
    `totalCommission` BIGINT NOT NULL,
    `totalIncome` BIGINT NOT NULL,
    `newBuyer` INTEGER NOT NULL,
    `programType` INTEGER NOT NULL,
    `itemSold` INTEGER NOT NULL,
    `estCommission` BIGINT NOT NULL,
    `estIncome` BIGINT NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AffiliateStat` ADD CONSTRAINT `AffiliateStat_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

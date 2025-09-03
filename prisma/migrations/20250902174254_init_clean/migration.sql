/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Akun` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Akun` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE `PerformanceLiveStream` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `durationMs` INTEGER NOT NULL,
    `statusCode` INTEGER NOT NULL,
    `conversionRate` DOUBLE NOT NULL DEFAULT 0.0000,
    `totalViews` INTEGER NOT NULL DEFAULT 0,
    `totalLikes` INTEGER NOT NULL DEFAULT 0,
    `followersGrowth` INTEGER NOT NULL DEFAULT 0,
    `productClicks` INTEGER NOT NULL DEFAULT 0,
    `uniqueViewers` INTEGER NOT NULL DEFAULT 0,
    `peakViewers` INTEGER NOT NULL DEFAULT 0,
    `avgViewDuration` DOUBLE NOT NULL DEFAULT 0.0,
    `totalComments` INTEGER NOT NULL DEFAULT 0,
    `addToCart` INTEGER NOT NULL DEFAULT 0,
    `placedOrders` INTEGER NOT NULL DEFAULT 0,
    `placedSalesAmount` DOUBLE NOT NULL DEFAULT 0.0,
    `confirmedOrders` INTEGER NOT NULL DEFAULT 0,
    `confirmedSalesAmount` DOUBLE NOT NULL DEFAULT 0.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `akunId` INTEGER NOT NULL,

    INDEX `PerformanceLiveStream_akunId_idx`(`akunId`),
    INDEX `PerformanceLiveStream_startTime_idx`(`startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Akun_email_key` ON `Akun`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `Akun_phone_key` ON `Akun`(`phone`);

-- AddForeignKey
ALTER TABLE `PerformanceLiveStream` ADD CONSTRAINT `PerformanceLiveStream_akunId_fkey` FOREIGN KEY (`akunId`) REFERENCES `Akun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `affiliateId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isAffiliate` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Affiliate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `komisi` DOUBLE NOT NULL DEFAULT 0,
    `totalDibayar` DOUBLE NOT NULL DEFAULT 0,
    `metodeBayar` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,
    `nomorTujuan` VARCHAR(191) NULL,
    `namaPemilik` VARCHAR(191) NULL,
    `lastPaidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Affiliate_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

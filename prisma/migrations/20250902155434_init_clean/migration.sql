/*
  Warnings:

  - You are about to drop the column `kode` on the `affiliate` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Affiliate_kode_key` ON `affiliate`;

-- AlterTable
ALTER TABLE `affiliate` DROP COLUMN `kode`;

-- AlterTable
ALTER TABLE `subscription` ADD COLUMN `komisi` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `AffiliateOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `affiliateId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `komisi` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('pending', 'approved', 'paid', 'canceled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AffiliateOrder` ADD CONSTRAINT `AffiliateOrder_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateOrder` ADD CONSTRAINT `AffiliateOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

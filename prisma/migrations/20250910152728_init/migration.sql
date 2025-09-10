-- DropForeignKey
ALTER TABLE `usersubscription` DROP FOREIGN KEY `UserSubscription_subscriptionId_fkey`;

-- DropIndex
DROP INDEX `UserSubscription_subscriptionId_fkey` ON `usersubscription`;

-- AlterTable
ALTER TABLE `subscription` MODIFY `price` DOUBLE NULL;

-- AlterTable
ALTER TABLE `usersubscription` ADD COLUMN `is_custom` BOOLEAN NULL DEFAULT false,
    MODIFY `subscriptionId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Price` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skema` VARCHAR(191) NOT NULL,
    `formAkun` VARCHAR(191) NOT NULL,
    `toAkun` VARCHAR(191) NOT NULL,
    `priceAkun` INTEGER NOT NULL,
    `priceMount` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserSubscription` ADD CONSTRAINT `UserSubscription_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

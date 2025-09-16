-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nama_akun` VARCHAR(191) NOT NULL,
    `validation_id` VARCHAR(191) NOT NULL,
    `total_payment_amount_dis` VARCHAR(191) NOT NULL,
    `payment_status` VARCHAR(191) NOT NULL,
    `payment_channel` VARCHAR(191) NOT NULL,
    `validation_review_time` DATETIME(3) NULL,
    `order_completed_period_end_time` DATETIME(3) NULL,
    `payment_time` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `akunId` BIGINT NOT NULL,

    UNIQUE INDEX `Pembayaran_validation_id_key`(`validation_id`),
    INDEX `Pembayaran_akunId_idx`(`akunId`),
    INDEX `Pembayaran_validation_id_idx`(`validation_id`),
    INDEX `Pembayaran_payment_status_idx`(`payment_status`),
    INDEX `Pembayaran_createdAt_idx`(`createdAt`),
    INDEX `Pembayaran_payment_time_idx`(`payment_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_akunId_fkey` FOREIGN KEY (`akunId`) REFERENCES `Akun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

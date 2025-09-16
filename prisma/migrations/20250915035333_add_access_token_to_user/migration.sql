-- CreateTable
CREATE TABLE `History` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `no` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `session` BIGINT NOT NULL,
    `gmv` VARCHAR(191) NOT NULL,
    `ord` INTEGER NOT NULL,
    `co` INTEGER NOT NULL,
    `act` INTEGER NOT NULL,
    `view` INTEGER NOT NULL,
    `viewer` INTEGER NOT NULL,
    `like` INTEGER NOT NULL,
    `comnt` INTEGER NOT NULL,
    `shere` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `durasi` VARCHAR(191) NOT NULL,
    `status` ENUM('Sedang_Live', 'Tidak_Live') NOT NULL,
    `akunId` BIGINT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pelanggaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jumlah` INTEGER NOT NULL,
    `judul` JSON NOT NULL,
    `historyId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `History` ADD CONSTRAINT `History_akunId_fkey` FOREIGN KEY (`akunId`) REFERENCES `Akun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pelanggaran` ADD CONSTRAINT `Pelanggaran_historyId_fkey` FOREIGN KEY (`historyId`) REFERENCES `History`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - The primary key for the `akun` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `performancelivestream` DROP FOREIGN KEY `PerformanceLiveStream_akunId_fkey`;

-- AlterTable
ALTER TABLE `akun` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `performancelivestream` MODIFY `akunId` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `usersubscription` MODIFY `limitAkun` INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE `PerformanceLiveStream` ADD CONSTRAINT `PerformanceLiveStream_akunId_fkey` FOREIGN KEY (`akunId`) REFERENCES `Akun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

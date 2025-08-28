/*
  Warnings:

  - You are about to alter the column `status` on the `order` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.
  - You are about to alter the column `status` on the `usersubscription` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `order` MODIFY `status` ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `nomor_wa` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `usersubscription` MODIFY `status` ENUM('active', 'expired', 'canceled') NOT NULL DEFAULT 'active';

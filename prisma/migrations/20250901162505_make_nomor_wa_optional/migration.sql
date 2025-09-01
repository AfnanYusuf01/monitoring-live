/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Akun` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Akun` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `akun` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Akun_email_key` ON `Akun`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `Akun_phone_key` ON `Akun`(`phone`);

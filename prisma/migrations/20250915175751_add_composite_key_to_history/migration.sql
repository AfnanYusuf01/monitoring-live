/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `ConfirmPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `confirmpayment` ADD COLUMN `isUsed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `token` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ConfirmPayment_token_key` ON `ConfirmPayment`(`token`);

-- CreateIndex
CREATE INDEX `ConfirmPayment_token_idx` ON `ConfirmPayment`(`token`);

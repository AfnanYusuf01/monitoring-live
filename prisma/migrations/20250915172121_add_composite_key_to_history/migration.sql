/*
  Warnings:

  - Added the required column `tagihanProduct` to the `ConfirmPayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `confirmpayment` ADD COLUMN `tagihanProduct` VARCHAR(191) NOT NULL;

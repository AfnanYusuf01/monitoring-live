/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Akun_email_key` ON `akun`;

-- DropIndex
DROP INDEX `Akun_phone_key` ON `akun`;

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

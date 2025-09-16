/*
  Warnings:

  - A unique constraint covering the columns `[access_token]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `access_token` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_access_token_key` ON `User`(`access_token`);

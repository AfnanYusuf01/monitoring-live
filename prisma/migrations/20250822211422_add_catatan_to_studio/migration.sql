/*
  Warnings:

  - Added the required column `userId` to the `Akun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Studio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `akun` ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `studio` ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Akun` ADD CONSTRAINT `Akun_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Studio` ADD CONSTRAINT `Studio_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

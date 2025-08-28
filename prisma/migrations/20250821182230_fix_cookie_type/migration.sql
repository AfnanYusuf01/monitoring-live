-- AlterTable
ALTER TABLE `akun` ADD COLUMN `studioId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Akun` ADD CONSTRAINT `Akun_studioId_fkey` FOREIGN KEY (`studioId`) REFERENCES `Studio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

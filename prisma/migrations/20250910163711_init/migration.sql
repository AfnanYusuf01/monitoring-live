/*
  Warnings:

  - You are about to drop the column `is_custom` on the `usersubscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `subscription` ADD COLUMN `is_custom` BOOLEAN NULL DEFAULT false;

-- AlterTable
ALTER TABLE `usersubscription` DROP COLUMN `is_custom`;

/*
  Warnings:

  - You are about to drop the column `duration` on the `usersubscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `subscription` ADD COLUMN `duration` INTEGER NULL;

-- AlterTable
ALTER TABLE `usersubscription` DROP COLUMN `duration`;

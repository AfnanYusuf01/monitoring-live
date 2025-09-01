/*
  Warnings:

  - You are about to drop the column `duration` on the `subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `subscription` DROP COLUMN `duration`;

-- AlterTable
ALTER TABLE `usersubscription` ALTER COLUMN `limitAkun` DROP DEFAULT;

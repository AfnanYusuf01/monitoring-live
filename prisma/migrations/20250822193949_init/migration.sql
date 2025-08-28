/*
  Warnings:

  - You are about to drop the column `cookie` on the `studio` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `studio` DROP COLUMN `cookie`,
    ADD COLUMN `catatan` TEXT NULL;

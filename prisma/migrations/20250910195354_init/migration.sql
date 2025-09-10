/*
  Warnings:

  - You are about to alter the column `formAkun` on the `price` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `toAkun` on the `price` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `price` MODIFY `formAkun` INTEGER NOT NULL,
    MODIFY `toAkun` INTEGER NOT NULL;

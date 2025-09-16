/*
  Warnings:

  - A unique constraint covering the columns `[akunId,session]` on the table `History` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `History_akunId_session_key` ON `History`(`akunId`, `session`);

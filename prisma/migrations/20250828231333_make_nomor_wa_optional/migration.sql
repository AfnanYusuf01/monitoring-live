-- AlterTable
ALTER TABLE `subscription` MODIFY `duration` INTEGER NULL;

-- AlterTable
ALTER TABLE `usersubscription` ADD COLUMN `duration` INTEGER NULL,
    ADD COLUMN `limitAkun` INTEGER NOT NULL DEFAULT 1;

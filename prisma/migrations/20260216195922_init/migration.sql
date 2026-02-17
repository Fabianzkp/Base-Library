/*
  Warnings:

  - You are about to alter the column `bookId` on the `Rating` table. The data in that column could be lost. The data in that column will be cast from `UnsignedInt` to `VarChar(191)`.

*/
-- DropForeignKey
ALTER TABLE `Rating` DROP FOREIGN KEY `Rating_bookId_fkey`;

-- AlterTable
ALTER TABLE `Rating` MODIFY `bookId` VARCHAR(191) NOT NULL;

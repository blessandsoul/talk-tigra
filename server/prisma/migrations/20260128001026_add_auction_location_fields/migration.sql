-- AlterTable
ALTER TABLE `locations` ADD COLUMN `auction_name` VARCHAR(191) NULL,
    ADD COLUMN `auction_type` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `locations_auction_type_idx` ON `locations`(`auction_type`);

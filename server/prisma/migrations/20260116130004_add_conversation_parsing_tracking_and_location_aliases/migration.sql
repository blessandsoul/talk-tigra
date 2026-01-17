-- AlterTable
ALTER TABLE `conversations` ADD COLUMN `last_parsed_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `location_aliases` (
    `id` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `location_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `location_aliases_alias_key`(`alias`),
    INDEX `location_aliases_alias_idx`(`alias`),
    INDEX `location_aliases_location_id_idx`(`location_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `conversations_last_parsed_at_idx` ON `conversations`(`last_parsed_at`);

-- AddForeignKey
ALTER TABLE `location_aliases` ADD CONSTRAINT `location_aliases_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

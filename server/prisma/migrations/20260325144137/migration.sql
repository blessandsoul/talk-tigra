-- CreateTable
CREATE TABLE `load_inquiries` (
    `id` VARCHAR(191) NOT NULL,
    `load_id` VARCHAR(191) NOT NULL,
    `vin` VARCHAR(191) NULL,
    `vehicle_info` VARCHAR(191) NULL,
    `received_in` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `first_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mention_count` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `load_inquiries_load_id_idx`(`load_id`),
    INDEX `load_inquiries_phone_number_idx`(`phone_number`),
    INDEX `load_inquiries_mention_count_idx`(`mention_count`),
    UNIQUE INDEX `load_inquiries_load_id_phone_number_key`(`load_id`, `phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- RenameIndex
ALTER TABLE `pickups` RENAME INDEX `deliveries_delivery_day_idx` TO `pickups_pickup_day_idx`;

-- RenameIndex
ALTER TABLE `pickups` RENAME INDEX `deliveries_synced_at_idx` TO `pickups_synced_at_idx`;

-- RenameIndex
ALTER TABLE `pickups` RENAME INDEX `deliveries_vin_key` TO `pickups_vin_key`;

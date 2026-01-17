-- CreateTable
CREATE TABLE `drivers` (
    `id` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `company_name` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `drivers_phone_number_key`(`phone_number`),
    INDEX `drivers_phone_number_idx`(`phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `locations_name_key`(`name`),
    INDEX `locations_name_idx`(`name`),
    INDEX `locations_state_idx`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_locations` (
    `driver_id` VARCHAR(191) NOT NULL,
    `location_id` VARCHAR(191) NOT NULL,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `match_count` INTEGER NOT NULL DEFAULT 1,
    `source` VARCHAR(191) NOT NULL DEFAULT 'sheet_match',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `driver_locations_driver_id_idx`(`driver_id`),
    INDEX `driver_locations_location_id_idx`(`location_id`),
    PRIMARY KEY (`driver_id`, `location_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loads` (
    `id` VARCHAR(191) NOT NULL,
    `vin` VARCHAR(191) NOT NULL,
    `load_id` VARCHAR(191) NOT NULL,
    `pickup_location` VARCHAR(191) NULL,
    `delivery_location` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `driver_phone` VARCHAR(191) NULL,
    `sheet_row_number` INTEGER NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `driver_id` VARCHAR(191) NULL,

    UNIQUE INDEX `loads_vin_key`(`vin`),
    INDEX `loads_load_id_idx`(`load_id`),
    INDEX `loads_driver_phone_idx`(`driver_phone`),
    INDEX `loads_synced_at_idx`(`synced_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `driver_locations` ADD CONSTRAINT `driver_locations_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_locations` ADD CONSTRAINT `driver_locations_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loads` ADD CONSTRAINT `loads_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

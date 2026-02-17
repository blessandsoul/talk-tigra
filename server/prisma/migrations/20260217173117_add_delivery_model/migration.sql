-- CreateTable
CREATE TABLE `deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `vin` VARCHAR(191) NOT NULL,
    `delivery_day` INTEGER NOT NULL,
    `driver_phone` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `sheet_row_number` INTEGER NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `deliveries_vin_key`(`vin`),
    INDEX `deliveries_delivery_day_idx`(`delivery_day`),
    INDEX `deliveries_synced_at_idx`(`synced_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

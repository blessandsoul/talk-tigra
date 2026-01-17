-- CreateTable
CREATE TABLE `unknown_drivers` (
    `id` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `loadIds` TEXT NOT NULL,
    `raw_location` VARCHAR(191) NULL,
    `matched` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `unknown_drivers_phone_number_idx`(`phone_number`),
    INDEX `unknown_drivers_matched_idx`(`matched`),
    INDEX `unknown_drivers_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` VARCHAR(191) NOT NULL,
    `phone_number_id` VARCHAR(191) NOT NULL,
    `participants` TEXT NOT NULL,
    `name` VARCHAR(191) NULL,
    `assigned_to` VARCHAR(191) NULL,
    `last_activity_at` DATETIME(3) NOT NULL,
    `last_activity_id` VARCHAR(191) NOT NULL,
    `muted_until` DATETIME(3) NULL,
    `snoozed_until` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversations_phone_number_id_idx`(`phone_number_id`),
    INDEX `conversations_last_activity_at_idx`(`last_activity_at`),
    INDEX `conversations_synced_at_idx`(`synced_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `phone_number_id` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `from` VARCHAR(191) NOT NULL,
    `to` TEXT NOT NULL,
    `text` TEXT NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_conversation_id_idx`(`conversation_id`),
    INDEX `messages_phone_number_id_idx`(`phone_number_id`),
    INDEX `messages_direction_idx`(`direction`),
    INDEX `messages_created_at_idx`(`created_at`),
    INDEX `messages_synced_at_idx`(`synced_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

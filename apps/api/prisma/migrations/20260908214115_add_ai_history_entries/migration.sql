-- CreateTable
CREATE TABLE `ai_history_entries` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `card_id` VARCHAR(191) NOT NULL,
    `lesson_id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `tokens_used` INTEGER NOT NULL DEFAULT 0,
    `cached` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_history_entries_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `ai_history_entries_user_id_card_id_mode_created_at_idx`(`user_id`, `card_id`, `mode`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_history_entries` ADD CONSTRAINT `ai_history_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_history_entries` ADD CONSTRAINT `ai_history_entries_card_id_fkey` FOREIGN KEY (`card_id`) REFERENCES `vocabulary_cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

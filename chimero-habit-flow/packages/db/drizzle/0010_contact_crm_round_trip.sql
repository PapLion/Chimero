ALTER TABLE `contacts` ADD COLUMN `updated_at` integer;
--> statement-breakpoint
UPDATE `contacts` SET `updated_at` = `created_at` WHERE `updated_at` IS NULL;
--> statement-breakpoint
ALTER TABLE `contact_reminder_settings` RENAME TO `contact_reminder_settings_old`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contact_reminder_settings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `contact_id` integer NOT NULL,
  `birthday_reminder_enabled` integer DEFAULT false NOT NULL,
  `birthday_reminder_days_before` integer,
  `check_in_reminder_enabled` integer DEFAULT false NOT NULL,
  `check_in_after_days` integer,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `contact_reminder_settings` (`id`, `contact_id`, `birthday_reminder_enabled`, `birthday_reminder_days_before`, `check_in_reminder_enabled`, `check_in_after_days`, `created_at`, `updated_at`)
SELECT `id`, `contact_id`, `birthday_reminder_enabled`, `birthday_reminder_days_before`, `check_in_reminder_enabled`, `check_in_after_days`, `created_at`, `updated_at`
FROM `contact_reminder_settings_old`;
--> statement-breakpoint
DROP TABLE `contact_reminder_settings_old`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `contact_reminder_settings_contact_unique` ON `contact_reminder_settings` (`contact_id`);

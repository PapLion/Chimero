ALTER TABLE `contacts` ADD COLUMN `last_talked_at` integer;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `likes` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `dislikes` text;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `has_kids` integer DEFAULT false;
--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `kids_notes` text;
--> statement-breakpoint
ALTER TABLE `contact_interactions` ADD COLUMN `mood_impact` text DEFAULT 'neutral';
--> statement-breakpoint
ALTER TABLE `contact_interactions` ADD COLUMN `method` text;
--> statement-breakpoint
UPDATE `contact_interactions` SET `mood_impact` = `mood` WHERE `mood_impact` IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contact_reminder_settings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `contact_id` integer NOT NULL,
  `birthday_reminder_enabled` integer DEFAULT false NOT NULL,
  `birthday_reminder_days_before` integer DEFAULT 7 NOT NULL,
  `check_in_reminder_enabled` integer DEFAULT false NOT NULL,
  `check_in_after_days` integer DEFAULT 14 NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `contact_reminder_settings_contact_unique` ON `contact_reminder_settings` (`contact_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contact_profile_blocks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `contact_id` integer NOT NULL,
  `title` text NOT NULL,
  `body` text NOT NULL,
  `order_index` integer DEFAULT 0 NOT NULL,
  `block_type` text DEFAULT 'text' NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `contact_profile_blocks_contact_idx` ON `contact_profile_blocks` (`contact_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `contact_profile_blocks_order_idx` ON `contact_profile_blocks` (`contact_id`, `order_index`);

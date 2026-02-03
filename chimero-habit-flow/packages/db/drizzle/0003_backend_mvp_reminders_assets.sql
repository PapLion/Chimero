-- Backend MVP: reminders (recurring time+days), assets (originalName, type)
-- Reminders: replace old schema with recurring (time HH:MM, days JSON, enabled, lastTriggered)
DROP TABLE IF EXISTS `reminders`;
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_id` integer,
	`title` text NOT NULL,
	`time` text NOT NULL,
	`days` text,
	`enabled` integer DEFAULT true,
	`last_triggered` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `assets` ADD `original_name` text;
--> statement-breakpoint
ALTER TABLE `assets` ADD `type` text NOT NULL DEFAULT 'image';

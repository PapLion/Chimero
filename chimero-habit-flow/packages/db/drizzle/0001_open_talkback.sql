CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date_time` integer NOT NULL,
	`is_completed` integer DEFAULT false,
	`linked_tracker_id` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`linked_tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `trackers` ADD `is_custom` integer DEFAULT false;
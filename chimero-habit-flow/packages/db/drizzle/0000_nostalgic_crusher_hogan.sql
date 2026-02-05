CREATE TABLE IF NOT EXISTS `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`original_name` text,
	`path` text NOT NULL,
	`type` text NOT NULL,
	`mime_type` text,
	`size` integer,
	`thumbnail_path` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_id` integer NOT NULL,
	`value` real,
	`note` text,
	`metadata` text DEFAULT '{}',
	`asset_id` integer,
	`timestamp` integer NOT NULL,
	`date_str` text NOT NULL,
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tracker_idx` ON `entries` (`tracker_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `date_idx` ON `entries` (`date_str`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `timestamp_idx` ON `entries` (`timestamp`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entries_to_tags` (
	`entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`entry_id`, `tag_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_id` integer,
	`title` text NOT NULL,
	`description` text,
	`time` text NOT NULL,
	`date` text,
	`days` text,
	`enabled` integer DEFAULT true,
	`last_triggered` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'dark',
	`currency` text DEFAULT 'USD',
	`language` text DEFAULT 'es',
	`dashboard_layout` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trackers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text,
	`color` text,
	`order` integer DEFAULT 0,
	`config` text DEFAULT '{}',
	`is_custom` integer DEFAULT false,
	`is_favorite` integer DEFAULT false,
	`archived` integer DEFAULT false,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);

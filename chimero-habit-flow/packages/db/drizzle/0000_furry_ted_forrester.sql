CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`path` text NOT NULL,
	`mime_type` text,
	`size` integer,
	`thumbnail_path` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_id` integer NOT NULL,
	`value` real,
	`note` text,
	`metadata` text DEFAULT '{}',
	`timestamp` integer NOT NULL,
	`date_str` text NOT NULL,
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tracker_idx` ON `entries` (`tracker_id`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `entries` (`date_str`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `entries` (`timestamp`);--> statement-breakpoint
CREATE TABLE `entries_to_tags` (
	`entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`entry_id`, `tag_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'dark',
	`currency` text DEFAULT 'USD',
	`language` text DEFAULT 'es',
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `trackers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text,
	`color` text,
	`order` integer DEFAULT 0,
	`config` text DEFAULT '{}',
	`archived` integer DEFAULT false,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);

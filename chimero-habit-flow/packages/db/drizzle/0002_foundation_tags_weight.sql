ALTER TABLE `settings` ADD COLUMN `weight_unit` text DEFAULT 'kg';--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `measure_unit` text DEFAULT 'cm';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entries_to_tags_entry_idx` ON `entries_to_tags` (`entry_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entries_to_tags_tag_idx` ON `entries_to_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tag_relationships` (
	`parent_tag_id` integer NOT NULL,
	`child_tag_id` integer NOT NULL,
	`relationship_type` text DEFAULT 'parent',
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	PRIMARY KEY(`parent_tag_id`, `child_tag_id`),
	FOREIGN KEY (`parent_tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tag_relationships_parent_idx` ON `tag_relationships` (`parent_tag_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tag_relationships_child_idx` ON `tag_relationships` (`child_tag_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entry_weight` (
	`entry_id` integer PRIMARY KEY NOT NULL,
	`weight_value` real NOT NULL,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`waist_value` real,
	`waist_unit` text,
	`body_fat_percentage` real,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_weight_unit_idx` ON `entry_weight` (`weight_unit`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tracker_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_id` integer NOT NULL,
	`goal_type` text DEFAULT 'target' NOT NULL,
	`target_value` real NOT NULL,
	`unit` text,
	`direction` text,
	`start_date` text,
	`target_date` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tracker_goals_tracker_idx` ON `tracker_goals` (`tracker_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tracker_goals_tracker_active_idx` ON `tracker_goals` (`tracker_id`,`active`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `asset_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`relation_type` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_links_asset_idx` ON `asset_links` (`asset_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_links_entity_idx` ON `asset_links` (`entity_type`,`entity_id`);

CREATE TABLE IF NOT EXISTS `symptoms` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `tracker_id` integer NOT NULL,
  `name` text NOT NULL,
  `symptom_key` text NOT NULL,
  `category` text DEFAULT 'general' NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `symptoms_tracker_idx` ON `symptoms` (`tracker_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `symptoms_tracker_key_unique` ON `symptoms` (`tracker_id`, `symptom_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `symptoms_category_idx` ON `symptoms` (`category`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entry_health` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `symptom_id` integer NOT NULL,
  `severity` integer,
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`symptom_id`) REFERENCES `symptoms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_health_symptom_idx` ON `entry_health` (`symptom_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_health_severity_idx` ON `entry_health` (`severity`);

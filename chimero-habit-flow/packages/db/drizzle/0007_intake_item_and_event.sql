CREATE TABLE IF NOT EXISTS `intake_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `tracker_id` integer NOT NULL,
  `item_name` text NOT NULL,
  `item_key` text NOT NULL,
  `item_type` text DEFAULT 'other' NOT NULL,
  `variant` text,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `intake_items_tracker_idx` ON `intake_items` (`tracker_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `intake_items_tracker_key_unique` ON `intake_items` (`tracker_id`, `item_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `intake_items_item_type_idx` ON `intake_items` (`item_type`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entry_intake` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `item_id` integer NOT NULL,
  `dosage` real,
  `unit` text,
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `intake_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_intake_item_idx` ON `entry_intake` (`item_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_intake_unit_idx` ON `entry_intake` (`unit`);

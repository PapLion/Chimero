CREATE TABLE IF NOT EXISTS `entry_gaming` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `game_title` text NOT NULL,
  `game_key` text NOT NULL,
  `estimated_hours` real NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_gaming_game_key_idx` ON `entry_gaming` (`game_key`);

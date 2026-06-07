CREATE TABLE IF NOT EXISTS `entry_food` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `food_name` text NOT NULL,
  `food_key` text NOT NULL,
  `calories` real,
  `meal_type` text,
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_food_food_key_idx` ON `entry_food` (`food_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entry_food_meal_type_idx` ON `entry_food` (`meal_type`);

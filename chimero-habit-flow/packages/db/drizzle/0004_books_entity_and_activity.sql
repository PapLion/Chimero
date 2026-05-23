CREATE TABLE IF NOT EXISTS `books` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `title_key` text NOT NULL,
  `shelf` text DEFAULT 'tbr' NOT NULL,
  `status` text DEFAULT 'planned' NOT NULL,
  `started_date` text,
  `finished_date` text,
  `rating_tenths` integer,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `books_title_key_idx` ON `books` (`title_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `books_shelf_idx` ON `books` (`shelf`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `books_status_idx` ON `books` (`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `book_activities` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `book_id` integer NOT NULL,
  `activity_type` text NOT NULL,
  `date_str` text NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `book_activities_book_idx` ON `book_activities` (`book_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `book_activities_type_idx` ON `book_activities` (`activity_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `book_activities_date_idx` ON `book_activities` (`date_str`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `book_activities_read_date_unique` ON `book_activities` (`book_id`, `date_str`) WHERE `activity_type` = 'read';

CREATE TABLE IF NOT EXISTS `workout_routines` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `tracker_id` integer NOT NULL,
  `name` text NOT NULL,
  `notes` text,
  `load_unit` text NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_routines_tracker_idx` ON `workout_routines` (`tracker_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_routines_tracker_name_idx` ON `workout_routines` (`tracker_id`, `name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_routine_exercises` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `routine_id` integer NOT NULL,
  `exercise_key` text NOT NULL,
  `source_exercise_id` text,
  `exercise_name` text NOT NULL,
  `category_snapshot` text,
  `level_snapshot` text,
  `equipment_snapshot` text,
  `body_part_snapshot` text,
  `secondary_body_part_snapshot` text,
  `force_snapshot` text,
  `mechanic_snapshot` text,
  `order_index` integer DEFAULT 0 NOT NULL,
  `target_sets` integer DEFAULT 1 NOT NULL,
  `target_reps` integer,
  `default_load` real,
  FOREIGN KEY (`routine_id`) REFERENCES `workout_routines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_routine_exercises_routine_idx` ON `workout_routine_exercises` (`routine_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_routine_exercises_order_idx` ON `workout_routine_exercises` (`routine_id`, `order_index`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_routine_exercises_exercise_idx` ON `workout_routine_exercises` (`exercise_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_sessions` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `routine_id` integer,
  `session_name` text,
  `duration_minutes` integer,
  `load_unit` text NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  `updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`routine_id`) REFERENCES `workout_routines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_sessions_routine_idx` ON `workout_sessions` (`routine_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_sessions_load_unit_idx` ON `workout_sessions` (`load_unit`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_session_exercises` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `session_entry_id` integer NOT NULL,
  `exercise_key` text NOT NULL,
  `source_exercise_id` text,
  `exercise_name` text NOT NULL,
  `category_snapshot` text,
  `level_snapshot` text,
  `equipment_snapshot` text,
  `body_part_snapshot` text,
  `secondary_body_part_snapshot` text,
  `force_snapshot` text,
  `mechanic_snapshot` text,
  `order_index` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`session_entry_id`) REFERENCES `workout_sessions`(`entry_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_session_exercises_session_idx` ON `workout_session_exercises` (`session_entry_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_session_exercises_order_idx` ON `workout_session_exercises` (`session_entry_id`, `order_index`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_session_exercises_exercise_idx` ON `workout_session_exercises` (`exercise_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_sets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `session_exercise_id` integer NOT NULL,
  `set_index` integer NOT NULL,
  `reps` integer,
  `load` real,
  FOREIGN KEY (`session_exercise_id`) REFERENCES `workout_session_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_sets_session_exercise_idx` ON `workout_sets` (`session_exercise_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_sets_set_idx` ON `workout_sets` (`session_exercise_id`, `set_index`);

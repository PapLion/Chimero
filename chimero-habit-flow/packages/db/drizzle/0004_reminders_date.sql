-- One-off reminder date (YYYY-MM-DD); null = recurring by days
ALTER TABLE `reminders` ADD COLUMN `date` text;

-- Persist "completed" state so done reminders stay in UI (Completed section)
ALTER TABLE `reminders` ADD COLUMN `completed_at` integer;

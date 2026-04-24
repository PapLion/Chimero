/**
 * Central type re-exports for frontend.
 * All types used in frontend come from single source: @packages/db
 */
export type {
  // Database types
  Tracker,
  TrackerConfig,
  TrackerInsert,
  Entry,
  EntryInsert,
  Asset,
  Reminder,
  ReminderInsert,
  Contact,
  ContactInsert,
  ContactUpdate,
  ContactInteraction,
  ContactInteractionInsert,
  // Correlation types
  CorrelationResult,
  CorrelationMetadata,
  EnhancedCorrelationResult,
  CorrelationCalculationOptions,
  // Schema types
  TrackerSchemaType,
  TrackerUIType,
} from '@packages/db'
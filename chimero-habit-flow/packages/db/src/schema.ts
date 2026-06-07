import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";

// --- 1. CONFIGURACIÓN & USUARIO ---
// Guardamos preferencias globales (Dark mode, Start of week, etc.)
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(), // Singleton (siempre id: 1)
  theme: text("theme").default("dark"),
  currency: text("currency").default("USD"),
  language: text("language").default("es"),
  weightUnit: text("weight_unit", { enum: ["kg", "lb"] }).default("kg"),
  measureUnit: text("measure_unit", { enum: ["cm", "in"] }).default("cm"),
  dashboardLayout: text("dashboard_layout", { mode: "json" }), // JSON: [{ id, trackerId, position, size }]
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
});

// --- 2. TRACKERS (La definición de qué rastreamos) ---
export const trackers = sqliteTable("trackers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // Ej: "Peso", "Humor", "CS2 Kills"
  type: text("type", { enum: ["numeric", "range", "binary", "text", "composite"] }).notNull(),
  
  // UX Config
  icon: text("icon"), // String para icono (ej: "lucide:dumbbell")
  color: text("color"), // Hex code
  order: integer("order").default(0), // Para el Drag & Drop
  
  // Configuración JSON para validar la entrada
  // Ej: { "min": 1, "max": 10, "unit": "kg", "step": 0.5 }
  config: text("config", { mode: "json" }).default("{}"),

  // Distingue trackers predefinidos (Weight, Mood...) de los creados por el usuario
  isCustom: integer("is_custom", { mode: "boolean" }).default(false),
  isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),

  archived: integer("archived", { mode: "boolean" }).default(false),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
});

// --- 3. ENTRIES (Los datos reales - Data Heavy) ---
// Optimizada para escrituras rápidas y lecturas por rango de fecha
export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackerId: integer("tracker_id").references(() => trackers.id, { onDelete: "cascade" }).notNull(),
  
  // Valor primario para gráficos rápidos (eje Y)
  // Si es un tracker complejo, esto puede ser null o un valor calculado
  value: real("value"), 
  
  // "Last time I ate tacos" -> Tacos es el tag, value es 1 (cantidad)
  note: text("note"), 
  
  // Data rica para Custom Trackers
  // Ej. Gym: { "exercises": [{ "name": "Bench", "weight": 100 }] }
  metadata: text("metadata", { mode: "json" }).default("{}"),
  
  // Optional asset attachment (image/video) linked to the entry
  assetId: integer("asset_id").references(() => assets.id, { onDelete: "set null" }),
  
  // Fecha exacta (Milisegundos) para "Mood multiple times a day"
  timestamp: integer("timestamp").notNull(),
  
  // Fecha normalizada (YYYY-MM-DD) para agrupaciones rápidas SQL sin calcular fechas
  dateStr: text("date_str").notNull(), 
}, (table) => ({
  // Índices para velocidad extrema en queries
  trackerIdx: index("tracker_idx").on(table.trackerId),
  dateIdx: index("date_idx").on(table.dateStr), // Para "Dame datos de Marzo"
  timestampIdx: index("timestamp_idx").on(table.timestamp), // Para ordenamiento cronológico
}));

// --- 4. REMINDERS (Notificaciones / Recordatorios) ---
// Recurring: time (HH:MM) + days (0-6). One-off: optional date (YYYY-MM-DD). Main process cron checks every 60s.
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackerId: integer("tracker_id").references(() => trackers.id, { onDelete: "set null" }), // Opcional
  title: text("title").notNull(),
  description: text("description"), // Optional note for the reminder
  time: text("time").notNull(), // "HH:MM" 24h
  date: text("date"), // YYYY-MM-DD one-off; null = recurring by days
  days: text("days", { mode: "json" }).$type<number[]>(), // [0,1,2,3,4,5,6] Domingo-Sábado
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  lastTriggered: integer("last_triggered", { mode: "timestamp" }), // Evitar doble disparo
  completedAt: integer("completed_at", { mode: "timestamp" }), // Cuando el usuario marca como hecho (persiste en UI)
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
});

// --- 5. ASSETS (Archivos Locales) ---
// Files on disk in userData/assets; DB stores references only.
export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(), // Nombre físico en disco (UUID.ext)
  originalName: text("original_name"), // Nombre original subido
  path: text("path").notNull(), // Ruta relativa desde userData/assets
  type: text("type").notNull(), // 'image', 'video'
  mimeType: text("mime_type"),
  size: integer("size"),
  thumbnailPath: text("thumbnail_path"),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
});

// --- 6B. BOOKS (Entidad estructurada de lectura) ---
export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  titleKey: text("title_key").notNull(),
  shelf: text("shelf", { enum: ["tbr", "reading", "finished", "paused", "dropped"] }).notNull().default("tbr"),
  status: text("status", { enum: ["planned", "active", "completed", "paused", "dropped"] }).notNull().default("planned"),
  startedDate: text("started_date"),
  finishedDate: text("finished_date"),
  ratingTenths: integer("rating_tenths"),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => ({
  titleKeyIdx: index("books_title_key_idx").on(t.titleKey),
  shelfIdx: index("books_shelf_idx").on(t.shelf),
  statusIdx: index("books_status_idx").on(t.status),
}));

export const bookActivities = sqliteTable("book_activities", {
  entryId: integer("entry_id").primaryKey().references(() => entries.id, { onDelete: "cascade" }),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type", { enum: ["started", "read", "finished"] }).notNull(),
  dateStr: text("date_str").notNull(),
}, (t) => ({
  bookIdx: index("book_activities_book_idx").on(t.bookId),
  typeIdx: index("book_activities_type_idx").on(t.activityType),
  dateIdx: index("book_activities_date_idx").on(t.dateStr),
  readDayUnique: uniqueIndex("book_activities_read_date_unique").on(t.bookId, t.dateStr).where(sql`${t.activityType} = 'read'`),
}));

// --- 6. TAGS (Categorización transversal) ---
export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  color: text("color"),
});

// Relación Many-to-Many entre Entries y Tags
export const entriesToTags = sqliteTable("entries_to_tags", {
  entryId: integer("entry_id").references(() => entries.id, { onDelete: "cascade" }).notNull(),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.entryId, t.tagId] }),
  entryTagIdx: index("entries_to_tags_entry_idx").on(t.entryId),
  tagEntryIdx: index("entries_to_tags_tag_idx").on(t.tagId),
}));

export const tagRelationships = sqliteTable("tag_relationships", {
  parentTagId: integer("parent_tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  childTagId: integer("child_tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  relationshipType: text("relationship_type").default("parent"),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => ({
  pk: primaryKey({ columns: [t.parentTagId, t.childTagId] }),
  parentIdx: index("tag_relationships_parent_idx").on(t.parentTagId),
  childIdx: index("tag_relationships_child_idx").on(t.childTagId),
}));

export const entryWeight = sqliteTable("entry_weight", {
  entryId: integer("entry_id").primaryKey().references(() => entries.id, { onDelete: "cascade" }),
  weightValue: real("weight_value").notNull(),
  weightUnit: text("weight_unit", { enum: ["kg", "lb"] }).notNull().default("kg"),
  waistValue: real("waist_value"),
  waistUnit: text("waist_unit", { enum: ["cm", "in"] }),
  bodyFatPercentage: real("body_fat_percentage"),
}, (t) => ({
  weightUnitIdx: index("entry_weight_unit_idx").on(t.weightUnit),
}));

export const entryGaming = sqliteTable("entry_gaming", {
  entryId: integer("entry_id").primaryKey().references(() => entries.id, { onDelete: "cascade" }),
  gameTitle: text("game_title").notNull(),
  gameKey: text("game_key").notNull(),
  estimatedHours: real("estimated_hours").notNull(),
}, (t) => ({
  gameKeyIdx: index("entry_gaming_game_key_idx").on(t.gameKey),
}));

export const entryFood = sqliteTable("entry_food", {
  entryId: integer("entry_id").primaryKey().references(() => entries.id, { onDelete: "cascade" }),
  foodName: text("food_name").notNull(),
  foodKey: text("food_key").notNull(),
  calories: real("calories"),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack", "other"] }),
}, (t) => ({
  foodKeyIdx: index("entry_food_food_key_idx").on(t.foodKey),
  mealTypeIdx: index("entry_food_meal_type_idx").on(t.mealType),
}));

export const symptoms = sqliteTable("symptoms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackerId: integer("tracker_id").references(() => trackers.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  symptomKey: text("symptom_key").notNull(),
  category: text("category", { enum: ["physical", "mental", "general", "other"] }).notNull().default("general"),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => ({
  trackerIdx: index("symptoms_tracker_idx").on(t.trackerId),
  symptomKeyUnique: uniqueIndex("symptoms_tracker_key_unique").on(t.trackerId, t.symptomKey),
  categoryIdx: index("symptoms_category_idx").on(t.category),
}));

export const entryHealth = sqliteTable("entry_health", {
  entryId: integer("entry_id").primaryKey().references(() => entries.id, { onDelete: "cascade" }),
  symptomId: integer("symptom_id").references(() => symptoms.id, { onDelete: "cascade" }).notNull(),
  severity: integer("severity"),
}, (t) => ({
  symptomIdx: index("entry_health_symptom_idx").on(t.symptomId),
  severityIdx: index("entry_health_severity_idx").on(t.severity),
}));

export const trackerGoals = sqliteTable("tracker_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackerId: integer("tracker_id").references(() => trackers.id, { onDelete: "cascade" }).notNull(),
  goalType: text("goal_type", { enum: ["target", "range", "minimum", "maximum"] }).notNull().default("target"),
  targetValue: real("target_value").notNull(),
  unit: text("unit"),
  direction: text("direction", { enum: ["decrease", "increase", "maintain"] }),
  startDate: text("start_date"),
  targetDate: text("target_date"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => ({
  trackerIdx: index("tracker_goals_tracker_idx").on(t.trackerId),
  trackerActiveIdx: index("tracker_goals_tracker_active_idx").on(t.trackerId, t.active),
}));

export const assetLinks = sqliteTable("asset_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id").references(() => assets.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  relationType: text("relation_type"),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => ({
  assetIdx: index("asset_links_asset_idx").on(t.assetId),
  entityIdx: index("asset_links_entity_idx").on(t.entityType, t.entityId),
}));

// --- 7. CONTACTS (Personal CRM) ---
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  avatarAssetId: integer("avatar_asset_id").references(() => assets.id, { onDelete: "set null" }),
  birthday: text("birthday"), // ISO date string "YYYY-MM-DD"
  dateMet: text("date_met"), // ISO date string "YYYY-MM-DD"
  dateLastTalked: text("date_last_talked"), // ISO date string "YYYY-MM-DD"
  traits: text("traits"), // JSON string array, ej: '["honest","funny","reliable"]'
  notes: text("notes"),
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
});

// --- 8. CONTACT INTERACTIONS (Registro de interacciones con contactos) ---
export const contactInteractions = sqliteTable("contact_interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
  entryId: integer("entry_id").references(() => entries.id, { onDelete: "set null" }), // FK a entries (opcional)
  mood: text("mood", { enum: ["positive", "negative", "neutral"] }).notNull(),
  timestamp: integer("timestamp").notNull(),
  notes: text("notes"),
});

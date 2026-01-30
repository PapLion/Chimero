import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, primaryKey } from "drizzle-orm/sqlite-core";

// --- 1. CONFIGURACIÓN & USUARIO ---
// Guardamos preferencias globales (Dark mode, Start of week, etc.)
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(), // Singleton (siempre id: 1)
  theme: text("theme").default("dark"),
  currency: text("currency").default("USD"),
  language: text("language").default("es"),
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

// --- 4. ASSETS (Archivos Locales) ---
export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  path: text("path").notNull(), // Ruta relativa en disco local
  mimeType: text("mime_type"),
  size: integer("size"),
  
  // Thumbnail generado por sharp (base64 o ruta) para carga rápida en UI
  thumbnailPath: text("thumbnail_path"),
  
  createdAt: integer("created_at").default(sql`(strftime('%s', 'now') * 1000)`),
});

// --- 5. TAGS (Categorización transversal) ---
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
}));
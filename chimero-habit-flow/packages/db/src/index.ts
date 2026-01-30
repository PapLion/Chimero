import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// En producción, esto apuntará a app.getPath('userData')
// Por ahora, usa un path relativo para desarrollo
const sqlite = new Database('chimero.db');
export const db = drizzle(sqlite, { schema });
export * from './schema';
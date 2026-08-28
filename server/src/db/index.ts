import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const sqlite = new Database(process.env.DB_PATH ?? "park.db");
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS pieces (
    id TEXT PRIMARY KEY,
    park_id TEXT NOT NULL DEFAULT 'main',
    type TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    z INTEGER NOT NULL DEFAULT 0,
    rotation INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#e63946',
    owner_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });

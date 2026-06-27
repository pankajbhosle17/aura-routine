// db.js
// Thin wrapper around better-sqlite3. Creates the database file and tables
// on first run, and exports a single shared connection.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "aura-routine.db");

// Make sure the directory for the db file exists.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    startTime TEXT NOT NULL,      -- "HH:MM"
    duration INTEGER NOT NULL,    -- minutes
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    priority TEXT NOT NULL DEFAULT 'Medium',
    completedToday INTEGER NOT NULL DEFAULT 0,
    lastCompletedDate TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,           -- "YYYY-MM-DD"
    taskId TEXT NOT NULL,
    taskName TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    UNIQUE(date, taskId)
  );
`);

export default db;

/**
 * Database Connection and Initialization
 *
 * Manages SQLite database connection and schema initialization.
 */

import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

let db: Database.Database | null = null;

/**
 * Initialize database connection
 * @param dbPath Path to SQLite database file
 */
export function initDatabase(dbPath: string): Database.Database {
  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create or open database
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(SCHEMA_SQL);

  return db;
}

/**
 * Get database instance
 * @throws Error if database not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}

/**
 * Run a transaction
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

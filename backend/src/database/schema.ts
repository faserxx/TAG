/**
 * Database schema definition for the Terminal Adventure Game
 */

export const SCHEMA_SQL = `
-- Adventures table
CREATE TABLE IF NOT EXISTS adventures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_location_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  adventure_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  FOREIGN KEY (adventure_id) REFERENCES adventures(id) ON DELETE CASCADE
);

-- Location connections (exits)
CREATE TABLE IF NOT EXISTS location_exits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_location_id TEXT NOT NULL,
  to_location_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(from_location_id, direction)
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dialogue TEXT NOT NULL,
  is_ai_powered INTEGER DEFAULT 0,
  personality TEXT,
  ai_config TEXT,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Index for querying AI characters
CREATE INDEX IF NOT EXISTS idx_characters_ai_powered ON characters(is_ai_powered);

-- Game state table (single row for current session)
CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_location TEXT NOT NULL,
  visited_locations TEXT NOT NULL,
  inventory TEXT NOT NULL,
  flags TEXT NOT NULL,
  mode TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL
);
`;

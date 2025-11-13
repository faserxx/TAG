/**
 * Database initialization functions
 */

import initSqlJs, { Database } from 'sql.js';
import { SCHEMA_SQL } from './schema.js';
import { DEMO_ADVENTURE } from './seed.js';
import bcrypt from 'bcryptjs';
import { DatabasePersistence } from './persistence.js';

/**
 * Initialize the database with schema
 */
export async function initializeDatabase(db: Database): Promise<void> {
  // Execute schema creation
  db.exec(SCHEMA_SQL);
}

/**
 * Check if demo adventure already exists
 */
export function hasDemoAdventure(db: Database): boolean {
  const result = db.exec(
    "SELECT COUNT(*) as count FROM adventures WHERE id = 'demo-adventure'"
  );
  
  if (result.length > 0 && result[0].values.length > 0) {
    const count = result[0].values[0][0] as number;
    return count > 0;
  }
  
  return false;
}

/**
 * Seed the database with demo adventure data
 */
export function seedDemoAdventure(db: Database): void {
  // Check if demo adventure already exists
  if (hasDemoAdventure(db)) {
    console.log('Demo adventure already exists, skipping seed');
    return;
  }

  console.log('Seeding demo adventure...');

  // Insert adventure
  const { adventure, locations, exits, characters } = DEMO_ADVENTURE;
  
  db.run(
    `INSERT INTO adventures (id, name, description, start_location_id) 
     VALUES (?, ?, ?, ?)`,
    [adventure.id, adventure.name, adventure.description, adventure.start_location_id]
  );

  // Insert locations
  for (const location of locations) {
    db.run(
      `INSERT INTO locations (id, adventure_id, name, description) 
       VALUES (?, ?, ?, ?)`,
      [location.id, location.adventure_id, location.name, location.description]
    );
  }

  // Insert exits
  for (const exit of exits) {
    db.run(
      `INSERT INTO location_exits (from_location_id, to_location_id, direction) 
       VALUES (?, ?, ?)`,
      [exit.from_location_id, exit.to_location_id, exit.direction]
    );
  }

  // Insert characters
  for (const character of characters) {
    const isAiPowered = character.isAiPowered ? 1 : 0;
    const personality = character.personality || null;
    const aiConfig = character.aiConfig ? JSON.stringify(character.aiConfig) : null;
    
    db.run(
      `INSERT INTO characters (id, location_id, name, dialogue, is_ai_powered, personality, ai_config) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [character.id, character.location_id, character.name, JSON.stringify(character.dialogue), isAiPowered, personality, aiConfig]
    );
  }

  console.log('Demo adventure seeded successfully');
}

/**
 * Initialize admin credentials with default password
 */
export async function initializeAdminCredentials(db: Database): Promise<void> {
  // Check if credentials already exist
  const result = db.exec('SELECT COUNT(*) as count FROM admin_credentials');
  
  if (result.length > 0 && result[0].values.length > 0) {
    const count = result[0].values[0][0] as number;
    if (count > 0) {
      console.log('Admin credentials already exist');
      return;
    }
  }

  // Create default admin password: "admin"
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin', salt);

  db.run(
    `INSERT INTO admin_credentials (id, password_hash, salt) 
     VALUES (1, ?, ?)`,
    [passwordHash, salt]
  );

  console.log('Admin credentials initialized (default password: "admin")');
}

/**
 * Create and initialize a new database
 * @param persistence Optional persistence layer for loading/saving database
 */
export async function createDatabase(persistence?: DatabasePersistence): Promise<Database> {
  const SQL = await initSqlJs();
  let db: Database;

  // Try to load existing database
  if (persistence) {
    const existingData = await persistence.loadDatabase();
    if (existingData) {
      console.log('Loading existing database from file...');
      db = new SQL.Database(existingData);
      return db;
    }
  }

  // Create new database if no existing file
  console.log('Creating new database...');
  db = new SQL.Database();

  await initializeDatabase(db);
  seedDemoAdventure(db);
  await initializeAdminCredentials(db);

  // Save initial database
  if (persistence) {
    await persistence.saveDatabase(db.export());
    console.log('Initial database saved to file');
  }

  return db;
}

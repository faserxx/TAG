import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import { createDatabase, initializeDatabase, seedDemoAdventure, hasDemoAdventure } from './init';
import { DatabasePersistence } from './persistence';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Database Initialization', () => {
  describe('initializeDatabase', () => {
    it('should create database schema', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();

      await initializeDatabase(db);

      // Check that tables exist
      const tables = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `);

      expect(tables.length).toBeGreaterThan(0);
      const tableNames = tables[0].values.map(row => row[0]);
      
      expect(tableNames).toContain('adventures');
      expect(tableNames).toContain('locations');
      expect(tableNames).toContain('location_exits');
      expect(tableNames).toContain('characters');
      expect(tableNames).toContain('game_state');
      expect(tableNames).toContain('admin_credentials');
    });
  });

  describe('hasDemoAdventure', () => {
    it('should return false when demo adventure does not exist', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      const result = hasDemoAdventure(db);
      expect(result).toBe(false);
    });

    it('should return true when demo adventure exists', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);
      seedDemoAdventure(db);

      const result = hasDemoAdventure(db);
      expect(result).toBe(true);
    });
  });

  describe('seedDemoAdventure', () => {
    it('should seed demo adventure data', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      seedDemoAdventure(db);

      const adventures = db.exec('SELECT * FROM adventures WHERE id = ?', ['demo-adventure']);
      expect(adventures.length).toBeGreaterThan(0);
      expect(adventures[0].values.length).toBe(1);
    });

    it('should not seed demo adventure twice', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      seedDemoAdventure(db);
      seedDemoAdventure(db);

      const adventures = db.exec('SELECT COUNT(*) as count FROM adventures WHERE id = ?', ['demo-adventure']);
      const count = adventures[0].values[0][0] as number;
      expect(count).toBe(1);
    });
  });

  describe('createDatabase', () => {
    let tempDir: string;
    let testDbPath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-init-test-'));
      testDbPath = path.join(tempDir, 'test.db');
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create new database without persistence', async () => {
      const db = await createDatabase();

      expect(db).toBeDefined();
      
      // Verify schema exists
      const tables = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table'
      `);
      expect(tables.length).toBeGreaterThan(0);

      // Verify demo adventure was seeded
      const adventures = db.exec('SELECT * FROM adventures WHERE id = ?', ['demo-adventure']);
      expect(adventures.length).toBeGreaterThan(0);

      db.close();
    });

    it('should create new database and save to file with persistence', async () => {
      const persistence = new DatabasePersistence({ dbPath: testDbPath });
      
      const db = await createDatabase(persistence);

      expect(db).toBeDefined();
      
      // Verify file was created
      const fileExists = await persistence.exists();
      expect(fileExists).toBe(true);

      db.close();
    });

    it('should load existing database from file with persistence', async () => {
      const persistence = new DatabasePersistence({ dbPath: testDbPath });
      
      // Create initial database
      const db1 = await createDatabase(persistence);
      
      // Add custom data
      db1.run(
        `INSERT INTO adventures (id, name, description, start_location_id) 
         VALUES (?, ?, ?, ?)`,
        ['custom-adventure', 'Custom', 'Custom adventure', 'start']
      );
      await persistence.saveDatabase(db1.export());
      db1.close();

      // Load database again
      const db2 = await createDatabase(persistence);
      
      // Verify custom data exists
      const adventures = db2.exec('SELECT * FROM adventures WHERE id = ?', ['custom-adventure']);
      expect(adventures.length).toBeGreaterThan(0);
      expect(adventures[0].values.length).toBe(1);

      db2.close();
    });

    it('should not seed demo adventure when loading existing database', async () => {
      const persistence = new DatabasePersistence({ dbPath: testDbPath });
      
      // Create initial database
      const db1 = await createDatabase(persistence);
      
      // Delete demo adventure
      db1.run('DELETE FROM adventures WHERE id = ?', ['demo-adventure']);
      await persistence.saveDatabase(db1.export());
      db1.close();

      // Load database again
      const db2 = await createDatabase(persistence);
      
      // Verify demo adventure was not re-seeded
      const adventures = db2.exec('SELECT * FROM adventures WHERE id = ?', ['demo-adventure']);
      expect(adventures.length === 0 || adventures[0].values.length === 0).toBe(true);

      db2.close();
    });

    it('should create new database when file does not exist', async () => {
      const persistence = new DatabasePersistence({ dbPath: testDbPath });
      
      // File doesn't exist, should create new database
      const db = await createDatabase(persistence);
      
      expect(db).toBeDefined();
      
      // Verify it's a fresh database with demo adventure
      const adventures = db.exec('SELECT * FROM adventures WHERE id = ?', ['demo-adventure']);
      expect(adventures.length).toBeGreaterThan(0);

      db.close();
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabasePersistence } from './persistence';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DatabasePersistence', () => {
  let tempDir: string;
  let testDbPath: string;
  let persistence: DatabasePersistence;

  beforeEach(async () => {
    // Create a temporary directory for test database files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-test-'));
    testDbPath = path.join(tempDir, 'test.db');
    persistence = new DatabasePersistence({ dbPath: testDbPath });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadDatabase', () => {
    it('should return null when database file does not exist', async () => {
      const result = await persistence.loadDatabase();
      expect(result).toBeNull();
    });

    it('should load existing database file', async () => {
      // Create a test database file
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      await fs.writeFile(testDbPath, testData);

      const result = await persistence.loadDatabase();
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toEqual(testData);
    });

    it('should return null on file read error', async () => {
      // Create persistence with invalid path
      const invalidPersistence = new DatabasePersistence({ 
        dbPath: path.join(tempDir, 'nonexistent', 'deeply', 'nested', 'test.db')
      });
      
      const result = await invalidPersistence.loadDatabase();
      expect(result).toBeNull();
    });
  });

  describe('saveDatabase', () => {
    it('should save database to file', async () => {
      const testData = new Uint8Array([10, 20, 30, 40, 50]);
      
      await persistence.saveDatabase(testData);
      
      const savedData = await fs.readFile(testDbPath);
      expect(new Uint8Array(savedData)).toEqual(testData);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'test.db');
      const nestedPersistence = new DatabasePersistence({ dbPath: nestedPath });
      const testData = new Uint8Array([1, 2, 3]);
      
      await nestedPersistence.saveDatabase(testData);
      
      const savedData = await fs.readFile(nestedPath);
      expect(new Uint8Array(savedData)).toEqual(testData);
    });

    it('should overwrite existing database file', async () => {
      const firstData = new Uint8Array([1, 2, 3]);
      const secondData = new Uint8Array([4, 5, 6, 7]);
      
      await persistence.saveDatabase(firstData);
      await persistence.saveDatabase(secondData);
      
      const savedData = await fs.readFile(testDbPath);
      expect(new Uint8Array(savedData)).toEqual(secondData);
    });
  });

  describe('exists', () => {
    it('should return false when file does not exist', async () => {
      const result = await persistence.exists();
      expect(result).toBe(false);
    });

    it('should return true when file exists', async () => {
      await fs.writeFile(testDbPath, new Uint8Array([1, 2, 3]));
      
      const result = await persistence.exists();
      expect(result).toBe(true);
    });
  });
});

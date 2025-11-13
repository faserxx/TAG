/**
 * Database Persistence Module
 * Handles file I/O operations for SQLite database persistence
 */

import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Configuration for database persistence
 */
export interface PersistenceConfig {
  /** Path to the database file */
  dbPath: string;
}

/**
 * Handles database file I/O operations
 */
export class DatabasePersistence {
  private dbPath: string;

  /**
   * Create a new DatabasePersistence instance
   * @param config Configuration with database file path
   */
  constructor(config: PersistenceConfig) {
    this.dbPath = config.dbPath;
  }

  /**
   * Load database from file
   * @returns Database file contents as Uint8Array, or null if file doesn't exist
   */
  async loadDatabase(): Promise<Uint8Array | null> {
    try {
      const fileExists = await this.exists();
      if (!fileExists) {
        return null;
      }

      const data = await fs.readFile(this.dbPath);
      return new Uint8Array(data);
    } catch (error) {
      console.error('Error loading database:', error);
      return null;
    }
  }

  /**
   * Save database to file
   * @param data Database contents as Uint8Array
   */
  async saveDatabase(data: Uint8Array): Promise<void> {
    try {
      await this.ensureDataDirectory();
      await fs.writeFile(this.dbPath, data);
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  /**
   * Check if database file exists
   * @returns True if file exists, false otherwise
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.dbPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the data directory exists, creating it if necessary
   */
  private async ensureDataDirectory(): Promise<void> {
    const directory = path.dirname(this.dbPath);
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
      throw error;
    }
  }
}

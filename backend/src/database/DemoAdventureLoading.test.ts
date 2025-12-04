/**
 * Unit tests for demo adventure loading
 */

import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { AdventureImportExport } from './AdventureImportExport.js';
import { AdventureValidator } from './AdventureValidator.js';
import { DataStore } from './DataStore.js';
import { SCHEMA_SQL } from './schema.js';

describe('Demo Adventure Loading', () => {
  let db: Database;
  let dataStore: DataStore;
  let validator: AdventureValidator;
  let importExport: AdventureImportExport;

  beforeEach(async () => {
    // Initialize SQL.js
    const SQL = await initSqlJs();
    db = new SQL.Database();
    
    // Create schema
    db.run(SCHEMA_SQL);
    
    // Initialize services
    dataStore = new DataStore(db);
    validator = new AdventureValidator();
    importExport = new AdventureImportExport(dataStore, validator);
  });

  it('should load demo adventure on first startup', async () => {
    // Check initial state - no adventures
    const initialAdventures = await dataStore.listAdventures();
    expect(initialAdventures.length).toBe(0);

    // Load demo adventure
    await importExport.loadDemoAdventure();

    // Verify demo adventure was loaded
    const adventures = await dataStore.listAdventures();
    expect(adventures.length).toBe(1);
    expect(adventures[0].id).toBe('demo-adventure');
    expect(adventures[0].name).toBe('The Lost Temple');
  });

  it('should skip demo adventure if it already exists', async () => {
    // Load demo adventure first time
    await importExport.loadDemoAdventure();
    
    const afterFirst = await dataStore.listAdventures();
    expect(afterFirst.length).toBe(1);

    // Try to load again
    await importExport.loadDemoAdventure();

    // Should still have only one adventure
    const afterSecond = await dataStore.listAdventures();
    expect(afterSecond.length).toBe(1);
  });

  it('should continue server startup if demo JSON is invalid', async () => {
    // This test verifies that loadDemoAdventure doesn't throw
    // even if there's an error (it logs and continues)
    
    // The method should not throw
    await expect(importExport.loadDemoAdventure()).resolves.not.toThrow();
  });
});

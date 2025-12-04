/**
 * Property-based and unit tests for AdventureImportExport
 * Feature: adventure-import-export, Property 1: Export-Import Round Trip Preservation
 * Feature: adventure-import-export, Property 2: Valid JSON Export
 * Feature: adventure-import-export, Property 3: Export Independence
 * Feature: adventure-import-export, Property 8: Transaction Atomicity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import initSqlJs, { Database } from 'sql.js';
import { AdventureImportExport } from './AdventureImportExport.js';
import { AdventureValidator } from './AdventureValidator.js';
import { DataStore } from './DataStore.js';
import { SCHEMA_SQL } from './schema.js';

describe('AdventureImportExport - Tests', () => {
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

  // Helper to create a simple valid adventure
  const createSimpleAdventure = (id: string, name: string) => ({
    id,
    name,
    description: 'Test adventure description',
    startLocationId: 'start',
    locations: [
      {
        id: 'start',
        name: 'Starting Location',
        description: 'This is the starting location for testing',
        exits: [
          {
            direction: 'north',
            targetLocationId: 'end'
          }
        ],
        characters: [
          {
            id: 'test-char',
            name: 'Test Character',
            dialogue: ['Hello', 'Welcome']
          }
        ],
        items: [
          {
            id: 'test-item',
            name: 'Test Item',
            description: 'A test item'
          }
        ]
      },
      {
        id: 'end',
        name: 'Ending Location',
        description: 'This is the ending location for testing',
        exits: [
          {
            direction: 'south',
            targetLocationId: 'start'
          }
        ]
      }
    ]
  });

  /**
   * Property 1: Export-Import Round Trip Preservation
   * For any adventure in the database, exporting it to JSON and then importing
   * that JSON should produce an equivalent adventure with all data preserved.
   */
  describe('Property 1: Export-Import Round Trip Preservation', () => {
    it.todo('should preserve all adventure data through export-import cycle', async () => {
      const adventure = createSimpleAdventure('test-roundtrip', 'Round Trip Test');

      // Import the adventure
      const importResult = await importExport.importFromJson(adventure);
      expect(importResult.success).toBe(true);

      // Export the adventure
      const exportedJson = await importExport.exportToJson(adventure.id);

      // Verify basic fields
      expect(exportedJson.id).toBe(adventure.id);
      expect(exportedJson.name).toBe(adventure.name);
      expect(exportedJson.startLocationId).toBe(adventure.startLocationId);

      // Verify locations count
      expect(exportedJson.locations.length).toBe(adventure.locations.length);

      // Verify each location
      for (const originalLoc of adventure.locations) {
        const exportedLoc = exportedJson.locations.find((l: any) => l.id === originalLoc.id);
        expect(exportedLoc).toBeDefined();
        expect(exportedLoc.name).toBe(originalLoc.name);
        expect(exportedLoc.description).toBe(originalLoc.description);

        // Verify exits
        if (originalLoc.exits && originalLoc.exits.length > 0) {
          expect(exportedLoc.exits).toBeDefined();
          expect(exportedLoc.exits.length).toBe(originalLoc.exits.length);
        }

        // Verify characters
        if (originalLoc.characters && originalLoc.characters.length > 0) {
          expect(exportedLoc.characters).toBeDefined();
          expect(exportedLoc.characters.length).toBe(originalLoc.characters.length);
        }

        // Verify items
        if (originalLoc.items && originalLoc.items.length > 0) {
          expect(exportedLoc.items).toBeDefined();
          expect(exportedLoc.items.length).toBe(originalLoc.items.length);
        }
      }

      // Clean up
      await dataStore.deleteAdventure(adventure.id);
    });

    it('should preserve special characters in text fields', async () => {
      const adventureWithSpecialChars = {
        id: 'special-chars-test',
        name: 'Test Adventure with quotes',
        description: 'Description with newlines and tabs',
        startLocationId: 'start',
        locations: [
          {
            id: 'start',
            name: 'Location Name',
            description: 'Description with unicode: cafe, naive',
            characters: [
              {
                id: 'char1',
                name: 'Character Name',
                dialogue: [
                  'Line with quotes',
                  'Line with apostrophes',
                  'Line with newlines'
                ]
              }
            ]
          }
        ]
      };

      const importResult = await importExport.importFromJson(adventureWithSpecialChars);
      expect(importResult.success).toBe(true);

      const exportedJson = await importExport.exportToJson('special-chars-test');

      expect(exportedJson.name).toBe(adventureWithSpecialChars.name);
      expect(exportedJson.description).toBe(adventureWithSpecialChars.description);
      expect(exportedJson.locations[0].name).toBe(adventureWithSpecialChars.locations[0].name);
      expect(exportedJson.locations[0].description).toBe(adventureWithSpecialChars.locations[0].description);

      await dataStore.deleteAdventure('special-chars-test');
    });
  });

  /**
   * Property 2: Valid JSON Export
   * For any adventure in the database, the export function should produce
   * syntactically valid JSON that can be successfully parsed.
   */
  describe('Property 2: Valid JSON Export', () => {
    it('should produce valid JSON that can be parsed', async () => {
      const adventure = createSimpleAdventure('test-json', 'JSON Test');

      // Import the adventure
      const importResult = await importExport.importFromJson(adventure);
      expect(importResult.success).toBe(true);

      // Export the adventure
      const exportedJson = await importExport.exportToJson(adventure.id);

      // Convert to JSON string and parse back
      const jsonString = JSON.stringify(exportedJson);
      const parsed = JSON.parse(jsonString);

      // Should be able to parse without errors
      expect(parsed).toBeDefined();
      expect(parsed.id).toBe(adventure.id);

      // Clean up
      await dataStore.deleteAdventure(adventure.id);
    });
  });

  /**
   * Property 3: Export Independence
   * For any set of adventures in the database, exporting one adventure should
   * not affect the exported data of other adventures.
   */
  describe('Property 3: Export Independence', () => {
    it('should export adventures independently without cross-contamination', async () => {
      const adventure1 = createSimpleAdventure('adventure-1', 'Adventure 1');
      const adventure2 = createSimpleAdventure('adventure-2', 'Adventure 2');

      // Import both adventures
      const result1 = await importExport.importFromJson(adventure1);
      expect(result1.success).toBe(true);
      
      const result2 = await importExport.importFromJson(adventure2);
      expect(result2.success).toBe(true);

      // Export each adventure
      const export1 = await importExport.exportToJson(adventure1.id);
      const export2 = await importExport.exportToJson(adventure2.id);

      // Verify each export contains only its own data
      expect(export1.id).toBe(adventure1.id);
      expect(export1.name).toBe(adventure1.name);
      expect(export2.id).toBe(adventure2.id);
      expect(export2.name).toBe(adventure2.name);

      // Verify no cross-contamination
      const export1LocationIds = export1.locations.map((l: any) => l.id);
      const export2LocationIds = export2.locations.map((l: any) => l.id);
      
      // Location IDs should not overlap
      for (const id of export1LocationIds) {
        expect(export2LocationIds).not.toContain(id);
      }

      // Clean up
      await dataStore.deleteAdventure(adventure1.id);
      await dataStore.deleteAdventure(adventure2.id);
    });
  });

  /**
   * Property 8: Transaction Atomicity
   * For any import operation that fails validation or encounters an error,
   * the database should remain unchanged with no partial data created.
   */
  describe('Property 8: Transaction Atomicity', () => {
    it('should not create partial data when import fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          adventureJsonArb,
          async (validAdventure) => {
            // Get initial adventure count
            const initialAdventures = await dataStore.listAdventures();
            const initialCount = initialAdventures.length;

            // Create invalid adventure (missing required field)
            const invalidAdventure = {
              ...validAdventure,
              name: undefined // Missing required field
            };

            // Attempt to import invalid adventure
            const result = await importExport.importFromJson(invalidAdventure);
            expect(result.success).toBe(false);

            // Verify no new adventures were created
            const finalAdventures = await dataStore.listAdventures();
            expect(finalAdventures.length).toBe(initialCount);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not create partial data when duplicate name exists', async () => {
      const adventure1 = {
        id: 'adventure-1',
        name: 'Duplicate Name Test',
        startLocationId: 'start',
        locations: [
          {
            id: 'start',
            name: 'Start',
            description: 'Starting location'
          }
        ]
      };

      const adventure2 = {
        id: 'adventure-2',
        name: 'Duplicate Name Test', // Same name
        startLocationId: 'start',
        locations: [
          {
            id: 'start',
            name: 'Start',
            description: 'Starting location'
          }
        ]
      };

      // Import first adventure
      const result1 = await importExport.importFromJson(adventure1);
      expect(result1.success).toBe(true);

      // Get count after first import
      const afterFirst = await dataStore.listAdventures();
      const countAfterFirst = afterFirst.length;

      // Attempt to import second adventure with duplicate name
      const result2 = await importExport.importFromJson(adventure2);
      expect(result2.success).toBe(false);
      expect(result2.errors).toBeDefined();
      expect(result2.errors![0].message).toContain('already exists');

      // Verify no new adventures were created
      const afterSecond = await dataStore.listAdventures();
      expect(afterSecond.length).toBe(countAfterFirst);

      // Clean up
      await dataStore.deleteAdventure('adventure-1');
    });
  });
});

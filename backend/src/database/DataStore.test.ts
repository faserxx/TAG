import { describe, it, expect, beforeEach, vi } from 'vitest';
import initSqlJs from 'sql.js';
import { DataStore } from './DataStore';
import { Adventure, GameMode } from '../types/index.js';
import { initializeDatabase } from './init.js';
import { DatabasePersistence } from './persistence.js';

describe('DataStore', () => {
  let dataStore: DataStore;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    await initializeDatabase(db);
    dataStore = new DataStore(db);
  });

  describe('adventure operations', () => {
    it('should save and load an adventure', async () => {
      const adventure: Adventure = {
        id: 'test-adventure',
        name: 'Test Adventure',
        description: 'A test adventure',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Starting Location',
            description: 'You are at the start',
            exits: new Map([['north', 'end']]),
            characters: [],
            items: []
          }],
          ['end', {
            id: 'end',
            name: 'End Location',
            description: 'You reached the end',
            exits: new Map(),
            characters: [],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStore.saveAdventure(adventure);
      const loaded = await dataStore.loadAdventure('test-adventure');

      expect(loaded.id).toBe('test-adventure');
      expect(loaded.name).toBe('Test Adventure');
      expect(loaded.locations.size).toBe(2);
      expect(loaded.locations.get('start')?.name).toBe('Starting Location');
    });

    it('should list all adventures', async () => {
      const adventure1: Adventure = {
        id: 'adventure-1',
        name: 'Adventure 1',
        description: 'First adventure',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStore.saveAdventure(adventure1);
      const adventures = await dataStore.listAdventures();

      expect(adventures.length).toBeGreaterThan(0);
      expect(adventures.some(a => a.id === 'adventure-1')).toBe(true);
    });

    it('should delete an adventure', async () => {
      const adventure: Adventure = {
        id: 'delete-test',
        name: 'Delete Test',
        description: 'Will be deleted',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start',
            exits: new Map(),
            characters: [],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStore.saveAdventure(adventure);
      await dataStore.deleteAdventure('delete-test');

      await expect(dataStore.loadAdventure('delete-test')).rejects.toThrow();
    });

    it('should save adventure with characters', async () => {
      const adventure: Adventure = {
        id: 'char-test',
        name: 'Character Test',
        description: 'Test with characters',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [
              {
                id: 'char-1',
                name: 'Guard',
                dialogue: ['Hello', 'Welcome'],
                currentDialogueIndex: 0
              }
            ],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStore.saveAdventure(adventure);
      const loaded = await dataStore.loadAdventure('char-test');

      expect(loaded.locations.get('start')?.characters).toHaveLength(1);
      expect(loaded.locations.get('start')?.characters[0].name).toBe('Guard');
    });
  });

  describe('game state operations', () => {
    it('should save and load game state', async () => {
      const state = {
        currentLocation: 'test-location',
        visitedLocations: new Set(['test-location', 'other-location']),
        inventory: [{ id: 'item-1', name: 'Sword', description: 'A sword' }],
        flags: new Map([['quest-done', true]]),
        mode: GameMode.Player
      };

      await dataStore.saveGameState(state);
      const loaded = await dataStore.loadGameState();

      expect(loaded).not.toBeNull();
      expect(loaded?.currentLocation).toBe('test-location');
      expect(loaded?.visitedLocations.has('test-location')).toBe(true);
      expect(loaded?.inventory).toHaveLength(1);
      expect(loaded?.flags.get('quest-done')).toBe(true);
    });

    it('should return null when no game state exists', async () => {
      const loaded = await dataStore.loadGameState();
      expect(loaded).toBeNull();
    });

    it('should update existing game state', async () => {
      const state1 = {
        currentLocation: 'location-1',
        visitedLocations: new Set(['location-1']),
        inventory: [],
        flags: new Map(),
        mode: GameMode.Player
      };

      await dataStore.saveGameState(state1);

      const state2 = {
        currentLocation: 'location-2',
        visitedLocations: new Set(['location-1', 'location-2']),
        inventory: [],
        flags: new Map(),
        mode: GameMode.Player
      };

      await dataStore.saveGameState(state2);
      const loaded = await dataStore.loadGameState();

      expect(loaded?.currentLocation).toBe('location-2');
      expect(loaded?.visitedLocations.size).toBe(2);
    });
  });

  describe('persistence integration', () => {
    it('should call persistence.saveDatabase after saveAdventure', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      const mockPersistence = {
        saveDatabase: vi.fn().mockResolvedValue(undefined),
        loadDatabase: vi.fn(),
        exists: vi.fn()
      } as unknown as DatabasePersistence;

      const dataStoreWithPersistence = new DataStore(db, mockPersistence);

      const adventure: Adventure = {
        id: 'persist-test',
        name: 'Persist Test',
        description: 'Test persistence',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStoreWithPersistence.saveAdventure(adventure);

      expect(mockPersistence.saveDatabase).toHaveBeenCalledTimes(1);
      expect(mockPersistence.saveDatabase).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should call persistence.saveDatabase after deleteAdventure', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      const mockPersistence = {
        saveDatabase: vi.fn().mockResolvedValue(undefined),
        loadDatabase: vi.fn(),
        exists: vi.fn()
      } as unknown as DatabasePersistence;

      const dataStoreWithPersistence = new DataStore(db, mockPersistence);

      const adventure: Adventure = {
        id: 'delete-persist-test',
        name: 'Delete Persist Test',
        description: 'Test delete persistence',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStoreWithPersistence.saveAdventure(adventure);
      vi.clearAllMocks();

      await dataStoreWithPersistence.deleteAdventure('delete-persist-test');

      expect(mockPersistence.saveDatabase).toHaveBeenCalledTimes(1);
    });

    it('should call persistence.saveDatabase after saveGameState', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      const mockPersistence = {
        saveDatabase: vi.fn().mockResolvedValue(undefined),
        loadDatabase: vi.fn(),
        exists: vi.fn()
      } as unknown as DatabasePersistence;

      const dataStoreWithPersistence = new DataStore(db, mockPersistence);

      const state = {
        currentLocation: 'test-location',
        visitedLocations: new Set(['test-location']),
        inventory: [],
        flags: new Map(),
        mode: GameMode.Player
      };

      await dataStoreWithPersistence.saveGameState(state);

      expect(mockPersistence.saveDatabase).toHaveBeenCalledTimes(1);
      expect(mockPersistence.saveDatabase).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should not fail when persistence is not provided', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      const dataStoreNoPersistence = new DataStore(db);

      const adventure: Adventure = {
        id: 'no-persist-test',
        name: 'No Persist Test',
        description: 'Test without persistence',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [],
            items: []
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await expect(dataStoreNoPersistence.saveAdventure(adventure)).resolves.not.toThrow();
    });

    it('should handle persistence errors gracefully', async () => {
      const SQL = await initSqlJs();
      const db = new SQL.Database();
      await initializeDatabase(db);

      const mockPersistence = {
        saveDatabase: vi.fn().mockRejectedValue(new Error('Disk full')),
        loadDatabase: vi.fn(),
        exists: vi.fn()
      } as unknown as DatabasePersistence;

      const dataStoreWithPersistence = new DataStore(db, mockPersistence);

      const state = {
        currentLocation: 'test-location',
        visitedLocations: new Set(['test-location']),
        inventory: [],
        flags: new Map(),
        mode: GameMode.Player
      };

      // Should not throw even if persistence fails
      await expect(dataStoreWithPersistence.saveGameState(state)).resolves.not.toThrow();
    });
  });
});

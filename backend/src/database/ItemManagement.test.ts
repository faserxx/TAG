import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import { DataStore } from './DataStore';
import { Adventure, GameMode } from '../types/index.js';
import { initializeDatabase } from './init.js';

describe('Item Management System', () => {
  let dataStore: DataStore;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    await initializeDatabase(db);
    dataStore = new DataStore(db);
  });

  describe('Item Persistence', () => {
    it('should save and load items with adventures', async () => {
      const adventure: Adventure = {
        id: 'test-adventure',
        name: 'Test Adventure',
        description: 'A test adventure with items',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Starting Location',
            description: 'You are at the start',
            exits: new Map(),
            characters: [],
            items: [
              {
                id: 'key-123',
                name: 'Ancient Key',
                description: 'A rusty iron key with strange symbols.'
              },
              {
                id: 'torch-456',
                name: 'Torch',
                description: 'A wooden torch that provides light.'
              }
            ]
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStore.saveAdventure(adventure);
      const loaded = await dataStore.loadAdventure('test-adventure');

      expect(loaded.locations.get('start')?.items.length).toBe(2);
      expect(loaded.locations.get('start')?.items[0].id).toBe('key-123');
      expect(loaded.locations.get('start')?.items[0].name).toBe('Ancient Key');
      expect(loaded.locations.get('start')?.items[1].id).toBe('torch-456');
    });

    it('should update items when adventure is re-saved', async () => {
      const adventure: Adventure = {
        id: 'update-test',
        name: 'Update Test',
        description: 'Testing item updates',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [],
            items: [
              {
                id: 'item-1',
                name: 'Item 1',
                description: 'First item'
              }
            ]
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      // Save initial version
      await dataStore.saveAdventure(adventure);

      // Update items
      adventure.locations.get('start')!.items = [
        {
          id: 'item-2',
          name: 'Item 2',
          description: 'Second item'
        },
        {
          id: 'item-3',
          name: 'Item 3',
          description: 'Third item'
        }
      ];

      // Save updated version
      await dataStore.saveAdventure(adventure);

      // Load and verify
      const loaded = await dataStore.loadAdventure('update-test');
      expect(loaded.locations.get('start')?.items.length).toBe(2);
      expect(loaded.locations.get('start')?.items[0].id).toBe('item-2');
      expect(loaded.locations.get('start')?.items[1].id).toBe('item-3');
    });

    it('should delete items when location is deleted (cascade)', async () => {
      const adventure: Adventure = {
        id: 'cascade-test',
        name: 'Cascade Test',
        description: 'Testing cascade delete',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map(),
            characters: [],
            items: []
          }],
          ['room', {
            id: 'room',
            name: 'Room',
            description: 'A room with items',
            exits: new Map(),
            characters: [],
            items: [
              {
                id: 'item-1',
                name: 'Item 1',
                description: 'An item'
              }
            ]
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      // Save with items
      await dataStore.saveAdventure(adventure);

      // Remove location with items
      adventure.locations.delete('room');
      await dataStore.saveAdventure(adventure);

      // Load and verify items are gone
      const loaded = await dataStore.loadAdventure('cascade-test');
      expect(loaded.locations.has('room')).toBe(false);
      expect(loaded.locations.size).toBe(1);
    });

    it('should handle empty item arrays', async () => {
      const adventure: Adventure = {
        id: 'empty-items',
        name: 'Empty Items',
        description: 'No items',
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

      await dataStore.saveAdventure(adventure);
      const loaded = await dataStore.loadAdventure('empty-items');

      expect(loaded.locations.get('start')?.items).toEqual([]);
    });

    it('should handle multiple locations with items', async () => {
      const adventure: Adventure = {
        id: 'multi-location',
        name: 'Multi Location',
        description: 'Multiple locations with items',
        startLocationId: 'start',
        locations: new Map([
          ['start', {
            id: 'start',
            name: 'Start',
            description: 'Start location',
            exits: new Map([['north', 'room1']]),
            characters: [],
            items: [
              {
                id: 'item-start',
                name: 'Start Item',
                description: 'Item at start'
              }
            ]
          }],
          ['room1', {
            id: 'room1',
            name: 'Room 1',
            description: 'First room',
            exits: new Map([['south', 'start'], ['east', 'room2']]),
            characters: [],
            items: [
              {
                id: 'item-room1',
                name: 'Room 1 Item',
                description: 'Item in room 1'
              }
            ]
          }],
          ['room2', {
            id: 'room2',
            name: 'Room 2',
            description: 'Second room',
            exits: new Map([['west', 'room1']]),
            characters: [],
            items: [
              {
                id: 'item-room2',
                name: 'Room 2 Item',
                description: 'Item in room 2'
              }
            ]
          }]
        ]),
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      await dataStore.saveAdventure(adventure);
      const loaded = await dataStore.loadAdventure('multi-location');

      expect(loaded.locations.get('start')?.items.length).toBe(1);
      expect(loaded.locations.get('room1')?.items.length).toBe(1);
      expect(loaded.locations.get('room2')?.items.length).toBe(1);
      expect(loaded.locations.get('start')?.items[0].id).toBe('item-start');
      expect(loaded.locations.get('room1')?.items[0].id).toBe('item-room1');
      expect(loaded.locations.get('room2')?.items[0].id).toBe('item-room2');
    });
  });

  describe('Inventory Persistence', () => {
    it('should save and load inventory in game state', async () => {
      const gameState = {
        currentLocation: 'start',
        visitedLocations: new Set(['start']),
        inventory: [
          {
            id: 'key-123',
            name: 'Ancient Key',
            description: 'A rusty iron key'
          },
          {
            id: 'torch-456',
            name: 'Torch',
            description: 'A wooden torch'
          }
        ],
        flags: new Map(),
        mode: GameMode.Player
      };

      await dataStore.saveGameState(gameState);
      const loaded = await dataStore.loadGameState();

      expect(loaded?.inventory.length).toBe(2);
      expect(loaded?.inventory[0].id).toBe('key-123');
      expect(loaded?.inventory[1].id).toBe('torch-456');
    });

    it('should handle empty inventory', async () => {
      const gameState = {
        currentLocation: 'start',
        visitedLocations: new Set(['start']),
        inventory: [],
        flags: new Map(),
        mode: GameMode.Player
      };

      await dataStore.saveGameState(gameState);
      const loaded = await dataStore.loadGameState();

      expect(loaded?.inventory).toEqual([]);
    });

    it('should update inventory when game state is re-saved', async () => {
      const gameState = {
        currentLocation: 'start',
        visitedLocations: new Set(['start']),
        inventory: [
          {
            id: 'item-1',
            name: 'Item 1',
            description: 'First item'
          }
        ],
        flags: new Map(),
        mode: GameMode.Player
      };

      // Save initial state
      await dataStore.saveGameState(gameState);

      // Update inventory
      gameState.inventory.push({
        id: 'item-2',
        name: 'Item 2',
        description: 'Second item'
      });

      // Save updated state
      await dataStore.saveGameState(gameState);

      // Load and verify
      const loaded = await dataStore.loadGameState();
      expect(loaded?.inventory.length).toBe(2);
      expect(loaded?.inventory[1].id).toBe('item-2');
    });
  });
});

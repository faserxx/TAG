import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from './GameState';
import { GameMode } from '../types';

describe('GameState', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState('start-location');
  });

  describe('location management', () => {
    it('should initialize with start location', () => {
      expect(gameState.getCurrentLocation()).toBe('start-location');
    });

    it('should update current location', () => {
      gameState.setCurrentLocation('new-location');
      expect(gameState.getCurrentLocation()).toBe('new-location');
    });

    it('should track visited locations', () => {
      gameState.setCurrentLocation('location-1');
      gameState.setCurrentLocation('location-2');
      
      expect(gameState.hasVisited('location-1')).toBe(true);
      expect(gameState.hasVisited('location-2')).toBe(true);
      expect(gameState.hasVisited('location-3')).toBe(false);
    });

    it('should return all visited locations', () => {
      gameState.setCurrentLocation('location-1');
      gameState.setCurrentLocation('location-2');
      
      const visited = gameState.getVisitedLocations();
      expect(visited).toContain('location-1');
      expect(visited).toContain('location-2');
    });
  });

  describe('inventory management', () => {
    it('should start with empty inventory', () => {
      expect(gameState.getInventory()).toEqual([]);
    });

    it('should add items to inventory', () => {
      const item = { id: 'item-1', name: 'Sword', description: 'A sharp sword' };
      gameState.addItem(item);
      
      expect(gameState.hasItem('item-1')).toBe(true);
      expect(gameState.getInventory()).toHaveLength(1);
    });

    it('should remove items from inventory', () => {
      const item = { id: 'item-1', name: 'Sword', description: 'A sharp sword' };
      gameState.addItem(item);
      
      const removed = gameState.removeItem('item-1');
      expect(removed).toBe(true);
      expect(gameState.hasItem('item-1')).toBe(false);
    });

    it('should return false when removing non-existent item', () => {
      const removed = gameState.removeItem('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('flag management', () => {
    it('should set and get flags', () => {
      gameState.setFlag('quest-completed', true);
      expect(gameState.getFlag('quest-completed')).toBe(true);
    });

    it('should check if flag exists', () => {
      gameState.setFlag('test-flag', 'value');
      expect(gameState.hasFlag('test-flag')).toBe(true);
      expect(gameState.hasFlag('non-existent')).toBe(false);
    });

    it('should remove flags', () => {
      gameState.setFlag('temp-flag', 'value');
      const removed = gameState.removeFlag('temp-flag');
      
      expect(removed).toBe(true);
      expect(gameState.hasFlag('temp-flag')).toBe(false);
    });
  });

  describe('game mode', () => {
    it('should start in player mode', () => {
      expect(gameState.getMode()).toBe(GameMode.Player);
    });

    it('should change game mode', () => {
      gameState.setMode(GameMode.Admin);
      expect(gameState.getMode()).toBe(GameMode.Admin);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      gameState.setCurrentLocation('test-location');
      gameState.addItem({ id: 'item-1', name: 'Test', description: 'Test item' });
      gameState.setFlag('test', true);
      
      const json = gameState.toJSON();
      
      expect(json.currentLocation).toBe('test-location');
      expect(json.inventory).toHaveLength(1);
      expect(json.flags.test).toBe(true);
    });

    it('should deserialize from JSON', () => {
      const data = {
        currentLocation: 'test-location',
        visitedLocations: ['test-location', 'other-location'],
        inventory: [{ id: 'item-1', name: 'Test', description: 'Test item' }],
        flags: { test: true },
        mode: GameMode.Player
      };
      
      const state = GameState.fromJSON(data);
      
      expect(state.getCurrentLocation()).toBe('test-location');
      expect(state.hasVisited('test-location')).toBe(true);
      expect(state.hasItem('item-1')).toBe(true);
      expect(state.getFlag('test')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', () => {
      gameState.setCurrentLocation('location-1');
      gameState.addItem({ id: 'item-1', name: 'Test', description: 'Test' });
      gameState.setFlag('test', true);
      gameState.setMode(GameMode.Admin);
      
      gameState.reset('new-start');
      
      expect(gameState.getCurrentLocation()).toBe('new-start');
      expect(gameState.getInventory()).toEqual([]);
      expect(gameState.hasFlag('test')).toBe(false);
      expect(gameState.getMode()).toBe(GameMode.Player);
    });
  });

  describe('map data tracking', () => {
    it('should record location visit with directional context', () => {
      gameState.recordLocationVisit('location-1', 'start-location', 'north');
      
      const mapData = gameState.getLocationMapData();
      expect(mapData).toHaveLength(1);
      expect(mapData[0].locationId).toBe('location-1');
      expect(mapData[0].visitedFrom).toBe('start-location');
      expect(mapData[0].entryDirection).toBe('north');
    });

    it('should record location visit without directional context', () => {
      gameState.recordLocationVisit('location-1');
      
      const mapData = gameState.getLocationMapData();
      expect(mapData).toHaveLength(1);
      expect(mapData[0].locationId).toBe('location-1');
      expect(mapData[0].visitedFrom).toBeUndefined();
      expect(mapData[0].entryDirection).toBeUndefined();
    });

    it('should retrieve map data', () => {
      gameState.recordLocationVisit('location-1', 'start-location', 'north');
      gameState.recordLocationVisit('location-2', 'location-1', 'east');
      
      const mapData = gameState.getLocationMapData();
      expect(mapData).toHaveLength(2);
      expect(mapData[0].locationId).toBe('location-1');
      expect(mapData[1].locationId).toBe('location-2');
    });

    it('should clear map data', () => {
      gameState.recordLocationVisit('location-1', 'start-location', 'north');
      gameState.recordLocationVisit('location-2', 'location-1', 'east');
      
      gameState.clearMapData();
      
      const mapData = gameState.getLocationMapData();
      expect(mapData).toHaveLength(0);
    });

    it('should serialize map data to JSON', () => {
      gameState.recordLocationVisit('location-1', 'start-location', 'north');
      gameState.recordLocationVisit('location-2', 'location-1', 'east');
      
      const json = gameState.toJSON();
      
      expect(json.locationMapData).toHaveLength(2);
      expect(json.locationMapData[0].locationId).toBe('location-1');
      expect(json.locationMapData[0].visitedFrom).toBe('start-location');
      expect(json.locationMapData[0].entryDirection).toBe('north');
    });

    it('should deserialize map data from JSON', () => {
      const data = {
        currentLocation: 'location-2',
        visitedLocations: ['start-location', 'location-1', 'location-2'],
        inventory: [],
        flags: {},
        mode: GameMode.Player,
        locationMapData: [
          { locationId: 'location-1', visitedFrom: 'start-location', entryDirection: 'north' },
          { locationId: 'location-2', visitedFrom: 'location-1', entryDirection: 'east' }
        ]
      };
      
      const state = GameState.fromJSON(data);
      const mapData = state.getLocationMapData();
      
      expect(mapData).toHaveLength(2);
      expect(mapData[0].locationId).toBe('location-1');
      expect(mapData[0].visitedFrom).toBe('start-location');
      expect(mapData[0].entryDirection).toBe('north');
      expect(mapData[1].locationId).toBe('location-2');
      expect(mapData[1].visitedFrom).toBe('location-1');
      expect(mapData[1].entryDirection).toBe('east');
    });

    it('should reset map data when reset is called', () => {
      gameState.recordLocationVisit('location-1', 'start-location', 'north');
      gameState.recordLocationVisit('location-2', 'location-1', 'east');
      
      gameState.reset('new-start');
      
      const mapData = gameState.getLocationMapData();
      expect(mapData).toHaveLength(0);
    });
  });
});

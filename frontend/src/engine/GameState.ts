import { GameMode, LocationMapData } from '../types';
import { apiClient } from '../api/ApiClient';

export interface Item {
  id: string;
  name: string;
  description: string;
}

export interface GameStateData {
  currentLocation: string;
  visitedLocations: Set<string>;
  inventory: Item[];
  flags: Map<string, any>;
  mode: GameMode;
  locationMapData: LocationMapData[];
}

export class GameState {
  private currentLocation: string;
  private visitedLocations: Set<string>;
  private inventory: Item[];
  private flags: Map<string, any>;
  private mode: GameMode;
  private locationMapData: LocationMapData[];

  constructor(startLocation: string = '') {
    this.currentLocation = startLocation;
    this.visitedLocations = new Set();
    this.inventory = [];
    this.flags = new Map();
    this.mode = GameMode.Player;
    this.locationMapData = [];
  }

  /**
   * Get current location ID
   */
  getCurrentLocation(): string {
    return this.currentLocation;
  }

  /**
   * Set current location and mark as visited
   */
  setCurrentLocation(locationId: string): void {
    this.currentLocation = locationId;
    this.visitedLocations.add(locationId);
  }

  /**
   * Check if a location has been visited
   */
  hasVisited(locationId: string): boolean {
    return this.visitedLocations.has(locationId);
  }

  /**
   * Get all visited locations
   */
  getVisitedLocations(): string[] {
    return Array.from(this.visitedLocations);
  }

  /**
   * Get player inventory
   */
  getInventory(): Item[] {
    return [...this.inventory];
  }

  /**
   * Add item to inventory
   */
  addItem(item: Item): void {
    this.inventory.push(item);
  }

  /**
   * Remove item from inventory
   */
  removeItem(itemId: string): boolean {
    const index = this.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if player has an item
   */
  hasItem(itemId: string): boolean {
    return this.inventory.some(item => item.id === itemId);
  }

  /**
   * Set a game flag
   */
  setFlag(key: string, value: any): void {
    this.flags.set(key, value);
  }

  /**
   * Get a game flag
   */
  getFlag(key: string): any {
    return this.flags.get(key);
  }

  /**
   * Check if a flag exists
   */
  hasFlag(key: string): boolean {
    return this.flags.has(key);
  }

  /**
   * Remove a flag
   */
  removeFlag(key: string): boolean {
    return this.flags.delete(key);
  }

  /**
   * Get current game mode
   */
  getMode(): GameMode {
    return this.mode;
  }

  /**
   * Set game mode
   */
  setMode(mode: GameMode): void {
    this.mode = mode;
  }

  /**
   * Record location visit with spatial context
   */
  recordLocationVisit(locationId: string, fromLocationId?: string, direction?: string): void {
    this.locationMapData.push({
      locationId,
      visitedFrom: fromLocationId,
      entryDirection: direction
    });
  }

  /**
   * Get map data for rendering
   */
  getLocationMapData(): LocationMapData[] {
    return [...this.locationMapData];
  }

  /**
   * Clear map data (for new adventures)
   */
  clearMapData(): void {
    this.locationMapData = [];
  }

  /**
   * Serialize state to JSON for API persistence
   */
  toJSON(): any {
    return {
      currentLocation: this.currentLocation,
      visitedLocations: Array.from(this.visitedLocations),
      inventory: this.inventory,
      flags: Object.fromEntries(this.flags),
      mode: this.mode,
      locationMapData: this.locationMapData
    };
  }

  /**
   * Load state from JSON
   */
  static fromJSON(data: any): GameState {
    const state = new GameState(data.currentLocation || '');
    
    if (data.visitedLocations) {
      state.visitedLocations = new Set(data.visitedLocations);
    }
    
    if (data.inventory) {
      state.inventory = data.inventory;
    }
    
    if (data.flags) {
      state.flags = new Map(Object.entries(data.flags));
    }
    
    if (data.mode) {
      state.mode = data.mode;
    }
    
    if (data.locationMapData) {
      state.locationMapData = data.locationMapData;
    }
    
    return state;
  }

  /**
   * Reset state to initial values
   */
  reset(startLocation: string = ''): void {
    this.currentLocation = startLocation;
    this.visitedLocations.clear();
    this.inventory = [];
    this.flags.clear();
    this.mode = GameMode.Player;
    this.locationMapData = [];
  }

  /**
   * Save state to backend API
   */
  async save(): Promise<void> {
    try {
      await apiClient.post('/game-state', this.toJSON());
    } catch (error) {
      console.error('Error saving game state:', error);
      throw error;
    }
  }

  /**
   * Load state from backend API
   */
  static async load(): Promise<GameState | null> {
    try {
      const data = await apiClient.get<any>('/game-state');
      return GameState.fromJSON(data);
    } catch (error: any) {
      // Return null if no saved state exists
      if (error.code === 'NOT_FOUND') {
        return null;
      }
      console.error('Error loading game state:', error);
      throw error;
    }
  }
}

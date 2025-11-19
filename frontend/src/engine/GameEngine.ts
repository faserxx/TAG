import { GameState } from './GameState';
import { Location } from './Location';
import { CharacterManager } from './CharacterManager';
import { CommandResult } from '../types';
import { apiClient } from '../api/ApiClient';

export interface Adventure {
  id: string;
  name: string;
  description: string;
  startLocationId: string;
  locations: Map<string, Location>;
  createdAt?: Date;
  modifiedAt?: Date;
}

export class GameEngine {
  private gameState: GameState;
  private currentAdventure: Adventure | null = null;

  constructor() {
    this.gameState = new GameState();
  }

  /**
   * Load an adventure from the backend API
   */
  async loadAdventure(adventureId: string): Promise<void> {
    try {
      const data = await apiClient.get<any>(`/adventures/${adventureId}`);
      this.currentAdventure = this.parseAdventureData(data);

      // Initialize game state with starting location
      this.gameState.reset(this.currentAdventure.startLocationId);
      this.gameState.setCurrentLocation(this.currentAdventure.startLocationId);

      // Record starting location in map data
      this.gameState.recordLocationVisit(this.currentAdventure.startLocationId);

      // Save initial state
      await this.gameState.save();
    } catch (error) {
      console.error('Error loading adventure:', error);
      throw error;
    }
  }

  /**
   * Parse adventure JSON data into Adventure object
   */
  private parseAdventureData(data: any): Adventure {
    const locations = new Map<string, Location>();

    // Parse locations
    if (data.locations) {
      if (data.locations instanceof Map) {
        data.locations.forEach((locData: any, id: string) => {
          locations.set(id, Location.fromJSON(locData));
        });
      } else {
        Object.entries(data.locations).forEach(([id, locData]) => {
          locations.set(id, Location.fromJSON(locData));
        });
      }
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      startLocationId: data.startLocationId || data.start_location_id,
      locations,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : undefined
    };
  }

  /**
   * Get current location object
   */
  getCurrentLocation(): Location | null {
    if (!this.currentAdventure) {
      return null;
    }

    const locationId = this.gameState.getCurrentLocation();
    return this.currentAdventure.locations.get(locationId) || null;
  }

  /**
   * Get game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get current adventure
   */
  getCurrentAdventure(): Adventure | null {
    return this.currentAdventure;
  }

  /**
   * Handle move command
   */
  async handleMove(direction: string): Promise<CommandResult> {
    const currentLocation = this.getCurrentLocation();

    if (!currentLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_LOCATION',
          message: 'No adventure loaded',
          suggestion: 'Load an adventure first'
        }
      };
    }

    // Normalize direction
    const normalizedDirection = direction.toLowerCase();

    // Check if exit exists
    if (!currentLocation.hasExit(normalizedDirection)) {
      const availableExits = Array.from(currentLocation.getExits().keys()).join(', ');
      return {
        success: false,
        output: [],
        error: {
          code: 'INVALID_DIRECTION',
          message: `You cannot go ${direction} from here.`,
          suggestion: availableExits 
            ? `Available exits: ${availableExits}` 
            : 'There are no exits from this location.'
        }
      };
    }

    // Get target location
    const targetLocationId = currentLocation.getExit(normalizedDirection);
    if (!targetLocationId) {
      return {
        success: false,
        output: [],
        error: {
          code: 'INVALID_EXIT',
          message: 'Exit configuration error',
          suggestion: 'This exit is not properly configured'
        }
      };
    }

    // Check if target location exists
    const targetLocation = this.currentAdventure?.locations.get(targetLocationId);
    if (!targetLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Target location not found',
          suggestion: 'This location may not exist in the adventure'
        }
      };
    }

    // Capture previous location before moving
    const previousLocationId = this.gameState.getCurrentLocation();

    // Move to new location
    this.gameState.setCurrentLocation(targetLocationId);

    // Record location visit with directional context
    this.gameState.recordLocationVisit(targetLocationId, previousLocationId, normalizedDirection);

    // Save state
    try {
      await this.gameState.save();
    } catch (error) {
      console.error('Failed to save game state:', error);
    }

    // Return location description
    return {
      success: true,
      output: targetLocation.getFormattedDescription(),
      error: undefined
    };
  }

  /**
   * Handle talk command
   */
  async handleTalk(characterName?: string): Promise<CommandResult> {
    const currentLocation = this.getCurrentLocation();

    if (!currentLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_LOCATION',
          message: 'No adventure loaded',
          suggestion: 'Load an adventure first'
        }
      };
    }

    const characters = currentLocation.getCharacters();

    // If no character name provided, list available characters
    if (!characterName) {
      if (characters.length === 0) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_CHARACTERS',
            message: 'There is no one here to talk to.',
            suggestion: 'Try exploring other locations'
          }
        };
      }

      const charList = characters.map(c => c.name).join(', ');
      return {
        success: true,
        output: [`You can talk to: ${charList}`],
        error: undefined
      };
    }

    // Find the character
    const character = currentLocation.findCharacter(characterName);

    if (!character) {
      const charList = characters.map(c => c.name).join(', ');
      return {
        success: false,
        output: [],
        error: {
          code: 'CHARACTER_NOT_FOUND',
          message: `${characterName} is not here.`,
          suggestion: characters.length > 0 
            ? `Available characters: ${charList}` 
            : 'There is no one here to talk to.'
        }
      };
    }

    // Get dialogue from character
    const dialogue = CharacterManager.getNextDialogue(character);
    const formattedDialogue = CharacterManager.formatDialogue(character, dialogue);

    return {
      success: true,
      output: formattedDialogue,
      error: undefined
    };
  }

  /**
   * Handle look command
   */
  async handleLook(): Promise<CommandResult> {
    const currentLocation = this.getCurrentLocation();

    if (!currentLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_LOCATION',
          message: 'No adventure loaded',
          suggestion: 'Load an adventure first'
        }
      };
    }

    return {
      success: true,
      output: currentLocation.getFormattedDescription(),
      error: undefined
    };
  }

  /**
   * Handle take command - pick up an item from the current location
   */
  async handleTake(itemIdentifier: string): Promise<CommandResult> {
    const currentLocation = this.getCurrentLocation();

    if (!currentLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_LOCATION',
          message: 'No adventure loaded',
          suggestion: 'Load an adventure first'
        }
      };
    }

    // Find the item in the current location
    const item = currentLocation.findItem(itemIdentifier);

    if (!item) {
      const items = currentLocation.getItems();
      return {
        success: false,
        output: [],
        error: {
          code: 'ITEM_NOT_FOUND',
          message: `You don't see ${itemIdentifier} here.`,
          suggestion: items.length > 0 
            ? `Available items: ${items.map(i => i.name).join(', ')}` 
            : 'There are no items here.'
        }
      };
    }

    // Remove item from location
    currentLocation.removeItem(item.id);

    // Add item to inventory
    this.gameState.addToInventory(item);

    // Save state
    try {
      await this.gameState.save();
    } catch (error) {
      console.error('Failed to save game state:', error);
    }

    return {
      success: true,
      output: [`You take the ${item.name}.`],
      error: undefined
    };
  }

  /**
   * Handle drop command - drop an item from inventory into current location
   */
  async handleDrop(itemIdentifier: string): Promise<CommandResult> {
    const currentLocation = this.getCurrentLocation();

    if (!currentLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_LOCATION',
          message: 'No adventure loaded',
          suggestion: 'Load an adventure first'
        }
      };
    }

    // Find the item in inventory
    const item = this.gameState.findInInventory(itemIdentifier);

    if (!item) {
      const inventory = this.gameState.getInventory();
      return {
        success: false,
        output: [],
        error: {
          code: 'ITEM_NOT_IN_INVENTORY',
          message: `You don't have ${itemIdentifier}.`,
          suggestion: inventory.length > 0 
            ? `You are carrying: ${inventory.map(i => i.name).join(', ')}` 
            : 'Your inventory is empty.'
        }
      };
    }

    // Remove item from inventory
    this.gameState.removeFromInventory(item.id);

    // Add item to current location
    currentLocation.addItem(item);

    // Save state
    try {
      await this.gameState.save();
    } catch (error) {
      console.error('Failed to save game state:', error);
    }

    return {
      success: true,
      output: [`You drop the ${item.name}.`],
      error: undefined
    };
  }

  /**
   * Handle examine command - view detailed description of an item
   */
  async handleExamine(itemIdentifier: string): Promise<CommandResult> {
    const currentLocation = this.getCurrentLocation();

    if (!currentLocation) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_LOCATION',
          message: 'No adventure loaded',
          suggestion: 'Load an adventure first'
        }
      };
    }

    // Search for item in current location first
    let item = currentLocation.findItem(itemIdentifier);

    // If not found in location, search inventory
    if (!item) {
      item = this.gameState.findInInventory(itemIdentifier);
    }

    if (!item) {
      const locationItems = currentLocation.getItems();
      const inventoryItems = this.gameState.getInventory();
      const allItems = [...locationItems, ...inventoryItems];
      
      return {
        success: false,
        output: [],
        error: {
          code: 'ITEM_NOT_AVAILABLE',
          message: `You don't see ${itemIdentifier} here or in your inventory.`,
          suggestion: allItems.length > 0 
            ? `Available items: ${allItems.map(i => i.name).join(', ')}` 
            : 'There are no items available.'
        }
      };
    }

    return {
      success: true,
      output: [
        `\n=== ${item.name} ===`,
        item.description
      ],
      error: undefined
    };
  }

  /**
   * Handle inventory command - list all items in player inventory
   */
  async handleInventory(): Promise<CommandResult> {
    const inventory = this.gameState.getInventory();

    if (inventory.length === 0) {
      return {
        success: true,
        output: ['Your inventory is empty.'],
        error: undefined
      };
    }

    const output: string[] = ['\n=== Inventory ==='];
    
    inventory.forEach(item => {
      output.push(`${item.name} - ${item.description}`);
    });

    output.push(`\nTotal items: ${inventory.length}`);

    return {
      success: true,
      output,
      error: undefined
    };
  }

  /**
   * Reset the game
   */
  async resetGame(): Promise<void> {
    if (this.currentAdventure) {
      this.gameState.reset(this.currentAdventure.startLocationId);
      this.gameState.setCurrentLocation(this.currentAdventure.startLocationId);
      await this.gameState.save();
    }
  }

  /**
   * Load saved game state
   */
  async loadSavedState(): Promise<boolean> {
    try {
      const savedState = await GameState.load();
      if (savedState) {
        this.gameState = savedState;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading saved state:', error);
      return false;
    }
  }

  /**
   * List all available adventures
   */
  async listAdventures(): Promise<Adventure[]> {
    try {
      const data = await apiClient.get<any[]>('/adventures');
      return data.map((adventureData: any) => this.parseAdventureData(adventureData));
    } catch (error) {
      console.error('Error listing adventures:', error);
      throw error;
    }
  }
}

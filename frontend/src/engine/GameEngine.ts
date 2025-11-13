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

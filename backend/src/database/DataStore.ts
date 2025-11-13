/**
 * DataStore class for managing SQLite database operations
 */

import { Database } from 'sql.js';
import {
  Adventure,
  Location,
  Character,
  GameState,
  GameMode,
  AdventureRow,
  LocationRow,
  ExitRow,
  CharacterRow,
  GameStateRow
} from '../types/index.js';
import { DatabasePersistence } from './persistence.js';

export class DataStore {
  private db: Database;
  private persistence?: DatabasePersistence;

  constructor(db: Database, persistence?: DatabasePersistence) {
    this.db = db;
    this.persistence = persistence;
  }

  /**
   * Persist database changes to file
   * Handles errors gracefully without failing the operation
   */
  private async persistChanges(): Promise<void> {
    if (!this.persistence) {
      return;
    }

    try {
      const data = this.db.export();
      await this.persistence.saveDatabase(data);
    } catch (error) {
      console.error('Failed to persist database changes:', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Save an adventure to the database
   */
  async saveAdventure(adventure: Adventure): Promise<void> {
    try {
      // Check if adventure exists
      const existingAdventure = this.db.exec(
        'SELECT id FROM adventures WHERE id = ?',
        [adventure.id]
      );

      const now = new Date().toISOString();

      if (existingAdventure.length > 0 && existingAdventure[0].values.length > 0) {
        // Update existing adventure
        this.db.run(
          `UPDATE adventures 
           SET name = ?, description = ?, start_location_id = ?, modified_at = ?
           WHERE id = ?`,
          [adventure.name, adventure.description, adventure.startLocationId, now, adventure.id]
        );

        // Delete existing locations, exits, and characters (cascade will handle related data)
        this.db.run('DELETE FROM locations WHERE adventure_id = ?', [adventure.id]);
      } else {
        // Insert new adventure
        this.db.run(
          `INSERT INTO adventures (id, name, description, start_location_id, created_at, modified_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [adventure.id, adventure.name, adventure.description, adventure.startLocationId, now, now]
        );
      }

      // Insert locations
      for (const [locationId, location] of adventure.locations) {
        this.db.run(
          `INSERT INTO locations (id, adventure_id, name, description)
           VALUES (?, ?, ?, ?)`,
          [locationId, adventure.id, location.name, location.description]
        );

        // Insert exits for this location
        for (const [direction, targetLocationId] of location.exits) {
          this.db.run(
            `INSERT INTO location_exits (from_location_id, to_location_id, direction)
             VALUES (?, ?, ?)`,
            [locationId, targetLocationId, direction]
          );
        }

        // Insert characters for this location
        for (const character of location.characters) {
          const isAiPowered = character.isAiPowered ? 1 : 0;
          const personality = character.personality || null;
          const aiConfig = character.aiConfig ? JSON.stringify(character.aiConfig) : null;
          
          this.db.run(
            `INSERT INTO characters (id, location_id, name, dialogue, is_ai_powered, personality, ai_config)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [character.id, locationId, character.name, JSON.stringify(character.dialogue), isAiPowered, personality, aiConfig]
          );
        }
      }

      // Persist changes to disk
      await this.persistChanges();
    } catch (error) {
      throw new Error(`Failed to save adventure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load an adventure from the database
   */
  async loadAdventure(adventureId: string): Promise<Adventure> {
    try {
      // Load adventure metadata
      const adventureResult = this.db.exec(
        'SELECT * FROM adventures WHERE id = ?',
        [adventureId]
      );

      if (adventureResult.length === 0 || adventureResult[0].values.length === 0) {
        throw new Error(`Adventure not found: ${adventureId}`);
      }

      const adventureData = adventureResult[0];
      const adventureRow = this.rowToObject<AdventureRow>(
        adventureData.columns,
        adventureData.values[0]
      );

      // Load locations
      const locationsResult = this.db.exec(
        'SELECT * FROM locations WHERE adventure_id = ?',
        [adventureId]
      );

      const locations = new Map<string, Location>();

      if (locationsResult.length > 0) {
        const locationData = locationsResult[0];
        
        for (const row of locationData.values) {
          const locationRow = this.rowToObject<LocationRow>(locationData.columns, row);
          
          // Load exits for this location
          const exitsResult = this.db.exec(
            'SELECT * FROM location_exits WHERE from_location_id = ?',
            [locationRow.id]
          );

          const exits = new Map<string, string>();
          if (exitsResult.length > 0) {
            const exitData = exitsResult[0];
            for (const exitRow of exitData.values) {
              const exit = this.rowToObject<ExitRow>(exitData.columns, exitRow);
              exits.set(exit.direction, exit.to_location_id);
            }
          }

          // Load characters for this location
          const charactersResult = this.db.exec(
            'SELECT * FROM characters WHERE location_id = ?',
            [locationRow.id]
          );

          const characters: Character[] = [];
          if (charactersResult.length > 0) {
            const characterData = charactersResult[0];
            for (const charRow of characterData.values) {
              const characterRow = this.rowToObject<CharacterRow>(characterData.columns, charRow);
              const character: Character = {
                id: characterRow.id,
                name: characterRow.name,
                dialogue: JSON.parse(characterRow.dialogue),
                currentDialogueIndex: 0
              };
              
              // Add AI-specific fields if present
              if (characterRow.is_ai_powered === 1) {
                character.isAiPowered = true;
                character.personality = characterRow.personality || undefined;
                character.aiConfig = characterRow.ai_config ? JSON.parse(characterRow.ai_config) : undefined;
              }
              
              characters.push(character);
            }
          }

          locations.set(locationRow.id, {
            id: locationRow.id,
            name: locationRow.name,
            description: locationRow.description,
            exits,
            characters,
            items: []
          });
        }
      }

      return {
        id: adventureRow.id,
        name: adventureRow.name,
        description: adventureRow.description,
        startLocationId: adventureRow.start_location_id,
        locations,
        createdAt: new Date(adventureRow.created_at),
        modifiedAt: new Date(adventureRow.modified_at)
      };
    } catch (error) {
      throw new Error(`Failed to load adventure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all adventures
   */
  async listAdventures(): Promise<Adventure[]> {
    try {
      const result = this.db.exec('SELECT * FROM adventures ORDER BY created_at DESC');

      if (result.length === 0 || result[0].values.length === 0) {
        return [];
      }

      const adventures: Adventure[] = [];
      const data = result[0];

      for (const row of data.values) {
        const adventureRow = this.rowToObject<AdventureRow>(data.columns, row);
        
        // Load full adventure data
        const adventure = await this.loadAdventure(adventureRow.id);
        adventures.push(adventure);
      }

      return adventures;
    } catch (error) {
      throw new Error(`Failed to list adventures: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an adventure
   */
  async deleteAdventure(adventureId: string): Promise<void> {
    try {
      const result = this.db.exec(
        'SELECT id FROM adventures WHERE id = ?',
        [adventureId]
      );

      if (result.length === 0 || result[0].values.length === 0) {
        throw new Error(`Adventure not found: ${adventureId}`);
      }

      this.db.run('DELETE FROM adventures WHERE id = ?', [adventureId]);

      // Persist changes to disk
      await this.persistChanges();
    } catch (error) {
      throw new Error(`Failed to delete adventure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save game state
   */
  async saveGameState(state: GameState): Promise<void> {
    try {
      const visitedLocations = JSON.stringify(Array.from(state.visitedLocations));
      const inventory = JSON.stringify(state.inventory);
      const flags = JSON.stringify(Object.fromEntries(state.flags));
      const now = new Date().toISOString();

      // Check if game state exists
      const existingState = this.db.exec('SELECT id FROM game_state WHERE id = 1');

      if (existingState.length > 0 && existingState[0].values.length > 0) {
        // Update existing state
        this.db.run(
          `UPDATE game_state 
           SET current_location = ?, visited_locations = ?, inventory = ?, flags = ?, mode = ?, updated_at = ?
           WHERE id = 1`,
          [state.currentLocation, visitedLocations, inventory, flags, state.mode, now]
        );
      } else {
        // Insert new state
        this.db.run(
          `INSERT INTO game_state (id, current_location, visited_locations, inventory, flags, mode, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?)`,
          [state.currentLocation, visitedLocations, inventory, flags, state.mode, now]
        );
      }

      // Persist changes to disk
      await this.persistChanges();
    } catch (error) {
      throw new Error(`Failed to save game state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load game state
   */
  async loadGameState(): Promise<GameState | null> {
    try {
      const result = this.db.exec('SELECT * FROM game_state WHERE id = 1');

      if (result.length === 0 || result[0].values.length === 0) {
        return null;
      }

      const data = result[0];
      const stateRow = this.rowToObject<GameStateRow>(data.columns, data.values[0]);

      return {
        currentLocation: stateRow.current_location,
        visitedLocations: new Set(JSON.parse(stateRow.visited_locations)),
        inventory: JSON.parse(stateRow.inventory),
        flags: new Map(Object.entries(JSON.parse(stateRow.flags))),
        mode: stateRow.mode as GameMode
      };
    } catch (error) {
      throw new Error(`Failed to load game state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export database to Uint8Array for persistence
   */
  export(): Uint8Array {
    return this.db.export();
  }

  /**
   * Get AI-powered characters in a specific location
   */
  async getAiCharactersByLocation(locationId: string): Promise<Character[]> {
    try {
      const result = this.db.exec(
        'SELECT * FROM characters WHERE location_id = ? AND is_ai_powered = 1',
        [locationId]
      );

      if (result.length === 0 || result[0].values.length === 0) {
        return [];
      }

      const characters: Character[] = [];
      const data = result[0];

      for (const row of data.values) {
        const characterRow = this.rowToObject<CharacterRow>(data.columns, row);
        const character: Character = {
          id: characterRow.id,
          name: characterRow.name,
          dialogue: JSON.parse(characterRow.dialogue),
          currentDialogueIndex: 0,
          isAiPowered: true,
          personality: characterRow.personality || undefined,
          aiConfig: characterRow.ai_config ? JSON.parse(characterRow.ai_config) : undefined
        };
        characters.push(character);
      }

      return characters;
    } catch (error) {
      throw new Error(`Failed to get AI characters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    this.db.close();
  }

  /**
   * Helper method to convert SQL row to typed object
   */
  private rowToObject<T>(columns: string[], values: any[]): T {
    const obj: any = {};
    columns.forEach((col, index) => {
      obj[col] = values[index];
    });
    return obj as T;
  }
}

/**
 * Adventure import/export service
 */

import { DataStore } from './DataStore.js';
import { AdventureValidator, ValidationError } from './AdventureValidator.js';
import { Adventure, Location, Character, Item } from '../types/index.js';

export interface ImportResult {
  success: boolean;
  adventureId?: string;
  errors?: ValidationError[];
}

export class AdventureImportExport {
  constructor(
    private dataStore: DataStore,
    private validator: AdventureValidator
  ) {}

  /**
   * Import adventure from JSON
   */
  async importFromJson(json: any, options?: { replace?: boolean }): Promise<ImportResult> {
    try {
      // Validate JSON
      const validationResult = this.validator.validateAdventureJson(json);
      if (!validationResult.valid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Check for duplicate adventure name
      const existingAdventures = await this.dataStore.listAdventures();
      const duplicateName = existingAdventures.find(adv => adv.name === json.name);
      
      if (duplicateName) {
        // If replace option is not set, return error indicating duplicate exists
        if (!options?.replace) {
          return {
            success: false,
            errors: [{
              field: 'name',
              message: `Adventure with name "${json.name}" already exists. Use replace option to overwrite.`,
              value: json.name
            }]
          };
        }
        
        // Delete the existing adventure before importing
        await this.dataStore.deleteAdventure(duplicateName.id);
      }

      // Convert JSON to Adventure type
      const adventure = this.convertJsonToAdventure(json);

      // Save to database
      await this.dataStore.saveAdventure(adventure);

      return {
        success: true,
        adventureId: adventure.id
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error during import'
        }]
      };
    }
  }

  /**
   * Export adventure to JSON
   */
  async exportToJson(adventureId: string): Promise<any> {
    const adventure = await this.dataStore.loadAdventure(adventureId);
    return this.convertAdventureToJson(adventure);
  }

  /**
   * Load demo adventure from JSON file
   */
  async loadDemoAdventure(): Promise<void> {
    try {
      // Check if demo adventure already exists
      const existingAdventures = await this.dataStore.listAdventures();
      const demoExists = existingAdventures.some(adv => adv.id === 'demo-adventure');
      
      if (demoExists) {
        console.log('Demo adventure already exists, skipping import');
        return;
      }

      // Load demo adventure JSON
      const demoJson = await import('../../data/demo-adventure.json', { assert: { type: 'json' } });
      
      // Import demo adventure
      const result = await this.importFromJson(demoJson.default);
      
      if (result.success) {
        console.log('Demo adventure imported successfully');
      } else {
        console.error('Failed to import demo adventure:', result.errors);
      }
    } catch (error) {
      console.error('Error loading demo adventure:', error);
      // Don't throw - allow server to continue
    }
  }

  /**
   * Convert JSON format to internal Adventure type
   */
  private convertJsonToAdventure(json: any): Adventure {
    const locations = new Map<string, Location>();

    // Process each location
    for (const locationJson of json.locations) {
      const exits = new Map<string, string>();
      
      // Process exits
      if (locationJson.exits) {
        for (const exit of locationJson.exits) {
          exits.set(exit.direction, exit.targetLocationId);
        }
      }

      // Process characters
      const characters: Character[] = [];
      if (locationJson.characters) {
        for (const charJson of locationJson.characters) {
          const character: Character = {
            id: charJson.id,
            name: charJson.name,
            dialogue: charJson.dialogue || [],
            currentDialogueIndex: 0
          };

          if (charJson.isAiPowered) {
            character.isAiPowered = true;
            character.personality = charJson.personality;
            character.aiConfig = charJson.aiConfig;
          }

          characters.push(character);
        }
      }

      // Process items
      const items: Item[] = [];
      if (locationJson.items) {
        for (const itemJson of locationJson.items) {
          items.push({
            id: itemJson.id,
            name: itemJson.name,
            description: itemJson.description
          });
        }
      }

      // Create location
      const location: Location = {
        id: locationJson.id,
        name: locationJson.name,
        description: locationJson.description,
        exits,
        characters,
        items
      };

      locations.set(locationJson.id, location);
    }

    // Create adventure
    return {
      id: json.id,
      name: json.name,
      description: json.description || '',
      startLocationId: json.startLocationId,
      locations,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }

  /**
   * Convert internal Adventure type to JSON format
   */
  private convertAdventureToJson(adventure: Adventure): any {
    const locations = [];

    // Process each location
    for (const [, location] of adventure.locations) {
      const exits = [];
      
      // Process exits
      for (const [direction, targetLocationId] of location.exits) {
        exits.push({
          direction,
          targetLocationId
        });
      }

      // Process characters
      const characters = location.characters.map(char => {
        const charJson: any = {
          id: char.id,
          name: char.name,
          dialogue: char.dialogue
        };

        if (char.isAiPowered) {
          charJson.isAiPowered = true;
          charJson.personality = char.personality;
          if (char.aiConfig) {
            charJson.aiConfig = char.aiConfig;
          }
        }

        return charJson;
      });

      // Process items
      const items = location.items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description
      }));

      // Create location JSON
      const locationJson: any = {
        id: location.id,
        name: location.name,
        description: location.description
      };

      if (exits.length > 0) {
        locationJson.exits = exits;
      }

      if (characters.length > 0) {
        locationJson.characters = characters;
      }

      if (items.length > 0) {
        locationJson.items = items;
      }

      locations.push(locationJson);
    }

    // Create adventure JSON
    const adventureJson: any = {
      id: adventure.id,
      name: adventure.name,
      startLocationId: adventure.startLocationId,
      locations
    };

    if (adventure.description) {
      adventureJson.description = adventure.description;
    }

    return adventureJson;
  }
}

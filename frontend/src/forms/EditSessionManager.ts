/**
 * EditSessionManager coordinates interactive editing sessions for game entities
 */

import { FormEditor, FormConfig, FieldConfig, FormResult } from './FormEditor';
import { TerminalInterface } from '../terminal/TerminalInterface';
import { AdministrationSystem } from '../admin/AdministrationSystem';
import { Adventure } from '../engine/GameEngine';
import { Location, Character } from '../engine/Location';
import { CommandResult } from '../types';
import {
  validateLocationName,
  validateLocationDescription,
  validateCharacterName,
  validateAdventureName,
  validateAdventureDescription,
  validateDialogue,
  validateAIPersonality
} from './validators';

export class EditSessionManager {
  constructor(
    private terminal: TerminalInterface,
    private adminSystem: AdministrationSystem
  ) {}

  /**
   * Edit a location interactively
   */
  async editLocation(locationId: string): Promise<CommandResult> {
    try {
      // Get current adventure
      const adventure = this.adminSystem.getCurrentAdventure();
      if (!adventure) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_ADVENTURE',
            message: 'No adventure is currently being edited',
            suggestion: 'Use "create adventure" or "load adventure" first'
          }
        };
      }

      // Get the location
      const location = adventure.locations.get(locationId);
      if (!location) {
        return {
          success: false,
          output: [],
          error: {
            code: 'LOCATION_NOT_FOUND',
            message: `Location not found: ${locationId}`,
            suggestion: 'Use "show locations" to see available locations'
          }
        };
      }

      // Create form config
      const formConfig = this.createLocationForm(location);

      // Run the form editor
      const formEditor = new FormEditor(this.terminal, formConfig);
      const result = await formEditor.edit();

      // If cancelled, return early
      if (result.cancelled) {
        return {
          success: false,
          output: ['Edit cancelled. No changes were saved.']
        };
      }

      // If no changes, return early
      if (result.changedFields.length === 0) {
        return {
          success: true,
          output: ['No changes made.']
        };
      }

      // Apply changes
      await this.applyLocationChanges(locationId, result);

      return {
        success: true,
        output: [
          `Location "${location.name}" updated successfully.`,
          `Changed fields: ${result.changedFields.join(', ')}`
        ]
      };

    } catch (error) {
      return {
        success: false,
        output: [],
        error: {
          code: 'EDIT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          suggestion: 'Check the error message and try again'
        }
      };
    }
  }

  /**
   * Edit a character interactively
   */
  async editCharacter(characterId: string): Promise<CommandResult> {
    try {
      // Get current adventure
      const adventure = this.adminSystem.getCurrentAdventure();
      if (!adventure) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_ADVENTURE',
            message: 'No adventure is currently being edited',
            suggestion: 'Use "create adventure" or "load adventure" first'
          }
        };
      }

      // Find the character in any location
      let character: Character | null = null;
      let locationId: string | null = null;

      for (const [locId, location] of adventure.locations) {
        const found = location.getCharacters().find(char => char.id === characterId);
        if (found) {
          character = found;
          locationId = locId;
          break;
        }
      }

      if (!character || !locationId) {
        return {
          success: false,
          output: [],
          error: {
            code: 'CHARACTER_NOT_FOUND',
            message: `Character not found: ${characterId}`,
            suggestion: 'Use "show characters" to see available characters'
          }
        };
      }

      // Create form config
      const formConfig = this.createCharacterForm(character);

      // Run the form editor
      const formEditor = new FormEditor(this.terminal, formConfig);
      const result = await formEditor.edit();

      // If cancelled, return early
      if (result.cancelled) {
        return {
          success: false,
          output: ['Edit cancelled. No changes were saved.']
        };
      }

      // If no changes, return early
      if (result.changedFields.length === 0) {
        return {
          success: true,
          output: ['No changes made.']
        };
      }

      // Apply changes
      await this.applyCharacterChanges(characterId, locationId, result);

      return {
        success: true,
        output: [
          `Character "${character.name}" updated successfully.`,
          `Changed fields: ${result.changedFields.join(', ')}`
        ]
      };

    } catch (error) {
      return {
        success: false,
        output: [],
        error: {
          code: 'EDIT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          suggestion: 'Check the error message and try again'
        }
      };
    }
  }

  /**
   * Edit an adventure's metadata interactively
   */
  async editAdventure(adventureId: string): Promise<CommandResult> {
    try {
      // Get current adventure
      const adventure = this.adminSystem.getCurrentAdventure();
      if (!adventure) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_ADVENTURE',
            message: 'No adventure is currently being edited',
            suggestion: 'Use "create adventure" or "load adventure" first'
          }
        };
      }

      // Verify the adventure ID matches
      if (adventure.id !== adventureId) {
        return {
          success: false,
          output: [],
          error: {
            code: 'ADVENTURE_MISMATCH',
            message: `Adventure ${adventureId} is not currently loaded`,
            suggestion: `Load adventure ${adventureId} first with "load adventure ${adventureId}"`
          }
        };
      }

      // Create form config
      const formConfig = this.createAdventureForm(adventure);

      // Run the form editor
      const formEditor = new FormEditor(this.terminal, formConfig);
      const result = await formEditor.edit();

      // If cancelled, return early
      if (result.cancelled) {
        return {
          success: false,
          output: ['Edit cancelled. No changes were saved.']
        };
      }

      // If no changes, return early
      if (result.changedFields.length === 0) {
        return {
          success: true,
          output: ['No changes made.']
        };
      }

      // Apply changes
      await this.applyAdventureChanges(result);

      return {
        success: true,
        output: [
          `Adventure "${adventure.name}" updated successfully.`,
          `Changed fields: ${result.changedFields.join(', ')}`
        ]
      };

    } catch (error) {
      return {
        success: false,
        output: [],
        error: {
          code: 'EDIT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          suggestion: 'Check the error message and try again'
        }
      };
    }
  }

  /**
   * Create a new item interactively
   */
  async createItem(): Promise<CommandResult> {
    try {
      // Get current adventure
      const adventure = this.adminSystem.getCurrentAdventure();
      if (!adventure) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_ADVENTURE',
            message: 'No adventure is currently being edited',
            suggestion: 'Use "create adventure" or "load adventure" first'
          }
        };
      }

      // Get current location
      const locationId = this.adminSystem.getCurrentLocationId();
      if (!locationId) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_LOCATION',
            message: 'No location selected',
            suggestion: 'Use "select location <id>" to select a location first'
          }
        };
      }

      // Create form config for new item
      const formConfig = this.createItemForm(null);

      // Run the form editor
      const formEditor = new FormEditor(this.terminal, formConfig);
      const result = await formEditor.edit();

      // If cancelled, return early
      if (result.cancelled) {
        return {
          success: false,
          output: ['Item creation cancelled.']
        };
      }

      // Create the item
      const name = result.values.get('name') as string;
      const description = result.values.get('description') as string;

      const itemId = this.adminSystem.addItemToCurrentLocation(name, description);

      return {
        success: true,
        output: [
          `Item "${name}" created successfully.`,
          `Item ID: ${itemId}`
        ]
      };

    } catch (error) {
      return {
        success: false,
        output: [],
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          suggestion: 'Check the error message and try again'
        }
      };
    }
  }

  /**
   * Edit an item interactively
   */
  async editItem(itemId: string): Promise<CommandResult> {
    try {
      // Get current adventure
      const adventure = this.adminSystem.getCurrentAdventure();
      if (!adventure) {
        return {
          success: false,
          output: [],
          error: {
            code: 'NO_ADVENTURE',
            message: 'No adventure is currently being edited',
            suggestion: 'Use "create adventure" or "load adventure" first'
          }
        };
      }

      // Find the item in any location
      const result = this.adminSystem.findItem(itemId);

      if (!result) {
        return {
          success: false,
          output: [],
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Item not found: ${itemId}`,
            suggestion: 'Use "show items" to see available items'
          }
        };
      }

      const { item } = result;

      // Create form config
      const formConfig = this.createItemForm(item);

      // Run the form editor
      const formEditor = new FormEditor(this.terminal, formConfig);
      const formResult = await formEditor.edit();

      // If cancelled, return early
      if (formResult.cancelled) {
        return {
          success: false,
          output: ['Edit cancelled. No changes were saved.']
        };
      }

      // If no changes, return early
      if (formResult.changedFields.length === 0) {
        return {
          success: true,
          output: ['No changes made.']
        };
      }

      // Apply changes
      await this.applyItemChanges(itemId, formResult);

      return {
        success: true,
        output: [
          `Item "${item.name}" updated successfully.`,
          `Changed fields: ${formResult.changedFields.join(', ')}`
        ]
      };

    } catch (error) {
      return {
        success: false,
        output: [],
        error: {
          code: 'EDIT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          suggestion: 'Check the error message and try again'
        }
      };
    }
  }

  /**
   * Create form configuration for location editing
   */
  private createLocationForm(location: Location): FormConfig {
    const fields: FieldConfig[] = [
      {
        name: 'name',
        label: 'Location Name',
        currentValue: location.name,
        helpText: 'A short, descriptive name for this location (max 100 characters)',
        required: true,
        validator: validateLocationName
      },
      {
        name: 'description',
        label: 'Description',
        currentValue: location.description,
        helpText: 'A detailed description of what the player sees (min 10 characters)',
        multiLine: true,
        required: true,
        validator: validateLocationDescription
      }
    ];

    return {
      title: `Editing Location: ${location.name}`,
      fields
    };
  }

  /**
   * Create form configuration for character editing
   */
  private createCharacterForm(character: Character): FormConfig {
    const fields: FieldConfig[] = [
      {
        name: 'name',
        label: 'Character Name',
        currentValue: character.name,
        helpText: 'The name of this character (max 50 characters)',
        required: true,
        validator: validateCharacterName
      }
    ];

    // Add dialogue field for non-AI characters
    if (!character.isAiPowered) {
      fields.push({
        name: 'dialogue',
        label: 'Dialogue Lines',
        currentValue: character.dialogue,
        helpText: 'The lines this character can say (at least one required)',
        isDialogue: true,
        required: true,
        validator: validateDialogue
      });
    }

    // Add personality field for AI characters
    if (character.isAiPowered) {
      fields.push({
        name: 'personality',
        label: 'AI Personality',
        currentValue: character.personality || '',
        helpText: 'Personality description for the AI character (max 500 characters)',
        multiLine: true,
        required: true,
        validator: validateAIPersonality
      });
    }

    return {
      title: `Editing Character: ${character.name}${character.isAiPowered ? ' (AI)' : ''}`,
      fields
    };
  }

  /**
   * Create form configuration for adventure editing
   */
  private createAdventureForm(adventure: Adventure): FormConfig {
    const fields: FieldConfig[] = [
      {
        name: 'name',
        label: 'Adventure Name',
        currentValue: adventure.name,
        helpText: 'The title of this adventure (max 100 characters)',
        required: true,
        validator: validateAdventureName
      },
      {
        name: 'description',
        label: 'Description',
        currentValue: adventure.description,
        helpText: 'A description of this adventure (optional, min 10 characters if provided)',
        multiLine: true,
        required: false,
        validator: validateAdventureDescription
      }
    ];

    return {
      title: `Editing Adventure: ${adventure.name}`,
      fields
    };
  }

  /**
   * Apply location changes using AdminSystem
   */
  private async applyLocationChanges(locationId: string, result: FormResult): Promise<void> {
    // Update name if changed
    if (result.changedFields.includes('name')) {
      const newName = result.values.get('name') as string;
      this.adminSystem.updateLocationName(locationId, newName);
    }

    // Update description if changed
    if (result.changedFields.includes('description')) {
      const newDescription = result.values.get('description');
      const descriptionText = Array.isArray(newDescription) 
        ? newDescription.join('\n') 
        : newDescription as string;
      this.adminSystem.updateLocationDescription(locationId, descriptionText);
    }
  }

  /**
   * Apply character changes using AdminSystem
   */
  private async applyCharacterChanges(characterId: string, locationId: string, result: FormResult): Promise<void> {
    const adventure = this.adminSystem.getCurrentAdventure();
    if (!adventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = adventure.locations.get(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    const characters = location.getCharacters();
    const characterIndex = characters.findIndex(char => char.id === characterId);
    if (characterIndex === -1) {
      throw new Error(`Character not found: ${characterId}`);
    }

    const character = characters[characterIndex];

    // Create updated character object
    const updatedCharacter: Character = { ...character };

    // Update name if changed
    if (result.changedFields.includes('name')) {
      updatedCharacter.name = result.values.get('name') as string;
    }

    // Update dialogue if changed (non-AI characters)
    if (result.changedFields.includes('dialogue')) {
      const newDialogue = result.values.get('dialogue');
      updatedCharacter.dialogue = Array.isArray(newDialogue) ? newDialogue : [newDialogue as string];
      updatedCharacter.currentDialogueIndex = 0; // Reset dialogue index
    }

    // Update personality if changed (AI characters)
    if (result.changedFields.includes('personality')) {
      const newPersonality = result.values.get('personality');
      const personalityText = Array.isArray(newPersonality) 
        ? newPersonality.join('\n') 
        : newPersonality as string;
      this.adminSystem.updateCharacterPersonality(characterId, personalityText);
      return; // updateCharacterPersonality handles the update
    }

    // Update the character in the location
    const updatedCharacters = [...characters];
    updatedCharacters[characterIndex] = updatedCharacter;

    // Create new location with updated characters
    const updatedLocation = new Location(
      location.id,
      location.name,
      location.description,
      location.getExits(),
      updatedCharacters,
      location.getItems()
    );

    // Update the location in the adventure
    adventure.locations.set(locationId, updatedLocation);
    adventure.modifiedAt = new Date();
  }

  /**
   * Apply adventure changes using AdminSystem
   */
  private async applyAdventureChanges(result: FormResult): Promise<void> {
    // Update name if changed
    if (result.changedFields.includes('name')) {
      const newName = result.values.get('name') as string;
      this.adminSystem.updateAdventureTitle(newName);
    }

    // Update description if changed
    if (result.changedFields.includes('description')) {
      const newDescription = result.values.get('description');
      const descriptionText = Array.isArray(newDescription) 
        ? newDescription.join('\n') 
        : newDescription as string;
      this.adminSystem.updateAdventureDescription(descriptionText);
    }
  }

  /**
   * Create form configuration for item editing/creation
   */
  private createItemForm(item: any | null): FormConfig {
    const fields: FieldConfig[] = [
      {
        name: 'name',
        label: 'Item Name',
        currentValue: item?.name || '',
        helpText: 'A short, descriptive name for this item (max 100 characters)',
        required: true,
        validator: (value: string | string[]) => {
          const text = Array.isArray(value) ? value.join('') : value;
          if (!text || text.trim().length === 0) {
            return 'Item name is required';
          }
          if (text.length > 100) {
            return 'Item name must be 100 characters or less';
          }
          return null;
        }
      },
      {
        name: 'description',
        label: 'Description',
        currentValue: item?.description || '',
        helpText: 'A detailed description of the item (min 10 characters)',
        multiLine: true,
        required: true,
        validator: (value: string | string[]) => {
          const text = Array.isArray(value) ? value.join('\n') : value;
          if (!text || text.trim().length === 0) {
            return 'Description is required';
          }
          if (text.trim().length < 10) {
            return 'Description must be at least 10 characters';
          }
          return null;
        }
      }
    ];

    return {
      title: item ? `Editing Item: ${item.name}` : 'Creating New Item',
      fields
    };
  }

  /**
   * Apply item changes using AdminSystem
   */
  private async applyItemChanges(itemId: string, result: FormResult): Promise<void> {
    // Update name if changed
    if (result.changedFields.includes('name')) {
      const newName = result.values.get('name') as string;
      this.adminSystem.updateItemName(itemId, newName);
    }

    // Update description if changed
    if (result.changedFields.includes('description')) {
      const newDescription = result.values.get('description');
      const descriptionText = Array.isArray(newDescription) 
        ? newDescription.join('\n') 
        : newDescription as string;
      this.adminSystem.updateItemDescription(itemId, descriptionText);
    }
  }
}

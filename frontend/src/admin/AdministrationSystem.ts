/**
 * Administration system for creating and managing adventures
 */

import { Adventure } from '../engine/GameEngine';
import { Location, Character } from '../engine/Location';
import { apiClient } from '../api/ApiClient';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class AdministrationSystem {
  private currentAdventure: Adventure | null = null;
  private currentLocationId: string | null = null;

  /**
   * Create a new adventure
   */
  createAdventure(name: string): Adventure {
    const id = this.generateId(name);
    
    this.currentAdventure = {
      id,
      name,
      description: '',
      startLocationId: '',
      locations: new Map(),
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    return this.currentAdventure;
  }

  /**
   * Get current adventure
   */
  getCurrentAdventure(): Adventure | null {
    return this.currentAdventure;
  }

  /**
   * Set current adventure (for editing existing adventures)
   */
  setCurrentAdventure(adventure: Adventure): void {
    this.currentAdventure = adventure;
  }

  /**
   * Add a location to the current adventure
   */
  addLocation(name: string, description: string): string {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const id = this.generateId(name);
    
    const location = new Location(id, name, description);
    this.currentAdventure.locations.set(id, location);

    // If this is the first location, set it as the starting location
    if (this.currentAdventure.locations.size === 1) {
      this.currentAdventure.startLocationId = id;
    }

    // Set as current location for adding characters
    this.currentLocationId = id;

    return id;
  }

  /**
   * Add a character to a specific location
   */
  addCharacter(locationId: string, name: string, dialogue: string[]): string {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = this.currentAdventure.locations.get(locationId);
    
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    const id = this.generateId(name);
    
    const character: Character = {
      id,
      name,
      dialogue,
      currentDialogueIndex: 0
    };

    location.addCharacter(character);

    return id;
  }

  /**
   * Add a character to the current location
   */
  addCharacterToCurrentLocation(name: string, dialogue: string[]): string {
    if (!this.currentLocationId) {
      throw new Error('No current location set. Add a location first.');
    }

    return this.addCharacter(this.currentLocationId, name, dialogue);
  }

  /**
   * Add an AI-powered character to the current location
   */
  addAiCharacterToCurrentLocation(name: string, personality: string): string {
    if (!this.currentLocationId) {
      throw new Error('No current location set. Add a location first.');
    }

    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = this.currentAdventure.locations.get(this.currentLocationId);
    
    if (!location) {
      throw new Error(`Location not found: ${this.currentLocationId}`);
    }

    // Validate personality length
    if (personality.length > 500) {
      throw new Error('Personality description must be 500 characters or less');
    }

    // Check for duplicate AI character names within the adventure
    for (const [, loc] of this.currentAdventure.locations) {
      const existingChars = loc.getCharacters();
      for (const char of existingChars) {
        if (char.isAiPowered && char.name.toLowerCase() === name.toLowerCase()) {
          throw new Error(`An AI character named "${name}" already exists in this adventure`);
        }
      }
    }

    const id = this.generateId(name);
    
    const character: Character = {
      id,
      name,
      dialogue: [], // AI characters don't use scripted dialogue
      currentDialogueIndex: 0,
      isAiPowered: true,
      personality,
      aiConfig: {
        temperature: 0.8,
        maxTokens: 150
      }
    };

    location.addCharacter(character);

    return id;
  }

  /**
   * Update the personality of an AI character
   */
  updateCharacterPersonality(characterId: string, newPersonality: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    // Validate personality length
    if (newPersonality.length > 500) {
      throw new Error('Personality description must be 500 characters or less');
    }

    // Find the character in any location
    let foundCharacter: Character | null = null;
    let foundLocation: Location | null = null;

    for (const [, location] of this.currentAdventure.locations) {
      const characters = location.getCharacters();
      const character = characters.find(char => char.id === characterId);
      
      if (character) {
        foundCharacter = character;
        foundLocation = location;
        break;
      }
    }

    if (!foundCharacter || !foundLocation) {
      throw new Error(`Character not found: ${characterId}`);
    }

    // Update the personality
    foundCharacter.personality = newPersonality;
  }

  /**
   * Update AI configuration for a character
   */
  updateAiConfig(characterId: string, temperature?: number, maxTokens?: number): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    // Validate parameters
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 500)) {
      throw new Error('Max tokens must be between 1 and 500');
    }

    // Find the character in any location
    let foundCharacter: Character | null = null;

    for (const [, location] of this.currentAdventure.locations) {
      const characters = location.getCharacters();
      const character = characters.find(char => char.id === characterId);
      
      if (character) {
        foundCharacter = character;
        break;
      }
    }

    if (!foundCharacter) {
      throw new Error(`Character not found: ${characterId}`);
    }

    // Initialize aiConfig if it doesn't exist
    if (!foundCharacter.aiConfig) {
      foundCharacter.aiConfig = {};
    }

    // Update configuration
    if (temperature !== undefined) {
      foundCharacter.aiConfig.temperature = temperature;
    }

    if (maxTokens !== undefined) {
      foundCharacter.aiConfig.maxTokens = maxTokens;
    }
  }

  /**
   * Connect two locations with a directional exit
   */
  connectLocations(fromId: string, toId: string, direction: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const fromLocation = this.currentAdventure.locations.get(fromId);
    const toLocation = this.currentAdventure.locations.get(toId);

    if (!fromLocation) {
      throw new Error(`Source location not found: ${fromId}`);
    }

    if (!toLocation) {
      throw new Error(`Target location not found: ${toId}`);
    }

    fromLocation.addExit(direction.toLowerCase(), toId);
  }

  /**
   * Get current location ID
   */
  getCurrentLocationId(): string | null {
    return this.currentLocationId;
  }

  /**
   * Set current location
   */
  setCurrentLocation(locationId: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    if (!this.currentAdventure.locations.has(locationId)) {
      throw new Error(`Location not found: ${locationId}`);
    }

    this.currentLocationId = locationId;
  }

  /**
   * Validate the current adventure
   */
  validateAdventure(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.currentAdventure) {
      errors.push('No adventure is currently being edited');
      return { isValid: false, errors, warnings };
    }

    // Check if adventure has a name
    if (!this.currentAdventure.name || this.currentAdventure.name.trim() === '') {
      errors.push('Adventure must have a name');
    }

    // Check if adventure has at least one location
    if (this.currentAdventure.locations.size === 0) {
      errors.push('Adventure must have at least one location');
    }

    // Check if starting location is set
    if (!this.currentAdventure.startLocationId) {
      errors.push('Adventure must have a starting location');
    } else if (!this.currentAdventure.locations.has(this.currentAdventure.startLocationId)) {
      errors.push('Starting location does not exist in adventure');
    }

    // Check if all locations are reachable from start
    if (this.currentAdventure.locations.size > 0 && this.currentAdventure.startLocationId) {
      const reachable = this.getReachableLocations(this.currentAdventure.startLocationId);
      const unreachable: string[] = [];

      for (const [locationId, location] of this.currentAdventure.locations) {
        if (!reachable.has(locationId)) {
          unreachable.push(location.name);
        }
      }

      if (unreachable.length > 0) {
        warnings.push(`Some locations are not reachable from start: ${unreachable.join(', ')}`);
      }
    }

    // Check if locations have descriptions
    for (const [, location] of this.currentAdventure.locations) {
      if (!location.description || location.description.trim() === '') {
        warnings.push(`Location "${location.name}" has no description`);
      }
    }

    // Check if locations have exits
    for (const [, location] of this.currentAdventure.locations) {
      if (location.getExits().size === 0 && this.currentAdventure.locations.size > 1) {
        warnings.push(`Location "${location.name}" has no exits`);
      }
    }

    // Validate AI characters
    const aiCharacterNames = new Set<string>();
    
    for (const [, location] of this.currentAdventure.locations) {
      const characters = location.getCharacters();
      
      for (const character of characters) {
        if (character.isAiPowered) {
          // Check for duplicate AI character names
          const lowerName = character.name.toLowerCase();
          if (aiCharacterNames.has(lowerName)) {
            errors.push(`Duplicate AI character name: "${character.name}"`);
          } else {
            aiCharacterNames.add(lowerName);
          }

          // Validate personality description length
          if (character.personality && character.personality.length > 500) {
            errors.push(`AI character "${character.name}" has personality description exceeding 500 characters`);
          }

          // Validate personality exists
          if (!character.personality || character.personality.trim() === '') {
            warnings.push(`AI character "${character.name}" has no personality description`);
          }

          // Validate aiConfig parameters
          if (character.aiConfig) {
            if (character.aiConfig.temperature !== undefined) {
              if (character.aiConfig.temperature < 0 || character.aiConfig.temperature > 2) {
                errors.push(`AI character "${character.name}" has invalid temperature (must be 0-2): ${character.aiConfig.temperature}`);
              }
            }

            if (character.aiConfig.maxTokens !== undefined) {
              if (character.aiConfig.maxTokens < 1 || character.aiConfig.maxTokens > 500) {
                errors.push(`AI character "${character.name}" has invalid max tokens (must be 1-500): ${character.aiConfig.maxTokens}`);
              }
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get all locations reachable from a starting location
   */
  private getReachableLocations(startId: string): Set<string> {
    if (!this.currentAdventure) {
      return new Set();
    }

    const reachable = new Set<string>();
    const queue: string[] = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      if (reachable.has(currentId)) {
        continue;
      }

      reachable.add(currentId);

      const location = this.currentAdventure.locations.get(currentId);
      if (location) {
        for (const [, targetId] of location.getExits()) {
          if (!reachable.has(targetId)) {
            queue.push(targetId);
          }
        }
      }
    }

    return reachable;
  }

  /**
   * Save the current adventure to the backend
   */
  async saveAdventure(sessionId: string): Promise<void> {
    if (!this.currentAdventure) {
      throw new Error('No adventure to save');
    }

    // Validate before saving
    const validation = this.validateAdventure();
    if (!validation.isValid) {
      throw new Error(`Cannot save invalid adventure: ${validation.errors.join(', ')}`);
    }

    // Update modified date
    this.currentAdventure.modifiedAt = new Date();

    try {
      await apiClient.post('/adventures', this.serializeAdventure(this.currentAdventure), sessionId);
    } catch (error) {
      throw new Error(`Failed to save adventure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all adventures
   */
  async listAdventures(): Promise<Adventure[]> {
    try {
      const data = await apiClient.get<any[]>('/adventures');
      return data.map((adv: any) => this.deserializeAdventure(adv));
    } catch (error) {
      throw new Error(`Failed to list adventures: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load an adventure by ID from the backend
   */
  async loadAdventure(adventureId: string): Promise<Adventure> {
    try {
      const data = await apiClient.get<any>(`/adventures/${adventureId}`);
      const adventure = this.deserializeAdventure(data);
      this.currentAdventure = adventure;
      this.currentLocationId = adventure.startLocationId;
      return adventure;
    } catch (error) {
      throw new Error(`Failed to load adventure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the current adventure (deselect)
   */
  clearCurrentAdventure(): void {
    this.currentAdventure = null;
    this.currentLocationId = null;
  }

  /**
   * Update the title of the current adventure
   */
  updateAdventureTitle(title: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    if (!title || title.trim() === '') {
      throw new Error('Title cannot be empty');
    }

    this.currentAdventure.name = title;
    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Update the description of the current adventure
   */
  updateAdventureDescription(description: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    this.currentAdventure.description = description;
    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Update the name of a location
   */
  updateLocationName(locationId: string, name: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = this.currentAdventure.locations.get(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    if (!name || name.trim() === '') {
      throw new Error('Location name cannot be empty');
    }

    // Create a new location with the updated name
    const updatedLocation = new Location(
      location.id,
      name,
      location.description,
      location.getExits(),
      location.getCharacters(),
      location.getItems()
    );

    this.currentAdventure.locations.set(locationId, updatedLocation);
    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Update the description of a location
   */
  updateLocationDescription(locationId: string, description: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = this.currentAdventure.locations.get(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    // Create a new location with the updated description
    const updatedLocation = new Location(
      location.id,
      location.name,
      description,
      location.getExits(),
      location.getCharacters(),
      location.getItems()
    );

    this.currentAdventure.locations.set(locationId, updatedLocation);
    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Remove a connection from a location
   */
  removeConnection(fromLocationId: string, direction: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = this.currentAdventure.locations.get(fromLocationId);
    if (!location) {
      throw new Error(`Location not found: ${fromLocationId}`);
    }

    const exits = location.getExits();
    const normalizedDirection = direction.toLowerCase();
    
    if (!exits.has(normalizedDirection)) {
      throw new Error(`No exit in direction "${direction}" from location "${location.name}"`);
    }

    // Create a new exits map without the specified direction
    const updatedExits = new Map(exits);
    updatedExits.delete(normalizedDirection);

    // Create a new location with the updated exits
    const updatedLocation = new Location(
      location.id,
      location.name,
      location.description,
      updatedExits,
      location.getCharacters(),
      location.getItems()
    );

    this.currentAdventure.locations.set(fromLocationId, updatedLocation);
    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Delete a location from the current adventure
   */
  deleteLocation(locationId: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    const location = this.currentAdventure.locations.get(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    // Prevent deleting the start location
    if (locationId === this.currentAdventure.startLocationId) {
      throw new Error('Cannot delete the starting location');
    }

    // Remove the location
    this.currentAdventure.locations.delete(locationId);

    // Remove all connections to this location from other locations
    for (const [, loc] of this.currentAdventure.locations) {
      const exits = loc.getExits();
      const updatedExits = new Map<string, string>();
      
      for (const [direction, targetId] of exits) {
        if (targetId !== locationId) {
          updatedExits.set(direction, targetId);
        }
      }

      // Only update if exits changed
      if (updatedExits.size !== exits.size) {
        const updatedLocation = new Location(
          loc.id,
          loc.name,
          loc.description,
          updatedExits,
          loc.getCharacters(),
          loc.getItems()
        );
        this.currentAdventure.locations.set(loc.id, updatedLocation);
      }
    }

    // Clear current location if it was the deleted one
    if (this.currentLocationId === locationId) {
      this.currentLocationId = this.currentAdventure.startLocationId;
    }

    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Delete a character from the current adventure
   */
  deleteCharacter(characterId: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    let found = false;

    // Find and remove the character from any location
    for (const [locationId, location] of this.currentAdventure.locations) {
      const characters = location.getCharacters();
      const characterIndex = characters.findIndex(char => char.id === characterId);
      
      if (characterIndex !== -1) {
        // Create a new characters array without the deleted character
        const updatedCharacters = characters.filter(char => char.id !== characterId);
        
        // Create a new location with the updated characters
        const updatedLocation = new Location(
          location.id,
          location.name,
          location.description,
          location.getExits(),
          updatedCharacters,
          location.getItems()
        );

        this.currentAdventure.locations.set(locationId, updatedLocation);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Character not found: ${characterId}`);
    }

    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Delete an item from the current adventure
   */
  deleteItem(itemId: string): void {
    if (!this.currentAdventure) {
      throw new Error('No adventure is currently being edited');
    }

    let found = false;

    // Find and remove the item from any location
    for (const [locationId, location] of this.currentAdventure.locations) {
      const items = location.getItems();
      const itemIndex = items.findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        // Create a new items array without the deleted item
        const updatedItems = items.filter(item => item.id !== itemId);
        
        // Create a new location with the updated items
        const updatedLocation = new Location(
          location.id,
          location.name,
          location.description,
          location.getExits(),
          location.getCharacters(),
          updatedItems
        );

        this.currentAdventure.locations.set(locationId, updatedLocation);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Item not found: ${itemId}`);
    }

    this.currentAdventure.modifiedAt = new Date();
  }

  /**
   * Get all location IDs from the current adventure (for autocomplete)
   */
  getLocationIds(): string[] {
    if (!this.currentAdventure) {
      return [];
    }

    return Array.from(this.currentAdventure.locations.keys());
  }

  /**
   * Generate a unique ID from a name
   */
  private generateId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}`;
  }

  /**
   * Serialize adventure for API
   */
  private serializeAdventure(adventure: Adventure): any {
    const locations: any = {};
    
    for (const [locationId, location] of adventure.locations) {
      const exits: any = {};
      for (const [direction, targetId] of location.getExits()) {
        exits[direction] = targetId;
      }
      
      locations[locationId] = {
        id: location.id,
        name: location.name,
        description: location.description,
        exits,
        characters: location.getCharacters(),
        items: []
      };
    }
    
    return {
      id: adventure.id,
      name: adventure.name,
      description: adventure.description,
      startLocationId: adventure.startLocationId,
      locations,
      createdAt: adventure.createdAt?.toISOString(),
      modifiedAt: adventure.modifiedAt?.toISOString()
    };
  }

  /**
   * Deserialize adventure from API
   */
  private deserializeAdventure(data: any): Adventure {
    const locations = new Map();
    
    for (const [locationId, locationData] of Object.entries(data.locations || {})) {
      const location: any = locationData;
      const loc = new Location(location.id, location.name, location.description);
      
      // Add exits
      for (const [direction, targetId] of Object.entries(location.exits || {})) {
        loc.addExit(direction, targetId as string);
      }
      
      // Add characters
      for (const character of location.characters || []) {
        loc.addCharacter(character);
      }
      
      locations.set(locationId, loc);
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      startLocationId: data.startLocationId,
      locations,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date()
    };
  }
}

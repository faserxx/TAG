import { Item } from './GameState';
import { AiCharacterConfig } from '../types';

export interface Character {
  id: string;
  name: string;
  dialogue: string[];
  currentDialogueIndex: number;
  isAiPowered?: boolean;
  personality?: string;
  aiConfig?: AiCharacterConfig;
}

export enum Direction {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west',
  Up = 'up',
  Down = 'down'
}

export class Location {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  private exits: Map<string, string>;
  private characters: Character[];
  private items: Item[];

  constructor(
    id: string,
    name: string,
    description: string,
    exits: Map<string, string> = new Map(),
    characters: Character[] = [],
    items: Item[] = []
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.exits = exits;
    this.characters = characters;
    this.items = items;
  }

  /**
   * Get all available exits from this location
   */
  getExits(): Map<string, string> {
    return new Map(this.exits);
  }

  /**
   * Get exit in a specific direction
   */
  getExit(direction: string): string | undefined {
    return this.exits.get(direction.toLowerCase());
  }

  /**
   * Check if an exit exists in a direction
   */
  hasExit(direction: string): boolean {
    return this.exits.has(direction.toLowerCase());
  }

  /**
   * Add an exit to this location
   */
  addExit(direction: string, targetLocationId: string): void {
    this.exits.set(direction.toLowerCase(), targetLocationId);
  }

  /**
   * Get all characters in this location
   */
  getCharacters(): Character[] {
    return [...this.characters];
  }

  /**
   * Find a character by name (case-insensitive)
   */
  findCharacter(name: string): Character | undefined {
    const lowerName = name.toLowerCase();
    return this.characters.find(
      char => char.name.toLowerCase() === lowerName
    );
  }

  /**
   * Add a character to this location
   */
  addCharacter(character: Character): void {
    this.characters.push(character);
  }

  /**
   * Remove a character from this location
   */
  removeCharacter(characterId: string): boolean {
    const index = this.characters.findIndex(char => char.id === characterId);
    if (index !== -1) {
      this.characters.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all items in this location
   */
  getItems(): Item[] {
    return [...this.items];
  }

  /**
   * Find an item by name (case-insensitive)
   */
  findItem(name: string): Item | undefined {
    const lowerName = name.toLowerCase();
    return this.items.find(
      item => item.name.toLowerCase() === lowerName
    );
  }

  /**
   * Add an item to this location
   */
  addItem(item: Item): void {
    this.items.push(item);
  }

  /**
   * Remove an item from this location
   */
  removeItem(itemId: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get a formatted description of the location
   */
  getFormattedDescription(): string[] {
    const lines: string[] = [];
    
    // Location name and description
    lines.push(`\n=== ${this.name} ===`);
    lines.push(this.description);
    
    // Available exits
    if (this.exits.size > 0) {
      const exitList = Array.from(this.exits.keys()).join(', ');
      lines.push(`\nExits: ${exitList}`);
    } else {
      lines.push('\nNo visible exits.');
    }
    
    // Characters present
    if (this.characters.length > 0) {
      const charList = this.characters.map(c => c.name).join(', ');
      lines.push(`\nCharacters: ${charList}`);
    }
    
    // Items present
    if (this.items.length > 0) {
      const itemList = this.items.map(i => i.name).join(', ');
      lines.push(`\nItems: ${itemList}`);
    }
    
    return lines;
  }

  /**
   * Create Location from JSON data
   */
  static fromJSON(data: any): Location {
    const exits = new Map<string, string>();
    if (data.exits) {
      if (data.exits instanceof Map) {
        data.exits.forEach((value: string, key: string) => {
          exits.set(key, value);
        });
      } else {
        Object.entries(data.exits).forEach(([key, value]) => {
          exits.set(key, value as string);
        });
      }
    }

    return new Location(
      data.id,
      data.name,
      data.description,
      exits,
      data.characters || [],
      data.items || []
    );
  }

  /**
   * Convert Location to JSON
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      exits: Object.fromEntries(this.exits),
      characters: this.characters,
      items: this.items
    };
  }
}

/**
 * Type definitions for the Terminal Adventure Game
 */

export interface Adventure {
  id: string;
  name: string;
  description: string;
  startLocationId: string;
  locations: Map<string, Location>;
  createdAt: Date;
  modifiedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  exits: Map<string, string>;
  characters: Character[];
  items: Item[];
}

export interface AiCharacterConfig {
  temperature?: number;
  maxTokens?: number;
  systemPromptTemplate?: string;
}

export interface Character {
  id: string;
  name: string;
  dialogue: string[];
  currentDialogueIndex: number;
  isAiPowered?: boolean;
  personality?: string;
  aiConfig?: AiCharacterConfig;
}

export interface Item {
  id: string;
  name: string;
  description: string;
}

export interface GameState {
  currentLocation: string;
  visitedLocations: Set<string>;
  inventory: Item[];
  flags: Map<string, any>;
  mode: GameMode;
}

export enum GameMode {
  Player = 'player',
  Admin = 'admin'
}

export interface AdventureRow {
  id: string;
  name: string;
  description: string;
  start_location_id: string;
  created_at: string;
  modified_at: string;
}

export interface LocationRow {
  id: string;
  adventure_id: string;
  name: string;
  description: string;
}

export interface ExitRow {
  from_location_id: string;
  to_location_id: string;
  direction: string;
}

export interface CharacterRow {
  id: string;
  location_id: string;
  name: string;
  dialogue: string;
  is_ai_powered: number;
  personality: string | null;
  ai_config: string | null;
}

export interface GameStateRow {
  id: number;
  current_location: string;
  visited_locations: string;
  inventory: string;
  flags: string;
  mode: string;
  updated_at: string;
}

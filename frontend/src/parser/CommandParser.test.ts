import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from './CommandParser';
import { GameMode, GameContext } from '../types';
import { GameEngine } from '../engine/GameEngine';
import { Location } from '../engine/Location';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('parse', () => {
    it('should parse valid command with no arguments', () => {
      const result = parser.parse('help');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('help');
      expect(result.args).toEqual([]);
    });

    it('should parse valid command with arguments', () => {
      const result = parser.parse('move north');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('move');
      expect(result.args).toEqual(['north']);
    });

    it('should handle empty input', () => {
      const result = parser.parse('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Empty command');
    });

    it('should handle unknown commands', () => {
      const result = parser.parse('invalidcommand');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown command');
    });

    it('should handle command aliases', () => {
      const result = parser.parse('?');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('help');
    });

    it('should handle quoted arguments', () => {
      const result = parser.parse('talk "temple guard"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('talk');
      expect(result.args).toEqual(['temple guard']);
    });
  });

  describe('suggestCommand', () => {
    it('should suggest similar commands for typos', () => {
      const suggestions = parser.suggestCommand('hlp');
      expect(suggestions).toContain('help');
    });

    it('should return empty array for completely unrelated input', () => {
      const suggestions = parser.suggestCommand('xyz123');
      expect(suggestions).toEqual([]);
    });

    it('should suggest commands with prefix match', () => {
      const suggestions = parser.suggestCommand('mov');
      expect(suggestions).toContain('move');
    });
  });

  describe('getAvailableCommands', () => {
    it('should return player mode commands', () => {
      const commands = parser.getAvailableCommands(GameMode.Player);
      const commandNames = commands.map(cmd => cmd.name);
      expect(commandNames).toContain('move');
      expect(commandNames).toContain('talk');
      expect(commandNames).toContain('help');
    });

    it('should return admin mode commands', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const commandNames = commands.map(cmd => cmd.name);
      expect(commandNames).toContain('create-adventure');
      expect(commandNames).toContain('add-location');
      expect(commandNames).toContain('help');
    });
  });

  describe('chat command', () => {
    it('should register chat command with aliases', () => {
      const commands = parser.getAvailableCommands(GameMode.Player);
      const chatCommand = commands.find(cmd => cmd.name === 'chat');
      expect(chatCommand).toBeDefined();
      expect(chatCommand?.aliases).toContain('talk-ai');
      expect(chatCommand?.aliases).toContain('converse');
    });

    it('should parse chat command without arguments', () => {
      const result = parser.parse('chat');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual([]);
    });

    it('should parse chat command with NPC name', () => {
      const result = parser.parse('chat sage');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual(['sage']);
    });

    it('should parse chat command with quoted NPC name', () => {
      const result = parser.parse('chat "Ancient Sage"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual(['Ancient Sage']);
    });

    it('should parse chat command using alias', () => {
      const result = parser.parse('talk-ai sage');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual(['sage']);
    });
  });

  describe('map command integration', () => {
    let gameEngine: GameEngine;
    let context: GameContext;

    beforeEach(() => {
      gameEngine = new GameEngine();
      parser.setGameEngine(gameEngine);
      context = {
        mode: GameMode.Player,
        isAuthenticated: false
      };
    });

    it('should register map command', () => {
      const commands = parser.getAvailableCommands(GameMode.Player);
      const mapCommand = commands.find(cmd => cmd.name === 'map');
      expect(mapCommand).toBeDefined();
      expect(mapCommand?.aliases).toContain('m');
    });

    it('should execute map command with no adventure loaded', async () => {
      const parsed = parser.parse('map');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE');
    });

    it('should execute map command with no visited locations', async () => {
      // Create a minimal adventure structure
      const locations = new Map<string, Location>();
      const location1 = new Location('loc1', 'Start', 'Starting location');
      locations.set('loc1', location1);

      // Manually set up adventure without visiting locations
      (gameEngine as any).currentAdventure = {
        id: 'test-adventure',
        name: 'Test Adventure',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };

      // Clear map data to simulate no visits
      gameEngine.getGameState().clearMapData();

      const parsed = parser.parse('map');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output.some(line => line.includes('No locations visited yet'))).toBe(true);
    });

    it('should execute map command with single location', async () => {
      // Create a minimal adventure structure
      const locations = new Map<string, Location>();
      const location1 = new Location('loc1', 'Start', 'Starting location');
      locations.set('loc1', location1);

      (gameEngine as any).currentAdventure = {
        id: 'test-adventure',
        name: 'Test Adventure',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };

      // Set current location and record visit
      gameEngine.getGameState().setCurrentLocation('loc1');
      gameEngine.getGameState().recordLocationVisit('loc1');

      const parsed = parser.parse('map');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output.some(line => line.includes('[@]'))).toBe(true);
      expect(result.output.some(line => line.includes('Legend'))).toBe(true);
    });

    it('should execute map command with multiple connected locations', async () => {
      // Create connected locations
      const locations = new Map<string, Location>();
      const location1 = new Location('loc1', 'Start', 'Starting location');
      const location2 = new Location('loc2', 'North Room', 'Northern room');
      
      location1.addExit('north', 'loc2');
      location2.addExit('south', 'loc1');
      
      locations.set('loc1', location1);
      locations.set('loc2', location2);

      (gameEngine as any).currentAdventure = {
        id: 'test-adventure',
        name: 'Test Adventure',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };

      // Visit both locations
      gameEngine.getGameState().setCurrentLocation('loc1');
      gameEngine.getGameState().recordLocationVisit('loc1');
      gameEngine.getGameState().recordLocationVisit('loc2', 'loc1', 'north');
      gameEngine.getGameState().setCurrentLocation('loc2');

      const parsed = parser.parse('map');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output.some(line => line.includes('[@]'))).toBe(true);
      expect(result.output.some(line => line.includes('[*]'))).toBe(true);
      expect(result.output.some(line => line.includes('Locations visited: 2'))).toBe(true);
    });
  });
});

describe('CommandParser - Chat Command', () => {
  let parser: CommandParser;
  let gameEngine: GameEngine;
  let context: GameContext;

  beforeEach(async () => {
    parser = new CommandParser();
    gameEngine = new GameEngine();
    parser.setGameEngine(gameEngine);
    
    // Import ChatManager dynamically to avoid circular dependencies
    const { ChatManager } = await import('../chat/ChatManager');
    const chatManager = new ChatManager();
    parser.setChatManager(chatManager);
    
    context = {
      mode: GameMode.Player,
      isAuthenticated: false
    };
  });

  describe('chat command registration', () => {
    it('should register chat command with aliases', () => {
      const commands = parser.getAvailableCommands(GameMode.Player);
      const chatCommand = commands.find(cmd => cmd.name === 'chat');
      expect(chatCommand).toBeDefined();
      expect(chatCommand?.aliases).toContain('talk-ai');
      expect(chatCommand?.aliases).toContain('converse');
    });

    it('should parse chat command without arguments', () => {
      const result = parser.parse('chat');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual([]);
    });

    it('should parse chat command with NPC name', () => {
      const result = parser.parse('chat sage');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual(['sage']);
    });

    it('should parse chat command with quoted NPC name', () => {
      const result = parser.parse('chat "Ancient Sage"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual(['Ancient Sage']);
    });

    it('should parse chat command using alias', () => {
      const result = parser.parse('talk-ai sage');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('chat');
      expect(result.args).toEqual(['sage']);
    });
  });

  describe('chat command execution', () => {
    it('should fail when no adventure is loaded', async () => {
      const parsed = parser.parse('chat');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_LOCATION');
    });

    it('should fail when no AI NPCs are in location', async () => {
      // Create location with regular (non-AI) NPC
      const locations = new Map<string, Location>();
      const location = new Location('loc1', 'Temple', 'A temple');
      location.addCharacter({
        id: 'char1',
        name: 'Guard',
        dialogue: ['Hello'],
        currentDialogueIndex: 0,
        isAiPowered: false
      });
      locations.set('loc1', location);

      (gameEngine as any).currentAdventure = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };
      gameEngine.getGameState().setCurrentLocation('loc1');

      const parsed = parser.parse('chat');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_AI_NPCS');
      expect(result.error?.suggestion).toContain('talk');
    });

    it('should start chat with single AI NPC when no name provided', async () => {
      // Create location with one AI NPC
      const locations = new Map<string, Location>();
      const location = new Location('loc1', 'Temple', 'A temple');
      location.addCharacter({
        id: 'ai-npc-1',
        name: 'Ancient Sage',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'A wise sage'
      });
      locations.set('loc1', location);

      (gameEngine as any).currentAdventure = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };
      gameEngine.getGameState().setCurrentLocation('loc1');

      const parsed = parser.parse('chat');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output.some(line => line.includes('Ancient Sage'))).toBe(true);
      expect(result.output.some(line => line.includes('chat mode'))).toBe(true);
    });

    it('should list AI NPCs when multiple present and no name provided', async () => {
      // Create location with multiple AI NPCs
      const locations = new Map<string, Location>();
      const location = new Location('loc1', 'Temple', 'A temple');
      location.addCharacter({
        id: 'ai-npc-1',
        name: 'Ancient Sage',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'A wise sage'
      });
      location.addCharacter({
        id: 'ai-npc-2',
        name: 'Mystic Oracle',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'A mysterious oracle'
      });
      locations.set('loc1', location);

      (gameEngine as any).currentAdventure = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };
      gameEngine.getGameState().setCurrentLocation('loc1');

      const parsed = parser.parse('chat');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MULTIPLE_AI_NPCS');
      expect(result.error?.suggestion).toContain('Ancient Sage');
      expect(result.error?.suggestion).toContain('Mystic Oracle');
    });

    it('should start chat with specified AI NPC', async () => {
      // Create location with AI NPC
      const locations = new Map<string, Location>();
      const location = new Location('loc1', 'Temple', 'A temple');
      location.addCharacter({
        id: 'ai-npc-1',
        name: 'Ancient Sage',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'A wise sage'
      });
      locations.set('loc1', location);

      (gameEngine as any).currentAdventure = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };
      gameEngine.getGameState().setCurrentLocation('loc1');

      const parsed = parser.parse('chat "Ancient Sage"');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output.some(line => line.includes('Ancient Sage'))).toBe(true);
    });

    it('should fail when specified NPC is not found', async () => {
      // Create location with AI NPC
      const locations = new Map<string, Location>();
      const location = new Location('loc1', 'Temple', 'A temple');
      location.addCharacter({
        id: 'ai-npc-1',
        name: 'Ancient Sage',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'A wise sage'
      });
      locations.set('loc1', location);

      (gameEngine as any).currentAdventure = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };
      gameEngine.getGameState().setCurrentLocation('loc1');

      const parsed = parser.parse('chat "Nonexistent NPC"');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NPC_NOT_FOUND');
      expect(result.error?.suggestion).toContain('Ancient Sage');
    });

    it('should fail when specified NPC is not AI-powered', async () => {
      // Create location with regular NPC
      const locations = new Map<string, Location>();
      const location = new Location('loc1', 'Temple', 'A temple');
      location.addCharacter({
        id: 'char1',
        name: 'Guard',
        dialogue: ['Hello'],
        currentDialogueIndex: 0,
        isAiPowered: false
      });
      locations.set('loc1', location);

      (gameEngine as any).currentAdventure = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        startLocationId: 'loc1',
        locations
      };
      gameEngine.getGameState().setCurrentLocation('loc1');

      const parsed = parser.parse('chat Guard');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_AI_POWERED');
      expect(result.error?.suggestion).toContain('talk');
    });
  });
});

describe('CommandParser - Adventure Selection Commands', () => {
  let parser: CommandParser;
  let context: GameContext;

  beforeEach(() => {
    parser = new CommandParser();
    context = {
      mode: GameMode.Admin,
      isAuthenticated: true
    };
  });

  describe('select-adventure command', () => {
    it('should register select-adventure command with aliases', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const selectCommand = commands.find(cmd => cmd.name === 'select-adventure');
      expect(selectCommand).toBeDefined();
      expect(selectCommand?.aliases).toContain('select');
    });

    it('should parse select-adventure command', () => {
      const result = parser.parse('select-adventure demo-adventure');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('select-adventure');
      expect(result.args).toEqual(['demo-adventure']);
    });

    it('should fail when no adventure ID provided', async () => {
      const parsed = parser.parse('select-adventure');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_ARGUMENT');
      expect(result.error?.message).toContain('Adventure ID required');
    });
  });

  describe('show-adventure command', () => {
    it('should register show-adventure command with aliases', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const showCommand = commands.find(cmd => cmd.name === 'show-adventure');
      expect(showCommand).toBeDefined();
      expect(showCommand?.aliases).toContain('show');
      expect(showCommand?.aliases).toContain('view-adventure');
    });

    it('should parse show-adventure command', () => {
      const result = parser.parse('show-adventure');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('show-adventure');
      expect(result.args).toEqual([]);
    });

    it('should fail when no adventure is selected', async () => {
      const parsed = parser.parse('show-adventure');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
      expect(result.error?.message).toContain('No adventure selected');
      expect(result.error?.suggestion).toContain('select-adventure');
    });
  });

  describe('deselect-adventure command', () => {
    it('should register deselect-adventure command with aliases', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const deselectCommand = commands.find(cmd => cmd.name === 'deselect-adventure');
      expect(deselectCommand).toBeDefined();
      expect(deselectCommand?.aliases).toContain('deselect');
    });

    it('should parse deselect-adventure command', () => {
      const result = parser.parse('deselect-adventure');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('deselect-adventure');
      expect(result.args).toEqual([]);
    });

    it('should fail when no adventure is selected', async () => {
      const parsed = parser.parse('deselect-adventure');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
      expect(result.error?.message).toContain('No adventure is currently selected');
    });
  });
});

describe('CommandParser - Adventure Editing Commands', () => {
  let parser: CommandParser;
  let context: GameContext;

  beforeEach(() => {
    parser = new CommandParser();
    context = {
      mode: GameMode.Admin,
      isAuthenticated: true
    };
  });

  describe('edit-title command', () => {
    it('should register edit-title command', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const editTitleCommand = commands.find(cmd => cmd.name === 'edit-title');
      expect(editTitleCommand).toBeDefined();
      expect(editTitleCommand?.mode).toBe(GameMode.Admin);
    });

    it('should parse edit-title command', () => {
      const result = parser.parse('edit-title "New Adventure Title"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('edit-title');
      expect(result.args).toEqual(['New Adventure Title']);
    });

    it('should fail when no title provided', async () => {
      const parsed = parser.parse('edit-title');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_ARGUMENT');
      expect(result.error?.message).toContain('New title required');
    });

    it('should fail when no adventure is selected', async () => {
      const parsed = parser.parse('edit-title "New Title"');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
      expect(result.error?.message).toContain('No adventure selected');
    });
  });

  describe('edit-description command', () => {
    it('should register edit-description command', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const editDescCommand = commands.find(cmd => cmd.name === 'edit-description');
      expect(editDescCommand).toBeDefined();
      expect(editDescCommand?.mode).toBe(GameMode.Admin);
    });

    it('should parse edit-description command', () => {
      const result = parser.parse('edit-description "A new description"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('edit-description');
      expect(result.args).toEqual(['A new description']);
    });

    it('should fail when no adventure is selected', async () => {
      const parsed = parser.parse('edit-description "New description"');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
      expect(result.error?.message).toContain('No adventure selected');
    });

    it('should allow empty description', async () => {
      const parsed = parser.parse('edit-description');
      const result = await parser.executeCommand(parsed, context);
      
      // Should fail because no adventure selected, not because of empty description
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
    });
  });

  describe('edit-location command', () => {
    it('should register edit-location command', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const editLocCommand = commands.find(cmd => cmd.name === 'edit-location');
      expect(editLocCommand).toBeDefined();
      expect(editLocCommand?.mode).toBe(GameMode.Admin);
    });

    it('should parse edit-location command with name property', () => {
      const result = parser.parse('edit-location loc-123 name "New Location Name"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('edit-location');
      expect(result.args).toEqual(['loc-123', 'name', 'New Location Name']);
    });

    it('should parse edit-location command with description property', () => {
      const result = parser.parse('edit-location loc-123 description "A new description"');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('edit-location');
      expect(result.args).toEqual(['loc-123', 'description', 'A new description']);
    });

    it('should fail when insufficient arguments provided', async () => {
      const parsed = parser.parse('edit-location loc-123');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_ARGUMENT');
      expect(result.error?.message).toContain('Three arguments required');
    });

    it('should fail when no adventure is selected', async () => {
      const parsed = parser.parse('edit-location loc-123 name "New Name"');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
      expect(result.error?.message).toContain('No adventure selected');
    });

    it('should fail when invalid property specified', async () => {
      // First create an adventure to get past the no-adventure check
      const createParsed = parser.parse('create-adventure "Test Adventure"');
      await parser.executeCommand(createParsed, context);

      const parsed = parser.parse('edit-location loc-123 invalid-property "value"');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PROPERTY');
      expect(result.error?.message).toContain('Invalid property');
      expect(result.error?.suggestion).toContain('name, description');
    });
  });

  describe('remove-connection command', () => {
    it('should register remove-connection command with aliases', () => {
      const commands = parser.getAvailableCommands(GameMode.Admin);
      const removeConnCommand = commands.find(cmd => cmd.name === 'remove-connection');
      expect(removeConnCommand).toBeDefined();
      expect(removeConnCommand?.aliases).toContain('remove-exit');
      expect(removeConnCommand?.mode).toBe(GameMode.Admin);
    });

    it('should parse remove-connection command', () => {
      const result = parser.parse('remove-connection loc-123 north');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('remove-connection');
      expect(result.args).toEqual(['loc-123', 'north']);
    });

    it('should parse remove-connection command using alias', () => {
      const result = parser.parse('remove-exit loc-123 south');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('remove-connection');
      expect(result.args).toEqual(['loc-123', 'south']);
    });

    it('should fail when insufficient arguments provided', async () => {
      const parsed = parser.parse('remove-connection loc-123');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_ARGUMENT');
      expect(result.error?.message).toContain('Two arguments required');
    });

    it('should fail when no adventure is selected', async () => {
      const parsed = parser.parse('remove-connection loc-123 north');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE_SELECTED');
      expect(result.error?.message).toContain('No adventure selected');
    });
  });
});

describe('CommandParser - Command History', () => {
  let parser: CommandParser;
  let context: GameContext;

  beforeEach(() => {
    parser = new CommandParser();
    context = {
      mode: GameMode.Player,
      isAuthenticated: false
    };
  });

  describe('addToHistory', () => {
    it('should add command to history', () => {
      parser.addToHistory('help');
      const history = parser.getHistory();
      expect(history).toEqual(['help']);
    });

    it('should add multiple commands to history', () => {
      parser.addToHistory('help');
      parser.addToHistory('look');
      parser.addToHistory('move north');
      const history = parser.getHistory();
      expect(history).toEqual(['help', 'look', 'move north']);
    });

    it('should not add empty commands to history', () => {
      parser.addToHistory('help');
      parser.addToHistory('');
      parser.addToHistory('   ');
      const history = parser.getHistory();
      expect(history).toEqual(['help']);
    });

    it('should not add duplicate consecutive commands', () => {
      parser.addToHistory('help');
      parser.addToHistory('help');
      parser.addToHistory('look');
      parser.addToHistory('look');
      const history = parser.getHistory();
      expect(history).toEqual(['help', 'look']);
    });

    it('should limit history to 50 commands', () => {
      // Add 60 commands
      for (let i = 1; i <= 60; i++) {
        parser.addToHistory(`command${i}`);
      }
      const history = parser.getHistory();
      expect(history.length).toBe(50);
      // Should have commands 11-60
      expect(history[0]).toBe('command11');
      expect(history[49]).toBe('command60');
    });

    it('should reset history index when adding command', () => {
      parser.addToHistory('help');
      parser.addToHistory('look');
      // Navigate up
      parser.getHistoryCommand('up');
      // Add new command should reset index
      parser.addToHistory('move north');
      const history = parser.getHistory();
      expect(history).toEqual(['help', 'look', 'move north']);
    });
  });

  describe('getHistoryCommand', () => {
    beforeEach(() => {
      parser.addToHistory('help');
      parser.addToHistory('look');
      parser.addToHistory('move north');
    });

    it('should return null when history is empty', () => {
      const emptyParser = new CommandParser();
      const result = emptyParser.getHistoryCommand('up');
      expect(result).toBeNull();
    });

    it('should return most recent command on first up', () => {
      const result = parser.getHistoryCommand('up');
      expect(result).toBe('move north');
    });

    it('should navigate backward through history with up', () => {
      expect(parser.getHistoryCommand('up')).toBe('move north');
      expect(parser.getHistoryCommand('up')).toBe('look');
      expect(parser.getHistoryCommand('up')).toBe('help');
    });

    it('should stay at oldest command when pressing up at beginning', () => {
      parser.getHistoryCommand('up'); // move north
      parser.getHistoryCommand('up'); // look
      parser.getHistoryCommand('up'); // help
      const result = parser.getHistoryCommand('up'); // should stay at help
      expect(result).toBe('help');
    });

    it('should navigate forward through history with down', () => {
      parser.getHistoryCommand('up'); // move north
      parser.getHistoryCommand('up'); // look
      parser.getHistoryCommand('up'); // help
      expect(parser.getHistoryCommand('down')).toBe('look');
      expect(parser.getHistoryCommand('down')).toBe('move north');
    });

    it('should return null when pressing down at end of history', () => {
      parser.getHistoryCommand('up'); // move north
      parser.getHistoryCommand('up'); // look
      parser.getHistoryCommand('down'); // move north
      const result = parser.getHistoryCommand('down'); // should return null
      expect(result).toBeNull();
    });

    it('should return null when pressing down without navigating up first', () => {
      const result = parser.getHistoryCommand('down');
      expect(result).toBeNull();
    });

    it('should allow navigating up again after reaching end with down', () => {
      parser.getHistoryCommand('up'); // move north
      parser.getHistoryCommand('down'); // null (end)
      const result = parser.getHistoryCommand('up'); // should start from most recent again
      expect(result).toBe('move north');
    });
  });

  describe('getHistory', () => {
    it('should return empty array when no history', () => {
      const history = parser.getHistory();
      expect(history).toEqual([]);
    });

    it('should return copy of history array', () => {
      parser.addToHistory('help');
      parser.addToHistory('look');
      const history1 = parser.getHistory();
      const history2 = parser.getHistory();
      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // Different array instances
    });

    it('should return all commands in order', () => {
      parser.addToHistory('help');
      parser.addToHistory('look');
      parser.addToHistory('move north');
      parser.addToHistory('talk guard');
      const history = parser.getHistory();
      expect(history).toEqual(['help', 'look', 'move north', 'talk guard']);
    });
  });

  describe('history command', () => {
    it('should register history command', () => {
      const commands = parser.getAvailableCommands(GameMode.Player);
      const historyCommand = commands.find(cmd => cmd.name === 'history');
      expect(historyCommand).toBeDefined();
      expect(historyCommand?.mode).toBe('both');
    });

    it('should parse history command', () => {
      const result = parser.parse('history');
      expect(result.isValid).toBe(true);
      expect(result.command).toBe('history');
      expect(result.args).toEqual([]);
    });

    it('should display empty history message when no commands', async () => {
      const parsed = parser.parse('history');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual(['No commands in history.']);
    });

    it('should display command history with numbers', async () => {
      parser.addToHistory('help');
      parser.addToHistory('look');
      parser.addToHistory('move north');
      
      const parsed = parser.parse('history');
      const result = await parser.executeCommand(parsed, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Command History:');
      expect(result.output).toContain('1. help');
      expect(result.output).toContain('2. look');
      expect(result.output).toContain('3. move north');
    });

    it('should be available in both player and admin mode', async () => {
      const playerCommands = parser.getAvailableCommands(GameMode.Player);
      const adminCommands = parser.getAvailableCommands(GameMode.Admin);
      
      expect(playerCommands.find(cmd => cmd.name === 'history')).toBeDefined();
      expect(adminCommands.find(cmd => cmd.name === 'history')).toBeDefined();
    });
  });
});

describe('CommandParser - Tab Autocomplete', () => {
  let parser: CommandParser;
  let context: GameContext;

  beforeEach(() => {
    parser = new CommandParser();
    context = {
      mode: GameMode.Admin,
      isAuthenticated: true
    };
  });

  describe('getAutocomplete - command completion', () => {
    it('should return empty suggestions for empty input', () => {
      const result = parser.getAutocomplete('', 0, context);
      expect(result.suggestions).toEqual([]);
    });

    it('should complete single matching command', () => {
      const result = parser.getAutocomplete('create-adv', 10, context);
      expect(result.suggestions).toContain('create-adventure');
      expect(result.completionText).toBe('create-adventure');
    });

    it('should return multiple matching commands', () => {
      const result = parser.getAutocomplete('ed', 2, context);
      expect(result.suggestions).toContain('edit-title');
      expect(result.suggestions).toContain('edit-description');
      expect(result.suggestions).toContain('edit-location');
      expect(result.completionText).toBeUndefined();
    });

    it('should filter commands by game mode', () => {
      const playerContext: GameContext = {
        mode: GameMode.Player,
        isAuthenticated: false
      };
      const result = parser.getAutocomplete('mov', 3, playerContext);
      expect(result.suggestions).toContain('move');
      expect(result.suggestions).not.toContain('create-adventure');
    });

    it('should include command aliases in suggestions', () => {
      const result = parser.getAutocomplete('h', 1, context);
      expect(result.suggestions).toContain('help');
      expect(result.suggestions).toContain('history');
    });
  });

  describe('getAutocomplete - location ID completion', () => {
    beforeEach(() => {
      // Create an adventure with locations
      const createParsed = parser.parse('create-adventure "Test Adventure"');
      parser.executeCommand(createParsed, context);
      
      // Add some locations
      parser.parse('add-location "Entrance" "The entrance"');
      parser.executeCommand(parser.parse('add-location "Entrance" "The entrance"'), context);
      parser.parse('add-location "Hall" "A grand hall"');
      parser.executeCommand(parser.parse('add-location "Hall" "A grand hall"'), context);
      parser.parse('add-location "Chamber" "A secret chamber"');
      parser.executeCommand(parser.parse('add-location "Chamber" "A secret chamber"'), context);
    });

    it('should return empty suggestions when no adventure selected', () => {
      const newParser = new CommandParser();
      const result = newParser.getAutocomplete('edit-location ', 14, context);
      expect(result.suggestions).toEqual([]);
    });

    it('should return empty suggestions in player mode', () => {
      const playerContext: GameContext = {
        mode: GameMode.Player,
        isAuthenticated: false
      };
      const result = parser.getAutocomplete('edit-location ', 14, playerContext);
      expect(result.suggestions).toEqual([]);
    });

    it('should suggest all location IDs for edit-location command', () => {
      const result = parser.getAutocomplete('edit-location ', 14, context);
      expect(result.suggestions.length).toBeGreaterThan(0);
      // All suggestions should be location IDs
      result.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
      });
    });

    it('should filter location IDs based on partial input', () => {
      const result = parser.getAutocomplete('edit-location entr', 18, context);
      const matchingIds = result.suggestions.filter(id => 
        id.toLowerCase().startsWith('entr')
      );
      expect(matchingIds.length).toBeGreaterThan(0);
    });

    it('should complete single matching location ID', () => {
      // Get the actual location IDs from the adventure
      const adventure = (parser as any).adminSystem.getCurrentAdventure();
      const locationIds = Array.from(adventure.locations.keys());
      
      // Use a unique prefix that matches only one location
      const uniquePrefix = locationIds[0].substring(0, 10);
      const result = parser.getAutocomplete(`edit-location ${uniquePrefix}`, 14 + uniquePrefix.length, context);
      
      if (result.suggestions.length === 1) {
        expect(result.completionText).toBe(result.suggestions[0]);
      }
    });

    it('should suggest location IDs for remove-connection command', () => {
      const result = parser.getAutocomplete('remove-connection ', 18, context);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should suggest location IDs for delete-location command', () => {
      const result = parser.getAutocomplete('delete-location ', 16, context);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should not suggest location IDs for non-location commands', () => {
      const result = parser.getAutocomplete('edit-title ', 11, context);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle cursor position in middle of input', () => {
      const result = parser.getAutocomplete('edit-location entrance name "New"', 18, context);
      // Should suggest location IDs based on "entrance" prefix
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial token at cursor', () => {
      const result = parser.getAutocomplete('edit-location ent', 17, context);
      const matchingIds = result.suggestions.filter(id => 
        id.toLowerCase().startsWith('ent')
      );
      expect(matchingIds.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest for second argument of edit-location', () => {
      const adventure = (parser as any).adminSystem.getCurrentAdventure();
      const locationIds = Array.from(adventure.locations.keys());
      const locationId = locationIds[0];
      
      const result = parser.getAutocomplete(`edit-location ${locationId} `, 14 + locationId.length + 1, context);
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('getAutocomplete - edge cases', () => {
    it('should handle input with quotes', () => {
      const result = parser.getAutocomplete('create-adventure "My', 20, context);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle cursor at beginning of input', () => {
      const result = parser.getAutocomplete('help', 0, context);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle cursor beyond input length', () => {
      const result = parser.getAutocomplete('help', 100, context);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple spaces', () => {
      const result = parser.getAutocomplete('edit-location   ', 16, context);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });
});

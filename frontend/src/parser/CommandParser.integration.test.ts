import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from './CommandParser';
import { GameMode } from '../types';
import { AdministrationSystem } from '../admin/AdministrationSystem';
import { Adventure } from '../engine/GameEngine';
import { Location } from '../engine/Location';

/**
 * Integration tests for backward compatibility with command-line editing
 * Tests that both interactive and traditional command-line modes work correctly
 */
describe('CommandParser - Backward Compatibility Integration Tests', () => {
  let commandParser: CommandParser;
  let adminSystem: AdministrationSystem;
  let testAdventure: Adventure;

  beforeEach(() => {
    commandParser = new CommandParser();
    
    // Get the admin system from the parser
    adminSystem = (commandParser as any).adminSystem;

    // Create test adventure
    const testLocation = new Location(
      'loc-1',
      'Temple Entrance',
      'You stand before an ancient temple.',
      new Map([['north', 'loc-2']]),
      [
        {
          id: 'char-1',
          name: 'Temple Guard',
          dialogue: ['Halt!', 'State your business.'],
          currentDialogueIndex: 0,
          isAiPowered: false
        }
      ],
      []
    );

    testAdventure = {
      id: 'adv-1',
      name: 'The Lost Temple',
      description: 'An epic adventure.',
      startingLocationId: 'loc-1',
      locations: new Map([['loc-1', testLocation]]),
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    // Set current adventure
    (adminSystem as any).currentAdventure = testAdventure;
  });

  describe('Edit Location - Command-line mode (backward compatibility)', () => {
    it('should edit location name using command-line arguments', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 name "New Temple Name"',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output.join(' ')).toContain('Updated location name');
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe('New Temple Name');
    });

    it('should edit location description using command-line arguments', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 description "A magnificent ancient temple with towering columns"',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output.join(' ')).toContain('Updated location description');
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.description).toBe('A magnificent ancient temple with towering columns');
    });

    it('should handle multi-word values in command-line mode', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 name Grand Temple of the Ancient Gods',
        context
      );

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe('Grand Temple of the Ancient Gods');
    });

    it('should return error for invalid property in command-line mode', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 invalid-property "Some Value"',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PROPERTY');
      expect(result.error?.message).toContain('Invalid property');
    });

    it('should return error when missing arguments in command-line mode', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 name',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_ARGUMENT');
    });

    it('should return error when location not found in command-line mode', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location invalid-id name "New Name"',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_LOCATION_FAILED');
    });
  });

  describe('Edit Location - Interactive mode detection', () => {
    it('should detect interactive mode when only ID is provided', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      // Without terminal set, should return error about interactive mode not available
      const result = await commandParser.parse(
        'edit location loc-1',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_SESSION_NOT_AVAILABLE');
      expect(result.error?.message).toContain('Interactive editing is not available');
    });

    it('should provide helpful suggestion when interactive mode not available', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1',
        context
      );

      expect(result.error?.suggestion).toContain('command-line format');
      expect(result.error?.suggestion).toContain('edit location <location-id> <property> <value>');
    });
  });

  describe('Edit Character - Interactive mode only', () => {
    it('should require exactly one argument (character ID)', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit character',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ARGUMENTS');
      expect(result.error?.message).toContain('Exactly one argument required');
    });

    it('should reject multiple arguments for character editing', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit character char-1 name "New Name"',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ARGUMENTS');
    });

    it('should indicate interactive mode when terminal not available', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit character char-1',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_SESSION_NOT_AVAILABLE');
    });
  });

  describe('Mode detection and routing', () => {
    it('should route to command-line mode with 3+ arguments for location', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      // This should use command-line mode, not interactive
      const result = await commandParser.parse(
        'edit location loc-1 name "Test"',
        context
      );

      // Should succeed (command-line mode)
      expect(result.success).toBe(true);
      expect(result.output.join(' ')).toContain('Updated location');
    });

    it('should route to interactive mode with 1 argument for location', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      // This should attempt interactive mode
      const result = await commandParser.parse(
        'edit location loc-1',
        context
      );

      // Should fail because terminal not set (interactive mode)
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_SESSION_NOT_AVAILABLE');
    });

    it('should maintain backward compatibility with location aliases', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit-location loc-1 name "Alias Test"',
        context
      );

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe('Alias Test');
    });

    it('should maintain backward compatibility with character aliases', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit-character char-1',
        context
      );

      // Should attempt interactive mode
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_SESSION_NOT_AVAILABLE');
    });
  });

  describe('Error handling consistency', () => {
    it('should provide consistent error messages across modes', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      // Command-line mode error
      const cmdResult = await commandParser.parse(
        'edit location invalid-id name "Test"',
        context
      );

      expect(cmdResult.success).toBe(false);
      expect(cmdResult.error).toBeDefined();
      expect(cmdResult.error?.message).toBeTruthy();
      expect(cmdResult.error?.suggestion).toBeTruthy();
    });

    it('should require admin mode for all edit commands', async () => {
      const context = {
        mode: GameMode.Player,
        isAuthenticated: false
      };

      const result = await commandParser.parse(
        'edit location loc-1 name "Test"',
        context
      );

      expect(result.success).toBe(false);
      // Should fail due to mode restriction
    });
  });

  describe('Help text and documentation', () => {
    it('should document both interactive and command-line modes for location', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'help edit location',
        context
      );

      const helpText = result.output.join(' ');
      
      // Should mention both modes
      expect(helpText).toContain('edit location');
      expect(helpText.toLowerCase()).toContain('interactive');
    });

    it('should show examples for both modes in location help', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'help edit location',
        context
      );

      const helpText = result.output.join('\n');
      
      // Should have examples for both modes
      expect(helpText).toContain('edit location entrance-123'); // Interactive mode
      expect(helpText).toContain('edit location entrance-123 name'); // Command-line mode
    });
  });

  describe('Value handling in command-line mode', () => {
    it('should handle quoted values correctly', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 name "Temple of the Ancient Gods"',
        context
      );

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe('Temple of the Ancient Gods');
    });

    it('should handle unquoted multi-word values', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 description A beautiful ancient temple with many secrets',
        context
      );

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.description).toBe('A beautiful ancient temple with many secrets');
    });

    it('should handle empty values in command-line mode', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const result = await commandParser.parse(
        'edit location loc-1 description ""',
        context
      );

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      expect(location?.description).toBe('');
    });
  });

  describe('State preservation', () => {
    it('should preserve other location properties when editing name', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const originalDescription = testAdventure.locations.get('loc-1')?.description;
      const originalExits = testAdventure.locations.get('loc-1')?.getExits();

      await commandParser.parse(
        'edit location loc-1 name "New Name"',
        context
      );

      const location = testAdventure.locations.get('loc-1');
      expect(location?.description).toBe(originalDescription);
      expect(location?.getExits()).toEqual(originalExits);
    });

    it('should preserve other location properties when editing description', async () => {
      const context = {
        mode: GameMode.Admin,
        isAuthenticated: true
      };

      const originalName = testAdventure.locations.get('loc-1')?.name;
      const originalCharacters = testAdventure.locations.get('loc-1')?.getCharacters();

      await commandParser.parse(
        'edit location loc-1 description "New Description"',
        context
      );

      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe(originalName);
      expect(location?.getCharacters()).toEqual(originalCharacters);
    });
  });
});

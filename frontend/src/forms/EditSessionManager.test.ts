import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditSessionManager } from './EditSessionManager';
import { AdministrationSystem } from '../admin/AdministrationSystem';
import { Adventure } from '../engine/GameEngine';
import { Location, Character } from '../engine/Location';
import { OutputStyle } from '../types';

// Mock TerminalInterface
class MockTerminalInterface {
  private responses: string[] = [];
  private responseIndex: number = 0;
  public writtenLines: string[] = [];
  public writtenText: string[] = [];
  public commandCallback?: (command: string) => void;
  private inputQueue: string[] = [];
  private waitingForInput: boolean = false;
  private inputResolver?: (value: string) => void;

  setResponses(responses: string[]) {
    this.responses = responses;
    this.responseIndex = 0;
  }

  write(text: string, _style?: OutputStyle): void {
    this.writtenText.push(text);
    
    // Check if this is a prompt for input
    if (text.includes('New value') || text.includes('Confirm') || text.includes('Choose')) {
      this.waitingForInput = true;
      // Process next input from queue if available
      this.processNextInput();
    }
  }

  writeLine(text: string, _style?: OutputStyle): void {
    this.writtenLines.push(text);
  }

  simulateInput(input: string): void {
    this.inputQueue.push(input);
    this.processNextInput();
  }

  private processNextInput(): void {
    if (this.waitingForInput && this.inputQueue.length > 0 && this.commandCallback) {
      this.waitingForInput = false;
      const input = this.inputQueue.shift()!;
      // Use setImmediate to simulate async behavior
      setImmediate(() => {
        if (this.commandCallback) {
          this.commandCallback(input);
        }
      });
    }
  }

  getNextResponse(): string {
    if (this.responseIndex < this.responses.length) {
      return this.responses[this.responseIndex++];
    }
    return '';
  }

  clearOutput(): void {
    this.writtenLines = [];
    this.writtenText = [];
  }
}

// Mock AdministrationSystem
class MockAdministrationSystem {
  private currentAdventure: Adventure | null = null;

  setCurrentAdventure(adventure: Adventure | null): void {
    this.currentAdventure = adventure;
  }

  getCurrentAdventure(): Adventure | null {
    return this.currentAdventure;
  }

  updateLocationName(locationId: string, newName: string): void {
    if (this.currentAdventure) {
      const location = this.currentAdventure.locations.get(locationId);
      if (location) {
        const updatedLocation = new Location(
          location.id,
          newName,
          location.description,
          location.getExits(),
          location.getCharacters(),
          location.getItems()
        );
        this.currentAdventure.locations.set(locationId, updatedLocation);
      }
    }
  }

  updateLocationDescription(locationId: string, newDescription: string): void {
    if (this.currentAdventure) {
      const location = this.currentAdventure.locations.get(locationId);
      if (location) {
        const updatedLocation = new Location(
          location.id,
          location.name,
          newDescription,
          location.getExits(),
          location.getCharacters(),
          location.getItems()
        );
        this.currentAdventure.locations.set(locationId, updatedLocation);
      }
    }
  }

  updateAdventureTitle(newTitle: string): void {
    if (this.currentAdventure) {
      this.currentAdventure.name = newTitle;
    }
  }

  updateAdventureDescription(newDescription: string): void {
    if (this.currentAdventure) {
      this.currentAdventure.description = newDescription;
    }
  }

  updateCharacterPersonality(characterId: string, personality: string): void {
    if (this.currentAdventure) {
      for (const location of this.currentAdventure.locations.values()) {
        const character = location.getCharacters().find(c => c.id === characterId);
        if (character) {
          character.personality = personality;
          break;
        }
      }
    }
  }
}

describe('EditSessionManager Integration Tests', () => {
  let mockTerminal: MockTerminalInterface;
  let mockAdminSystem: MockAdministrationSystem;
  let editSessionManager: EditSessionManager;
  let testAdventure: Adventure;

  beforeEach(() => {
    mockTerminal = new MockTerminalInterface();
    mockAdminSystem = new MockAdministrationSystem();
    editSessionManager = new EditSessionManager(
      mockTerminal as any,
      mockAdminSystem as any
    );

    // Create test adventure with locations and characters
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
        },
        {
          id: 'char-2',
          name: 'Wise Oracle',
          dialogue: [],
          currentDialogueIndex: 0,
          isAiPowered: true,
          personality: 'A wise and ancient oracle who speaks in riddles.'
        }
      ],
      []
    );

    testAdventure = {
      id: 'adv-1',
      name: 'The Lost Temple',
      description: 'An epic adventure in an ancient temple.',
      startLocationId: 'loc-1',
      locations: new Map([['loc-1', testLocation]]),
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    mockAdminSystem.setCurrentAdventure(testAdventure);
  });

  describe('Full location edit flow', () => {
    it('should successfully edit location name and description', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('New Temple Name');
      mockTerminal.simulateInput('Line 1 of new description');
      mockTerminal.simulateInput('Line 2 of new description');
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Location "Temple Entrance" updated successfully.');
      
      // Verify changes were applied
      const updatedLocation = testAdventure.locations.get('loc-1');
      expect(updatedLocation?.name).toBe('New Temple Name');
      expect(updatedLocation?.description).toBe('Line 1 of new description\nLine 2 of new description');
    });

    it('should handle keeping some fields unchanged', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput('Updated description only');
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(true);
      
      const updatedLocation = testAdventure.locations.get('loc-1');
      expect(updatedLocation?.name).toBe('Temple Entrance'); // Unchanged
      expect(updatedLocation?.description).toBe('Updated description only');
    });

    it('should return error when location not found', async () => {
      const result = await editSessionManager.editLocation('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOCATION_NOT_FOUND');
      expect(result.error?.message).toContain('Location not found');
    });
  });

  describe('Full character edit flow with dialogue editing', () => {
    it('should successfully edit character name and dialogue', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('Elite Guard');
      mockTerminal.simulateInput('r'); // Replace dialogue
      mockTerminal.simulateInput('Welcome, traveler.');
      mockTerminal.simulateInput('You may pass.');
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editCharacter('char-1');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Character "Temple Guard" updated successfully.');
      
      const location = testAdventure.locations.get('loc-1');
      const character = location?.getCharacters().find(c => c.id === 'char-1');
      expect(character?.name).toBe('Elite Guard');
      expect(character?.dialogue).toEqual(['Welcome, traveler.', 'You may pass.']);
    });

    it('should handle keeping dialogue unchanged', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput('k'); // Keep dialogue

      const result = await editSessionManager.editCharacter('char-1');

      expect(result.success).toBe(true);
      expect(result.output).toContain('No changes made');
    });

    it('should handle editing individual dialogue lines', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput('e'); // Edit dialogue
      mockTerminal.simulateInput('1'); // Edit line 1
      mockTerminal.simulateInput('Stop right there!');
      mockTerminal.simulateInput('done');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editCharacter('char-1');

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      const character = location?.getCharacters().find(c => c.id === 'char-1');
      expect(character?.dialogue[0]).toBe('Stop right there!');
      expect(character?.dialogue[1]).toBe('State your business.');
    });

    it('should successfully edit AI character personality', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('Ancient Oracle');
      mockTerminal.simulateInput('A mysterious oracle with vast knowledge.');
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editCharacter('char-2');

      expect(result.success).toBe(true);
      
      const location = testAdventure.locations.get('loc-1');
      const character = location?.getCharacters().find(c => c.id === 'char-2');
      expect(character?.name).toBe('Ancient Oracle');
      expect(character?.personality).toBe('A mysterious oracle with vast knowledge.');
    });

    it('should return error when character not found', async () => {
      const result = await editSessionManager.editCharacter('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_NOT_FOUND');
      expect(result.error?.message).toContain('Character not found');
    });
  });

  describe('Full adventure edit flow', () => {
    it('should successfully edit adventure name and description', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('The Ancient Temple');
      mockTerminal.simulateInput('A thrilling adventure awaits.');
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editAdventure('adv-1');

      expect(result.success).toBe(true);
      expect(result.output[0]).toContain('Adventure');
      expect(result.output[0]).toContain('updated successfully');
      
      expect(testAdventure.name).toBe('The Ancient Temple');
      expect(testAdventure.description).toBe('A thrilling adventure awaits.');
    });

    it('should handle empty description (optional field)', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput(''); // Empty description

      const result = await editSessionManager.editAdventure('adv-1');

      expect(result.success).toBe(true);
      expect(result.output).toContain('No changes made');
    });

    it('should return error when no adventure is loaded', async () => {
      mockAdminSystem.setCurrentAdventure(null);

      const result = await editSessionManager.editAdventure('adv-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_ADVENTURE');
      expect(result.error?.message).toContain('No adventure is currently being edited');
    });

    it('should return error when adventure ID mismatch', async () => {
      const result = await editSessionManager.editAdventure('wrong-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ADVENTURE_MISMATCH');
    });
  });

  describe('Cancellation and no-op edits', () => {
    it('should handle cancellation at first field', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('cancel');

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(false);
      expect(result.output[0]).toContain('Edit cancelled');
      
      // Verify no changes
      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe('Temple Entrance');
    });

    it('should handle cancellation during multi-line input', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput('Line 1');
      mockTerminal.simulateInput('cancel');

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(false);
      expect(result.output[0]).toContain('Edit cancelled');
    });

    it('should handle no-op edit (all fields kept)', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput(''); // Keep description

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(true);
      expect(result.output).toContain('No changes made');
    });

    it('should handle declining confirmation after making changes', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('New Name');
      mockTerminal.simulateInput(''); // Keep description
      mockTerminal.simulateInput('n'); // Decline confirmation

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(false);
      expect(result.output[0]).toContain('Edit cancelled');
      
      // Verify no changes
      const location = testAdventure.locations.get('loc-1');
      expect(location?.name).toBe('Temple Entrance');
    });
  });

  describe('Validation across multiple fields', () => {
    it('should validate location name and re-prompt on error', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput('   '); // Invalid (empty)
      mockTerminal.simulateInput('Valid Name'); // Valid
      mockTerminal.simulateInput(''); // Keep description
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(true);
      
      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[ERROR]');
    });

    it('should validate description length', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput('Short'); // Invalid (too short)
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('This is a valid description that is long enough.'); // Valid
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editLocation('loc-1');

      expect(result.success).toBe(true);
      
      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[ERROR]');
    });

    it('should validate character name length', async () => {
      // Queue all inputs upfront
      const longName = 'a'.repeat(51);
      mockTerminal.simulateInput(longName); // Invalid (too long)
      mockTerminal.simulateInput('Valid Name'); // Valid
      mockTerminal.simulateInput('k'); // Keep dialogue

      const result = await editSessionManager.editCharacter('char-1');

      expect(result.success).toBe(true);
      
      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[ERROR]');
    });

    it('should validate dialogue has at least one line', async () => {
      // Queue all inputs upfront
      mockTerminal.simulateInput(''); // Keep name
      mockTerminal.simulateInput('r'); // Replace dialogue
      mockTerminal.simulateInput('END'); // Invalid (empty)
      mockTerminal.simulateInput('Valid dialogue line'); // Valid
      mockTerminal.simulateInput('END');
      mockTerminal.simulateInput('y');

      const result = await editSessionManager.editCharacter('char-1');

      expect(result.success).toBe(true);
      
      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[ERROR]');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateLocationName,
  validateCharacterName,
  validateAdventureName,
  validateDialogue,
  validateLocationDescription,
  validateAIPersonality,
  validateAdventureDescription
} from './validators';

describe('validators', () => {
  describe('validateRequired', () => {
    it('should pass for non-empty string', () => {
      expect(validateRequired('test')).toBeNull();
    });

    it('should fail for empty string', () => {
      expect(validateRequired('')).toBe('This field is required and cannot be empty');
    });

    it('should fail for whitespace-only string', () => {
      expect(validateRequired('   ')).toBe('This field is required and cannot be empty');
    });

    it('should pass for non-empty array', () => {
      expect(validateRequired(['line1', 'line2'])).toBeNull();
    });

    it('should fail for empty array', () => {
      expect(validateRequired([])).toBe('This field is required and cannot be empty');
    });

    it('should fail for array with only empty strings', () => {
      expect(validateRequired(['', '  '])).toBe('This field is required and cannot be empty');
    });
  });

  describe('validateLocationName', () => {
    it('should pass for valid location name', () => {
      expect(validateLocationName('Temple Entrance')).toBeNull();
    });

    it('should fail for empty string', () => {
      expect(validateLocationName('')).toBe('Location name cannot be empty');
    });

    it('should fail for whitespace-only string', () => {
      expect(validateLocationName('   ')).toBe('Location name cannot be empty');
    });

    it('should fail for name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(validateLocationName(longName)).toBe('Location name must be 100 characters or less');
    });

    it('should pass for name exactly 100 characters', () => {
      const name = 'a'.repeat(100);
      expect(validateLocationName(name)).toBeNull();
    });

    it('should fail for array input', () => {
      expect(validateLocationName(['line1'])).toBe('Location name must be a single line of text');
    });
  });

  describe('validateCharacterName', () => {
    it('should pass for valid character name', () => {
      expect(validateCharacterName('Temple Guard')).toBeNull();
    });

    it('should fail for empty string', () => {
      expect(validateCharacterName('')).toBe('Character name cannot be empty');
    });

    it('should fail for name longer than 50 characters', () => {
      const longName = 'a'.repeat(51);
      expect(validateCharacterName(longName)).toBe('Character name must be 50 characters or less');
    });

    it('should pass for name exactly 50 characters', () => {
      const name = 'a'.repeat(50);
      expect(validateCharacterName(name)).toBeNull();
    });

    it('should fail for array input', () => {
      expect(validateCharacterName(['line1'])).toBe('Character name must be a single line of text');
    });
  });

  describe('validateAdventureName', () => {
    it('should pass for valid adventure name', () => {
      expect(validateAdventureName('The Lost Temple')).toBeNull();
    });

    it('should fail for empty string', () => {
      expect(validateAdventureName('')).toBe('Adventure name cannot be empty');
    });

    it('should fail for name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(validateAdventureName(longName)).toBe('Adventure name must be 100 characters or less');
    });

    it('should pass for name exactly 100 characters', () => {
      const name = 'a'.repeat(100);
      expect(validateAdventureName(name)).toBeNull();
    });

    it('should fail for array input', () => {
      expect(validateAdventureName(['line1'])).toBe('Adventure name must be a single line of text');
    });
  });

  describe('validateDialogue', () => {
    it('should pass for array with dialogue lines', () => {
      expect(validateDialogue(['Hello!', 'How are you?'])).toBeNull();
    });

    it('should pass for single string', () => {
      expect(validateDialogue('Hello!')).toBeNull();
    });

    it('should fail for empty array', () => {
      expect(validateDialogue([])).toBe('Character must have at least one dialogue line');
    });

    it('should fail for array with only empty strings', () => {
      expect(validateDialogue(['', '  '])).toBe('Character must have at least one dialogue line');
    });

    it('should pass for array with at least one non-empty line', () => {
      expect(validateDialogue(['', 'Hello!', '  '])).toBeNull();
    });
  });

  describe('validateLocationDescription', () => {
    it('should pass for valid description', () => {
      expect(validateLocationDescription('A beautiful temple entrance')).toBeNull();
    });

    it('should pass for multi-line description', () => {
      expect(validateLocationDescription(['Line 1', 'Line 2'])).toBeNull();
    });

    it('should fail for empty string', () => {
      expect(validateLocationDescription('')).toBe('Location description cannot be empty');
    });

    it('should fail for empty array', () => {
      expect(validateLocationDescription([])).toBe('Location description cannot be empty');
    });

    it('should fail for description shorter than 10 characters', () => {
      expect(validateLocationDescription('Short')).toBe('Location description should be at least 10 characters');
    });

    it('should pass for description exactly 10 characters', () => {
      expect(validateLocationDescription('1234567890')).toBeNull();
    });
  });

  describe('validateAIPersonality', () => {
    it('should pass for valid personality', () => {
      expect(validateAIPersonality('A wise and ancient guardian')).toBeNull();
    });

    it('should pass for multi-line personality', () => {
      expect(validateAIPersonality(['Line 1', 'Line 2'])).toBeNull();
    });

    it('should fail for empty string', () => {
      expect(validateAIPersonality('')).toBe('AI personality cannot be empty');
    });

    it('should fail for personality longer than 500 characters', () => {
      const longText = 'a'.repeat(501);
      const result = validateAIPersonality(longText);
      expect(result).toContain('Personality description must be 500 characters or less');
      expect(result).toContain('501 characters');
    });

    it('should pass for personality exactly 500 characters', () => {
      const text = 'a'.repeat(500);
      expect(validateAIPersonality(text)).toBeNull();
    });
  });

  describe('validateAdventureDescription', () => {
    it('should pass for valid description', () => {
      expect(validateAdventureDescription('An epic adventure awaits')).toBeNull();
    });

    it('should pass for empty string (optional field)', () => {
      expect(validateAdventureDescription('')).toBeNull();
    });

    it('should pass for empty array (optional field)', () => {
      expect(validateAdventureDescription([])).toBeNull();
    });

    it('should fail for description shorter than 10 characters when provided', () => {
      expect(validateAdventureDescription('Short')).toBe('Adventure description should be at least 10 characters if provided');
    });

    it('should pass for description exactly 10 characters', () => {
      expect(validateAdventureDescription('1234567890')).toBeNull();
    });

    it('should pass for multi-line description', () => {
      expect(validateAdventureDescription(['Line 1 here', 'Line 2 here'])).toBeNull();
    });
  });
});

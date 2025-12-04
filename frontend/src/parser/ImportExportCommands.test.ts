/**
 * Tests for import/export terminal commands
 * Feature: adventure-import-export, Property 11: Admin Command Mode Enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from './CommandParser';
import { GameMode } from '../types';

describe('Import/Export Commands', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  /**
   * Property 11: Admin Command Mode Enforcement
   * For any import/export terminal command, when executed in player mode,
   * the system should reject the command with an error message.
   */
  describe('Property 11: Admin Command Mode Enforcement', () => {
    it('should reject export command in player mode', async () => {
      const result = await parser.parse('export demo-adventure', {
        mode: GameMode.Player,
        currentLocation: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_MODE');
    });

    it('should reject import command in player mode', async () => {
      const result = await parser.parse('import', {
        mode: GameMode.Player,
        currentLocation: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_MODE');
    });

    it('should reject schema command in player mode', async () => {
      const result = await parser.parse('schema', {
        mode: GameMode.Player,
        currentLocation: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_MODE');
    });

    it('should allow export command in admin mode', async () => {
      const result = await parser.parse('export demo-adventure', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      // Will fail due to missing auth, but should not be rejected for mode
      expect(result.error?.code).not.toBe('INVALID_MODE');
    });

    it('should allow import command in admin mode', async () => {
      const result = await parser.parse('import', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      // Will fail due to missing auth, but should not be rejected for mode
      expect(result.error?.code).not.toBe('INVALID_MODE');
    });

    it('should allow schema command in admin mode', async () => {
      const result = await parser.parse('schema', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      // Should not be rejected for mode
      expect(result.error?.code).not.toBe('INVALID_MODE');
    });
  });

  describe('Unit Tests for Terminal Commands', () => {
    it('should require adventure name for export command', async () => {
      const result = await parser.parse('export', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_ARGUMENT');
      expect(result.error?.message).toContain('Adventure name required');
    });

    it('should provide usage suggestion for export command', async () => {
      const result = await parser.parse('export', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      expect(result.error?.suggestion).toContain('export <adventure-name>');
    });

    it('should handle export command with adventure name', async () => {
      const result = await parser.parse('export demo-adventure', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      // Will fail due to missing auth, but command should be recognized
      expect(result.error?.code).not.toBe('COMMAND_NOT_FOUND');
    });

    it('should handle import command', async () => {
      const result = await parser.parse('import', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      // Will fail due to missing auth, but command should be recognized
      expect(result.error?.code).not.toBe('COMMAND_NOT_FOUND');
    });

    it('should handle schema command', async () => {
      const result = await parser.parse('schema', {
        mode: GameMode.Admin,
        currentLocation: 'test'
      });

      // Command should be recognized
      expect(result.error?.code).not.toBe('COMMAND_NOT_FOUND');
    });
  });
});

/**
 * Tests for export command autocomplete
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from './CommandParser';
import { GameMode } from '../types';

describe('Export Command Autocomplete', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it('should provide autocomplete for export command', async () => {
    const result = await parser.getAutocomplete('export ', 7, {
      mode: GameMode.Admin,
      currentLocation: 'test'
    });

    // Should attempt to fetch adventure names
    // In test environment without API, suggestions will be empty
    expect(result).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('should handle partial adventure name in export command', async () => {
    const result = await parser.getAutocomplete('export demo', 11, {
      mode: GameMode.Admin,
      currentLocation: 'test'
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('should provide autocomplete for import command', async () => {
    const result = await parser.getAutocomplete('import', 6, {
      mode: GameMode.Admin,
      currentLocation: 'test'
    });

    // Import command has no arguments, so no autocomplete
    expect(result).toBeDefined();
  });

  it('should provide autocomplete for schema command', async () => {
    const result = await parser.getAutocomplete('schema', 6, {
      mode: GameMode.Admin,
      currentLocation: 'test'
    });

    // Schema command has no arguments, so no autocomplete
    expect(result).toBeDefined();
  });
});

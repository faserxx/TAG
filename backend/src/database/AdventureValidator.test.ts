/**
 * Property-based tests for AdventureValidator
 * Feature: adventure-import-export, Property 6: Schema Validation Enforcement
 * Feature: adventure-import-export, Property 5: Invalid JSON Rejection with Comprehensive Errors
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { AdventureValidator } from './AdventureValidator.js';

describe('AdventureValidator - Property Tests', () => {
  const validator = new AdventureValidator();

  /**
   * Property 6: Schema Validation Enforcement
   * For any JSON file missing required fields, containing incorrect data types,
   * or violating referential integrity constraints, the schema validation should
   * reject it with appropriate error messages.
   */
  describe('Property 6: Schema Validation Enforcement', () => {
    it('should reject adventures missing required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Randomly omit required fields
            id: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            name: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            startLocationId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            locations: fc.option(fc.array(fc.record({
              id: fc.string({ minLength: 1 }),
              name: fc.string({ minLength: 1 }),
              description: fc.string({ minLength: 1 })
            })), { nil: undefined })
          }),
          (adventure) => {
            // Only test cases where at least one required field is missing
            const hasMissingField = !adventure.id || !adventure.name || 
                                   !adventure.startLocationId || !adventure.locations;
            
            if (!hasMissingField) {
              return true; // Skip valid cases
            }

            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have at least one error
            expect(result.errors.length).toBeGreaterThan(0);
            // Error messages should be present
            result.errors.forEach(error => {
              expect(error.message).toBeTruthy();
              expect(error.field).toBeTruthy();
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adventures with incorrect data types', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // id should be string, not number
            fc.record({
              id: fc.integer(),
              name: fc.string({ minLength: 1 }),
              startLocationId: fc.string({ minLength: 1 }),
              locations: fc.array(fc.record({
                id: fc.string({ minLength: 1 }),
                name: fc.string({ minLength: 1 }),
                description: fc.string({ minLength: 1 })
              }), { minLength: 1 })
            }),
            // name should be string, not number
            fc.record({
              id: fc.string({ minLength: 1 }),
              name: fc.integer(),
              startLocationId: fc.string({ minLength: 1 }),
              locations: fc.array(fc.record({
                id: fc.string({ minLength: 1 }),
                name: fc.string({ minLength: 1 }),
                description: fc.string({ minLength: 1 })
              }), { minLength: 1 })
            }),
            // locations should be array, not string
            fc.record({
              id: fc.string({ minLength: 1 }),
              name: fc.string({ minLength: 1 }),
              startLocationId: fc.string({ minLength: 1 }),
              locations: fc.string()
            })
          ),
          (adventure) => {
            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have at least one error
            expect(result.errors.length).toBeGreaterThan(0);
            // Should mention type error
            const hasTypeError = result.errors.some(e => 
              e.message.toLowerCase().includes('type') ||
              e.message.toLowerCase().includes('invalid')
            );
            expect(hasTypeError).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adventures with invalid direction values', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['north', 'south', 'east', 'west', 'up', 'down'].includes(s)),
          (invalidDirection) => {
            const adventure = {
              id: 'test-adventure',
              name: 'Test Adventure',
              startLocationId: 'start',
              locations: [
                {
                  id: 'start',
                  name: 'Start',
                  description: 'Starting location',
                  exits: [
                    {
                      direction: invalidDirection,
                      targetLocationId: 'end'
                    }
                  ]
                },
                {
                  id: 'end',
                  name: 'End',
                  description: 'Ending location'
                }
              ]
            };

            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have error about invalid direction
            const hasDirectionError = result.errors.some(e => 
              e.message.toLowerCase().includes('enum') ||
              e.message.toLowerCase().includes('one of')
            );
            expect(hasDirectionError).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adventures with duplicate location IDs', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-z0-9-]+$/),
          (duplicateId) => {
            const adventure = {
              id: 'test-adventure',
              name: 'Test Adventure',
              startLocationId: duplicateId,
              locations: [
                {
                  id: duplicateId,
                  name: 'Location 1',
                  description: 'First location'
                },
                {
                  id: duplicateId,
                  name: 'Location 2',
                  description: 'Second location with same ID'
                }
              ]
            };

            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have error about duplicate ID
            const hasDuplicateError = result.errors.some(e => 
              e.message.toLowerCase().includes('duplicate')
            );
            expect(hasDuplicateError).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adventures with invalid exit references', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s !== 'start'),
          (nonExistentLocationId) => {
            const adventure = {
              id: 'test-adventure',
              name: 'Test Adventure',
              startLocationId: 'start',
              locations: [
                {
                  id: 'start',
                  name: 'Start',
                  description: 'Starting location',
                  exits: [
                    {
                      direction: 'north',
                      targetLocationId: nonExistentLocationId
                    }
                  ]
                }
              ]
            };

            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have error about non-existent location
            const hasReferenceError = result.errors.some(e => 
              e.message.toLowerCase().includes('non-existent') ||
              e.message.toLowerCase().includes('does not exist')
            );
            expect(hasReferenceError).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adventures with invalid startLocationId', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s !== 'actual-location'),
          (invalidStartId) => {
            const adventure = {
              id: 'test-adventure',
              name: 'Test Adventure',
              startLocationId: invalidStartId,
              locations: [
                {
                  id: 'actual-location',
                  name: 'Actual Location',
                  description: 'The only location'
                }
              ]
            };

            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have error about start location
            const hasStartLocationError = result.errors.some(e => 
              e.field.includes('startLocationId') ||
              e.message.toLowerCase().includes('start location')
            );
            expect(hasStartLocationError).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Invalid JSON Rejection with Comprehensive Errors
   * For any JSON file that violates the schema, the validation should fail
   * and report all validation errors with specific field paths and clear messages.
   */
  describe('Property 5: Invalid JSON Rejection with Comprehensive Errors', () => {
    it('should report all validation errors, not just the first one', () => {
      fc.assert(
        fc.property(
          fc.constant({
            // Multiple violations: missing id, wrong type for name, invalid startLocationId
            name: 123, // Wrong type
            startLocationId: 'non-existent',
            locations: [
              {
                id: 'loc1',
                name: 'Location 1',
                description: 'Description'
              }
            ]
          }),
          (adventure) => {
            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // Should have multiple errors (missing id, wrong type, invalid reference)
            expect(result.errors.length).toBeGreaterThan(1);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide specific field paths in error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            startLocationId: fc.string({ minLength: 1 }),
            locations: fc.array(fc.record({
              // Missing required 'name' field
              id: fc.string({ minLength: 1 }),
              description: fc.string({ minLength: 1 })
            }), { minLength: 1 })
          }),
          (adventure) => {
            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid (missing location name)
            expect(result.valid).toBe(false);
            // All errors should have field paths
            result.errors.forEach(error => {
              expect(error.field).toBeTruthy();
              expect(typeof error.field).toBe('string');
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide clear error messages', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Missing required field
            fc.record({
              name: fc.string({ minLength: 1 }),
              startLocationId: fc.string({ minLength: 1 }),
              locations: fc.array(fc.record({
                id: fc.string({ minLength: 1 }),
                name: fc.string({ minLength: 1 }),
                description: fc.string({ minLength: 1 })
              }), { minLength: 1 })
            }),
            // Wrong type
            fc.record({
              id: fc.integer(),
              name: fc.string({ minLength: 1 }),
              startLocationId: fc.string({ minLength: 1 }),
              locations: fc.array(fc.record({
                id: fc.string({ minLength: 1 }),
                name: fc.string({ minLength: 1 }),
                description: fc.string({ minLength: 1 })
              }), { minLength: 1 })
            })
          ),
          (adventure) => {
            const result = validator.validateAdventureJson(adventure);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            // All errors should have non-empty messages
            result.errors.forEach(error => {
              expect(error.message).toBeTruthy();
              expect(error.message.length).toBeGreaterThan(0);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

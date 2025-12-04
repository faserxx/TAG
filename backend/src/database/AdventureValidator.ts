/**
 * Adventure JSON validation service
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import adventureSchema from './adventure-schema.json' assert { type: 'json' };

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class AdventureValidator {
  private ajv: Ajv;
  private validateFunction: ValidateFunction;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    this.validateFunction = this.ajv.compile(adventureSchema);
  }

  /**
   * Validate adventure JSON against schema and referential integrity
   */
  validateAdventureJson(json: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Schema validation
    const schemaValid = this.validateFunction(json);
    if (!schemaValid && this.validateFunction.errors) {
      errors.push(...this.convertAjvErrors(this.validateFunction.errors));
    }

    // If schema validation fails, don't proceed with referential integrity checks
    if (!schemaValid) {
      return { valid: false, errors };
    }

    // Referential integrity validation
    const integrityErrors = this.validateReferentialIntegrity(json);
    errors.push(...integrityErrors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate referential integrity between entities
   */
  validateReferentialIntegrity(adventure: any): ValidationError[] {
    const errors: ValidationError[] = [];

    errors.push(...this.validateLocationReferences(adventure));
    errors.push(...this.validateCharacterReferences(adventure));
    errors.push(...this.validateItemReferences(adventure));
    errors.push(...this.validateExitReferences(adventure));

    return errors;
  }

  /**
   * Validate location references
   */
  private validateLocationReferences(adventure: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const locationIds = new Set<string>();
    const duplicateIds = new Set<string>();

    // Collect location IDs and check for duplicates
    for (const location of adventure.locations) {
      if (locationIds.has(location.id)) {
        duplicateIds.add(location.id);
      }
      locationIds.add(location.id);
    }

    // Report duplicate location IDs
    for (const duplicateId of duplicateIds) {
      errors.push({
        field: 'locations',
        message: `Duplicate location ID: "${duplicateId}"`,
        value: duplicateId
      });
    }

    // Validate startLocationId references an existing location
    if (!locationIds.has(adventure.startLocationId)) {
      errors.push({
        field: 'startLocationId',
        message: `Start location "${adventure.startLocationId}" does not exist in locations array`,
        value: adventure.startLocationId
      });
    }

    return errors;
  }

  /**
   * Validate character references
   */
  private validateCharacterReferences(adventure: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const characterIds = new Set<string>();
    const duplicateIds = new Set<string>();

    // Collect character IDs and check for duplicates
    for (const location of adventure.locations) {
      if (location.characters) {
        for (const character of location.characters) {
          if (characterIds.has(character.id)) {
            duplicateIds.add(character.id);
          }
          characterIds.add(character.id);
        }
      }
    }

    // Report duplicate character IDs
    for (const duplicateId of duplicateIds) {
      errors.push({
        field: 'characters',
        message: `Duplicate character ID: "${duplicateId}"`,
        value: duplicateId
      });
    }

    return errors;
  }

  /**
   * Validate item references
   */
  private validateItemReferences(adventure: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const itemIds = new Set<string>();
    const duplicateIds = new Set<string>();

    // Collect item IDs and check for duplicates
    for (const location of adventure.locations) {
      if (location.items) {
        for (const item of location.items) {
          if (itemIds.has(item.id)) {
            duplicateIds.add(item.id);
          }
          itemIds.add(item.id);
        }
      }
    }

    // Report duplicate item IDs
    for (const duplicateId of duplicateIds) {
      errors.push({
        field: 'items',
        message: `Duplicate item ID: "${duplicateId}"`,
        value: duplicateId
      });
    }

    return errors;
  }

  /**
   * Validate exit references
   */
  private validateExitReferences(adventure: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const locationIds = new Set<string>(adventure.locations.map((loc: any) => loc.id));

    for (const location of adventure.locations) {
      if (location.exits) {
        const directionsUsed = new Set<string>();

        for (const exit of location.exits) {
          // Check for duplicate directions from same location
          if (directionsUsed.has(exit.direction)) {
            errors.push({
              field: `locations[${location.id}].exits`,
              message: `Duplicate exit direction "${exit.direction}" from location "${location.id}"`,
              value: exit.direction
            });
          }
          directionsUsed.add(exit.direction);

          // Validate target location exists
          if (!locationIds.has(exit.targetLocationId)) {
            errors.push({
              field: `locations[${location.id}].exits[${exit.direction}]`,
              message: `Exit from "${location.id}" to "${exit.targetLocationId}" references non-existent location`,
              value: exit.targetLocationId
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Convert Ajv errors to our ValidationError format
   */
  private convertAjvErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map(error => {
      const field = error.instancePath || error.schemaPath;
      let message = error.message || 'Validation error';
      
      // Enhance error messages with more context
      if (error.keyword === 'required') {
        message = `Missing required field: ${error.params.missingProperty}`;
      } else if (error.keyword === 'type') {
        message = `Invalid type: expected ${error.params.type}, got ${typeof error.data}`;
      } else if (error.keyword === 'enum') {
        message = `Invalid value: must be one of ${error.params.allowedValues.join(', ')}`;
      } else if (error.keyword === 'minLength') {
        message = `Value too short: minimum length is ${error.params.limit}`;
      } else if (error.keyword === 'pattern') {
        message = `Invalid format: must match pattern ${error.params.pattern}`;
      }

      return {
        field: field.replace(/^\//, '').replace(/\//g, '.'),
        message,
        value: error.data
      };
    });
  }
}

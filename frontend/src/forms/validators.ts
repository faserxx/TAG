/**
 * Field validators for form editing
 * Each validator returns an error message string if validation fails, or null if valid
 */

/**
 * Validator for required fields (non-empty)
 */
export function validateRequired(value: string | string[]): string | null {
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every(line => line.trim() === '')) {
      return 'This field is required and cannot be empty';
    }
  } else if (typeof value === 'string') {
    if (value.trim() === '') {
      return 'This field is required and cannot be empty';
    }
  }
  return null;
}

/**
 * Validator for location names
 * - Must not be empty
 * - Must be between 1 and 100 characters
 * - Should not contain only whitespace
 */
export function validateLocationName(value: string | string[]): string | null {
  if (Array.isArray(value)) {
    return 'Location name must be a single line of text';
  }

  const name = value.trim();

  if (name === '') {
    return 'Location name cannot be empty';
  }

  if (name.length > 100) {
    return 'Location name must be 100 characters or less';
  }

  return null;
}

/**
 * Validator for character names
 * - Must not be empty
 * - Must be between 1 and 50 characters
 * - Should not contain only whitespace
 */
export function validateCharacterName(value: string | string[]): string | null {
  if (Array.isArray(value)) {
    return 'Character name must be a single line of text';
  }

  const name = value.trim();

  if (name === '') {
    return 'Character name cannot be empty';
  }

  if (name.length > 50) {
    return 'Character name must be 50 characters or less';
  }

  return null;
}

/**
 * Validator for adventure names
 * - Must not be empty
 * - Must be between 1 and 100 characters
 * - Should not contain only whitespace
 */
export function validateAdventureName(value: string | string[]): string | null {
  if (Array.isArray(value)) {
    return 'Adventure name must be a single line of text';
  }

  const name = value.trim();

  if (name === '') {
    return 'Adventure name cannot be empty';
  }

  if (name.length > 100) {
    return 'Adventure name must be 100 characters or less';
  }

  return null;
}

/**
 * Validator for dialogue lines (non-AI characters)
 * - Must have at least one line
 * - Each line should not be empty
 */
export function validateDialogue(value: string | string[]): string | null {
  if (!Array.isArray(value)) {
    // If it's a single string, convert to array for validation
    value = [value];
  }

  // Filter out empty lines
  const nonEmptyLines = value.filter(line => line.trim() !== '');

  if (nonEmptyLines.length === 0) {
    return 'Character must have at least one dialogue line';
  }

  return null;
}

/**
 * Validator for location descriptions
 * - Must not be empty
 * - Should have meaningful content
 */
export function validateLocationDescription(value: string | string[]): string | null {
  let text: string;

  if (Array.isArray(value)) {
    text = value.join('\n').trim();
  } else {
    text = value.trim();
  }

  if (text === '') {
    return 'Location description cannot be empty';
  }

  if (text.length < 10) {
    return 'Location description should be at least 10 characters';
  }

  return null;
}

/**
 * Validator for AI personality descriptions
 * - Must not be empty
 * - Must be 500 characters or less
 */
export function validateAIPersonality(value: string | string[]): string | null {
  let text: string;

  if (Array.isArray(value)) {
    text = value.join('\n').trim();
  } else {
    text = value.trim();
  }

  if (text === '') {
    return 'AI personality cannot be empty';
  }

  if (text.length > 500) {
    return `Personality description must be 500 characters or less (currently ${text.length} characters)`;
  }

  return null;
}

/**
 * Validator for adventure descriptions
 * - Can be empty (optional field)
 * - If provided, should have meaningful content
 */
export function validateAdventureDescription(value: string | string[]): string | null {
  let text: string;

  if (Array.isArray(value)) {
    text = value.join('\n').trim();
  } else {
    text = value.trim();
  }

  // Adventure description is optional, so empty is allowed
  if (text === '') {
    return null;
  }

  // If provided, should be at least 10 characters
  if (text.length < 10) {
    return 'Adventure description should be at least 10 characters if provided';
  }

  return null;
}

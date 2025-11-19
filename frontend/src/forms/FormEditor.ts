import { TerminalInterface } from '../terminal/TerminalInterface';
import { OutputStyle } from '../types';
import { FormModal, FormModalField } from './FormModal';

/**
 * Configuration for a single form field
 */
export interface FieldConfig {
  name: string;
  label: string;
  currentValue: string | string[];
  helpText?: string;
  multiLine?: boolean;
  required?: boolean;
  validator?: (value: string | string[]) => string | null; // Returns error message or null
  isDialogue?: boolean; // Special handling for dialogue editing
}

/**
 * Configuration for the entire form
 */
export interface FormConfig {
  title: string;
  fields: FieldConfig[];
}

/**
 * Result of form editing
 */
export interface FormResult {
  cancelled: boolean;
  values: Map<string, string | string[]>;
  changedFields: string[];
}

/**
 * Error thrown when user cancels the form
 */
export class CancellationError extends Error {
  constructor() {
    super('Form cancelled by user');
    this.name = 'CancellationError';
  }
}

/**
 * FormEditor manages interactive form-based editing using HTML modal
 */
export class FormEditor {
  constructor(
    private terminal: TerminalInterface,
    private config: FormConfig
  ) {}

  /**
   * Start the interactive form editing session using HTML modal
   */
  async edit(): Promise<FormResult> {
    // Show loading message in terminal
    this.terminal.writeLine('Opening form editor...', OutputStyle.Info);
    
    // Convert config to modal format
    const modalFields: FormModalField[] = this.config.fields.map(field => ({
      name: field.name,
      label: field.label,
      value: field.currentValue,
      type: field.isDialogue ? 'dialogue' : (field.multiLine ? 'textarea' : 'text'),
      helpText: field.helpText,
      required: field.required,
      maxLength: this.getMaxLength(field),
      validator: field.validator
    }));
    
    // Create and show modal
    const modal = new FormModal({
      title: this.config.title,
      fields: modalFields
    });
    
    const result = await modal.show();
    
    // Display result in terminal
    if (result.cancelled) {
      this.terminal.writeLine('Edit cancelled. No changes were saved.', OutputStyle.System);
    } else if (result.changedFields.length === 0) {
      this.terminal.writeLine('No changes made.', OutputStyle.System);
    } else {
      this.terminal.writeLine(`✓ Changes saved successfully!`, OutputStyle.Success);
      this.terminal.writeLine(`Modified fields: ${result.changedFields.join(', ')}`, OutputStyle.Info);
    }
    
    return result;
  }
  
  /**
   * Get max length for a field based on validation rules
   */
  private getMaxLength(field: FieldConfig): number | undefined {
    // Common max lengths based on field type
    if (field.name === 'name') {
      return field.label.includes('Character') ? 50 : 100;
    }
    if (field.name === 'personality') {
      return 500;
    }
    return undefined;
  }
}

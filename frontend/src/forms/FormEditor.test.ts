import { describe, it, expect, beforeEach } from 'vitest';
import { FormEditor, FieldConfig, FormConfig } from './FormEditor';
import { OutputStyle } from '../types';

// Mock TerminalInterface
class MockTerminalInterface {
  private responses: string[] = [];
  private responseIndex: number = 0;
  public writtenLines: string[] = [];
  public writtenText: string[] = [];
  public commandCallback?: (command: string) => void;

  setResponses(responses: string[]) {
    this.responses = responses;
    this.responseIndex = 0;
  }

  write(text: string, _style?: OutputStyle): void {
    this.writtenText.push(text);
  }

  writeLine(text: string, _style?: OutputStyle): void {
    this.writtenLines.push(text);
  }

  simulateInput(input: string): void {
    if (this.commandCallback) {
      this.commandCallback(input);
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

describe('FormEditor', () => {
  let mockTerminal: MockTerminalInterface;
  let formEditor: FormEditor;

  beforeEach(() => {
    mockTerminal = new MockTerminalInterface();
  });

  describe('field-by-field prompting flow', () => {
    it('should prompt for each field in sequence', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Old Name'
          },
          {
            name: 'description',
            label: 'Description',
            currentValue: 'Old Description'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      // Start edit in background
      const editPromise = formEditor.edit();

      // Wait for first prompt
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Name');

      // Wait for second prompt
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Description');

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      const result = await editPromise;

      expect(result.cancelled).toBe(false);
      expect(result.values.get('name')).toBe('New Name');
      expect(result.values.get('description')).toBe('New Description');
      expect(result.changedFields).toEqual(['name', 'description']);
    });

    it('should display form header with title', async () => {
      const config: FormConfig = {
        title: 'Editing Location: Temple',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Temple'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('n');

      await editPromise;

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('Editing Location: Temple');
    });

    it('should show field progress (Field X of Y)', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            currentValue: 'Value 1'
          },
          {
            name: 'field2',
            label: 'Field 2',
            currentValue: 'Value 2'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('n');

      await editPromise;

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('Field 1 of 2');
      expect(output).toContain('Field 2 of 2');
    });
  });

  describe('validation error handling and re-prompting', () => {
    it('should display error and re-prompt when validation fails', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'age',
            label: 'Age',
            currentValue: '25',
            required: true,
            validator: (value: string | string[]) => {
              if (typeof value === 'string') {
                const num = parseInt(value);
                if (isNaN(num)) {
                  return 'Age must be a number';
                }
              }
              return null;
            }
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      // Start the edit process
      const editPromise = formEditor.edit();

      // Simulate the interaction sequence
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('not a number'); // Invalid input - will trigger validator

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('30'); // Valid input

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y'); // Confirm

      const result = await editPromise;

      // Verify the error message was displayed
      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[ERROR] Age must be a number');
      
      // Verify the valid value was accepted
      expect(result.values.get('age')).toBe('30');
      expect(result.changedFields).toContain('age');
    });

    it('should continue re-prompting until valid input is provided', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'age',
            label: 'Age',
            currentValue: '25',
            validator: (value: string | string[]) => {
              if (typeof value === 'string') {
                const num = parseInt(value);
                if (isNaN(num) || num < 0 || num > 120) {
                  return 'Age must be between 0 and 120';
                }
              }
              return null;
            }
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // First attempt - invalid
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('999');

      // Second attempt - invalid
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('-5');

      // Third attempt - valid
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('30');

      // Confirmation
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      const result = await editPromise;

      expect(result.values.get('age')).toBe('30');

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[ERROR] Age must be between 0 and 120');
    });
  });

  describe('cancellation at various points', () => {
    it('should cancel when user types "cancel" at first field', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Old Name'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('cancel');

      const result = await editPromise;

      expect(result.cancelled).toBe(true);
      expect(result.values.size).toBe(0);
      expect(result.changedFields).toEqual([]);

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('Edit cancelled');
    });

    it('should cancel when user types "cancel" at middle field', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            currentValue: 'Value 1'
          },
          {
            name: 'field2',
            label: 'Field 2',
            currentValue: 'Value 2'
          },
          {
            name: 'field3',
            label: 'Field 3',
            currentValue: 'Value 3'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // First field - change value
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Value 1');

      // Second field - cancel
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('cancel');

      const result = await editPromise;

      expect(result.cancelled).toBe(true);
      expect(result.values.size).toBe(0);
      expect(result.changedFields).toEqual([]);
    });

    it('should cancel when user declines confirmation', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Old Name'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Name');

      // Decline confirmation
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('n');

      const result = await editPromise;

      expect(result.cancelled).toBe(true);

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('Edit cancelled');
    });
  });

  describe('keeping vs changing values', () => {
    it('should keep current value when user presses Enter', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Original Name'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Press Enter (empty input)
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      // Decline to save (no changes)
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('n');

      const result = await editPromise;

      expect(result.values.get('name')).toBe('Original Name');
      expect(result.changedFields).toEqual([]);

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('[kept]');
    });

    it('should track changed fields correctly', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            currentValue: 'Value 1'
          },
          {
            name: 'field2',
            label: 'Field 2',
            currentValue: 'Value 2'
          },
          {
            name: 'field3',
            label: 'Field 3',
            currentValue: 'Value 3'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Change field1
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Value 1');

      // Keep field2
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      // Change field3
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Value 3');

      // Confirm
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      const result = await editPromise;

      expect(result.changedFields).toEqual(['field1', 'field3']);
      expect(result.values.get('field1')).toBe('New Value 1');
      expect(result.values.get('field2')).toBe('Value 2');
      expect(result.values.get('field3')).toBe('New Value 3');
    });

    it('should allow keeping all values (no-op edit)', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            currentValue: 'Value 1'
          },
          {
            name: 'field2',
            label: 'Field 2',
            currentValue: 'Value 2'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Keep all fields
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      // Should not prompt for confirmation when no changes
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await editPromise;

      expect(result.changedFields).toEqual([]);
      expect(result.cancelled).toBe(true); // No changes means cancelled
    });
  });

  describe('multi-line input collection', () => {
    it('should collect multiple lines until END terminator', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'description',
            label: 'Description',
            currentValue: 'Old description',
            multiLine: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Enter multi-line content
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('Line 1');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('Line 2');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('Line 3');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('END');

      // Confirm
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      const result = await editPromise;

      expect(result.values.get('description')).toEqual(['Line 1', 'Line 2', 'Line 3']);
      expect(result.changedFields).toContain('description');
    });

    it('should keep current value when first line is empty in multi-line mode', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'description',
            label: 'Description',
            currentValue: 'Original description',
            multiLine: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Press Enter on first line (keeps current value but converts to array)
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      // Confirm to save (there's a change due to type conversion)
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      const result = await editPromise;

      // Multi-line fields return arrays, even when keeping string values
      // Note: This causes a type change from string to string[] which is detected as a change
      expect(result.values.get('description')).toEqual(['Original description']);
      expect(result.changedFields).toContain('description');
    });

    it('should handle cancellation during multi-line input', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'description',
            label: 'Description',
            currentValue: 'Old description',
            multiLine: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Start entering lines
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('Line 1');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('Line 2');

      // Cancel
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('cancel');

      const result = await editPromise;

      expect(result.cancelled).toBe(true);
      expect(result.values.size).toBe(0);
    });
  });

  describe('summary generation', () => {
    it('should display summary with changed and unchanged fields', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Old Name'
          },
          {
            name: 'description',
            label: 'Description',
            currentValue: 'Old Description'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Change name
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Name');

      // Keep description
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      // Confirm
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      await editPromise;

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('Edit Summary');
      expect(output).toContain('Name:');
      // The summary displays old and new values on separate lines
      expect(output).toContain('Old Name');
      expect(output).toContain('New Name');
      // Unchanged fields show [kept] indicator
      expect(output).toContain('[kept]');
    });

    it('should show "No changes made" when all fields are kept', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'name',
            label: 'Name',
            currentValue: 'Name'
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Keep field
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('');

      await editPromise;

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('No changes made');
    });

    it('should display old and new values for array fields', async () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'dialogue',
            label: 'Dialogue',
            currentValue: ['Line 1', 'Line 2'],
            isDialogue: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const editPromise = formEditor.edit();

      // Choose replace option
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('r');

      // Enter new dialogue
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Line 1');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('New Line 2');

      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('END');

      // Confirm
      await new Promise(resolve => setTimeout(resolve, 10));
      mockTerminal.simulateInput('y');

      await editPromise;

      const output = mockTerminal.writtenLines.join('\n');
      expect(output).toContain('Edit Summary');
      expect(output).toContain('Dialogue:');
    });
  });

  describe('dialogue field configuration', () => {
    it('should support isDialogue flag in FieldConfig', () => {
      const dialogueField: FieldConfig = {
        name: 'dialogue',
        label: 'Dialogue Lines',
        currentValue: ['Hello', 'Goodbye'],
        isDialogue: true
      };

      expect(dialogueField.isDialogue).toBe(true);
      expect(Array.isArray(dialogueField.currentValue)).toBe(true);
    });

    it('should handle dialogue field with empty array', () => {
      const dialogueField: FieldConfig = {
        name: 'dialogue',
        label: 'Dialogue Lines',
        currentValue: [],
        isDialogue: true
      };

      expect(dialogueField.currentValue).toEqual([]);
    });
  });

  describe('dialogue validation', () => {
    it('should validate that at least one dialogue line exists', () => {
      const validator = (value: string | string[]): string | null => {
        if (Array.isArray(value) && value.length === 0) {
          return 'At least one dialogue line is required';
        }
        return null;
      };

      expect(validator([])).toBe('At least one dialogue line is required');
      expect(validator(['Hello'])).toBe(null);
      expect(validator(['Hello', 'Goodbye'])).toBe(null);
    });
  });

  describe('dialogue array handling', () => {
    it('should properly detect changes in dialogue arrays', () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'dialogue',
            label: 'Dialogue',
            currentValue: ['Line 1', 'Line 2'],
            isDialogue: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      // Test that arrays with different content are detected as changed
      const oldValue = ['Line 1', 'Line 2'];
      const newValue = ['Line 1', 'Line 3'];
      
      // Access private method through type assertion for testing
      const hasChanged = (formEditor as any).hasValueChanged(oldValue, newValue);
      expect(hasChanged).toBe(true);
    });

    it('should detect when dialogue arrays have different lengths', () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'dialogue',
            label: 'Dialogue',
            currentValue: ['Line 1', 'Line 2'],
            isDialogue: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const oldValue = ['Line 1', 'Line 2'];
      const newValue = ['Line 1', 'Line 2', 'Line 3'];
      
      const hasChanged = (formEditor as any).hasValueChanged(oldValue, newValue);
      expect(hasChanged).toBe(true);
    });

    it('should not detect changes when dialogue arrays are identical', () => {
      const config: FormConfig = {
        title: 'Test Form',
        fields: [
          {
            name: 'dialogue',
            label: 'Dialogue',
            currentValue: ['Line 1', 'Line 2'],
            isDialogue: true
          }
        ]
      };

      formEditor = new FormEditor(mockTerminal as any, config);

      const oldValue = ['Line 1', 'Line 2'];
      const newValue = ['Line 1', 'Line 2'];
      
      const hasChanged = (formEditor as any).hasValueChanged(oldValue, newValue);
      expect(hasChanged).toBe(false);
    });
  });
});

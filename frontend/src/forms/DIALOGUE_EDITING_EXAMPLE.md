# Dialogue Editing Feature

This document demonstrates how to use the dialogue editing functionality in the FormEditor.

## Overview

The FormEditor now supports special handling for dialogue fields through the `isDialogue` flag in `FieldConfig`. When a field is marked as dialogue, users get three options:
- **Keep** (k): Preserve all existing dialogue lines
- **Edit** (e): Edit individual lines one by one
- **Replace** (r): Replace all dialogue with new lines

## Usage Example

```typescript
import { FormEditor, FieldConfig, FormConfig } from './forms';
import { TerminalInterface } from './terminal/TerminalInterface';

// Create a form config with a dialogue field
const formConfig: FormConfig = {
  title: 'Editing Character: Temple Guard',
  fields: [
    {
      name: 'name',
      label: 'Character Name',
      currentValue: 'Temple Guard',
      required: true
    },
    {
      name: 'dialogue',
      label: 'Dialogue Lines',
      currentValue: [
        'Halt! Who goes there?',
        'State your business.',
        'Very well, you may pass.'
      ],
      isDialogue: true,  // Enable dialogue editing mode
      validator: (value: string | string[]) => {
        // Validate at least one dialogue line exists
        if (Array.isArray(value) && value.length === 0) {
          return 'At least one dialogue line is required for non-AI characters';
        }
        return null;
      }
    }
  ]
};

// Create and run the form editor
const terminal = new TerminalInterface();
const editor = new FormEditor(terminal, formConfig);

const result = await editor.edit();

if (!result.cancelled) {
  console.log('Changed fields:', result.changedFields);
  console.log('New dialogue:', result.values.get('dialogue'));
}
```

## User Experience Flow

### 1. Keep Option (k)
```
Current dialogue:
  1: "Halt! Who goes there?"
  2: "State your business."
  3: "Very well, you may pass."

Options:
  k - Keep all dialogue
  e - Edit individual lines
  r - Replace all dialogue

Choice (k/e/r): k
[kept]
```

### 2. Edit Option (e)
```
Current dialogue:
  1: "Halt! Who goes there?"
  2: "State your business."
  3: "Very well, you may pass."

Options:
  k - Keep all dialogue
  e - Edit individual lines
  r - Replace all dialogue

Choice (k/e/r): e

Edit individual lines (press Enter to keep, type new text to change)
Type "cancel" to abort.

Line 1: "Halt! Who goes there?"
New value (or Enter to keep): 
[kept]

Line 2: "State your business."
New value (or Enter to keep): What brings you to the temple?

Line 3: "Very well, you may pass."
New value (or Enter to keep): 
[kept]

Add more dialogue lines? (y/n): y

Enter new dialogue lines (type END on a new line when finished):
Type "cancel" to abort.

> May the gods watch over you.
> END
```

### 3. Replace Option (r)
```
Current dialogue:
  1: "Halt! Who goes there?"
  2: "State your business."
  3: "Very well, you may pass."

Options:
  k - Keep all dialogue
  e - Edit individual lines
  r - Replace all dialogue

Choice (k/e/r): r

Enter new dialogue lines (type END on a new line when finished):
Type "cancel" to abort.

> Welcome to the temple.
> Please show respect to the sacred grounds.
> The priests are inside if you need guidance.
> END
```

## Cancellation

Users can cancel at any point by:
- Typing "cancel" at any prompt
- Pressing Ctrl+C

When cancelled, the form returns:
```typescript
{
  cancelled: true,
  values: new Map(),
  changedFields: []
}
```

## Validation

The dialogue field supports custom validators. Common validation:

```typescript
validator: (value: string | string[]) => {
  if (!Array.isArray(value)) {
    return 'Dialogue must be an array of strings';
  }
  
  if (value.length === 0) {
    return 'At least one dialogue line is required';
  }
  
  if (value.some(line => line.trim() === '')) {
    return 'Dialogue lines cannot be empty';
  }
  
  return null;
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:
- **2.4**: Support adding/removing/editing multiple dialogue lines
- **2.6**: Validate that at least one dialogue line exists for non-AI characters
- **8.1**: Display all current dialogue lines numbered
- **8.2**: Prompt with "Keep, edit, or replace dialogue? (k/e/r)"
- **8.3**: Allow editing individual lines by number when "edit" is chosen
- **8.4**: Allow entering new dialogue lines when "replace" is chosen
- **8.5**: Preserve all current dialogue lines when "keep" is chosen
- **8.6**: Validate that at least one dialogue line exists after editing

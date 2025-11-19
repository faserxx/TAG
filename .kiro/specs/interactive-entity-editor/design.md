# Design Document

## Overview

This feature introduces an interactive form-based editing system for game entities in admin mode. The system uses a console-based "form" interface that prompts users field-by-field, making it easier to edit complex entities with multi-line content. The design centers around a reusable `FormEditor` class that handles all user interaction, validation, and state management.

## Architecture

### Component Interaction

```
CommandParser
    ↓ (detects edit command with only ID)
    ↓ (creates FormEditor instance)
    ↓
FormEditor ← (field configuration)
    ↓ (manages edit session)
    ↓ (prompts user via TerminalInterface)
    ↓
TerminalInterface
    ↓ (displays prompts and collects input)
    ↓ (returns user input to FormEditor)
    ↓
FormEditor
    ↓ (validates input)
    ↓ (returns edited values)
    ↓
CommandParser
    ↓ (applies changes via AdminSystem)
    ↓
AdministrationSystem
```

### State Management

The FormEditor maintains an edit session state:
- Current field being edited
- Original values
- New values
- Validation errors
- Cancellation flag

## Components and Interfaces

### 1. FormEditor Class

A reusable class that manages interactive form-based editing.

**Location**: `frontend/src/forms/FormEditor.ts`

**Interface**:
```typescript
interface FieldConfig {
  name: string;
  label: string;
  currentValue: string | string[];
  helpText?: string;
  multiLine?: boolean;
  required?: boolean;
  validator?: (value: string) => string | null; // Returns error message or null
}

interface FormConfig {
  title: string;
  fields: FieldConfig[];
}

interface FormResult {
  cancelled: boolean;
  values: Map<string, string | string[]>;
  changedFields: string[];
}

class FormEditor {
  constructor(
    private terminal: TerminalInterface,
    private config: FormConfig
  ) {}
  
  async edit(): Promise<FormResult>;
}
```


### 2. TerminalInterface Extensions

Add methods to support interactive prompting and special input modes.

**New Methods**:
```typescript
interface TerminalInterface {
  // Existing methods...
  
  // New methods for interactive forms
  promptForInput(prompt: string, defaultValue?: string): Promise<string>;
  promptForMultiLineInput(prompt: string, currentValue?: string[]): Promise<string[]>;
  promptForConfirmation(prompt: string): Promise<boolean>;
  displayFieldHeader(fieldName: string, fieldNumber: number, totalFields: number): void;
  displayCurrentValue(value: string | string[]): void;
}
```

### 3. Command Parser Integration

Modify existing edit commands to detect when only an ID is provided and launch FormEditor.

**Pattern**:
```typescript
handler: async (args: string[], context: GameContext) => {
  // If only ID provided, use interactive form
  if (args.length === 1) {
    return await this.handleInteractiveEdit('location', args[0]);
  }
  
  // Otherwise, use traditional command-line edit
  // ... existing logic
}
```

### 4. Edit Session Manager

A helper class to coordinate between CommandParser and FormEditor.

**Location**: `frontend/src/forms/EditSessionManager.ts`

```typescript
class EditSessionManager {
  async editLocation(locationId: string): Promise<CommandResult>;
  async editCharacter(characterId: string): Promise<CommandResult>;
  async editAdventure(adventureId: string): Promise<CommandResult>;
  
  private createLocationForm(location: Location): FormConfig;
  private createCharacterForm(character: Character): FormConfig;
  private createAdventureForm(adventure: Adventure): FormConfig;
}
```

## Data Models

### FormConfig Structure

Example for editing a location:
```typescript
{
  title: "Editing Location: Temple Entrance",
  fields: [
    {
      name: "name",
      label: "Location Name",
      currentValue: "Temple Entrance",
      helpText: "A short, descriptive name for this location",
      required: true,
      validator: (value) => value.length > 0 ? null : "Name cannot be empty"
    },
    {
      name: "description",
      label: "Description",
      currentValue: "You stand before an ancient temple...",
      helpText: "A detailed description of what the player sees",
      multiLine: true,
      required: true
    }
  ]
}
```


## User Interaction Flow

### Single-Line Field Editing

```
┌─────────────────────────────────────────────────────────┐
│ Editing Location: Temple Entrance                       │
│ Field 1 of 2                                            │
├─────────────────────────────────────────────────────────┤
│ Location Name                                           │
│ A short, descriptive name for this location             │
│                                                         │
│ Current: Temple Entrance                                │
│ New value (or Enter to keep): _                         │
└─────────────────────────────────────────────────────────┘
```

### Multi-Line Field Editing

```
┌─────────────────────────────────────────────────────────┐
│ Editing Location: Temple Entrance                       │
│ Field 2 of 2                                            │
├─────────────────────────────────────────────────────────┤
│ Description (multi-line)                                │
│ A detailed description of what the player sees          │
│                                                         │
│ Current value:                                          │
│   1: You stand before an ancient temple.                │
│   2: Vines cover the weathered stone walls.             │
│                                                         │
│ Enter new description (type END on a new line):         │
│ > _                                                     │
└─────────────────────────────────────────────────────────┘
```

### Dialogue Editing (Character-Specific)

```
┌─────────────────────────────────────────────────────────┐
│ Editing Character: Temple Guard                         │
│ Field 3 of 3                                            │
├─────────────────────────────────────────────────────────┤
│ Dialogue Lines                                          │
│                                                         │
│ Current dialogue:                                       │
│   1: "Halt! Who goes there?"                            │
│   2: "State your business."                             │
│   3: "Very well, you may pass."                         │
│                                                         │
│ Options:                                                │
│   k - Keep all dialogue                                 │
│   e - Edit individual lines                             │
│   r - Replace all dialogue                              │
│                                                         │
│ Choice: _                                               │
└─────────────────────────────────────────────────────────┘
```

### Summary and Confirmation

```
┌─────────────────────────────────────────────────────────┐
│ Edit Summary                                            │
├─────────────────────────────────────────────────────────┤
│ Changes to Location: Temple Entrance                    │
│                                                         │
│ ✓ Name: [kept]                                          │
│ ✓ Description:                                          │
│     Old: You stand before an ancient temple.            │ 
│     New: You stand before a magnificent ancient         │
│          temple, its entrance flanked by statues.       │
│                                                         │
│ Save these changes? (y/n): _                            │
└─────────────────────────────────────────────────────────┘
```


## Error Handling

### Validation Errors

When a field fails validation:
```
New value: 
[ERROR] Name cannot be empty
New value (or Enter to keep): _
```

### Entity Not Found

```
Error: Location not found: invalid-id
Suggestion: Use "show locations" to see available locations.
```

### Cancellation

```
Edit cancelled. No changes were saved.
```

### Interruption Handling

- Ctrl+C during any prompt: Cancel edit session
- "cancel" typed at any prompt: Cancel edit session
- Network errors during save: Display error, offer to retry

## Implementation Details

### FormEditor.edit() Flow

1. Display form title and entity info
2. For each field in config:
   a. Display field header with progress
   b. Display help text
   c. Display current value
   d. Prompt for new value
   e. If empty input, keep current value
   f. If "cancel", abort and return cancelled result
   g. Validate input
   h. If invalid, show error and re-prompt
   i. Store new value
3. Display summary of changes
4. Prompt for confirmation
5. Return result with values and changed fields

### Multi-Line Input Handling

```typescript
async promptForMultiLineInput(prompt: string, currentValue?: string[]): Promise<string[]> {
  const lines: string[] = [];
  
  this.write(prompt);
  this.write('Type END on a new line when finished.');
  
  while (true) {
    const line = await this.readLine();
    
    if (line.trim() === 'END') {
      break;
    }
    
    if (line.trim() === 'cancel') {
      throw new CancellationError();
    }
    
    lines.push(line);
  }
  
  return lines.length > 0 ? lines : currentValue || [];
}
```

### Dialogue Editing Logic

```typescript
async editDialogue(currentDialogue: string[]): Promise<string[]> {
  // Display current dialogue
  this.displayDialogueLines(currentDialogue);
  
  // Prompt for action
  const choice = await this.promptForInput('Choice (k/e/r)');
  
  switch (choice.toLowerCase()) {
    case 'k':
      return currentDialogue;
    
    case 'e':
      return await this.editIndividualLines(currentDialogue);
    
    case 'r':
      return await this.replaceAllDialogue();
    
    default:
      this.write('[ERROR] Invalid choice. Please enter k, e, or r.');
      return await this.editDialogue(currentDialogue);
  }
}
```


## Testing Strategy

### Unit Tests

1. **FormEditor Tests**
   - Test field-by-field prompting
   - Test validation error handling
   - Test cancellation at various points
   - Test keeping vs changing values
   - Test multi-line input
   - Test summary generation

2. **EditSessionManager Tests**
   - Test form config generation for each entity type
   - Test applying changes to entities
   - Test error handling for invalid IDs

3. **TerminalInterface Tests**
   - Test new prompting methods
   - Test multi-line input collection
   - Test confirmation prompts

### Integration Tests

1. Test full edit flow for location
2. Test full edit flow for character
3. Test full edit flow for adventure
4. Test cancellation and resumption
5. Test validation across multiple fields
6. Test backward compatibility with command-line editing

### Manual Testing

1. Edit a location with multi-line description
2. Edit a character with multiple dialogue lines
3. Cancel edit session at various points
4. Test with very long input values
5. Test with special characters in input
6. Test keeping all values (no-op edit)

## Performance Considerations

- FormEditor operates entirely in-memory (no API calls during prompting)
- Only saves to backend when user confirms changes
- Minimal performance impact - all operations are user-paced
- No caching needed as edit sessions are short-lived

## Backward Compatibility

### Command-Line Editing Preserved

All existing edit commands continue to work with full arguments:
```
edit location loc-123 name "New Name"
edit character char-456 name "New Name"
```

### Detection Logic

```typescript
if (args.length === 1) {
  // Interactive form mode
  return await this.handleInteractiveEdit(entityType, args[0]);
} else {
  // Traditional command-line mode
  return await this.handleTraditionalEdit(args);
}
```

## Future Enhancements

Potential improvements not included in this spec:
- Undo/redo within edit session
- Field-level history (show previous values)
- Templates for common entity configurations
- Bulk editing multiple entities
- Import/export entity data
- Rich text formatting hints
- Inline validation as user types
- Auto-save drafts
- Edit session recovery after disconnect


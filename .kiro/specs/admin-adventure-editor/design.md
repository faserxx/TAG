# Design Document

## Overview

This feature extends the admin mode with commands to select, view, and edit existing adventures stored in the database. It also enhances the terminal interface with Tab autocomplete for location IDs and Up/Down arrow key navigation through command history. The design builds on the existing AdministrationSystem and CommandParser architecture, adding an "edit session" concept to track which adventure is currently being modified.

## Architecture

### High-Level Components

1. **AdministrationSystem** (frontend/src/admin/AdministrationSystem.ts)
   - Extended with methods to load adventures from the backend
   - Manages the "edit session" state (currently selected adventure)
   - Provides CRUD operations for adventure entities (locations, characters, items)

2. **CommandParser** (frontend/src/parser/CommandParser.ts)
   - Extended with new admin commands for adventure selection and editing
   - Enhanced with Tab autocomplete logic for location IDs
   - Enhanced with command history tracking and arrow key navigation

3. **TerminalInterface** (frontend/src/terminal/TerminalInterface.ts)
   - Extended to capture Tab key and arrow key events
   - Provides callbacks for autocomplete and history navigation

4. **Backend API** (backend/src/api/routes.ts)
   - Existing GET /adventures endpoint provides adventure list
   - Existing GET /adventures/:id endpoint provides full adventure data
   - Existing POST /adventures endpoint handles updates (PUT-like behavior based on ID existence)

### Data Flow

```
User Input → TerminalInterface → CommandParser → AdministrationSystem → API Client → Backend
                    ↓                   ↓                    ↓
              Tab/Arrow Keys      Command History      Edit Session State
```

## Components and Interfaces

### 1. Edit Session State

The AdministrationSystem already maintains `currentAdventure` and `currentLocationId`. This serves as the edit session state. No new state management is required.

**Key Methods:**
- `setCurrentAdventure(adventure: Adventure): void` - Already exists
- `getCurrentAdventure(): Adventure | null` - Already exists
- `clearCurrentAdventure(): void` - New method to deselect adventure

### 2. Adventure Selection Commands

**New Commands in CommandParser:**

#### list-adventures (already exists)
- Mode: Admin
- Handler: Uses `adminSystem.listAdventures()`
- Output: Formatted list with ID, title, description, location count

#### select-adventure
- Syntax: `select-adventure <adventure-id>`
- Mode: Admin
- Handler:
  1. Validate adventure ID exists via API
  2. Load full adventure data via `apiClient.get('/adventures/:id')`
  3. Deserialize and set as current adventure via `adminSystem.setCurrentAdventure()`
  4. Display confirmation with adventure title
- Error handling: Invalid ID, network errors

#### show-adventure
- Syntax: `show-adventure`
- Mode: Admin
- Handler:
  1. Check if edit session is active (`adminSystem.getCurrentAdventure()`)
  2. Format and display adventure details (title, description, locations, characters, items)
- Error handling: No adventure selected

#### deselect-adventure
- Syntax: `deselect-adventure`
- Mode: Admin
- Handler:
  1. Check if edit session is active
  2. Call `adminSystem.clearCurrentAdventure()`
  3. Display confirmation
- Error handling: No adventure selected

### 3. Adventure Editing Commands

#### edit-title
- Syntax: `edit-title <new-title>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Update `currentAdventure.name`
  3. Mark adventure as modified
- Error handling: No adventure selected, empty title

#### edit-description
- Syntax: `edit-description <new-description>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Update `currentAdventure.description`
  3. Mark adventure as modified
- Error handling: No adventure selected

#### edit-location
- Syntax: `edit-location <location-id> <property> <value>`
- Properties: name, description
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Find location by ID in current adventure
  3. Update specified property
  4. Mark adventure as modified
- Error handling: No adventure selected, location not found, invalid property

#### add-connection
- Syntax: `add-connection <from-location-id> <direction> <to-location-id>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Validate both location IDs exist
  3. Call `adminSystem.connectLocations()`
- Error handling: No adventure selected, invalid location IDs, invalid direction

#### remove-connection
- Syntax: `remove-connection <from-location-id> <direction>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Find location and remove exit
  3. Mark adventure as modified
- Error handling: No adventure selected, location not found, exit not found

#### delete-location
- Syntax: `delete-location <location-id>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Prompt for confirmation
  3. Remove location from adventure
  4. Remove all connections to this location
  5. Mark adventure as modified
- Error handling: No adventure selected, location not found, cannot delete starting location

#### delete-character
- Syntax: `delete-character <character-id>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Find character in any location
  3. Prompt for confirmation
  4. Remove character
  5. Mark adventure as modified
- Error handling: No adventure selected, character not found

#### delete-item
- Syntax: `delete-item <item-id>`
- Mode: Admin
- Handler:
  1. Verify edit session is active
  2. Find item in any location
  3. Prompt for confirmation
  4. Remove item
  5. Mark adventure as modified
- Error handling: No adventure selected, item not found

### 4. Tab Autocomplete System

**New Interface:**
```typescript
interface AutocompleteContext {
  mode: GameMode;
  currentInput: string;
  cursorPosition: number;
  editSession: Adventure | null;
}

interface AutocompleteResult {
  suggestions: string[];
  completionText?: string;
}
```

**Implementation in CommandParser:**

```typescript
class CommandParser {
  private autocompleteProviders: Map<string, AutocompleteProvider> = new Map();
  
  getAutocomplete(context: AutocompleteContext): AutocompleteResult {
    // Parse partial command
    // Identify which argument needs completion
    // Call appropriate autocomplete provider
    // Return suggestions or completion
  }
  
  registerAutocompleteProvider(commandName: string, provider: AutocompleteProvider): void {
    // Register provider for specific command
  }
}
```

**Location ID Autocomplete Provider:**
- Triggered for commands: edit-location, add-connection, remove-connection, delete-location
- Filters location IDs from current adventure based on partial input
- Returns single match as auto-completion
- Returns multiple matches as suggestion list

**Implementation in TerminalInterface:**

```typescript
class TerminalInterface {
  private onTabCallback: ((input: string, cursorPos: number) => AutocompleteResult) | null = null;
  
  onTab(callback: (input: string, cursorPos: number) => AutocompleteResult): void {
    this.onTabCallback = callback;
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const result = this.onTabCallback?.(currentInput, cursorPosition);
      // Apply completion or show suggestions
    }
  }
}
```

### 5. Command History System

**New State in CommandParser:**
```typescript
class CommandParser {
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;
  
  addToHistory(command: string): void {
    // Add command to history
    // Limit to maxHistorySize
    // Reset historyIndex
  }
  
  getHistoryCommand(direction: 'up' | 'down'): string | null {
    // Navigate history based on direction
    // Return command at current index
  }
  
  getHistory(): string[] {
    // Return full history for "history" command
  }
}
```

**Implementation in TerminalInterface:**

```typescript
class TerminalInterface {
  private onArrowCallback: ((direction: 'up' | 'down') => string | null) | null = null;
  
  onArrow(callback: (direction: 'up' | 'down') => string | null): void {
    this.onArrowCallback = callback;
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? 'up' : 'down';
      const command = this.onArrowCallback?.(direction);
      // Replace current input with command
    }
  }
}
```

**New Command:**
```typescript
{
  name: 'history',
  aliases: [],
  description: 'Show command history',
  syntax: 'history',
  mode: 'both',
  handler: async () => {
    const history = this.getHistory();
    const output = history.map((cmd, idx) => `${idx + 1}. ${cmd}`);
    return { success: true, output, error: undefined };
  }
}
```

## Data Models

### Extended Adventure Interface
No changes needed - existing Adventure interface supports all required operations.

### Extended Location Class
Add method to remove exits:
```typescript
class Location {
  removeExit(direction: string): boolean {
    return this.exits.delete(direction);
  }
}
```

### Extended AdministrationSystem Methods

```typescript
class AdministrationSystem {
  // New methods
  async loadAdventure(adventureId: string): Promise<Adventure>;
  clearCurrentAdventure(): void;
  updateAdventureTitle(title: string): void;
  updateAdventureDescription(description: string): void;
  updateLocationName(locationId: string, name: string): void;
  updateLocationDescription(locationId: string, description: string): void;
  removeConnection(fromLocationId: string, direction: string): void;
  deleteLocation(locationId: string): void;
  deleteCharacter(characterId: string): void;
  deleteItem(itemId: string): void;
  getLocationIds(): string[];
}
```

## Error Handling

### Edit Session Validation
All edit commands must check for active edit session:
```typescript
if (!this.adminSystem.getCurrentAdventure()) {
  return {
    success: false,
    output: [],
    error: {
      code: 'NO_EDIT_SESSION',
      message: 'No adventure selected',
      suggestion: 'Use "select-adventure <id>" to select an adventure first'
    }
  };
}
```

### Entity Not Found
When editing/deleting entities:
```typescript
if (!entity) {
  return {
    success: false,
    output: [],
    error: {
      code: 'ENTITY_NOT_FOUND',
      message: `${entityType} not found: ${entityId}`,
      suggestion: 'Use "show-adventure" to see available entities'
    }
  };
}
```

### Deletion Confirmation
For destructive operations, implement confirmation:
```typescript
// First call - prompt for confirmation
if (!context.confirmationPending) {
  return {
    success: true,
    output: ['PROMPT_CONFIRMATION', `Delete ${entityType} "${entityName}"?`],
    error: undefined
  };
}

// Second call - execute deletion
// ... perform deletion
```

### Network Errors
Handle API failures gracefully:
```typescript
try {
  const adventure = await apiClient.get(`/adventures/${adventureId}`);
} catch (error) {
  return {
    success: false,
    output: [],
    error: {
      code: 'LOAD_FAILED',
      message: error instanceof Error ? error.message : 'Failed to load adventure',
      suggestion: 'Check your connection and try again'
    }
  };
}
```

## Testing Strategy

### Unit Tests

1. **AdministrationSystem Tests**
   - Test loadAdventure() with valid/invalid IDs
   - Test clearCurrentAdventure()
   - Test update methods for title, description, locations
   - Test delete methods with validation
   - Test getLocationIds() for autocomplete

2. **CommandParser Tests**
   - Test new command registration and execution
   - Test autocomplete logic with various inputs
   - Test command history add/retrieve
   - Test history navigation (up/down)

3. **TerminalInterface Tests**
   - Test Tab key event handling
   - Test Arrow key event handling
   - Test callback invocation

### Integration Tests

1. **Edit Session Workflow**
   - List adventures → Select adventure → Edit properties → Save
   - Verify edit session state throughout workflow
   - Test deselect and re-select

2. **Autocomplete Workflow**
   - Type partial location ID → Press Tab → Verify completion
   - Type ambiguous prefix → Press Tab → Verify suggestions displayed

3. **History Workflow**
   - Execute multiple commands → Press Up → Verify previous command
   - Navigate through history → Press Down → Verify forward navigation
   - Execute "history" command → Verify list display

### Manual Testing

1. **Admin Workflow**
   - Create adventure in admin mode
   - Exit admin mode
   - Re-enter admin mode
   - Select and edit the created adventure
   - Verify changes persist after save

2. **Autocomplete UX**
   - Test Tab completion with single match
   - Test Tab completion with multiple matches
   - Test Tab completion with no matches
   - Verify cursor position after completion

3. **History UX**
   - Test Up arrow at beginning of history
   - Test Down arrow at end of history
   - Test editing recalled command
   - Verify history persists within session

## Implementation Notes

### Backward Compatibility
- All new commands are admin-only, no impact on player mode
- Existing create-adventure workflow remains unchanged
- New edit commands complement existing creation commands

### Performance Considerations
- Command history limited to 50 entries to prevent memory growth
- Autocomplete only searches current adventure's locations (small dataset)
- Adventure loading is async with loading indicator

### User Experience
- Clear error messages guide users through edit workflow
- Autocomplete reduces typing and prevents typos
- History navigation speeds up repetitive tasks
- Confirmation prompts prevent accidental deletions

### Future Enhancements
- Undo/redo for edit operations
- Diff view showing changes before save
- Bulk edit operations
- Import/export adventure JSON
- Autocomplete for character and item IDs

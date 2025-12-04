# Design Document: Delete Adventure Command

## Overview

This feature adds a terminal command for administrators to delete adventures from the Terminal Adventure Game. While the backend already provides a DELETE /api/adventures/:id endpoint, there is currently no way for administrators to delete adventures through the terminal interface. This design implements a "delete adventure" command that integrates with the existing CommandParser and AdministrationSystem to provide a safe, user-friendly way to remove adventures.

The command will follow the established patterns in the codebase:
- Registration in CommandParser with aliases
- Admin-mode only access
- Confirmation prompts for destructive operations
- Autocomplete support for adventure IDs
- Comprehensive error handling with actionable suggestions


## Architecture

The delete adventure command will be implemented as a new command registration in the CommandParser class, following the same pattern as other admin commands like "delete location", "delete character", and "delete item".

### Component Interaction Flow

```
User Input → CommandParser → API Client → Backend API → Database
     ↓            ↓              ↓
Confirmation  Validation    Error Handling
```

1. **User enters command**: `delete adventure <adventure-id>`
2. **CommandParser validates**: Checks admin mode, parses arguments
3. **Fetch adventure details**: Retrieve adventure name for confirmation
4. **Confirmation prompt**: Display adventure details and ask for confirmation
5. **API call**: Send DELETE request to `/api/adventures/:id`
6. **Handle response**: Display success or error message

### Integration Points

- **CommandParser**: Register new command with handler
- **API Client**: Use existing fetch API for DELETE requests
- **AdministrationSystem**: Check if adventure is currently selected
- **AuthenticationManager**: Verify admin mode and session
- **TerminalInterface**: Display confirmation prompts and results

## Components and Interfaces

### Command Registration

The command will be registered in `CommandParser.initializeDefaultCommands()` with the following structure:

```typescript
{
  name: 'delete adventure',
  aliases: ['del-adventure', 'delete-adventure'],
  description: 'Delete an adventure from the system',
  syntax: 'delete adventure <adventure-id>',
  examples: ['delete adventure demo-adventure', 'del-adventure my-adventure-123'],
  mode: GameMode.Admin,
  handler: async (args: string[], context: GameContext) => { ... }
}
```

### Command Handler Logic

The handler will implement the following steps:

1. **Argument Validation**
   - Check if adventure ID is provided
   - Return error with usage suggestion if missing

2. **Current Adventure Check**
   - Use `adminSystem.getCurrentAdventure()` to check if adventure is selected
   - If selected adventure matches target, return error suggesting deselection

3. **Adventure Lookup**
   - Fetch adventure details from `/api/adventures/:id`
   - Handle 404 if adventure doesn't exist
   - Extract adventure name for confirmation prompt

4. **Confirmation Prompt**
   - Return special output marker for confirmation: `PROMPT_DELETE_ADVENTURE_CONFIRMATION`
   - Include adventure ID and name in output
   - Terminal will handle the actual prompt interaction

5. **Deletion Execution**
   - Send DELETE request to `/api/adventures/:id` with session headers
   - Handle various error responses (401, 404, 500)
   - Return success message with adventure name

6. **Error Handling**
   - Authentication errors: Suggest re-authenticating
   - Not found errors: Inform user adventure doesn't exist
   - Network errors: Suggest checking connection
   - Unknown errors: Display error details

### Autocomplete Support

Extend the existing autocomplete logic in `CommandParser.getAutocomplete()`:

```typescript
const adventureIdCommands = ['load', 'select adventure', 'edit adventure', 'export', 'delete adventure'];
```

The autocomplete will:
- Fetch available adventure IDs from `/api/adventures`
- Use existing cache mechanism (5-second cache duration)
- Filter based on partial input
- Provide completion when exactly one match exists

### API Integration

Use the existing fetch API pattern:

```typescript
const response = await fetch(`/api/adventures/${adventureId}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId
  }
});
```

Expected responses:
- **200 OK**: Adventure deleted successfully
- **401 Unauthorized**: Not authenticated or session expired
- **404 Not Found**: Adventure doesn't exist
- **500 Internal Server Error**: Server-side error

## Data Models

No new data models are required. The command will work with existing types:

### Adventure Interface (existing)
```typescript
interface Adventure {
  id: string;
  name: string;
  description: string;
  locations: Map<string, Location>;
}
```

### CommandResult Interface (existing)
```typescript
interface CommandResult {
  success: boolean;
  output: string[];
  error?: {
    code: string;
    message: string;
    suggestion: string;
  };
}
```

### GameContext Interface (existing)
```typescript
interface GameContext {
  mode: GameMode;
  currentLocation: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Admin-only access
*For any* user in player mode, attempting to execute the delete adventure command should result in an error indicating the command is not available in player mode.
**Validates: Requirements 7.4, 7.5**

### Property 2: Argument validation
*For any* invocation of delete adventure without an adventure ID argument, the command should return an error with usage instructions.
**Validates: Requirements 1.1**

### Property 3: Current adventure protection
*For any* currently selected adventure, attempting to delete that adventure should result in an error suggesting deselection first.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Confirmation requirement
*For any* valid delete adventure command, the system should prompt for confirmation before executing the deletion.
**Validates: Requirements 1.2, 6.4**

### Property 5: Adventure name display
*For any* existing adventure, the confirmation prompt should display both the adventure ID and name.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 6: Non-existent adventure handling
*For any* adventure ID that doesn't exist, the command should return a not found error before prompting for confirmation.
**Validates: Requirements 1.5, 4.1, 6.3**

### Property 7: Authentication enforcement
*For any* delete request without valid authentication, the backend should return a 401 error and the command should display an authentication error message.
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 8: Alias equivalence
*For any* command alias (del-adventure, delete-adventure), the execution should be identical to using the primary command name.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: Autocomplete functionality
*For any* partial adventure ID input, the autocomplete should return matching adventure IDs from the available adventures.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 10: Error message clarity
*For any* error condition (404, 401, network error), the command should return a specific error message with an actionable suggestion.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

## Error Handling

### Error Categories and Responses

1. **Missing Argument Error**
   - Code: `MISSING_ARGUMENT`
   - Message: "Adventure ID required"
   - Suggestion: "Usage: delete adventure <adventure-id>. Use 'list adventures' to see available adventures."

2. **Currently Selected Error**
   - Code: `ADVENTURE_SELECTED`
   - Message: "Cannot delete currently selected adventure"
   - Suggestion: "Use 'deselect adventure' first, then try again."

3. **Not Found Error**
   - Code: `ADVENTURE_NOT_FOUND`
   - Message: "Adventure '{id}' not found"
   - Suggestion: "Use 'list adventures' to see available adventures."

4. **Authentication Error**
   - Code: `UNAUTHORIZED`
   - Message: "Authentication required to delete adventures"
   - Suggestion: "Your session may have expired. Use 'sudo' to re-authenticate."

5. **Network Error**
   - Code: `NETWORK_ERROR`
   - Message: "Failed to connect to server"
   - Suggestion: "Check your connection and try again."

6. **Server Error**
   - Code: `SERVER_ERROR`
   - Message: "Server error occurred while deleting adventure"
   - Suggestion: "Please try again later or contact support."

### Error Handling Strategy

- **Fail fast**: Validate inputs before making API calls
- **Specific messages**: Provide clear, actionable error messages
- **Graceful degradation**: Handle network failures without crashing
- **User guidance**: Always suggest next steps in error messages

## Testing Strategy

### Unit Tests

Unit tests will verify specific command behaviors and edge cases:

1. **Command Registration**
   - Verify command is registered with correct name and aliases
   - Verify command is admin-mode only
   - Verify command appears in help system

2. **Argument Validation**
   - Test with no arguments (should error)
   - Test with valid adventure ID (should proceed)
   - Test with multiple arguments (should use first as ID)

3. **Current Adventure Protection**
   - Test deleting currently selected adventure (should error)
   - Test deleting non-selected adventure (should proceed)

4. **Error Handling**
   - Test 404 response (adventure not found)
   - Test 401 response (unauthorized)
   - Test network error
   - Test server error (500)

5. **Confirmation Flow**
   - Test confirmation prompt is triggered
   - Test adventure name is included in prompt
   - Test cancellation flow

6. **Autocomplete**
   - Test autocomplete with partial ID
   - Test autocomplete with no matches
   - Test autocomplete with single match
   - Test autocomplete with multiple matches

### Property-Based Tests

Property-based tests will verify universal behaviors across many inputs:

1. **Admin Mode Enforcement Property**
   - Generate random game contexts with different modes
   - Verify command only executes in admin mode

2. **Argument Requirement Property**
   - Generate random argument arrays (including empty)
   - Verify error when no adventure ID provided

3. **Current Adventure Protection Property**
   - Generate random adventure IDs
   - When ID matches current adventure, verify error
   - When ID doesn't match, verify no protection error

4. **Alias Equivalence Property**
   - Generate random adventure IDs
   - Verify all aliases produce identical results

5. **Error Message Property**
   - Generate various error conditions
   - Verify all errors include code, message, and suggestion

### Integration Tests

Integration tests will verify end-to-end functionality:

1. **Successful Deletion Flow**
   - Create test adventure
   - Execute delete command
   - Confirm deletion
   - Verify adventure is removed

2. **Confirmation Cancellation**
   - Execute delete command
   - Cancel confirmation
   - Verify adventure still exists

3. **Autocomplete Integration**
   - Create multiple test adventures
   - Test autocomplete returns correct IDs
   - Test cache behavior

### Test Framework

- **Framework**: Vitest (existing project standard)
- **Property Testing Library**: fast-check (TypeScript property-based testing)
- **Test Location**: `frontend/src/parser/DeleteAdventureCommand.test.ts`
- **Property Test Configuration**: Minimum 100 iterations per property test

### Test Tagging

Each property-based test will be tagged with a comment referencing the design document:

```typescript
// Feature: delete-adventure-command, Property 1: Admin-only access
test.prop([fc.record({ mode: fc.constantFrom(GameMode.Player, GameMode.Admin) })])(
  'delete adventure command only executes in admin mode',
  async (context) => {
    // Test implementation
  }
);
```

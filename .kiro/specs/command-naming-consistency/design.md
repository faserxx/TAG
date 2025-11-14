# Design Document

## Overview

This design outlines the approach for standardizing command naming conventions by converting all hyphenated command names to use spaces. The refactoring will maintain backward compatibility by keeping hyphenated names as aliases, ensuring existing users can continue using familiar commands while new users learn the consistent space-separated convention.

## Architecture

### Affected Components

1. **CommandParser** (`frontend/src/parser/CommandParser.ts`)
   - Primary component requiring updates
   - Contains all command registrations
   - Manages command aliases

2. **HelpSystem** (`frontend/src/help/HelpSystem.ts`)
   - Already has help pages for most commands
   - May need updates to reflect new primary names

3. **Test Files**
   - `CommandParser.test.ts` - Update test cases to use new names
   - Add backward compatibility tests

## Components and Interfaces

### Command Registration Changes

Each command registration will be updated following this pattern:

**Before:**
```typescript
this.registerCommand({
  name: 'create-adventure',
  aliases: ['create'],
  description: 'Create a new adventure',
  // ...
});
```

**After:**
```typescript
this.registerCommand({
  name: 'create adventure',
  aliases: ['create', 'create-adventure'], // Old name becomes alias
  description: 'Create a new adventure',
  // ...
});
```

### Commands to Update

The following 18 commands will be renamed:

| Old Name (hyphenated) | New Name (spaces) | Existing Aliases | New Aliases |
|----------------------|-------------------|------------------|-------------|
| `create-adventure` | `create adventure` | `create` | `create`, `create-adventure` |
| `add-location` | `add location` | `addloc` | `addloc`, `add-location` |
| `add-character` | `add character` | `addchar` | `addchar`, `add-character` |
| `list-adventures` | `list adventures` | `list`, `ls` | `list`, `ls`, `list-adventures` |
| `select-adventure` | `select adventure` | `select` | `select`, `select-adventure` |
| `show-adventure` | `show adventure` | `show`, `view-adventure` | `show`, `view-adventure`, `show-adventure` |
| `deselect-adventure` | `deselect adventure` | `deselect` | `deselect`, `deselect-adventure` |
| `edit-title` | `edit title` | none | `edit-title` |
| `edit-description` | `edit description` | none | `edit-description` |
| `edit-location` | `edit location` | none | `edit-location` |
| `remove-connection` | `remove connection` | `remove-exit` | `remove-exit`, `remove-connection` |
| `create-ai-character` | `create ai character` | `create-ai-npc` | `create-ai-npc`, `create-ai-character` |
| `edit-character-personality` | `edit character personality` | `edit-personality` | `edit-personality`, `edit-character-personality` |
| `set-ai-config` | `set ai config` | `config-ai` | `config-ai`, `set-ai-config` |
| `delete-location` | `delete location` | `del-location` | `del-location`, `delete-location` |
| `delete-character` | `delete character` | `del-character` | `del-character`, `delete-character` |
| `delete-item` | `delete item` | `del-item` | `del-item`, `delete-item` |
| `save-adventure` | `save adventure` | none | `save-adventure` |

**Note:** The `save` command currently has name `'save'` with alias `'save-adventure'`. This should be renamed to `'save adventure'` with aliases `['save', 'save-adventure']`.

### Commands That Remain Unchanged

These commands already use single words or spaces:
- `help`, `clear`, `history`, `exit`, `move`, `talk`, `chat`, `look`, `map`, `sudo`, `load`, `adventures`
- `show locations`, `show characters`, `show items`, `select location` (already use spaces)

## Data Models

No data model changes required. This is purely a command interface refactoring.

## Implementation Strategy

### Phase 1: Update Command Registrations

For each hyphenated command:
1. Change the `name` property to use spaces
2. Add the old hyphenated name to the `aliases` array
3. Preserve all existing aliases

### Phase 2: Update Help System

The HelpSystem automatically generates help pages from command metadata, so most updates will be automatic. However:
1. Verify that help pages display the new space-separated names as primary
2. Ensure hyphenated aliases appear in the aliases list
3. Update any manually-created help pages in `initializeHelpPages()` if they reference old command names

### Phase 3: Update Tests

1. Update all test cases that reference hyphenated command names
2. Add new tests to verify backward compatibility:
   - Test that hyphenated aliases still work
   - Test that help displays space-separated names
   - Test that command completion prioritizes space-separated names

### Phase 4: Update Tab Completion

The tab completion logic in CommandParser may need updates to:
1. Prioritize space-separated names in suggestions
2. Still allow completion of hyphenated aliases
3. Handle partial matches for both formats

## Error Handling

### Backward Compatibility Errors

No new error conditions are introduced. All existing commands continue to work through aliases.

### User Communication

When users use hyphenated commands, the system should:
1. Execute the command successfully (no breaking changes)
2. Optionally display a subtle hint in help output that space-separated names are preferred
3. Not show deprecation warnings during normal command execution (to avoid disrupting workflow)

## Testing Strategy

### Unit Tests

1. **Command Registration Tests**
   - Verify all 18 commands are registered with space-separated names
   - Verify all hyphenated names exist as aliases
   - Verify existing short aliases are preserved

2. **Command Execution Tests**
   - Test each command with new space-separated name
   - Test each command with old hyphenated alias
   - Verify identical behavior for both

3. **Help System Tests**
   - Verify help output shows space-separated names
   - Verify `help <hyphenated-name>` works
   - Verify aliases are listed in help pages

4. **Tab Completion Tests**
   - Verify completion suggests space-separated names
   - Verify completion works for hyphenated aliases
   - Verify prioritization of space-separated names

### Integration Tests

1. Test full command workflows using new names
2. Test full command workflows using old aliases
3. Verify no regressions in existing functionality

### Manual Testing

1. Test in browser terminal with both naming conventions
2. Verify help output is clear and consistent
3. Test tab completion behavior
4. Verify user experience is smooth

## Migration Path

### For Users

1. **Immediate**: All existing commands continue to work via aliases
2. **Learning**: Help system teaches new convention naturally
3. **Gradual**: Users can adopt new names at their own pace
4. **No Breaking Changes**: No forced migration required

### For Developers

1. Update CommandParser command registrations
2. Update test files to use new names
3. Add backward compatibility tests
4. Update any documentation or examples

## Performance Considerations

- Minimal performance impact: only affects command parsing
- Alias resolution is O(1) via Map lookup
- No impact on command execution performance

## Security Considerations

No security implications. This is a pure interface refactoring.

## Future Considerations

### Deprecation Timeline

While hyphenated aliases will remain for backward compatibility, consider:
1. Adding a note in documentation that space-separated names are preferred
2. Updating any external documentation or tutorials
3. Potentially adding a "tips" system that gently suggests space-separated names

### Consistency with Future Commands

All new commands should follow the space-separated convention established by this refactoring.

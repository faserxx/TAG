# Requirements Document

## Introduction

This feature standardizes command naming conventions across the Terminal Adventure Game by converting all hyphenated command names to use spaces instead. Currently, the system has inconsistent naming: older commands use hyphens (e.g., "create-adventure", "add-location") while newer commands use spaces (e.g., "show locations", "select location"). This inconsistency creates a poor user experience and makes commands harder to discover and remember.

## Glossary

- **Command Name**: The primary identifier used to invoke a command in the terminal interface
- **Command Alias**: Alternative names that can be used to invoke the same command
- **Command Parser**: The system component that interprets user input and routes commands to handlers
- **Help System**: The system component that provides documentation for commands
- **Backward Compatibility**: Maintaining support for old command names while introducing new ones
- **Admin Mode**: An authenticated mode where users have elevated privileges to manage adventures
- **Player Mode**: The default mode where users play through adventures

## Requirements

### Requirement 1

**User Story:** As a user, I want all commands to follow a consistent naming convention using spaces, so that I can easily predict and remember command names

#### Acceptance Criteria

1. THE Command Parser SHALL rename all hyphenated admin commands to use spaces instead of hyphens
2. THE Command Parser SHALL rename "create-adventure" to "create adventure"
3. THE Command Parser SHALL rename "add-location" to "add location"
4. THE Command Parser SHALL rename "add-character" to "add character"
5. THE Command Parser SHALL rename "list-adventures" to "list adventures"
6. THE Command Parser SHALL rename "select-adventure" to "select adventure"
7. THE Command Parser SHALL rename "show-adventure" to "show adventure"
8. THE Command Parser SHALL rename "deselect-adventure" to "deselect adventure"
9. THE Command Parser SHALL rename "edit-title" to "edit title"
10. THE Command Parser SHALL rename "edit-description" to "edit description"
11. THE Command Parser SHALL rename "edit-location" to "edit location"
12. THE Command Parser SHALL rename "remove-connection" to "remove connection"
13. THE Command Parser SHALL rename "create-ai-character" to "create ai character"
14. THE Command Parser SHALL rename "edit-character-personality" to "edit character personality"
15. THE Command Parser SHALL rename "set-ai-config" to "set ai config"
16. THE Command Parser SHALL rename "delete-location" to "delete location"
17. THE Command Parser SHALL rename "delete-character" to "delete character"
18. THE Command Parser SHALL rename "delete-item" to "delete item"

### Requirement 2

**User Story:** As an existing user, I want my old hyphenated commands to still work, so that I don't have to relearn all command names immediately

#### Acceptance Criteria

1. THE Command Parser SHALL maintain all hyphenated command names as aliases for backward compatibility
2. WHEN a user enters a hyphenated command name, THE Command Parser SHALL execute the corresponding space-separated command
3. THE Command Parser SHALL add "create-adventure" as an alias for "create adventure"
4. THE Command Parser SHALL add "add-location" as an alias for "add location"
5. THE Command Parser SHALL add "add-character" as an alias for "add character"
6. THE Command Parser SHALL add "list-adventures" as an alias for "list adventures"
7. THE Command Parser SHALL add "select-adventure" as an alias for "select adventure"
8. THE Command Parser SHALL add "show-adventure" as an alias for "show adventure"
9. THE Command Parser SHALL add "deselect-adventure" as an alias for "deselect adventure"
10. THE Command Parser SHALL add "edit-title" as an alias for "edit title"
11. THE Command Parser SHALL add "edit-description" as an alias for "edit description"
12. THE Command Parser SHALL add "edit-location" as an alias for "edit location"
13. THE Command Parser SHALL add "remove-connection" as an alias for "remove connection"
14. THE Command Parser SHALL add "create-ai-character" as an alias for "create ai character"
15. THE Command Parser SHALL add "edit-character-personality" as an alias for "edit character personality"
16. THE Command Parser SHALL add "set-ai-config" as an alias for "set ai config"
17. THE Command Parser SHALL add "delete-location" as an alias for "delete location"
18. THE Command Parser SHALL add "delete-character" as an alias for "delete character"
19. THE Command Parser SHALL add "delete-item" as an alias for "delete item"

### Requirement 3

**User Story:** As a user, I want the help system to reflect the new command names, so that I learn the correct naming convention

#### Acceptance Criteria

1. WHEN a user enters "help" in admin mode, THE Terminal Interface SHALL display all commands using space-separated names
2. THE Help System SHALL update all command documentation to use space-separated names as the primary name
3. THE Help System SHALL list hyphenated names in the aliases section of help pages
4. WHEN a user enters "help <hyphenated-command>", THE Terminal Interface SHALL display the help page for the corresponding space-separated command
5. THE Terminal Interface SHALL indicate in help output that hyphenated names are deprecated aliases

### Requirement 4

**User Story:** As a user, I want existing short aliases to remain unchanged, so that my muscle memory for quick commands is preserved

#### Acceptance Criteria

1. THE Command Parser SHALL preserve all existing short aliases (e.g., "create", "addloc", "addchar", "list", "ls")
2. THE Command Parser SHALL NOT modify single-word aliases
3. THE Command Parser SHALL NOT modify single-letter aliases
4. THE Command Parser SHALL only update multi-word command names that currently use hyphens

### Requirement 5

**User Story:** As a developer, I want all tests to pass with the new command names, so that I can verify the refactoring is correct

#### Acceptance Criteria

1. THE Command Parser SHALL update all test files to use space-separated command names
2. THE Command Parser SHALL add tests for backward compatibility with hyphenated aliases
3. WHEN tests are executed, THE Test Suite SHALL pass all existing tests with updated command names
4. THE Test Suite SHALL include tests verifying that hyphenated aliases still work
5. THE Test Suite SHALL verify that help documentation displays space-separated names as primary

### Requirement 6

**User Story:** As a user, I want command completion to suggest space-separated names, so that I learn the new convention naturally

#### Acceptance Criteria

1. WHEN a user types a partial command and presses Tab, THE Terminal Interface SHALL suggest space-separated command names
2. THE Terminal Interface SHALL prioritize space-separated names over hyphenated aliases in completion suggestions
3. THE Terminal Interface SHALL still allow completion of hyphenated aliases for backward compatibility
4. WHEN a user types "create-", THE Terminal Interface SHALL suggest both "create adventure" and the hyphenated alias

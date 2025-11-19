# Requirements Document

## Introduction

This feature introduces an interactive form-based editing system for game entities in admin mode. Instead of requiring users to specify all entity properties on the command line (which is error-prone and difficult for multi-line content), users can invoke an edit command with just the entity ID, and the system will present an interactive console-based form for editing properties one at a time.

## Glossary

- **Entity**: A game object that can be edited (location, character, item, adventure)
- **Interactive Form**: A console-based interface that prompts the user for input field by field
- **Edit Session**: The state when a user is actively editing an entity through the interactive form
- **Field Prompt**: A single input request for one property of an entity
- **Terminal Interface**: The xterm.js-based console UI where all interactions occur
- **Command Parser**: The system component that interprets user input and routes commands
- **Admin Mode**: The authenticated mode where users can edit adventures

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to edit a location by only specifying its ID, so that I can update its properties through an interactive form instead of typing everything on one command line

#### Acceptance Criteria

1. WHEN a user enters "edit location <id>" with only the location ID, THE Terminal Interface SHALL enter an interactive edit session
2. THE Terminal Interface SHALL display the current value for each editable property
3. THE Terminal Interface SHALL prompt the user to enter a new value or press Enter to keep the current value
4. THE Terminal Interface SHALL support multi-line input for description fields
5. THE Terminal Interface SHALL allow the user to cancel the edit session by typing "cancel" or pressing Ctrl+C
6. WHEN all fields have been edited, THE System SHALL save the changes and exit the edit session
7. THE Terminal Interface SHALL display a confirmation message showing what was changed

### Requirement 2

**User Story:** As an admin user, I want to edit a character by only specifying its ID, so that I can update its properties through an interactive form

#### Acceptance Criteria

1. WHEN a user enters "edit character <id>" with only the character ID, THE Terminal Interface SHALL enter an interactive edit session
2. THE Terminal Interface SHALL display the current character name, dialogue, and personality (if AI-powered)
3. THE Terminal Interface SHALL prompt for each editable field: name, dialogue lines, AI personality
4. THE Terminal Interface SHALL support adding/removing/editing multiple dialogue lines
5. THE Terminal Interface SHALL only show personality field for AI-powered characters
6. THE Terminal Interface SHALL validate that at least one dialogue line exists for non-AI characters
7. WHEN editing is complete, THE System SHALL save the changes and display a summary

### Requirement 3

**User Story:** As an admin user, I want to edit an adventure's metadata by only specifying its ID, so that I can update title and description through an interactive form

#### Acceptance Criteria

1. WHEN a user enters "edit adventure <id>" with only the adventure ID, THE Terminal Interface SHALL enter an interactive edit session
2. THE Terminal Interface SHALL display the current adventure name and description
3. THE Terminal Interface SHALL prompt for new name and description
4. THE Terminal Interface SHALL validate that the name is not empty
5. THE Terminal Interface SHALL allow empty description
6. WHEN editing is complete, THE System SHALL save the changes

### Requirement 4

**User Story:** As an admin user, I want clear visual feedback during the edit session, so that I understand what I'm editing and what the current values are

#### Acceptance Criteria

1. THE Terminal Interface SHALL display a header showing "Editing: <entity-type> - <entity-name>"
2. THE Terminal Interface SHALL use color coding to distinguish prompts, current values, and user input
3. THE Terminal Interface SHALL display field labels in a consistent format
4. THE Terminal Interface SHALL show current values in a dimmed color before prompting for new values
5. THE Terminal Interface SHALL display help text for each field explaining what it's for
6. THE Terminal Interface SHALL show progress (e.g., "Field 2 of 4")

### Requirement 5

**User Story:** As an admin user, I want to be able to cancel an edit session at any time, so that I can exit without saving changes if I make a mistake

#### Acceptance Criteria

1. WHEN a user types "cancel" at any prompt, THE System SHALL exit the edit session without saving changes
2. WHEN a user presses Ctrl+C at any prompt, THE System SHALL exit the edit session without saving changes
3. THE Terminal Interface SHALL display a cancellation message confirming no changes were saved
4. THE System SHALL return to normal admin mode command prompt after cancellation

### Requirement 6

**User Story:** As an admin user, I want to keep the current value of a field by pressing Enter, so that I can quickly skip fields I don't want to change

#### Acceptance Criteria

1. WHEN a user presses Enter without typing anything, THE System SHALL keep the current value for that field
2. THE Terminal Interface SHALL display "[kept]" or similar indicator when a value is kept
3. THE System SHALL move to the next field after keeping a value
4. THE System SHALL allow keeping all values (effectively a no-op edit)

### Requirement 7

**User Story:** As an admin user, I want to edit multi-line content like descriptions and dialogue, so that I can enter formatted text easily

#### Acceptance Criteria

1. WHEN editing a multi-line field, THE Terminal Interface SHALL indicate multi-line mode
2. THE Terminal Interface SHALL accept multiple lines of input
3. THE Terminal Interface SHALL use a special terminator (e.g., "END" on its own line) to finish multi-line input
4. THE Terminal Interface SHALL display the current multi-line value with line numbers
5. THE Terminal Interface SHALL allow replacing the entire multi-line content

### Requirement 8

**User Story:** As an admin user, I want to edit dialogue lines for a character, so that I can add, remove, or modify individual dialogue entries

#### Acceptance Criteria

1. WHEN editing character dialogue, THE Terminal Interface SHALL display all current dialogue lines numbered
2. THE Terminal Interface SHALL prompt: "Keep, edit, or replace dialogue? (k/e/r)"
3. WHEN user chooses "edit", THE Terminal Interface SHALL allow editing individual lines by number
4. WHEN user chooses "replace", THE Terminal Interface SHALL allow entering new dialogue lines
5. WHEN user chooses "keep", THE System SHALL preserve all current dialogue lines
6. THE System SHALL validate that at least one dialogue line exists after editing

### Requirement 9

**User Story:** As an admin user, I want the system to validate my input during the edit session, so that I catch errors before saving

#### Acceptance Criteria

1. THE System SHALL validate required fields are not empty
2. THE System SHALL validate field length constraints
3. WHEN validation fails, THE Terminal Interface SHALL display an error message and re-prompt for that field
4. THE System SHALL not allow saving invalid data
5. THE Terminal Interface SHALL show validation rules in help text for each field

### Requirement 10

**User Story:** As an admin user, I want to see a summary of changes after editing, so that I can confirm what was modified

#### Acceptance Criteria

1. WHEN editing is complete, THE Terminal Interface SHALL display a summary of all changes
2. THE Summary SHALL show "Field: old value → new value" for each changed field
3. THE Summary SHALL indicate fields that were kept unchanged
4. THE Summary SHALL display a final confirmation prompt: "Save changes? (y/n)"
5. WHEN user confirms, THE System SHALL save all changes
6. WHEN user declines, THE System SHALL discard all changes

### Requirement 11

**User Story:** As a developer, I want the interactive edit system to be extensible, so that new entity types can easily add form-based editing

#### Acceptance Criteria

1. THE System SHALL provide a reusable FormEditor class or interface
2. THE FormEditor SHALL accept a field configuration defining prompts, validators, and current values
3. THE FormEditor SHALL handle all user interaction and input collection
4. THE FormEditor SHALL return edited values or null if cancelled
5. THE System SHALL allow entity-specific edit handlers to use the FormEditor

### Requirement 12

**User Story:** As an admin user, I want the old command-line style editing to still work, so that I can use whichever method is more convenient

#### Acceptance Criteria

1. WHEN a user provides all arguments on the command line, THE System SHALL use the old direct edit method
2. WHEN a user provides only the entity ID, THE System SHALL use the interactive form method
3. THE Help System SHALL document both editing methods
4. THE System SHALL maintain backward compatibility with existing edit commands

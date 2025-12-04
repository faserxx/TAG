# Requirements Document

## Introduction

This feature enables adventure creators to build adventures offline using JSON files and import them into the game. It provides a JSON schema for validation, export functionality for existing adventures, and converts the demo adventure to a static JSON file that is imported at server startup. This allows for version control, offline editing, and easier adventure sharing.

## Glossary

- **Adventure**: A complete game scenario containing locations, characters, items, and their relationships
- **JSON Schema**: A vocabulary that allows annotation and validation of JSON documents
- **Import**: The process of loading an adventure from a JSON file into the game database
- **Export**: The process of saving an adventure from the game database to a JSON file
- **Demo Adventure**: The pre-built "The Lost Temple" adventure that ships with the game
- **Server**: The backend Node.js/Express application that manages game data
- **API**: The HTTP interface through which the frontend communicates with the backend

## Requirements

### Requirement 1

**User Story:** As an adventure creator, I want to export existing adventures to JSON files, so that I can back them up, share them, or edit them offline.

#### Acceptance Criteria

1. WHEN an administrator requests an adventure export THEN the system SHALL serialize the complete adventure data to valid JSON format
2. WHEN exporting an adventure THEN the system SHALL include all locations, characters, items, dialogues, and their relationships
3. WHEN the export completes THEN the system SHALL provide the JSON data for download
4. WHEN exporting multiple adventures THEN the system SHALL maintain data integrity for each adventure independently
5. WHEN an adventure contains special characters in text fields THEN the system SHALL properly escape them in the JSON output

### Requirement 2

**User Story:** As an adventure creator, I want to import adventures from JSON files, so that I can load adventures I created offline or received from others.

#### Acceptance Criteria

1. WHEN an administrator uploads a valid JSON adventure file THEN the system SHALL parse and validate the file against the JSON schema
2. WHEN importing an adventure THEN the system SHALL create all locations, characters, items, and relationships in the database
3. IF the JSON file fails schema validation THEN the system SHALL reject the import and provide specific validation error messages
4. WHEN an imported adventure has the same name as an existing adventure THEN the system SHALL prevent the import and notify the administrator
5. WHEN the import completes successfully THEN the system SHALL make the adventure immediately available for gameplay

### Requirement 3

**User Story:** As an adventure creator, I want access to a JSON schema file, so that I can validate my adventure files before importing them.

#### Acceptance Criteria

1. THE system SHALL provide a downloadable JSON schema file that defines the adventure format
2. WHEN the schema is used for validation THEN it SHALL enforce required fields for adventures, locations, characters, and items
3. WHEN the schema is used for validation THEN it SHALL validate data types for all fields
4. WHEN the schema is used for validation THEN it SHALL enforce referential integrity constraints between entities
5. THE schema SHALL include descriptions and examples for all fields to guide adventure creators

### Requirement 4

**User Story:** As a system administrator, I want the demo adventure loaded from a static JSON file at server startup, so that the adventure data is version-controlled and easily modifiable.

#### Acceptance Criteria

1. WHEN the server starts THEN the system SHALL check if the demo adventure exists in the database
2. IF the demo adventure does not exist THEN the system SHALL import it from the static JSON file
3. WHEN importing the demo adventure THEN the system SHALL use the same validation and import logic as user imports
4. IF the demo adventure JSON file is invalid THEN the system SHALL log an error and continue server startup without the demo adventure
5. WHEN the demo adventure already exists THEN the system SHALL skip the import and use the existing database version

### Requirement 5

**User Story:** As an adventure creator, I want comprehensive documentation on the JSON format, so that I can create valid adventures without trial and error.

#### Acceptance Criteria

1. THE system SHALL provide documentation that explains the complete JSON structure for adventures
2. WHEN the documentation describes a field THEN it SHALL include the field name, data type, whether it is required, and its purpose
3. THE documentation SHALL include at least one complete example adventure in JSON format
4. THE documentation SHALL explain referential integrity requirements between locations, characters, and items
5. THE documentation SHALL provide guidance on common validation errors and how to fix them

### Requirement 6

**User Story:** As an adventure creator, I want clear error messages when imports fail, so that I can quickly identify and fix issues in my JSON files.

#### Acceptance Criteria

1. WHEN a JSON file has syntax errors THEN the system SHALL report the line and column number of the error
2. WHEN a JSON file fails schema validation THEN the system SHALL report all validation errors with field paths
3. WHEN referential integrity is violated THEN the system SHALL identify the specific missing or invalid references
4. WHEN an import fails THEN the system SHALL not create partial data in the database
5. WHEN multiple errors exist THEN the system SHALL report all errors rather than stopping at the first one

### Requirement 7

**User Story:** As a developer, I want the import/export functionality exposed via REST API endpoints, so that it can be accessed from the admin interface and potentially external tools.

#### Acceptance Criteria

1. THE system SHALL provide a POST endpoint for importing adventures from JSON
2. THE system SHALL provide a GET endpoint for exporting adventures to JSON
3. THE system SHALL provide a GET endpoint for downloading the JSON schema file
4. WHEN API endpoints are accessed without admin authentication THEN the system SHALL reject the request with a 401 status code
5. WHEN API operations complete successfully THEN the system SHALL return appropriate HTTP status codes and response bodies

### Requirement 8

**User Story:** As an administrator, I want to import and export adventures using terminal commands, so that I can manage adventures directly from the game interface without switching to external tools.

#### Acceptance Criteria

1. WHEN an administrator types "export <adventure-name>" in admin mode THEN the system SHALL download the adventure as a JSON file
2. WHEN an administrator types "import" in admin mode THEN the system SHALL open a file picker for selecting a JSON file to import
3. WHEN an administrator types "schema" in admin mode THEN the system SHALL download the JSON schema file
4. WHEN import/export commands are used in player mode THEN the system SHALL reject the command and display an error message
5. WHEN an export command references a non-existent adventure THEN the system SHALL display an error message with available adventure names

# Implementation Plan

- [x] 1. Create JSON schema and validation infrastructure


  - Create adventure-schema.json file defining the complete adventure structure
  - Implement AdventureValidator class with Ajv integration
  - Add validation for required fields, data types, and referential integrity
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 1.1 Write property test for schema validation


  - **Property 6: Schema Validation Enforcement**
  - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 1.2 Write property test for comprehensive error reporting

  - **Property 5: Invalid JSON Rejection with Comprehensive Errors**
  - **Validates: Requirements 2.3, 6.2, 6.3, 6.5**

- [x] 2. Implement import/export service layer



  - Create AdventureImportExport class
  - Implement JSON to Adventure conversion (deserialize)
  - Implement Adventure to JSON conversion (serialize)
  - Add duplicate name detection
  - Integrate with AdventureValidator
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.4_

- [x] 2.1 Write property test for round-trip preservation


  - **Property 1: Export-Import Round Trip Preservation**
  - **Validates: Requirements 1.2, 2.2, 1.5**

- [x] 2.2 Write property test for valid JSON export

  - **Property 2: Valid JSON Export**
  - **Validates: Requirements 1.1**

- [x] 2.3 Write property test for export independence

  - **Property 3: Export Independence**
  - **Validates: Requirements 1.4**

- [x] 2.4 Write property test for transaction atomicity

  - **Property 8: Transaction Atomicity**
  - **Validates: Requirements 6.4**

- [x] 3. Add API endpoints for import/export


  - Add POST /api/adventures/import endpoint with authentication
  - Add GET /api/adventures/:id/export endpoint with authentication
  - Add GET /api/schema endpoint (public)
  - Implement proper error handling and status codes
  - Add Content-Disposition headers for file downloads
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.1 Write property test for authentication enforcement

  - **Property 9: Authentication Enforcement**
  - **Validates: Requirements 7.4**

- [x] 3.2 Write property test for HTTP response correctness

  - **Property 10: HTTP Response Correctness**
  - **Validates: Requirements 7.5**

- [x] 3.3 Write unit tests for API endpoints

  - Test import endpoint with valid JSON
  - Test import endpoint with invalid JSON
  - Test export endpoint with valid adventure ID
  - Test export endpoint with invalid adventure ID
  - Test schema endpoint returns correct schema
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Convert demo adventure to static JSON file


  - Create demo-adventure.json from existing seed data
  - Implement demo adventure loading in server initialization
  - Add error handling for invalid demo JSON
  - Update server startup to check for existing demo adventure
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Write unit tests for demo adventure loading

  - Test demo adventure loads on first startup
  - Test demo adventure skipped if already exists
  - Test server continues if demo JSON is invalid
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 5. Add admin terminal commands for import/export


  - Add "export <adventure-name>" command to CommandParser
  - Add "import" command to CommandParser with file picker
  - Add "schema" command to CommandParser
  - Implement admin mode validation for these commands
  - Add API client methods for import/export operations
  - Implement file download and upload handling in browser
  - Add terminal feedback messages for success/error
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.1 Write property test for admin command mode enforcement

  - **Property 11: Admin Command Mode Enforcement**
  - **Validates: Requirements 8.4**

- [x] 5.2 Write unit tests for terminal commands

  - Test export command in admin mode
  - Test import command in admin mode
  - Test schema command in admin mode
  - Test commands rejected in player mode
  - Test export with non-existent adventure shows error
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Create user documentation


  - Write ADVENTURE_JSON_FORMAT.md with complete structure explanation
  - Include field descriptions and requirements
  - Add complete example adventure
  - Document referential integrity requirements
  - Add common validation errors and solutions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

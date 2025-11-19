# Implementation Plan

- [x] 1. Create FormEditor infrastructure




  - Create `frontend/src/forms/` directory
  - Define TypeScript interfaces for FieldConfig, FormConfig, and FormResult
  - Implement FormEditor class with edit() method
  - Implement field-by-field prompting logic
  - Implement validation and error handling
  - Implement cancellation handling (Ctrl+C and "cancel" keyword)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.1, 5.2, 5.3, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3, 11.4_

- [x] 2. Extend TerminalInterface with interactive prompting methods





  - Add promptForInput() method for single-line input with default value
  - Add promptForMultiLineInput() method for multi-line content
  - Add promptForConfirmation() method for yes/no prompts
  - Add displayFieldHeader() method for field progress display
  - Add displayCurrentValue() method for showing existing values
  - Handle Ctrl+C interruption in all prompt methods
  - _Requirements: 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4_

- [x] 3. Implement multi-line input handling





  - Implement END terminator detection
  - Display current multi-line values with line numbers
  - Handle empty multi-line input (keep current value)
  - Support cancellation during multi-line input
  - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Implement dialogue editing for characters





  - Create dialogue editing sub-flow (keep/edit/replace options)
  - Implement "keep" option to preserve all dialogue
  - Implement "edit" option for line-by-line editing
  - Implement "replace" option for entering new dialogue
  - Validate at least one dialogue line exists
  - Display numbered dialogue lines
  - _Requirements: 2.4, 2.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 5. Create EditSessionManager class





  - Implement editLocation() method
  - Implement editCharacter() method
  - Implement editAdventure() method
  - Create form config generators for each entity type
  - Implement change application logic using AdminSystem
  - Handle entity not found errors
  - _Requirements: 1.1, 1.6, 2.1, 2.7, 3.1, 3.6, 11.5_

- [x] 6. Implement change summary and confirmation





  - Generate summary showing old vs new values for changed fields
  - Display "[kept]" indicator for unchanged fields
  - Implement final confirmation prompt
  - Handle save on confirmation
  - Handle discard on decline
  - Display appropriate success/cancellation messages
  - _Requirements: 1.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 7. Integrate interactive editing into CommandParser





  - Modify "edit location" command to detect ID-only invocation
  - Modify "edit character" command to detect ID-only invocation
  - Modify "edit adventure" command to detect ID-only invocation (if exists)
  - Implement detection logic: args.length === 1 triggers interactive mode
  - Maintain backward compatibility with full command-line arguments
  - _Requirements: 1.1, 2.1, 3.1, 12.1, 12.2, 12.4_

- [x] 8. Implement field validators





  - Create validator for required fields (non-empty)
  - Create validator for location names
  - Create validator for character names
  - Create validator for adventure names
  - Create validator for dialogue (at least one line for non-AI characters)
  - Display validation errors and re-prompt
  - _Requirements: 2.6, 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Add visual formatting and color coding





  - Implement color-coded prompts (use terminal color codes)
  - Display current values in dimmed color
  - Display field labels in bold or highlighted
  - Add box drawing characters for form headers
  - Display progress indicators (Field X of Y)
  - Add help text display for each field
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 10. Update help documentation





  - Update "edit location" help to mention interactive mode
  - Update "edit character" help to mention interactive mode
  - Add examples showing both command-line and interactive usage
  - Document the END terminator for multi-line input
  - Document cancellation methods (Ctrl+C and "cancel")
  - _Requirements: 12.3_

- [x] 11. Write unit tests for FormEditor






  - Test field-by-field prompting flow
  - Test validation error handling and re-prompting
  - Test cancellation at various points
  - Test keeping vs changing values
  - Test multi-line input collection
  - Test summary generation
  - _Requirements: 5.3_
-

- [x] 12. Write integration tests





  - Test full location edit flow
  - Test full character edit flow with dialogue editing
  - Test full adventure edit flow
  - Test cancellation and no-op edits
  - Test validation across multiple fields
  - Test backward compatibility with command-line editing
  - _Requirements: 12.1, 12.2, 12.4_

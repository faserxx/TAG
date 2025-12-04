# Implementation Plan: Delete Adventure Command

- [x] 1. Register delete adventure command in CommandParser


  - Add command registration in `initializeDefaultCommands()` method
  - Set command name as "delete adventure"
  - Add aliases: "del-adventure", "delete-adventure"
  - Set mode to `GameMode.Admin`
  - Define syntax, description, and examples
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 7.4, 7.5_

- [x] 2. Implement command handler with argument validation

  - Check if adventure ID argument is provided
  - Return error with usage suggestion if missing
  - Extract adventure ID from args array
  - _Requirements: 1.1_

- [x] 3. Add current adventure protection logic

  - Use `adminSystem.getCurrentAdventure()` to get selected adventure
  - Compare selected adventure ID with target adventure ID
  - Return error if they match, suggesting deselection
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Implement adventure lookup for confirmation


  - Fetch adventure details from `/api/adventures/:id`
  - Handle 404 response if adventure doesn't exist
  - Extract adventure name from response
  - Return error before confirmation if adventure not found
  - _Requirements: 6.1, 6.2, 6.3, 1.5_

- [x] 5. Implement confirmation prompt flow


  - Return special output marker: `PROMPT_DELETE_ADVENTURE_CONFIRMATION`
  - Include adventure ID and name in output
  - Display warning that deletion is permanent
  - Format confirmation prompt with visual distinction
  - _Requirements: 1.2, 6.4, 6.5_

- [x] 6. Implement deletion API call

  - Get session ID from `authManager`
  - Send DELETE request to `/api/adventures/:id`
  - Include session ID in request headers
  - Handle successful deletion response
  - Return success message with adventure name
  - _Requirements: 1.3, 1.4, 7.1, 7.2_

- [x] 7. Implement comprehensive error handling

  - Handle 401 Unauthorized error with authentication message
  - Handle 404 Not Found error with adventure not found message
  - Handle network errors with connection message
  - Handle 500 Server Error with generic error message
  - Provide actionable suggestions for each error type
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.3_

- [x] 8. Add autocomplete support for adventure IDs


  - Add "delete adventure" to `adventureIdCommands` array in `getAutocomplete()` method
  - Leverage existing adventure ID cache mechanism
  - Filter adventure IDs based on partial input
  - Provide completion text when exactly one match exists
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 9. Update help system registration
  - Ensure command is registered with help system
  - Verify all aliases appear in help documentation
  - Confirm command appears in admin mode help list
  - _Requirements: 5.4_

- [ ] 10. Write property-based tests for delete adventure command
  - [ ] 10.1 Write property test for admin-only access
    - **Property 1: Admin-only access**
    - **Validates: Requirements 7.4, 7.5**
  - [ ] 10.2 Write property test for argument validation
    - **Property 2: Argument validation**
    - **Validates: Requirements 1.1**
  - [ ] 10.3 Write property test for current adventure protection
    - **Property 3: Current adventure protection**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - [ ] 10.4 Write property test for confirmation requirement
    - **Property 4: Confirmation requirement**
    - **Validates: Requirements 1.2, 6.4**
  - [ ] 10.5 Write property test for adventure name display
    - **Property 5: Adventure name display**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ] 10.6 Write property test for non-existent adventure handling
    - **Property 6: Non-existent adventure handling**
    - **Validates: Requirements 1.5, 4.1, 6.3**
  - [ ] 10.7 Write property test for authentication enforcement
    - **Property 7: Authentication enforcement**
    - **Validates: Requirements 7.1, 7.2, 7.3**
  - [ ] 10.8 Write property test for alias equivalence
    - **Property 8: Alias equivalence**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [ ] 10.9 Write property test for autocomplete functionality
    - **Property 9: Autocomplete functionality**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  - [ ] 10.10 Write property test for error message clarity
    - **Property 10: Error message clarity**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 11. Write unit tests for delete adventure command
  - [ ] 11.1 Test command registration
    - Verify command is registered with correct name
    - Verify aliases are registered correctly
    - Verify command is admin-mode only
    - Verify command appears in help system
  - [ ] 11.2 Test argument validation
    - Test with no arguments (should error)
    - Test with valid adventure ID (should proceed)
    - Test with multiple arguments (should use first as ID)
  - [ ] 11.3 Test current adventure protection
    - Test deleting currently selected adventure (should error)
    - Test deleting non-selected adventure (should proceed)
  - [ ] 11.4 Test error handling
    - Test 404 response (adventure not found)
    - Test 401 response (unauthorized)
    - Test network error
    - Test server error (500)
  - [ ] 11.5 Test confirmation flow
    - Test confirmation prompt is triggered
    - Test adventure name is included in prompt
  - [ ] 11.6 Test autocomplete
    - Test autocomplete with partial ID
    - Test autocomplete with no matches
    - Test autocomplete with single match
    - Test autocomplete with multiple matches

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

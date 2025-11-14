# Implementation Plan

- [x] 1. Add helper functions to CommandParser for location lookup and formatting





  - Create `findLocationByIdOrName()` method that searches by ID first, then by case-insensitive name match
  - Create `formatLocationDetails()` method to format detailed location information with exits, characters, and items
  - Create `formatCharacterList()` method to format character list with optional location information
  - Create `formatItemList()` method to format item list with optional location information
  - _Requirements: 1.2, 1.4, 2.2, 2.4, 3.2, 3.4, 4.3, 4.6, 4.7_

- [x] 2. Implement "show locations" command





  - Register command in `initializeDefaultCommands()` with name "show locations", no aliases, admin mode only
  - Validate that an adventure is selected using `adminSystem.getCurrentAdventure()`
  - Return error if no adventure selected with code `NO_ADVENTURE_SELECTED`
  - Iterate through all locations in the adventure and format output with ID, name, description, and exits
  - Mark starting location with [START] indicator
  - Include total count in header
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement "show characters" command with context awareness





  - Register command in `initializeDefaultCommands()` with name "show characters", no aliases, admin mode only
  - Validate that an adventure is selected
  - Check if a location is selected using `adminSystem.getCurrentLocationId()`
  - If location selected, filter characters to only that location
  - If no location selected, show all characters from all locations in the adventure
  - Format output with character ID, name, location name, dialogue preview (first 50 chars), and personality preview for AI characters
  - Mark AI characters with [AI] indicator
  - Include context information in header ("in <Location Name>" or "in <Adventure Name>")
  - Include total count
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Implement "show items" command with context awareness





  - Register command in `initializeDefaultCommands()` with name "show items", no aliases, admin mode only
  - Validate that an adventure is selected
  - Check if a location is selected using `adminSystem.getCurrentLocationId()`
  - If location selected, filter items to only that location
  - If no location selected, show all items from all locations in the adventure
  - Format output with item ID, name, location name, and description
  - Include context information in header ("in <Location Name>" or "in <Adventure Name>")
  - Include total count
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Implement "select location" command





  - Register command in `initializeDefaultCommands()` with name "select location", no aliases, admin mode only
  - Validate that an adventure is selected
  - Validate that identifier argument is provided
  - Use `findLocationByIdOrName()` helper to locate the location by ID or name
  - Return error if location not found with code `LOCATION_NOT_FOUND`
  - Call `adminSystem.setCurrentLocation(locationId)` to update admin context
  - Format and display detailed location information using `formatLocationDetails()` helper
  - Include location name, ID, description, exits with target names, characters with previews, and items with descriptions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 6. Create AdminMapRenderer class for full adventure visualization





  - Create new file `frontend/src/engine/AdminMapRenderer.ts`
  - Implement constructor that accepts adventure locations, selected location ID
  - Implement `render()` method that returns string array for terminal output
  - Show all locations (not just visited like player map)
  - Show all directional connections with arrows
  - Mark selected location with [*] indicator
  - Use text-based graph representation with proper indentation
  - Group connected locations together visually
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

- [x] 7. Implement "map" command





  - Register command in `initializeDefaultCommands()` with name "map", no aliases, admin mode only
  - Validate that an adventure is selected
  - Return error if no adventure selected with code `NO_ADVENTURE_SELECTED`
  - Get current adventure and selected location ID from adminSystem
  - Create AdminMapRenderer instance with adventure locations and selected location
  - Call renderer's `render()` method and return output
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8. Update help system with new commands





  - Add "show locations" command to HelpSystem with description, syntax, and examples
  - Add "show characters" command to HelpSystem with description, syntax, examples, and note about context awareness
  - Add "show items" command to HelpSystem with description, syntax, examples, and note about context awareness
  - Add "select location" command to HelpSystem with description, syntax, and examples
  - Add "map" command to HelpSystem with description, syntax, and examples
  - Include explanation that show commands are context-aware based on selected location
  - Group commands under "Navigation & Inspection" category in admin help
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

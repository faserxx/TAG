# Implementation Plan: Map Command

- [x] 1. Extend GameState with map data tracking





  - Add `LocationMapData` interface to track visit history with spatial context
  - Implement `recordLocationVisit()` method to store location ID, previous location, and entry direction
  - Implement `getLocationMapData()` method to retrieve map data for rendering
  - Implement `clearMapData()` method to reset map when loading new adventures
  - Update `toJSON()` and `fromJSON()` methods to serialize/deserialize map data
  - Update `reset()` method to clear map data
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Write unit tests for GameState map tracking


  - Test recording location visits with and without directional context
  - Test retrieving map data
  - Test clearing map data
  - Test serialization and deserialization of map data
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Create MapRenderer class for ASCII map generation





  - Create `frontend/src/engine/MapRenderer.ts` file
  - Define `MapNode` and `GridCell` interfaces for internal representation
  - Implement constructor accepting locations map, visited location IDs, and current location ID
  - Implement `buildSpatialGraph()` to calculate relative positions of visited locations based on exit directions
  - Implement `renderGrid()` to convert spatial graph into ASCII character grid
  - Implement `renderLegend()` to generate map symbol explanations
  - Implement public `render()` method that orchestrates graph building, grid rendering, and legend generation
  - Handle edge cases: single location, linear paths, grid layouts, up/down exits
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.1 Write unit tests for MapRenderer


  - Test single location rendering
  - Test linear path rendering (north-south and east-west)
  - Test grid layout with intersections
  - Test current location highlighting
  - Test up/down exit indicators
  - Test legend generation
  - Test handling of long location names
  - Test large map scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Update GameEngine to record directional context





  - Modify `handleMove()` method in `GameEngine.ts` to capture the direction used
  - Call `gameState.recordLocationVisit()` with previous location ID and direction when moving
  - Ensure starting location is recorded when adventure is loaded
  - _Requirements: 2.1, 2.5_

- [x] 4. Register map command in CommandParser





  - Add map command registration in `initializeDefaultCommands()` method
  - Set command name as 'map' with alias 'm'
  - Set mode to `GameMode.Player`
  - Implement command handler that validates game engine initialization
  - Get current adventure and visited locations from game engine
  - Create MapRenderer instance with necessary data
  - Call `render()` and return formatted output
  - Handle error cases: no adventure loaded, no locations visited, engine not initialized
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.1 Write integration tests for map command


  - Test map command registration
  - Test map command execution with valid game state
  - Test map command with no adventure loaded
  - Test map command with no visited locations
  - Test map command with single location
  - Test map command with multiple connected locations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Add map command help documentation





  - Register map command with HelpSystem (automatic via CommandParser)
  - Verify help text includes command description, syntax, and examples
  - Verify map command appears in general help listing
  - Add explanation of map symbols in command description
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
- [x] 6. Add map-related type definitions





- [ ] 6. Add map-related type definitions

  - Add `LocationMapData` interface to `frontend/src/types/index.ts`
  - Add `MapNode` and `GridCell` interfaces if needed for public API
  - Ensure type safety across all map-related components
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
-

- [x] 7. Test map feature end-to-end




  - Load demo adventure and verify starting location is recorded
  - Move through multiple locations and verify map builds progressively
  - Verify current location is highlighted correctly
  - Verify directional connections are displayed accurately
  - Test save/load functionality to ensure map data persists
  - Load different adventure and verify map resets
  - Test map command help text
  - Verify map displays correctly in terminal with color coding
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

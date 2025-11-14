# Design Document

## Overview

This feature adds context-aware administrative commands to display game content and navigate the adventure structure in admin mode. The commands will leverage the existing AdministrationSystem's state management (currentAdventure and currentLocationId) to provide filtered views based on the administrator's current context. A new map command will visualize the complete adventure structure.

## Architecture

### Component Interaction

```
CommandParser
    ↓ (registers commands)
    ↓ (executes handlers)
    ↓
AdministrationSystem ← (maintains admin context)
    ↓ (queries adventure data)
    ↓
Adventure → Location → Characters/Items
    ↓
MapRenderer (new) ← (renders full adventure map)
```

### State Management

The AdministrationSystem already maintains:
- `currentAdventure`: The selected adventure for editing
- `currentLocationId`: The currently selected location within the adventure

The new commands will read this state to provide context-aware output.

## Components and Interfaces

### 1. Command Handlers (CommandParser)

Four new command handlers will be added to CommandParser.initializeDefaultCommands():

#### show locations
- **Mode**: Admin only
- **Syntax**: `show locations`
- **Behavior**: Display all locations in the selected adventure
- **Output Format**:
  ```
  Locations in "<Adventure Name>" (X total):
  
  1. <Location Name> [START]
     ID: <location-id>
     Description: <description>
     Exits: north → <target>, south → <target>
  
  2. <Location Name>
     ID: <location-id>
     ...
  ```

#### show characters
- **Mode**: Admin only
- **Syntax**: `show characters`
- **Behavior**: 
  - If location selected: Show only characters in that location
  - If only adventure selected: Show all characters in adventure
- **Output Format**:
  ```
  Characters in "<Location Name>" (X total):
  OR
  Characters in "<Adventure Name>" (X total):
  
  1. <Character Name> [AI]
     ID: <character-id>
     Location: <location-name>
     Dialogue: "<first line preview...>"
     Personality: "<personality preview...>" (for AI characters)
  
  2. <Character Name>
     ...
  ```

#### show items
- **Mode**: Admin only
- **Syntax**: `show items`
- **Behavior**:
  - If location selected: Show only items in that location
  - If only adventure selected: Show all items in adventure
- **Output Format**:
  ```
  Items in "<Location Name>" (X total):
  OR
  Items in "<Adventure Name>" (X total):
  
  1. <Item Name>
     ID: <item-id>
     Location: <location-name>
     Description: <description>
  
  2. <Item Name>
     ...
  ```

#### select location
- **Mode**: Admin only
- **Syntax**: `select location <id|name>`
- **Behavior**: 
  - Accept location ID or name as identifier
  - Set as current location in AdministrationSystem
  - Display detailed location information
- **Output Format**:
  ```
  Selected location: "<Location Name>"
  ID: <location-id>
  Description: <description>
  
  Exits (X):
    north → <Location Name> (<location-id>)
    south → <Location Name> (<location-id>)
  
  Characters (X):
    • <Character Name> [AI] - <personality preview>
    • <Character Name> - "<dialogue preview>"
  
  Items (X):
    • <Item Name> - <description>
  ```

#### map
- **Mode**: Admin only
- **Syntax**: `map`
- **Behavior**: Display complete adventure map with all locations and connections
- **Output Format**: ASCII-style map showing location relationships

### 2. MapRenderer Enhancement

The existing MapRenderer (used in player mode) will be enhanced or a new AdminMapRenderer will be created to support full adventure visualization.

**Key Differences from Player Map**:
- Shows ALL locations (not just visited)
- Shows ALL connections
- Highlights selected location with special marker
- More detailed connection information

**Rendering Strategy**:
- Use text-based graph representation
- Group locations by connectivity
- Show directional arrows for connections
- Mark selected location with `[*]` indicator

### 3. AdministrationSystem Extensions

No new methods needed - existing methods provide all required functionality:
- `getCurrentAdventure()`: Get selected adventure
- `getCurrentLocationId()`: Get selected location
- `setCurrentLocation(locationId)`: Set selected location

### 4. Helper Functions

New utility functions in CommandParser:

```typescript
private findLocationByIdOrName(identifier: string, adventure: Adventure): Location | null {
  // Try exact ID match first
  const byId = adventure.locations.get(identifier);
  if (byId) return byId;
  
  // Try case-insensitive name match
  const lowerIdentifier = identifier.toLowerCase();
  for (const [, location] of adventure.locations) {
    if (location.name.toLowerCase() === lowerIdentifier) {
      return location;
    }
  }
  
  return null;
}

private formatLocationDetails(location: Location, adventure: Adventure): string[] {
  // Format detailed location information including exits, characters, items
}

private formatCharacterList(characters: Character[], showLocation: boolean): string[] {
  // Format character list with optional location information
}

private formatItemList(items: Item[], showLocation: boolean): string[] {
  // Format item list with optional location information
}
```

## Data Models

No new data models required. Existing models are sufficient:

- **Adventure**: Contains locations map, name, description
- **Location**: Contains id, name, description, exits, characters, items
- **Character**: Contains id, name, dialogue, isAiPowered, personality
- **Item**: Contains id, name, description

## Error Handling

### Common Error Scenarios

1. **No Adventure Selected**
   - Error Code: `NO_ADVENTURE_SELECTED`
   - Message: "No adventure selected"
   - Suggestion: "Use 'select-adventure <id>' to select an adventure for editing."

2. **No Location Selected** (for context-aware commands)
   - Behavior: Fall back to adventure-wide view
   - No error thrown

3. **Location Not Found** (for select location)
   - Error Code: `LOCATION_NOT_FOUND`
   - Message: "Location not found: <identifier>"
   - Suggestion: "Use 'show locations' to see available locations."

4. **Empty Results**
   - Success: true
   - Output: Friendly message like "No characters in this location."

### Validation

- All commands validate that an adventure is selected before proceeding
- `select location` validates that the location exists in the current adventure
- Identifier matching is case-insensitive for user convenience

## Testing Strategy

### Unit Tests

Test command handlers with mocked AdministrationSystem:

1. **show locations**
   - Test with no adventure selected (error)
   - Test with adventure containing 0 locations
   - Test with adventure containing multiple locations
   - Test output formatting

2. **show characters**
   - Test with no adventure selected (error)
   - Test with location selected (filtered view)
   - Test with only adventure selected (full view)
   - Test with AI and regular characters
   - Test with no characters

3. **show items**
   - Test with no adventure selected (error)
   - Test with location selected (filtered view)
   - Test with only adventure selected (full view)
   - Test with no items

4. **select location**
   - Test with no adventure selected (error)
   - Test with valid location ID
   - Test with valid location name
   - Test with invalid identifier
   - Test case-insensitive matching
   - Test state update in AdministrationSystem

5. **map**
   - Test with no adventure selected (error)
   - Test with simple linear adventure
   - Test with complex branching adventure
   - Test selected location highlighting

### Integration Tests

1. Test command flow: `select-adventure` → `show locations` → `select location` → `show characters`
2. Test context switching: Select location, run show commands, deselect location, verify behavior change
3. Test with real adventure data from backend

### Manual Testing

1. Create adventure with multiple locations, characters, and items
2. Test all show commands in various contexts
3. Verify map rendering with complex adventure structures
4. Test identifier matching edge cases (special characters, spaces)

## Implementation Notes

### Command Registration Order

Register commands in this order within initializeDefaultCommands():
1. show locations
2. show characters  
3. show items
4. select location
5. map

### Output Formatting

- Use consistent indentation (2 spaces for nested items)
- Use bullet points (•) for list items
- Use arrows (→) for directional connections
- Use brackets for special markers: [START], [AI], [*]
- Include counts in headers: "Locations (5 total)"
- Add blank lines between major sections for readability

### Performance Considerations

- All commands operate on in-memory adventure data (no API calls)
- Map rendering complexity is O(n) where n = number of locations
- Character/item filtering is O(n) where n = number of entities
- No performance concerns for typical adventure sizes (< 100 locations)

### Future Enhancements

Potential improvements not included in this spec:
- Filtering options (e.g., `show characters --ai-only`)
- Sorting options (e.g., `show locations --sort-by-name`)
- Search functionality (e.g., `show characters --search "guard"`)
- Export map to file
- Interactive map navigation
- Visual graph rendering (beyond ASCII)

## Help System Integration

Update HelpSystem to include new commands in admin mode help text:

### Command Category: "Navigation & Inspection"

```
Navigation & Inspection Commands:
  show locations              Display all locations in selected adventure
  show characters             Display characters (filtered by selected location)
  show items                  Display items (filtered by selected location)
  select location <id|name>   Select a location to view details and set context
  map                         Display complete adventure map

Note: show commands are context-aware. If you've selected a location using
"select location", the show commands will filter results to that location.
```

### Individual Command Help

Each command will have detailed help accessible via `help <command>`:
- Full syntax with parameter descriptions
- Multiple usage examples
- Explanation of context-aware behavior
- Related commands

## Dependencies

### Existing Code

- CommandParser: Add new command handlers
- AdministrationSystem: Use existing state management
- Adventure/Location models: Read-only access
- HelpSystem: Register new commands

### New Code

- MapRenderer enhancement or AdminMapRenderer class
- Helper functions for formatting and location lookup
- Command handler implementations

### External Dependencies

None - all functionality uses existing libraries and frameworks.

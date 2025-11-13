# Design Document: Map Command

## Overview

The map command feature adds spatial awareness to the Terminal Adventure Game by tracking visited locations and rendering an ASCII-based visual map. The system automatically records locations as players explore and displays their spatial relationships based on directional exits (north, south, east, west, up, down).

The implementation follows the existing architecture patterns:
- Frontend-only feature (no backend changes required)
- Integrates with existing GameState for persistence
- Follows command registration pattern in CommandParser
- Uses OutputFormatter for terminal display

## Architecture

### Component Structure

```
frontend/src/
├── engine/
│   ├── GameState.ts          [Modified] Add map data tracking
│   └── MapRenderer.ts         [New] ASCII map generation
├── parser/
│   └── CommandParser.ts       [Modified] Register map command
├── help/
│   └── HelpSystem.ts          [Modified] Add map help content
└── types/
    └── index.ts               [Modified] Add map-related types
```

### Data Flow

1. **Location Visit**: When player moves → GameState records location + spatial position
2. **Map Request**: Player types "map" → CommandParser routes to map handler
3. **Map Generation**: MapRenderer reads GameState → Builds ASCII grid → Returns formatted output
4. **Display**: Terminal displays map with color coding and legend

## Components and Interfaces

### 1. MapRenderer Class

**Purpose**: Generate ASCII representation of visited locations and their connections.

**Key Responsibilities**:
- Build spatial graph from visited locations and exits
- Calculate relative positions of locations
- Render ASCII grid with locations, connections, and markers
- Handle map legend and formatting

**Public Interface**:
```typescript
class MapRenderer {
  constructor(locations: Map<string, Location>, visitedLocationIds: string[], currentLocationId: string)
  
  // Generate complete map output
  render(): string[]
  
  // Build spatial layout from location connections
  private buildSpatialGraph(): MapNode[]
  
  // Convert spatial graph to ASCII grid
  private renderGrid(nodes: MapNode[]): string[]
  
  // Generate map legend
  private renderLegend(): string[]
}
```

**Internal Types**:
```typescript
interface MapNode {
  locationId: string;
  locationName: string;
  x: number;  // Grid position
  y: number;  // Grid position
  isCurrent: boolean;
  exits: Map<string, string>;  // direction -> targetLocationId
}

interface GridCell {
  type: 'empty' | 'location' | 'connection';
  content: string;
  locationId?: string;
  isCurrent?: boolean;
}
```

### 2. GameState Extensions

**Purpose**: Track spatial relationships between visited locations.

**New Data Structure**:
```typescript
interface LocationMapData {
  locationId: string;
  visitedFrom?: string;  // Previous location ID
  entryDirection?: string;  // Direction used to enter
}

// Add to GameStateData interface
interface GameStateData {
  // ... existing fields
  locationMapData: LocationMapData[];  // Ordered visit history
}
```

**New Methods**:
```typescript
class GameState {
  // Record location visit with spatial context
  recordLocationVisit(locationId: string, fromLocationId?: string, direction?: string): void
  
  // Get map data for rendering
  getLocationMapData(): LocationMapData[]
  
  // Clear map data (for new adventures)
  clearMapData(): void
}
```

### 3. Command Registration

**Command Specification**:
```typescript
{
  name: 'map',
  aliases: ['m'],
  description: 'Display map of visited locations',
  syntax: 'map',
  examples: ['map'],
  mode: GameMode.Player,
  handler: async (args: string[], context: GameContext) => CommandResult
}
```

**Handler Logic**:
1. Validate game engine is initialized
2. Get current adventure and visited locations
3. Create MapRenderer instance
4. Generate map output
5. Return formatted result with legend

## Data Models

### Map Coordinate System

The map uses a 2D grid coordinate system:
- Origin (0, 0) at starting location
- North: y decreases (y - 1)
- South: y increases (y + 1)
- East: x increases (x + 1)
- West: x decreases (x - 1)
- Up/Down: Indicated with special markers (↑/↓)

### Spatial Graph Building Algorithm

1. **Initialize**: Place starting location at (0, 0)
2. **Traverse**: For each visited location in order:
   - If entry direction known, calculate position relative to previous location
   - If no entry direction, place near existing locations
3. **Resolve Conflicts**: If multiple locations map to same coordinates, adjust layout
4. **Optimize**: Minimize grid size while maintaining relationships

### ASCII Rendering

**Location Symbols**:
- `[@]` - Current location (player position)
- `[*]` - Visited location
- `[?]` - Unexplored exit indicator (optional enhancement)

**Connection Symbols**:
- `|` - North/South connection
- `-` - East/West connection
- `+` - Intersection point
- `↑` - Up exit available
- `↓` - Down exit available

**Example Map Output**:
```
=== Map ===

    [*]────[*]
     |      |
    [@]────[*]↓
     
Legend:
  [@] - Your location
  [*] - Visited location
  |/- - Connections
  ↑↓  - Up/Down exits

Locations visited: 5
```

## Error Handling

### Error Scenarios

1. **No Adventure Loaded**
   - Code: `NO_ADVENTURE`
   - Message: "No adventure loaded"
   - Suggestion: "Use 'load <adventure-id>' to start an adventure"

2. **No Locations Visited**
   - Code: `NO_MAP_DATA`
   - Message: "No locations visited yet"
   - Suggestion: "Explore the adventure to build your map"

3. **Game Engine Not Initialized**
   - Code: `NO_ENGINE`
   - Message: "Game engine not initialized"
   - Suggestion: "Please restart the game"

### Graceful Degradation

- If spatial relationships cannot be determined, fall back to list view
- If map is too large for terminal, provide scrollable output
- If location names are too long, truncate with ellipsis

## Testing Strategy

### Unit Tests

**MapRenderer Tests** (`MapRenderer.test.ts`):
- Single location rendering
- Linear path (north-south, east-west)
- Grid layout (multiple intersections)
- Current location highlighting
- Up/down exit indicators
- Legend generation
- Long location name handling
- Large map handling

**GameState Tests** (extend `GameState.test.ts`):
- Recording location visits with direction
- Retrieving map data
- Clearing map data
- Serialization/deserialization of map data
- Map data persistence across save/load

### Integration Tests

**Command Execution Tests** (extend `CommandParser.test.ts`):
- Map command registration
- Map command execution with valid state
- Map command with no adventure loaded
- Map command with no visited locations
- Help text for map command

### Manual Testing Scenarios

1. **Linear Exploration**: Move north → east → south → west, verify map shows correct layout
2. **Complex Layout**: Explore branching paths, verify all connections shown
3. **Save/Load**: Save game, reload, verify map persists
4. **New Adventure**: Load different adventure, verify map resets
5. **Terminal Sizing**: Test map display in different terminal widths

## Implementation Notes

### Performance Considerations

- Map rendering is O(n) where n = number of visited locations
- Spatial graph building uses breadth-first traversal
- Grid size limited to reasonable dimensions (e.g., 50x50)
- Cache rendered map if location set hasn't changed (optional optimization)

### Color Coding

Use existing OutputFormatter styles:
- Current location: `OutputStyle.Success` (green)
- Visited locations: `OutputStyle.Info` (cyan)
- Connections: `OutputStyle.Normal` (white)
- Legend: `OutputStyle.System` (gray)

### Accessibility

- Use standard ASCII characters (no extended Unicode)
- Provide text-based legend explaining symbols
- Ensure map is readable with screen readers (structured output)
- Support terminal color schemes (use semantic styles)

### Future Enhancements (Out of Scope)

- Interactive map navigation (click locations)
- Fog of war (show unexplored exits)
- Mini-map mode (compact view)
- Export map to file
- 3D visualization for up/down connections
- Location annotations (notes, markers)

## Dependencies

### Existing Dependencies
- GameState: Location visit tracking
- Location: Exit information
- CommandParser: Command registration
- OutputFormatter: Terminal styling
- HelpSystem: Help documentation

### No New External Dependencies Required

All functionality can be implemented using existing TypeScript and browser APIs.

## Migration and Rollout

### Backward Compatibility

- Existing game saves without map data will work (map starts empty)
- GameState serialization extended to include optional map data
- No breaking changes to existing commands or APIs

### Deployment Steps

1. Add MapRenderer class
2. Extend GameState with map tracking
3. Update GameEngine to record location visits with direction
4. Register map command in CommandParser
5. Add help documentation
6. Test with existing adventures
7. Deploy to production

### Rollback Plan

If issues arise:
- Map command can be disabled by removing registration
- GameState changes are additive (no data loss)
- No backend changes means no database migration needed

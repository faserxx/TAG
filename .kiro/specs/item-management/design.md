# Design Document: Item Management System

## Overview

The item management system adds comprehensive item functionality to the Terminal Adventure Game, enabling both administrators to create and manage items in adventures, and players to interact with items during gameplay. Items are objects with an ID, name, and description that can exist in locations or in the player's inventory.

This design integrates with the existing architecture by:
- Extending the database schema to store items
- Adding item-related commands to the command parser
- Enhancing the game engine to manage inventory state
- Providing admin tools for item creation and editing
- Using the existing modal form system for item editing

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│  Command Parser                                              │
│  ├── Player Commands: take, drop, examine, inventory        │
│  └── Admin Commands: create item, edit item, delete item    │
│                                                              │
│  Game Engine                                                 │
│  ├── Inventory Management                                   │
│  └── Item Interaction Logic                                 │
│                                                              │
│  Administration System                                       │
│  ├── Item Creation                                          │
│  ├── Item Editing                                           │
│  └── Item Deletion                                          │
│                                                              │
│  Form Editor (Modal-based)                                  │
│  └── Interactive Item Forms                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
├─────────────────────────────────────────────────────────────┤
│  API Server                                                  │
│  └── No new endpoints needed (items saved with adventures)  │
│                                                              │
│  DataStore                                                   │
│  ├── Item CRUD operations                                   │
│  └── Inventory persistence                                  │
│                                                              │
│  Database (SQLite)                                          │
│  ├── items table                                            │
│  └── game_state.inventory (JSON)                           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema Extension

Add a new `items` table to store item data:

```sql
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_location ON items(location_id);
```

**Design Notes:**
- `location_id` can be NULL to represent items in player inventory
- Foreign key cascade ensures items are deleted when locations are deleted
- Index on `location_id` for efficient location-based queries
- Items are also stored in the `game_state.inventory` field as JSON for player inventory

### 2. Type Definitions

The `Item` interface already exists in `backend/src/types/index.ts`:

```typescript
export interface Item {
  id: string;
  name: string;
  description: string;
}
```

Add to `frontend/src/types/index.ts`:

```typescript
export interface Item {
  id: string;
  name: string;
  description: string;
}
```

### 3. DataStore Extensions

Extend `backend/src/database/DataStore.ts` to handle items:

**Methods to add:**
- `saveAdventure()` - Update to save/load items with locations
- `loadAdventure()` - Update to load items from database
- Item data is embedded in location data, no separate item endpoints needed

**Implementation approach:**
- When saving an adventure, iterate through locations and save their items to the `items` table
- When loading an adventure, load items for each location and attach to location objects
- Delete existing items for a location before re-saving (similar to characters)

### 4. Location Class Extensions

The `Location` class in `frontend/src/engine/Location.ts` already has an `items` array. Extend it with item management methods:

**Methods to add:**
- `addItem(item: Item): void` - Add an item to the location
- `removeItem(itemId: string): Item | null` - Remove and return an item
- `findItem(identifier: string): Item | null` - Find item by ID or name (case-insensitive)
- `getItems(): Item[]` - Get all items in the location

**Design pattern:**
- Follow the same pattern as character management
- Support finding items by both ID and name for user convenience
- Return immutable copies to prevent external modification

### 5. GameEngine Extensions

Extend `frontend/src/engine/GameEngine.ts` with item interaction methods:

**Methods to add:**
- `handleTake(itemIdentifier: string): Promise<CommandResult>` - Move item from location to inventory
- `handleDrop(itemIdentifier: string): Promise<CommandResult>` - Move item from inventory to location
- `handleExamine(itemIdentifier: string): Promise<CommandResult>` - Display item details
- `handleInventory(): Promise<CommandResult>` - List items in player inventory

**Implementation details:**
- Search for items by ID first, then by case-insensitive name match
- Update game state inventory array
- Persist changes via `gameState.save()`
- Provide helpful error messages when items not found

### 6. GameState Extensions

Extend `frontend/src/engine/GameState.ts` to manage inventory:

**Methods to add:**
- `addToInventory(item: Item): void` - Add item to inventory
- `removeFromInventory(itemId: string): Item | null` - Remove and return item
- `findInInventory(identifier: string): Item | null` - Find item by ID or name
- `getInventory(): Item[]` - Get all inventory items

**Storage:**
- Inventory is already defined in the GameState interface as `Item[]`
- Persisted to backend via the existing `save()` method
- Loaded from backend via the existing `load()` method

### 7. AdministrationSystem Extensions

Extend `frontend/src/admin/AdministrationSystem.ts` with item management:

**Methods to add:**
- `addItem(locationId: string, name: string, description: string): string` - Create item in location
- `addItemToCurrentLocation(name: string, description: string): string` - Create item in current location
- `updateItemName(itemId: string, name: string): void` - Update item name
- `updateItemDescription(itemId: string, description: string): void` - Update item description
- `deleteItem(itemId: string): void` - Delete item from adventure
- `findItem(itemId: string): { item: Item, location: Location } | null` - Find item across all locations
- `getItemIds(): string[]` - Get all item IDs for autocomplete

**Design pattern:**
- Follow the same pattern as character management methods
- Generate IDs using the existing `generateId()` method
- Update `modifiedAt` timestamp when items change
- Validate that current adventure exists before operations

### 8. Command Parser Extensions

Add new commands to `frontend/src/parser/CommandParser.ts`:

**Player Mode Commands:**

| Command | Aliases | Description |
|---------|---------|-------------|
| `take <item>` | `get`, `pickup` | Pick up an item from the current location |
| `drop <item>` | `put` | Drop an item from inventory into current location |
| `examine <item>` | `inspect`, `look at` | View detailed description of an item |
| `inventory` | `inv`, `i` | List all items in inventory |

**Admin Mode Commands:**

| Command | Aliases | Description |
|---------|---------|-------------|
| `create item` | `add item` | Create a new item in the selected location |
| `edit item <id>` | `modify item` | Edit an existing item |
| `delete item <id>` | `remove item`, `del item` | Delete an item |

**Command handlers:**
- Player commands call GameEngine methods
- Admin commands use FormEditor for interactive editing
- All commands validate arguments and provide helpful error messages

### 9. Form Editor Integration

Use the existing `FormEditor` system for item creation and editing:

**Item Form Fields:**
1. **ID** (read-only for edit, auto-generated for create)
2. **Name** (text input, required)
3. **Description** (multi-line text, required)

**Form behavior:**
- Create: Display form with empty fields, generate ID on save
- Edit: Load existing item data, show ID as read-only
- Validation: Ensure name and description are not empty
- Save: Call AdministrationSystem methods to update adventure

### 10. Autocomplete Extensions

Extend the autocomplete system in `frontend/src/parser/CommandParser.ts`:

**Add item ID autocomplete for:**
- `edit item <tab>` - Show all item IDs in current adventure
- `delete item <tab>` - Show all item IDs in current adventure
- `examine <tab>` - Show items in current location + inventory
- `take <tab>` - Show items in current location
- `drop <tab>` - Show items in inventory

**Implementation:**
- Use `adminSystem.getItemIds()` for admin commands
- Use `currentLocation.getItems()` for player commands
- Combine location items and inventory for examine command

## Data Models

### Item Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Item Lifecycle                         │
└──────────────────────────────────────────────────────────┘

Admin Creates Item:
  1. Admin enters "create item" command
  2. FormEditor displays modal form
  3. Admin fills in name and description
  4. AdministrationSystem.addItemToCurrentLocation()
  5. Item added to Location.items array
  6. Admin saves adventure
  7. DataStore saves items to database

Player Takes Item:
  1. Player enters "take <item>" command
  2. GameEngine.handleTake() finds item in location
  3. Item removed from Location.items
  4. Item added to GameState.inventory
  5. GameState.save() persists to backend
  6. Backend saves inventory as JSON in game_state table

Player Drops Item:
  1. Player enters "drop <item>" command
  2. GameEngine.handleDrop() finds item in inventory
  3. Item removed from GameState.inventory
  4. Item added to Location.items
  5. GameState.save() persists to backend
  6. Backend saves inventory as JSON in game_state table
```

### Database Storage

**Items in Locations (items table):**
```
id: "ancient-key-abc123"
location_id: "temple-entrance-xyz789"
name: "Ancient Key"
description: "A rusty iron key with strange symbols etched into its surface."
```

**Items in Inventory (game_state.inventory JSON):**
```json
{
  "inventory": [
    {
      "id": "ancient-key-abc123",
      "name": "Ancient Key",
      "description": "A rusty iron key with strange symbols etched into its surface."
    }
  ]
}
```

**Design decision:** Items in player inventory are stored in the `game_state` table as JSON, not in the `items` table. This keeps game state self-contained and makes inventory management simpler. When a player takes an item, it's removed from the `items` table and added to the inventory JSON. When dropped, it's removed from inventory and re-inserted into the `items` table.

## Error Handling

### Validation Errors

**Admin Operations:**
- No adventure selected → "No adventure selected. Use 'select adventure' first."
- No location selected → "No location selected. Use 'select location' first."
- Item not found → "Item not found: {id}"
- Empty name/description → "Name and description are required."

**Player Operations:**
- Item not in location → "You don't see {item} here."
- Item not in inventory → "You don't have {item}."
- No items in inventory → "Your inventory is empty."
- No items in location → "There are no items here."

### API Errors

Items are saved as part of adventures, so no new API endpoints are needed. Existing adventure save/load error handling applies:
- Network errors → "Failed to save adventure: Network error"
- Database errors → "Failed to save adventure: Database error"
- Validation errors → "Cannot save invalid adventure: {errors}"

## Testing Strategy

### Unit Tests

**DataStore Tests:**
- Test saving adventures with items
- Test loading adventures with items
- Test item deletion via location cascade
- Test inventory persistence in game state

**Location Tests:**
- Test adding/removing items
- Test finding items by ID and name
- Test item list retrieval

**GameEngine Tests:**
- Test taking items from locations
- Test dropping items in locations
- Test examining items
- Test inventory display
- Test item not found errors

**AdministrationSystem Tests:**
- Test creating items in locations
- Test updating item properties
- Test deleting items
- Test finding items across locations

### Integration Tests

**Item Creation Flow:**
1. Admin selects adventure and location
2. Admin creates item via form
3. Item appears in location
4. Admin saves adventure
5. Item persists to database

**Item Interaction Flow:**
1. Player loads adventure with items
2. Player takes item from location
3. Item moves to inventory
4. Player drops item in different location
5. Item appears in new location
6. State persists across sessions

**Item Editing Flow:**
1. Admin loads adventure
2. Admin edits item via form
3. Changes reflected in adventure
4. Admin saves adventure
5. Changes persist to database

### Manual Testing Scenarios

1. **Create and interact with items**
   - Create items in multiple locations
   - Take items and verify inventory
   - Drop items and verify location
   - Examine items for descriptions

2. **Item persistence**
   - Create items and save adventure
   - Reload adventure and verify items exist
   - Take items and reload game
   - Verify inventory persists

3. **Error handling**
   - Try to take non-existent items
   - Try to drop items not in inventory
   - Try to create items without location selected
   - Verify helpful error messages

4. **Autocomplete**
   - Test tab completion for item IDs
   - Test tab completion for item names
   - Verify context-aware suggestions

## Implementation Notes

### Phase 1: Database and Backend
- Add items table to schema
- Update DataStore to save/load items with adventures
- Test item persistence

### Phase 2: Frontend Data Layer
- Extend Location class with item methods
- Extend GameState with inventory methods
- Extend AdministrationSystem with item management
- Test data layer methods

### Phase 3: Player Commands
- Implement take, drop, examine, inventory commands
- Add command handlers to GameEngine
- Test player item interactions

### Phase 4: Admin Commands
- Implement create item, edit item, delete item commands
- Integrate with FormEditor for item forms
- Test admin item management

### Phase 5: Autocomplete and Polish
- Add item ID autocomplete
- Add item name autocomplete
- Test autocomplete in various contexts
- Polish error messages and user feedback

## Dependencies

- Existing FormEditor system for item forms
- Existing modal system for form display
- Existing autocomplete system for item suggestions
- Existing DataStore for persistence
- Existing GameState for inventory management
- Existing AdministrationSystem pattern for admin operations

## Security Considerations

- Item creation/editing requires admin authentication (existing session validation)
- Player item interactions don't require authentication (read-only game state)
- Item IDs are generated server-side to prevent conflicts
- SQL injection prevented by parameterized queries (existing pattern)
- Item data validated before saving (name and description required)

## Performance Considerations

- Items loaded with adventures (no additional queries)
- Inventory stored as JSON in game state (efficient serialization)
- Item lookups use array iteration (acceptable for small item counts)
- Database index on location_id for efficient item queries
- No caching needed (items are part of adventure data)

## Future Enhancements

Potential future additions (not in scope for this spec):
- Item properties (weight, value, usability)
- Item combinations and crafting
- Item-triggered events and puzzles
- Item visibility conditions
- Item containers (items that hold other items)
- Item durability and consumables

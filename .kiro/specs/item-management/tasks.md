# Implementation Plan

- [x] 1. Extend database schema and backend for items


  - Add items table to schema.ts with id, location_id, name, description columns
  - Add foreign key constraint linking items to locations with CASCADE delete
  - Add index on location_id for efficient queries
  - Update DataStore.saveAdventure() to save items for each location
  - Update DataStore.loadAdventure() to load items and attach to location objects
  - Delete existing items before re-saving (similar to characters pattern)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Extend Location class with item management methods


  - Add addItem(item: Item) method to add items to location
  - Add removeItem(itemId: string) method to remove and return item
  - Add findItem(identifier: string) method to find by ID or case-insensitive name
  - Add getItems() method to return all items
  - Follow the same pattern as character management methods
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.1, 5.2_

- [x] 3. Extend GameState with inventory management methods


  - Add addToInventory(item: Item) method to add item to inventory array
  - Add removeFromInventory(itemId: string) method to remove and return item
  - Add findInInventory(identifier: string) method to find by ID or name
  - Add getInventory() method to return all inventory items
  - Ensure inventory persists via existing save() method
  - _Requirements: 3.5, 4.5, 5.3, 6.1, 6.5_

- [x] 4. Implement player item interaction commands


- [x] 4.1 Implement take command in GameEngine


  - Add handleTake(itemIdentifier: string) method to GameEngine
  - Find item in current location by ID or name
  - Remove item from location using Location.removeItem()
  - Add item to inventory using GameState.addToInventory()
  - Save game state to persist changes
  - Return success message with item name
  - Handle errors: item not found, no adventure loaded
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 Implement drop command in GameEngine

  - Add handleDrop(itemIdentifier: string) method to GameEngine
  - Find item in inventory by ID or name
  - Remove item from inventory using GameState.removeFromInventory()
  - Add item to current location using Location.addItem()
  - Save game state to persist changes
  - Return success message with item name
  - Handle errors: item not in inventory, no adventure loaded
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.3 Implement examine command in GameEngine

  - Add handleExamine(itemIdentifier: string) method to GameEngine
  - Search for item in current location first
  - Search for item in inventory if not found in location
  - Return formatted output with item name and full description
  - Handle error: item not available in location or inventory
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.4 Implement inventory command in GameEngine

  - Add handleInventory() method to GameEngine
  - Get all items from GameState.getInventory()
  - Format output with item names and brief descriptions
  - Display count of total items
  - Handle empty inventory with appropriate message
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.5 Register player commands in CommandParser


  - Register "take" command with aliases "get", "pickup"
  - Register "drop" command with alias "put"
  - Register "examine" command with aliases "inspect", "look at"
  - Register "inventory" command with aliases "inv", "i"
  - Set all commands to player mode
  - Wire command handlers to GameEngine methods
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 6.5_

- [x] 5. Extend AdministrationSystem with item management


  - Add addItem(locationId, name, description) method to create items
  - Add addItemToCurrentLocation(name, description) convenience method
  - Add updateItemName(itemId, name) method to update item name
  - Add updateItemDescription(itemId, description) method to update description
  - Add deleteItem(itemId) method to remove item from adventure
  - Add findItem(itemId) method to locate item across all locations
  - Add getItemIds() method to return all item IDs for autocomplete
  - Use existing generateId() method for ID generation
  - Update modifiedAt timestamp when items change
  - Follow the same pattern as character management methods
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 8.1, 8.4_

- [x] 6. Implement admin item commands with form integration

- [x] 6.1 Implement create item command


  - Register "create item" command with alias "add item" in admin mode
  - Validate that an adventure is selected
  - Validate that a location is selected
  - Display modal form with fields: name (text), description (multi-line)
  - Generate item ID using AdministrationSystem.generateId()
  - Call AdministrationSystem.addItemToCurrentLocation() on form submit
  - Display success message with item ID and name
  - Handle errors: no adventure selected, no location selected
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6.2 Implement edit item command

  - Register "edit item" command with alias "modify item" in admin mode
  - Validate that an adventure is selected
  - Find item using AdministrationSystem.findItem()
  - Display modal form with current values: ID (read-only), name, description
  - Call AdministrationSystem update methods on form submit
  - Display success message with item name
  - Handle error: item not found
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6.3 Implement delete item command

  - Register "delete item" command with aliases "remove item", "del item" in admin mode
  - Validate that an adventure is selected
  - Prompt for confirmation before deleting
  - Call AdministrationSystem.deleteItem()
  - Display success message
  - Handle errors: item not found, no adventure selected
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Add item autocomplete support


  - Extend autocomplete for "edit item <tab>" to show all item IDs in adventure
  - Extend autocomplete for "delete item <tab>" to show all item IDs in adventure
  - Extend autocomplete for "examine <tab>" to show items in location + inventory
  - Extend autocomplete for "take <tab>" to show items in current location
  - Extend autocomplete for "drop <tab>" to show items in inventory
  - Use AdministrationSystem.getItemIds() for admin commands
  - Use Location.getItems() and GameState.getInventory() for player commands
  - _Requirements: 3.2, 4.2, 5.2_

- [x] 8. Update show items command to display items correctly


  - Verify "show items" command displays items from items table
  - Update to show items in selected location or all locations
  - Format output with item ID, name, location name, and description
  - Test that items appear correctly after creation
  - _Requirements: 1.4, 2.4_

- [x] 9. Write integration tests for item system



  - Test item creation and persistence to database
  - Test taking items and inventory persistence
  - Test dropping items and location updates
  - Test examining items in location and inventory
  - Test item editing and updates
  - Test item deletion and cascade behavior
  - Test autocomplete for item commands
  - Test error handling for invalid operations
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_


## Bug Fixes

### Items Disappearing After Save/Load Cycle (Fixed)

**Issue**: When saving an adventure and then re-selecting it, items would disappear from locations.

**Root Cause**: The `deserializeAdventure` method in `AdministrationSystem.ts` was not restoring items when loading adventures from the API. While it properly restored characters, it was missing the corresponding code to restore items.

**Fix**: Added the missing item restoration code in the `deserializeAdventure` method:

```typescript
// Add items
for (const item of location.items || []) {
  loc.addItem(item);
}
```

**Files Modified**:
- `frontend/src/admin/AdministrationSystem.ts` - Added item restoration in deserializeAdventure method

**Testing**: Verified that items now persist correctly through save/load cycles. Backend tests confirm item persistence works correctly (8/8 tests passing in ItemManagement.test.ts).

---

### Item Autocomplete and Partial Matching Not Working (Fixed)

**Issue**: 
1. Autocomplete for item commands (take, drop, examine) only matched items starting with the typed text, not matching words within item names
2. Item finding required exact name match, so "take bottle" wouldn't find "Abandoned bottle of wine"

**Root Cause**: 
1. Autocomplete used simple `startsWith` matching, which doesn't support word boundary matching
2. `findItem` and `findInInventory` methods only checked for exact name matches after ID lookup

**Fix**: 
1. Updated autocomplete logic to support word boundary matching - now matches if any word in the item name starts with the typed text
2. Updated `findItem` (Location.ts) and `findInInventory` (GameState.ts) to support partial matching using `includes`

**Files Modified**:
- `frontend/src/parser/CommandParser.ts` - Enhanced autocomplete for take/drop/examine commands with word boundary matching
- `frontend/src/engine/Location.ts` - Added partial matching to findItem method
- `frontend/src/engine/GameState.ts` - Added partial matching to findInInventory method

**Testing**: Now "take bottle" will find "Abandoned bottle of wine", and typing "take b<tab>" will show both "Abandoned bottle of wine" and "Bottle of sacred wine".

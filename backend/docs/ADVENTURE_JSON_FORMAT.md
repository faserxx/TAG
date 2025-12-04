# Adventure JSON Format Documentation

This document describes the JSON format for creating adventures in the Terminal Adventure Game. You can create adventures offline using this format and import them into the game.

## Table of Contents

- [Overview](#overview)
- [JSON Structure](#json-structure)
- [Field Descriptions](#field-descriptions)
- [Referential Integrity](#referential-integrity)
- [Complete Example](#complete-example)
- [Common Validation Errors](#common-validation-errors)
- [Best Practices](#best-practices)

## Overview

Adventures are defined in JSON format following a specific schema. Each adventure consists of:
- Basic metadata (id, name, description)
- A collection of locations
- Characters within those locations
- Items within those locations
- Connections (exits) between locations

## JSON Structure

```json
{
  "id": "string",
  "name": "string",
  "description": "string (optional)",
  "startLocationId": "string",
  "locations": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "exits": [
        {
          "direction": "north|south|east|west|up|down",
          "targetLocationId": "string"
        }
      ],
      "characters": [
        {
          "id": "string",
          "name": "string",
          "dialogue": ["string"],
          "isAiPowered": false,
          "personality": "string (optional)",
          "aiConfig": {
            "temperature": 0.7,
            "maxTokens": 150
          }
        }
      ],
      "items": [
        {
          "id": "string",
          "name": "string",
          "description": "string"
        }
      ]
    }
  ]
}
```

## Field Descriptions

### Adventure Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the adventure. Must match pattern `^[a-z0-9-]+$` |
| `name` | string | Yes | Display name of the adventure |
| `description` | string | No | Brief description of the adventure |
| `startLocationId` | string | Yes | ID of the starting location (must reference an existing location) |
| `locations` | array | Yes | Array of location objects (at least one required) |

### Location Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within the adventure. Must match pattern `^[a-z0-9-]+$` |
| `name` | string | Yes | Display name of the location |
| `description` | string | Yes | Detailed description shown to players |
| `exits` | array | No | Array of exit objects (connections to other locations) |
| `characters` | array | No | Array of character objects present in this location |
| `items` | array | No | Array of item objects present in this location |

### Exit Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | Yes | Direction of the exit. Must be one of: `north`, `south`, `east`, `west`, `up`, `down` |
| `targetLocationId` | string | Yes | ID of the destination location (must reference an existing location) |

### Character Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within the adventure. Must match pattern `^[a-z0-9-]+$` |
| `name` | string | Yes | Display name of the character |
| `dialogue` | array | Yes | Array of dialogue strings. Can be empty for AI-powered characters |
| `isAiPowered` | boolean | No | Whether this character uses AI for dialogue (default: false) |
| `personality` | string | Conditional | Required if `isAiPowered` is true. Describes the character's personality for AI |
| `aiConfig` | object | No | Configuration for AI-powered characters |
| `aiConfig.temperature` | number | No | AI temperature (0-2, higher = more creative) |
| `aiConfig.maxTokens` | number | No | Maximum tokens for AI response |

### Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within the adventure. Must match pattern `^[a-z0-9-]+$` |
| `name` | string | Yes | Display name of the item |
| `description` | string | Yes | Description of the item |

## Referential Integrity

The following referential integrity rules must be followed:

1. **Start Location**: The `startLocationId` must reference an existing location ID
2. **Exit Targets**: All `targetLocationId` values in exits must reference existing location IDs
3. **Unique IDs**: All location, character, and item IDs must be unique within the adventure
4. **No Duplicate Directions**: A location cannot have multiple exits in the same direction

## Complete Example

Here's a complete example of a simple adventure:

```json
{
  "id": "haunted-mansion",
  "name": "The Haunted Mansion",
  "description": "A spooky adventure through a mysterious mansion",
  "startLocationId": "entrance-hall",
  "locations": [
    {
      "id": "entrance-hall",
      "name": "Entrance Hall",
      "description": "A grand entrance hall with a sweeping staircase. Dust motes dance in the dim light filtering through grimy windows. The air is cold and still.",
      "exits": [
        {
          "direction": "north",
          "targetLocationId": "library"
        },
        {
          "direction": "up",
          "targetLocationId": "upstairs-landing"
        }
      ],
      "characters": [
        {
          "id": "butler",
          "name": "Old Butler",
          "dialogue": [
            "Welcome to the mansion. I've been expecting you.",
            "The master hasn't been seen in years...",
            "Be careful where you wander. Some doors are best left closed."
          ]
        }
      ],
      "items": [
        {
          "id": "rusty-key",
          "name": "Rusty Key",
          "description": "An old, rusty key with strange markings"
        }
      ]
    },
    {
      "id": "library",
      "name": "Library",
      "description": "Towering bookshelves line the walls, filled with ancient tomes. A fireplace crackles softly in the corner, though you saw no one tend it.",
      "exits": [
        {
          "direction": "south",
          "targetLocationId": "entrance-hall"
        }
      ],
      "characters": [
        {
          "id": "ghost",
          "name": "Ghostly Librarian",
          "dialogue": [],
          "isAiPowered": true,
          "personality": "You are the ghost of a librarian who haunts this mansion. You speak in whispers and riddles, offering cryptic clues about the mansion's dark history. You are melancholic but not malevolent.",
          "aiConfig": {
            "temperature": 0.8,
            "maxTokens": 150
          }
        }
      ]
    },
    {
      "id": "upstairs-landing",
      "name": "Upstairs Landing",
      "description": "A narrow landing with several doors leading to different rooms. The floorboards creak ominously with every step.",
      "exits": [
        {
          "direction": "down",
          "targetLocationId": "entrance-hall"
        }
      ]
    }
  ]
}
```

## Common Validation Errors

### Missing Required Fields

**Error**: `Missing required field: name`

**Solution**: Ensure all required fields are present. Check the field descriptions table above.

### Invalid ID Format

**Error**: `Invalid format: must match pattern ^[a-z0-9-]+$`

**Solution**: IDs must contain only lowercase letters, numbers, and hyphens. No spaces or special characters.

**Bad**: `"Temple Entrance"`, `"temple_entrance"`, `"Temple-1!"`

**Good**: `"temple-entrance"`, `"temple-1"`, `"entrance"`

### Invalid Direction

**Error**: `Invalid value: must be one of north, south, east, west, up, down`

**Solution**: Use only the allowed direction values.

### Duplicate IDs

**Error**: `Duplicate location ID: "entrance"`

**Solution**: Ensure all location, character, and item IDs are unique within the adventure.

### Invalid Reference

**Error**: `Start location "lobby" does not exist in locations array`

**Solution**: Make sure `startLocationId` and all `targetLocationId` values reference existing location IDs.

### Missing Personality for AI Character

**Error**: `Missing required field: personality`

**Solution**: If `isAiPowered` is true, you must provide a `personality` field.

## Best Practices

### 1. Use Descriptive IDs

Use clear, descriptive IDs that make your JSON easy to read and maintain:

```json
{
  "id": "temple-entrance",  // Good
  "id": "loc1"              // Less clear
}
```

### 2. Write Engaging Descriptions

Make location descriptions vivid and immersive:

```json
{
  "description": "You stand in a vast hall."  // Basic
}
```

```json
{
  "description": "You stand in a vast hall, its vaulted ceiling disappearing into shadows above. Ancient murals cover every wall, depicting forgotten rituals and celestial alignments."  // Better
}
```

### 3. Create Logical Connections

Ensure exits make sense and are bidirectional when appropriate:

```json
{
  "locations": [
    {
      "id": "room-a",
      "exits": [{ "direction": "north", "targetLocationId": "room-b" }]
    },
    {
      "id": "room-b",
      "exits": [{ "direction": "south", "targetLocationId": "room-a" }]
    }
  ]
}
```

### 4. Balance Dialogue Length

For scripted characters, provide 3-5 dialogue options:

```json
{
  "dialogue": [
    "First greeting",
    "Additional information",
    "Hint or clue",
    "Atmospheric comment"
  ]
}
```

### 5. Use AI Characters Sparingly

AI-powered characters are great for key NPCs, but use scripted dialogue for minor characters to maintain consistency and control.

### 6. Test Your Adventure

Before importing:
1. Validate your JSON syntax using a JSON validator
2. Check that all references are correct
3. Ensure there's a path from the start location to all other locations
4. Test with the schema validator: use the `schema` command in admin mode to download the schema

### 7. Version Control

Keep your adventure JSON files in version control (like Git) to track changes and collaborate with others.

## Importing Your Adventure

Once your JSON file is ready:

1. Enter admin mode: `sudo` (password: `admin123`)
2. Import your adventure: `import`
3. Select your JSON file when prompted
4. Fix any validation errors if they occur
5. Test your adventure: `select adventure <your-adventure-id>`

## Exporting Adventures

To export an existing adventure:

1. Enter admin mode: `sudo`
2. Export the adventure: `export <adventure-name>`
3. The JSON file will be downloaded to your browser's download folder

## Getting Help

- Use `help import` for import command help
- Use `help export` for export command help
- Use `schema` to download the JSON schema for validation
- Check the validation error messages for specific guidance

## Schema Validation

Download the JSON schema file using the `schema` command in admin mode. You can use this schema with JSON validators to check your adventure files before importing them.

Popular JSON schema validators:
- Online: https://www.jsonschemavalidator.net/
- VS Code: Install "JSON Schema Validator" extension
- Command line: Use `ajv-cli` npm package

---

**Happy Adventure Creating!**

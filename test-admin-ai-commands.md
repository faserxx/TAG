# Testing Admin AI NPC Management Commands

This document describes how to test the new admin commands for AI NPC management.

## Commands Implemented

### 1. create-ai-character
Creates an AI-powered character in the current location.

**Syntax:** `create-ai-character <name> <personality>`

**Example:**
```
create-ai-character "Mystic Oracle" "A mysterious fortune teller who speaks in riddles"
```

**Features:**
- Creates AI character with isAiPowered flag set to true
- Validates personality length (max 500 characters)
- Checks for duplicate AI character names within adventure
- Sets default AI config (temperature: 0.8, maxTokens: 150)
- Returns character ID for future reference

### 2. edit-character-personality
Updates the personality description of an existing AI character.

**Syntax:** `edit-character-personality <character-id> <new-personality>`

**Example:**
```
edit-character-personality mystic-oracle-abc123 "A wise seer with knowledge of past and future"
```

**Features:**
- Validates personality length (max 500 characters)
- Finds character across all locations in adventure
- Updates personality field

### 3. set-ai-config
Configures AI parameters for a character.

**Syntax:** `set-ai-config <character-id> [temperature=<value>] [max-tokens=<value>]`

**Examples:**
```
set-ai-config mystic-oracle-abc123 temperature=0.9
set-ai-config mystic-oracle-abc123 max-tokens=200
set-ai-config mystic-oracle-abc123 temperature=0.7 max-tokens=150
```

**Features:**
- Validates temperature range (0-2)
- Validates max-tokens range (1-500)
- Can set one or both parameters
- Updates aiConfig object

### 4. Enhanced Validation
The adventure validation now includes AI character checks:

**Validations:**
- Ensures AI character names are unique within adventure
- Validates personality description length (max 500 characters)
- Validates aiConfig parameters are within acceptable ranges
- Warns if AI character has no personality description

## Testing Workflow

1. Enter admin mode:
   ```
   sudo
   [enter password: admin123]
   ```

2. Create a new adventure:
   ```
   create-adventure "AI Test Adventure"
   ```

3. Add a location:
   ```
   add-location "Mystic Chamber" "A dimly lit chamber filled with mystical artifacts"
   ```

4. Create an AI character:
   ```
   create-ai-character "Oracle" "A wise mystic who knows ancient secrets"
   ```

5. Edit the personality:
   ```
   edit-character-personality oracle-[id] "An all-knowing oracle with cryptic wisdom"
   ```

6. Configure AI parameters:
   ```
   set-ai-config oracle-[id] temperature=0.9 max-tokens=200
   ```

7. Save the adventure:
   ```
   save
   ```

8. Exit admin mode and test:
   ```
   exit
   load ai-test-adventure-[id]
   chat Oracle
   ```

## Validation Tests

### Test duplicate AI character names:
```
create-ai-character "Oracle" "First oracle"
create-ai-character "Oracle" "Second oracle"
# Should fail with error about duplicate name
```

### Test personality length validation:
```
create-ai-character "Test" "[501+ character string]"
# Should fail with error about max 500 characters
```

### Test AI config parameter validation:
```
set-ai-config oracle-[id] temperature=3.0
# Should fail - temperature must be 0-2

set-ai-config oracle-[id] max-tokens=600
# Should fail - max-tokens must be 1-500
```

## Implementation Details

All commands are registered in `CommandParser.ts` for admin mode only.
The underlying logic is implemented in `AdministrationSystem.ts`.
Validation is performed both at command execution and during adventure save.

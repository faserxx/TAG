# Requirements Document

## Introduction

This feature adds an AI-powered Non-Player Character (NPC) to the default adventure ("The Lost Temple") that players can interact with through natural language conversation. The NPC will be powered by a local language model accessed via lmstudio-js, providing dynamic, context-aware responses. A new `chat` command will allow players to enter conversational mode with the NPC.

## Glossary

- **Game System**: The Terminal Adventure Game application (frontend and backend)
- **NPC**: Non-Player Character - a character in the game controlled by AI rather than a human player
- **LMStudio**: A local language model runtime that provides AI inference capabilities
- **Chat Mode**: An interactive conversational state where player input is sent to the AI NPC
- **Player**: The human user playing the adventure game
- **Adventure**: A collection of locations, characters, and narrative content
- **Location**: A specific place in the adventure where the player can be positioned
- **Command Parser**: The system component that interprets player text input

## Requirements

### Requirement 1

**User Story:** As a player, I want to discover an AI-powered NPC in the default adventure, so that I can have dynamic conversations beyond scripted dialogue

#### Acceptance Criteria

1. THE Game System SHALL add one AI-powered NPC character to "The Lost Temple" adventure
2. WHEN the player uses the `look` command in the NPC's location, THE Game System SHALL display the NPC's presence in the location description
3. THE Game System SHALL store NPC configuration including name, personality description, and location assignment in the database
4. THE Game System SHALL distinguish AI-powered NPCs from standard scripted NPCs in the data model
5. WHEN the player enters the NPC's location, THE Game System SHALL indicate that the NPC is available for conversation

### Requirement 2

**User Story:** As a player, I want to use a `chat` command to start a conversation with an AI NPC, so that I can interact naturally using my own words

#### Acceptance Criteria

1. THE Game System SHALL implement a `chat` command that accepts an NPC name as a parameter
2. WHEN the player executes `chat <npc_name>` and the NPC is in the current location, THE Game System SHALL enter chat mode with that NPC
3. IF the player executes `chat <npc_name>` and the NPC is not in the current location, THEN THE Game System SHALL display an error message indicating the NPC is not present
4. IF the player executes `chat` without specifying an NPC name and exactly one AI NPC is in the location, THEN THE Game System SHALL enter chat mode with that NPC
5. IF the player executes `chat` without specifying an NPC name and multiple AI NPCs are in the location, THEN THE Game System SHALL display a message listing available NPCs
6. WHEN entering chat mode, THE Game System SHALL display a welcome message indicating the conversation has started and how to exit

### Requirement 3

**User Story:** As a player in chat mode, I want my messages to be sent to the AI NPC and receive contextual responses, so that I can have meaningful conversations

#### Acceptance Criteria

1. WHILE in chat mode, THE Game System SHALL send all player input to the LMStudio API as conversation messages
2. WHILE in chat mode, THE Game System SHALL display a loading indicator during API request processing
3. WHEN the LMStudio API returns a response, THE Game System SHALL display the NPC's reply in the terminal with appropriate formatting
4. THE Game System SHALL maintain conversation history for the duration of the chat session
5. THE Game System SHALL include the NPC's personality description and current location context in the system prompt sent to the LMStudio API
6. IF the LMStudio API request fails, THEN THE Game System SHALL display an error message and remain in chat mode

### Requirement 4

**User Story:** As a player in chat mode, I want to exit the conversation and return to normal game commands, so that I can continue exploring the adventure

#### Acceptance Criteria

1. WHILE in chat mode, WHEN the player types `exit`, THE Game System SHALL terminate chat mode and return to normal command processing
2. WHILE in chat mode, WHEN the player types `quit`, THE Game System SHALL terminate chat mode and return to normal command processing
3. WHEN exiting chat mode, THE Game System SHALL display a message confirming the conversation has ended
4. WHEN exiting chat mode, THE Game System SHALL clear the conversation history for that session
5. THE Game System SHALL display the standard game prompt after exiting chat mode

### Requirement 5

**User Story:** As a developer, I want the backend to integrate with LMStudio via lmstudio-js, so that the system can generate AI responses for NPC conversations

#### Acceptance Criteria

1. THE Game System SHALL install and configure the lmstudio-js npm package in the backend workspace
2. THE Game System SHALL create an API endpoint that accepts chat messages and returns AI-generated responses
3. THE Game System SHALL configure the LMStudio client with connection parameters (host, port, model selection)
4. WHEN the backend receives a chat request, THE Game System SHALL construct a prompt including NPC personality and conversation history
5. THE Game System SHALL handle LMStudio connection errors gracefully and return appropriate error responses
6. THE Game System SHALL set reasonable timeout values (30 seconds maximum) for LMStudio API requests

### Requirement 6

**User Story:** As an admin, I want to configure AI NPC properties through the admin interface, so that I can customize NPC personalities and behaviors

#### Acceptance Criteria

1. WHERE admin mode is active, THE Game System SHALL allow creation of AI-powered NPCs with personality descriptions
2. WHERE admin mode is active, THE Game System SHALL allow editing of existing AI NPC personality descriptions
3. THE Game System SHALL store AI NPC personality descriptions with a maximum length of 500 characters
4. WHERE admin mode is active, THE Game System SHALL allow assignment of AI NPCs to specific locations
5. THE Game System SHALL validate that AI NPC names are unique within an adventure

### Requirement 7

**User Story:** As a player, I want the help system to document the chat command, so that I can learn how to interact with AI NPCs

#### Acceptance Criteria

1. THE Game System SHALL add `chat` command documentation to the help system
2. WHEN the player executes `help chat`, THE Game System SHALL display usage instructions and examples
3. THE Game System SHALL include the `chat` command in the general help command list
4. THE Game System SHALL document the exit/quit commands for leaving chat mode in the help text

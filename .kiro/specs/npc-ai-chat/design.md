# Design Document: NPC AI Chat Feature

## Overview

This feature integrates AI-powered NPCs into the Terminal Adventure Game using LMStudio for local language model inference. Players will be able to engage in natural language conversations with AI NPCs through a new `chat` command, creating dynamic, context-aware interactions that go beyond scripted dialogue.

The implementation extends the existing character system with AI capabilities, adds a new chat mode to the command parser, and integrates lmstudio-js on the backend for AI response generation.

## Architecture

### High-Level Components

The system consists of three main layers:
- Frontend: CommandParser, ChatManager, TerminalInterface
- Backend: API Server with chat endpoint, LMStudioClient
- External: LMStudio server for AI inference

### Data Flow

1. Entering Chat Mode: Player executes chat command, CommandParser validates NPC presence, ChatManager initializes session
2. Sending Messages: Player input captured by ChatManager, sent via API to backend, LMStudioClient generates response, displayed in terminal
3. Exiting Chat Mode: Player types exit/quit, ChatManager clears session, returns to normal command mode

## Components and Interfaces

### 1. Database Schema Extension

Add AI NPC support to the existing character system by extending the characters table with AI-specific fields.

Type Extensions for backend/src/types/index.ts:
- Add isAiPowered boolean flag to Character interface
- Add personality string field for AI character description
- Add aiConfig object for model parameters (temperature, maxTokens, systemPromptTemplate)
- Update CharacterRow interface with corresponding database fields

### 2. Frontend: ChatManager

New component to manage chat session state and conversation history.

Location: frontend/src/chat/ChatManager.ts

Key responsibilities:
- Maintain current chat session with NPC ID, name, and message history
- Track whether chat mode is active
- Provide methods to start/end sessions and add messages
- Format conversation history for API requests

### 3. Frontend: Chat Command

Extend CommandParser with chat command implementation in initializeDefaultCommands method.

Command specification:
- Name: chat
- Aliases: talk-ai, converse
- Mode: Player only
- Arguments: Optional NPC name
- Handler logic: Validate NPC presence, check if AI-powered, initialize chat session

### 4. Backend: LMStudio Integration

New service to handle LMStudio API communication.

Location: backend/src/ai/LMStudioClient.ts

Key responsibilities:
- Connect to LMStudio server using lmstudio-js
- Generate AI responses from conversation history
- Build system prompts with NPC personality and location context
- Handle connection errors and timeouts
- Provide health check functionality

### 5. Backend: Chat API Endpoint

New endpoint for handling chat requests.

Location: backend/src/api/server.ts

Endpoint: POST /api/chat
Request body: npcId, message, conversationHistory, locationId
Response: success flag, AI response text, NPC name

Logic flow:
- Validate request parameters
- Load NPC from database and verify AI-powered flag
- Build system prompt with personality and location context
- Call LMStudioClient to generate response
- Return formatted response

### 6. Frontend: Chat Mode Input Handling

Modify main.ts to handle chat mode input differently from normal commands.

Logic:
- Check if ChatManager is in chat mode before parsing input
- If in chat mode and input is exit/quit, end session
- If in chat mode and input is message, send to chat API
- Otherwise, parse as normal command

## Data Models

### AI NPC Character

Character object with AI-specific fields:
- Standard fields: id, name, location
- AI fields: isAiPowered (true), personality (description string), aiConfig (parameters)
- Empty dialogue array (not used for AI NPCs)

### Chat Request Payload

API request structure:
- npcId: Character identifier
- message: User's current message
- conversationHistory: Array of previous messages with roles
- locationId: Current location for context

### Chat Response Payload

API response structure:
- success: Boolean indicating success/failure
- response: AI-generated text response
- npcName: Name of the NPC for display
- error: Optional error object with code, message, suggestion

## Error Handling

### Frontend Error Scenarios

1. NPC Not Found: Display error with list of available NPCs in location
2. No AI NPCs in Location: Suggest using talk command for scripted NPCs
3. API Request Failure: Display error message, remain in chat mode, allow retry
4. LMStudio Unavailable: Display friendly error suggesting server check

### Backend Error Scenarios

1. LMStudio Connection Failed: Return 503 with retry suggestion
2. Invalid NPC ID: Return 404 with error details
3. Request Timeout: Return 408 after 30 seconds
4. Malformed Request: Return 400 with validation errors

All errors follow consistent format with code, message, and suggestion fields.

## Testing Strategy

### Unit Tests

ChatManager: Session lifecycle, conversation history management, state validation
LMStudioClient: Connection handling, request formatting, response parsing, error handling
Command Parser: Chat command parsing, NPC name resolution, mode switching logic

### Integration Tests

Chat Flow: Complete conversation flow, multiple message exchanges, mode switching
API Endpoint: Request/response cycle, error scenarios, conversation history handling
Database Operations: Load AI NPCs, query by location, admin operations

### Manual Testing Scenarios

1. Start chat with AI NPC by name
2. Start chat without name (single AI NPC in location)
3. Send multiple messages in conversation
4. Exit chat mode and verify return to normal commands
5. Test with LMStudio offline (error handling)
6. Test with multiple AI NPCs in same location
7. Admin mode: Create and configure AI NPC

## Configuration

### LMStudio Connection

Environment-based configuration with defaults:
- Base URL: http://localhost:1234 (OpenAI-compatible REST API)
- Model: default
- Timeout: 30000ms
- Temperature: 0.8
- Max Tokens: 150

Configuration file: backend/src/config/lmstudio.ts

### Default AI NPC for Demo Adventure

The Lost Temple adventure will include one AI NPC named "Ancient Sage" in the temple inner sanctum location with a mystical personality focused on temple history and secrets.

## Admin Interface Extensions

### Create AI NPC Command

Syntax: create-ai-character name personality-description
Creates new AI-powered character with specified personality

### Edit AI NPC Personality

Syntax: edit-character-personality character-id new-personality
Updates personality description for existing AI character

### Configure AI Parameters

Syntax: set-ai-config character-id temperature=value max-tokens=value
Adjusts AI generation parameters for specific character

## Help System Updates

### Chat Command Help Page

Comprehensive help documentation including:
- Command name and synopsis
- Detailed description of chat mode behavior
- Usage with and without NPC name parameter
- Instructions for exiting chat mode
- Examples of different usage patterns
- Related commands (talk, look, help)

## Performance Considerations

1. Response Time: LMStudio requests may take 2-10 seconds, display loading indicator, 30-second timeout
2. Conversation History: Limit to last 10 messages to prevent token overflow
3. Concurrent Requests: Single-player game, no concurrency concerns
4. Memory Usage: Conversation history stored in memory only during active session, cleared on exit

## Security Considerations

1. Input Sanitization: Validate and sanitize user messages before sending to LMStudio
2. Response Filtering: No explicit content filtering (local model, single player)
3. Rate Limiting: Not required for single-player local game
4. API Access: Chat endpoint is public (no auth) as it's player-facing functionality

## Future Enhancements

1. Conversation Persistence: Save conversation history to database for continuity
2. Dynamic Personality: NPCs remember player interactions and evolve
3. Multi-NPC Conversations: Chat with multiple NPCs simultaneously
4. Voice Integration: Text-to-speech for NPC responses
5. Context Awareness: NPCs react to player's game state
6. Model Selection: Allow admin to choose different models per NPC

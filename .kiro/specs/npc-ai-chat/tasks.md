# Implementation Plan

- [x] 1. Extend database schema and types for AI NPCs




  - [x] 1.1 Update database schema to add AI character fields


    - Add is_ai_powered, personality, and ai_config columns to characters table
    - Create index for querying AI characters
    - Update schema.ts with new SQL definitions
    - _Requirements: 1.3, 5.1_
  
  - [x] 1.2 Extend TypeScript type definitions for AI characters


    - Update Character interface in backend/src/types/index.ts with isAiPowered, personality, aiConfig fields
    - Update CharacterRow interface with corresponding database fields
    - Create AiCharacterConfig interface for model parameters
    - Update Character interface in frontend/src/types/index.ts to match
    - _Requirements: 1.3, 5.1_
  
  - [x] 1.3 Update DataStore to handle AI character data


    - Modify character loading logic to parse AI-specific fields
    - Modify character saving logic to serialize AI configuration
    - Add methods to query AI-powered characters by location
    - _Requirements: 1.3, 5.1_

- [x] 2. Implement backend LMStudio integration





  - [x] 2.1 Install lmstudio-js dependency


    - Add lmstudio-js to backend/package.json
    - Run npm install in backend workspace
    - _Requirements: 5.1_
  
  - [x] 2.2 Create LMStudio configuration module


    - Create backend/src/config/lmstudio.ts with environment-based configuration
    - Define default values for baseUrl, model, timeout, temperature, maxTokens
    - Export configuration object
    - _Requirements: 5.3_
  
  - [x] 2.3 Implement LMStudioClient class


    - Create backend/src/ai/LMStudioClient.ts
    - Implement constructor with configuration
    - Implement connect method to initialize lmstudio-js client
    - Implement generateResponse method to call LMStudio API
    - Implement buildSystemPrompt method to format NPC personality and context
    - Implement healthCheck method to verify LMStudio availability
    - Add error handling for connection failures and timeouts
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 2.4 Write unit tests for LMStudioClient


    - Test connection handling with mock LMStudio server
    - Test request formatting and response parsing
    - Test error scenarios (timeout, connection failure)
    - Test system prompt generation with various inputs
    - _Requirements: 5.1, 5.5_

- [x] 3. Implement backend chat API endpoint



  - [x] 3.1 Add chat endpoint to API server


    - Add POST /api/chat route in backend/src/api/server.ts
    - Implement handleChat method to process chat requests
    - Validate request body (npcId, message, conversationHistory, locationId)
    - Load NPC from DataStore and verify isAiPowered flag
    - Build system prompt with personality and location context
    - Call LMStudioClient to generate response
    - Return formatted response with success, response text, and NPC name
    - Add error handling for invalid NPC, LMStudio failures, timeouts
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 5.2, 5.4, 5.5_
  
  - [x] 3.2 Write integration tests for chat endpoint


    - Test successful chat request/response cycle
    - Test error scenarios (invalid NPC ID, LMStudio unavailable)
    - Test conversation history handling
    - Test timeout behavior
    - _Requirements: 3.1, 3.6, 5.5_

- [x] 4. Implement frontend ChatManager




  - [x] 4.1 Create ChatManager class


    - Create frontend/src/chat/ChatManager.ts
    - Define ChatMessage and ChatSession interfaces
    - Implement startSession method to initialize chat with NPC
    - Implement endSession method to clear current session
    - Implement addMessage method to append to conversation history
    - Implement getSession method to retrieve current session
    - Implement isInChatMode method to check active state
    - Implement getConversationHistory method to format for API requests
    - _Requirements: 3.1, 3.4, 4.4_
  
  - [x] 4.2 Write unit tests for ChatManager


    - Test session lifecycle (start, add messages, end)
    - Test conversation history management
    - Test state validation (isInChatMode)
    - Test history formatting for API
    - _Requirements: 3.4, 4.4_

- [x] 5. Implement chat command in CommandParser






  - [x] 5.1 Add chat command registration

    - Add chat command to initializeDefaultCommands in frontend/src/parser/CommandParser.ts
    - Set command name, aliases (talk-ai, converse), description, syntax, examples
    - Set mode to GameMode.Player
    - _Requirements: 2.1, 2.2, 7.2, 7.3_
  

  - [x] 5.2 Implement chat command handler logic

    - Validate current location has characters
    - If no NPC name provided and exactly one AI NPC present, use that NPC
    - If no NPC name provided and multiple AI NPCs present, list available NPCs
    - If NPC name provided, find matching AI NPC in current location
    - If NPC not found or not AI-powered, return appropriate error
    - Initialize ChatManager session with NPC details
    - Return welcome message with instructions to exit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 5.3 Write unit tests for chat command


    - Test command parsing with various inputs
    - Test NPC name resolution (with/without quotes)
    - Test error cases (no NPCs, NPC not found, not AI-powered)
    - Test automatic NPC selection with single AI NPC
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Implement chat mode input handling in main.ts




  - [x] 6.1 Integrate ChatManager into main application


    - Import ChatManager in frontend/src/main.ts
    - Create ChatManager instance
    - Pass ChatManager to CommandParser or make accessible
    - _Requirements: 3.1, 4.1_
  
  - [x] 6.2 Add chat mode input routing


    - Before parsing input as command, check if ChatManager.isInChatMode()
    - If in chat mode and input is "exit" or "quit", call ChatManager.endSession() and display exit message
    - If in chat mode and input is a message, call sendChatMessage function
    - Otherwise, proceed with normal command parsing
    - _Requirements: 3.1, 4.1, 4.2, 4.3_
  
  - [x] 6.3 Implement sendChatMessage function


    - Add user message to ChatManager conversation history
    - Display loading indicator in terminal
    - Make API request to POST /api/chat with npcId, message, conversationHistory, locationId
    - On success, add assistant response to ChatManager and display in terminal
    - On error, display error message and remain in chat mode
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [x] 7. Add AI NPC to demo adventure




  - [x] 7.1 Update seed data with AI NPC


    - Modify backend/src/database/seed.ts
    - Add "Ancient Sage" character to temple inner sanctum location
    - Set isAiPowered to true
    - Set personality description for mystical sage character
    - Set aiConfig with temperature 0.8 and maxTokens 150
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  
  - [x] 7.2 Test AI NPC in demo adventure


    - Load demo adventure and navigate to inner sanctum
    - Verify AI NPC appears in location description
    - Test chat command with AI NPC
    - Verify conversation flow works end-to-end
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 3.1_



- [x] 8. Extend admin interface for AI NPC management




  - [x] 8.1 Add create-ai-character command

    - Register new command in CommandParser for admin mode
    - Parse name and personality description from arguments
    - Create character with isAiPowered flag set to true
    - Add to current location in AdministrationSystem
    - Return success message with character ID
    - _Requirements: 6.1, 6.3_
  

  - [x] 8.2 Add edit-character-personality command

    - Register new command in CommandParser for admin mode
    - Parse character ID and new personality from arguments
    - Load character from current adventure
    - Update personality field
    - Return success message
    - _Requirements: 6.2, 6.3_
  
  - [x] 8.3 Add set-ai-config command


    - Register new command in CommandParser for admin mode
    - Parse character ID and configuration parameters (temperature, max-tokens)
    - Load character from current adventure
    - Update aiConfig object
    - Validate parameter ranges (temperature 0-2, max-tokens 1-500)
    - Return success message
    - _Requirements: 6.2, 6.3_
  

  - [x] 8.4 Update character validation in AdministrationSystem

    - Ensure AI character names are unique within adventure
    - Validate personality description length (max 500 characters)
    - Validate aiConfig parameters are within acceptable ranges
    - _Requirements: 6.3, 6.5_

- [x] 9. Update help system with chat command documentation







  - [x] 9.1 Add chat command help page

    - Create help page in HelpSystem for chat command
    - Include name, synopsis, detailed description
    - Document usage with and without NPC name parameter
    - Document exit/quit commands for leaving chat mode
    - Add examples of different usage patterns
    - Add see also references to talk, look, help commands
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 9.2 Update general help command list


    - Ensure chat command appears in player mode command list
    - Add brief description in command list output
    - _Requirements: 7.3_



- [x] 10. Add error handling and user feedback



  - [x] 10.1 Implement frontend error display for chat


    - Format LMStudio connection errors with helpful messages
    - Format NPC not found errors with available NPC list
    - Format timeout errors with retry suggestion
    - Display loading indicator during AI response generation
    - _Requirements: 3.2, 3.6_
  


  - [x] 10.2 Implement backend error responses





    - Return 503 for LMStudio connection failures
    - Return 404 for invalid NPC IDs
    - Return 408 for request timeouts
    - Return 400 for malformed requests
    - Include error code, message, and suggestion in all error responses
    - _Requirements: 3.6, 5.5_

- [x] 11. Integration and end-to-end testing





  - [x] 11.1 Test complete chat flow


    - Start application and load demo adventure
    - Navigate to AI NPC location
    - Execute chat command and verify session starts
    - Send multiple messages and verify responses
    - Exit chat mode and verify return to normal commands
    - _Requirements: 1.1, 2.1, 3.1, 4.1_
  

  - [ ] 11.2 Test error scenarios
    - Test with LMStudio offline
    - Test with invalid NPC names
    - Test with multiple AI NPCs in location
    - Test chat command in location with no AI NPCs
    - _Requirements: 2.3, 2.4, 2.5, 3.6_

  
  - [ ] 11.3 Test admin functionality
    - Enter admin mode
    - Create new AI character with personality
    - Edit existing AI character personality
    - Configure AI parameters
    - Save adventure and verify AI NPCs persist
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

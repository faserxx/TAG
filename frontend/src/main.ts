// Main entry point for the frontend application
import { TerminalInterface } from './terminal/TerminalInterface';
import { OutputFormatter } from './terminal/OutputFormatter';
import { CommandParser } from './parser/CommandParser';
import { GameEngine } from './engine/GameEngine';
import { AuthenticationManager } from './auth/AuthenticationManager';
import { ChatManager } from './chat/ChatManager';
import { OutputStyle, GameMode, GameContext } from './types';
import { ApiError } from './api/ApiClient';
import './styles/terminal.css';
import './styles/form-modal.css';

// Initialize the terminal interface
const container = document.getElementById('terminal');
if (!container) {
  throw new Error('Terminal container not found');
}

const terminal = new TerminalInterface();
const formatter = new OutputFormatter();
const parser = new CommandParser();
const gameEngine = new GameEngine();
const authManager = new AuthenticationManager();
const chatManager = new ChatManager();

// Connect game engine to parser
parser.setGameEngine(gameEngine);
parser.setAuthManager(authManager);
parser.setChatManager(chatManager);
parser.setTerminal(terminal);

// Initialize game context
const gameContext: GameContext = {
  mode: GameMode.Player,
  currentLocation: undefined,
  isAuthenticated: false
};

// Set up mode change handler
authManager.onModeChange((mode: GameMode) => {
  gameContext.mode = mode;
  gameContext.isAuthenticated = authManager.isAuthenticated();
  
  // Update terminal prompt based on mode
  if (mode === GameMode.Admin) {
    terminal.updatePrompt('# ');
  } else {
    terminal.updatePrompt('$ ');
  }
});

// Set up password prompt callback (not currently used, but available for future use)
parser.setPasswordPromptCallback((_passwordCallback: (password: string) => void) => {
  terminal.promptPassword(async (password: string) => {
    const result = await parser.handlePasswordAuthentication(password);
    
    if (result.success) {
      if (result.output.includes('ENTER_ADMIN_MODE')) {
        terminal.writeLine('Authentication successful. Entering admin mode...', OutputStyle.Success);
        terminal.writeLine('Type "help" to see available admin commands.\n', OutputStyle.Info);
      }
    } else if (result.error) {
      const errorMsg = formatter.formatError(result.error.message);
      terminal.writeLine(errorMsg.text, errorMsg.style);
      
      if (result.error.suggestion) {
        terminal.writeLine(result.error.suggestion, OutputStyle.Info);
      }
    }
    
    terminal.write(terminal['currentPrompt']);
  });
});

terminal.initialize(container);

// Wire up autocomplete callback
terminal.onTab((input: string, cursorPos: number) => {
  return parser.getAutocomplete(input, cursorPos, gameContext);
});

// Wire up history navigation callback
terminal.onArrow((direction: 'up' | 'down') => {
  return parser.getHistoryCommand(direction);
});

// Display welcome message and tutorial
function displayWelcomeMessage() {
  terminal.writeLine('', OutputStyle.Normal);
  terminal.writeLine('  ████████╗ █████╗  ██████╗ ', OutputStyle.Success);
  terminal.writeLine('  ╚══██╔══╝██╔══██╗██╔════╝ ', OutputStyle.Success);
  terminal.writeLine('     ██║   ███████║██║  ███╗', OutputStyle.Success);
  terminal.writeLine('     ██║   ██╔══██║██║   ██║', OutputStyle.Success);
  terminal.writeLine('     ██║   ██║  ██║╚██████╔╝', OutputStyle.Success);
  terminal.writeLine('     ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ', OutputStyle.Success);
  terminal.writeLine('', OutputStyle.Normal);
  terminal.writeLine('  ╔════════════════════════════════════════════════════════════════╗', OutputStyle.Info);
  terminal.writeLine('  ║  Terminal Adventure Game (on steroids)                         ║', OutputStyle.Info);
  terminal.writeLine('  ╚════════════════════════════════════════════════════════════════╝', OutputStyle.Info);
  terminal.writeLine('', OutputStyle.Normal);
  
  terminal.writeLine('Welcome, adventurer! You are about to embark on a text-based journey', OutputStyle.Description);
  terminal.writeLine('through mysterious locations, where your choices and commands shape', OutputStyle.Description);
  terminal.writeLine('your experience. Navigate using simple commands, interact with', OutputStyle.Description);
  terminal.writeLine('characters, and uncover the secrets of the Lost Temple.\n', OutputStyle.Description);
  
  terminal.writeLine('BASIC COMMANDS:', OutputStyle.Success);
  terminal.writeLine('  move <direction>  - Travel to adjacent locations (north, south, east, west, up, down)', OutputStyle.Normal);
  terminal.writeLine('  look              - Examine your current surroundings', OutputStyle.Normal);
  terminal.writeLine('  talk <character>  - Speak with characters you encounter', OutputStyle.Normal);
  terminal.writeLine('  adventures        - List all available adventures', OutputStyle.Normal);
  terminal.writeLine('  load <id>         - Load and play a different adventure', OutputStyle.Normal);
  terminal.writeLine('  help              - Display all available commands', OutputStyle.Normal);
  terminal.writeLine('  help <command>    - Get detailed help for a specific command\n', OutputStyle.Normal);
  
  terminal.writeLine('TIPS:', OutputStyle.Success);
  terminal.writeLine('  • Use the "look" command to see available exits and characters', OutputStyle.Info);
  terminal.writeLine('  • Talk to characters multiple times to hear all their dialogue', OutputStyle.Info);
  terminal.writeLine('  • Use "adventures" to see other adventures you can play', OutputStyle.Info);
  terminal.writeLine('  • Type "help" anytime to see the full list of commands', OutputStyle.Info);
  terminal.writeLine('  • Explore thoroughly - every location has something to discover!\n', OutputStyle.Info);
  
  terminal.writeLine('Loading demo adventure: The Lost Temple...\n', OutputStyle.System);
}

displayWelcomeMessage();

// Load demo adventure
(async () => {
  terminal.showLoading('Loading demo adventure');
  
  try {
    await gameEngine.loadAdventure('demo-adventure');
    terminal.hideLoading();
    
    const location = gameEngine.getCurrentLocation();
    
    if (location) {
      terminal.writeLine('Demo adventure loaded successfully!\n', OutputStyle.Success);
      
      // Display starting location
      const description = location.getFormattedDescription();
      description.forEach(line => {
        terminal.writeLine(line, OutputStyle.Description);
      });
      terminal.writeLine('', OutputStyle.Normal);
      
      // Update game context
      gameContext.currentLocation = location.id;
    }
    
    // Show initial prompt
    terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
  } catch (error) {
    terminal.hideLoading();
    
    // Handle API errors gracefully
    if (isApiError(error)) {
      terminal.writeLine(`Failed to load demo adventure: ${error.message}`, OutputStyle.Error);
      if (error.suggestion) {
        terminal.writeLine(error.suggestion, OutputStyle.Info);
      }
    } else {
      terminal.writeLine('Failed to load demo adventure.', OutputStyle.Error);
      terminal.writeLine('The game may not function properly.\n', OutputStyle.Error);
    }
    console.error('Error loading demo adventure:', error);
    
    // Show prompt even on error
    terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
  }
})();

/**
 * Type guard for API errors
 */
function isApiError(error: any): error is ApiError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

/**
 * Send a chat message to the AI NPC
 */
async function sendChatMessage(message: string): Promise<void> {
  const session = chatManager.getSession();
  
  if (!session) {
    terminal.writeLine('Error: No active chat session', OutputStyle.Error);
    terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
    return;
  }
  
  // Add user message to conversation history
  chatManager.addMessage('user', message);
  
  // Display loading indicator
  terminal.showLoading('Thinking');
  
  try {
    // Make API request to chat endpoint
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        npcId: session.npcId,
        message: message,
        conversationHistory: chatManager.getConversationHistory(),
        locationId: session.locationId
      })
    });
    
    terminal.hideLoading();
    
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      
      // Format error message based on status code and error type
      let errorMsg = '';
      let suggestion = '';
      
      if (response.status === 503) {
        // LMStudio connection error
        errorMsg = 'Unable to connect to AI service';
        suggestion = errorData.suggestion || 'Please ensure LMStudio is running and try again. You can check if LMStudio is running at http://localhost:1234';
      } else if (response.status === 404) {
        // NPC not found
        errorMsg = errorData.message || 'NPC not found';
        suggestion = errorData.suggestion || 'The NPC may have been removed. Try using the "look" command to see available NPCs.';
      } else if (response.status === 408) {
        // Timeout
        errorMsg = 'The AI is taking too long to respond';
        suggestion = errorData.suggestion || 'Please try sending your message again. If the problem persists, try a shorter message.';
      } else if (response.status === 400) {
        // Bad request
        errorMsg = errorData.message || 'Invalid request';
        suggestion = errorData.suggestion || 'Please try again with a different message.';
      } else {
        // Generic error
        errorMsg = errorData.message || `Request failed: ${response.statusText}`;
        suggestion = errorData.suggestion || 'Please try again.';
      }
      
      terminal.writeLine(`Error: ${errorMsg}`, OutputStyle.Error);
      terminal.writeLine(suggestion, OutputStyle.Info);
      terminal.writeLine('', OutputStyle.Normal);
      
      // Remain in chat mode
      terminal.write('> ');
      return;
    }
    
    const data = await response.json();
    
    if (data.success && data.response) {
      // Add assistant response to conversation history
      chatManager.addMessage('assistant', data.response);
      
      // Display NPC response
      terminal.writeLine(`${data.npcName}: ${data.response}`, OutputStyle.Success);
      terminal.writeLine('', OutputStyle.Normal);
    } else {
      terminal.writeLine('Error: Invalid response from server', OutputStyle.Error);
      terminal.writeLine('The server returned an unexpected response format.', OutputStyle.Info);
      terminal.writeLine('', OutputStyle.Normal);
    }
    
  } catch (error) {
    terminal.hideLoading();
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      terminal.writeLine('Error: Unable to connect to the server', OutputStyle.Error);
      terminal.writeLine('Please check your network connection and ensure the backend server is running.', OutputStyle.Info);
    } else if (isApiError(error)) {
      terminal.writeLine(`Error: ${error.message}`, OutputStyle.Error);
      if (error.suggestion) {
        terminal.writeLine(error.suggestion, OutputStyle.Info);
      }
    } else {
      terminal.writeLine('Error: Failed to send message', OutputStyle.Error);
      terminal.writeLine('An unexpected error occurred. Please try again.', OutputStyle.Info);
    }
    
    terminal.writeLine('', OutputStyle.Normal);
    console.error('Chat message error:', error);
  }
  
  // Show chat prompt with character name
  const currentSession = chatManager.getSession();
  terminal.write(`[${currentSession?.npcName}] > `);
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  terminal.writeLine('\nAn unexpected error occurred. Please try again.', OutputStyle.Error);
  terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (isApiError(event.reason)) {
    terminal.writeLine(`\nError: ${event.reason.message}`, OutputStyle.Error);
    if (event.reason.suggestion) {
      terminal.writeLine(event.reason.suggestion, OutputStyle.Info);
    }
  } else {
    terminal.writeLine('\nAn unexpected error occurred. Please try again.', OutputStyle.Error);
  }
  
  terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
});

// Set up command handler with parser integration
terminal.onCommand(async (input: string) => {
  // Check if in chat mode first
  if (chatManager.isInChatMode()) {
    const trimmedInput = input.trim().toLowerCase();
    
    // Check for exit commands
    if (trimmedInput === 'exit' || trimmedInput === 'quit') {
      const session = chatManager.getSession();
      chatManager.endSession();
      terminal.writeLine(`You ended your conversation with ${session?.npcName}.`, OutputStyle.Info);
      terminal.writeLine('You can now use regular commands again.\n', OutputStyle.Info);
      // Restore normal prompt
      terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
      return;
    }
    
    // Otherwise, send message to chat
    await sendChatMessage(input);
    return;
  }
  
  // Parse the command
  const parsed = parser.parse(input);
  
  // Show loading for potentially long operations
  const longRunningCommands = ['save', 'list-adventures', 'create-adventure'];
  const showLoading = longRunningCommands.includes(parsed.command);
  
  if (showLoading) {
    terminal.showLoading('Processing');
  }
  
  // Execute the command
  let result;
  try {
    result = await parser.executeCommand(parsed, gameContext);
  } catch (error) {
    // Handle unexpected errors during command execution
    if (showLoading) {
      terminal.hideLoading();
    }
    
    const errorMsg = isApiError(error) 
      ? error.message 
      : 'An unexpected error occurred';
    
    terminal.writeLine(errorMsg, OutputStyle.Error);
    
    if (isApiError(error) && error.suggestion) {
      terminal.writeLine(error.suggestion, OutputStyle.Info);
    }
    
    console.error('Command execution error:', error);
    
    // Show prompt after error
    terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
    return;
  }
  
  if (showLoading) {
    terminal.hideLoading();
  }
  
  // Add command to history after successful execution
  if (result.success) {
    parser.addToHistory(input);
  }
  
  // Handle special commands
  if (result.success && result.output.includes('CLEAR_SCREEN')) {
    terminal.clear();
    return;
  }
  
  // Handle chat mode start - filter out the marker from output
  if (result.output.some(line => line.startsWith('CHAT_MODE_START:'))) {
    result.output = result.output.filter(line => !line.startsWith('CHAT_MODE_START:'));
  }
  
  // Handle password prompt for sudo
  if (result.success && result.output.includes('PROMPT_PASSWORD')) {
    terminal.promptPassword(async (password: string) => {
      const authResult = await parser.handlePasswordAuthentication(password);
      
      if (authResult.success) {
        if (authResult.output.includes('ENTER_ADMIN_MODE')) {
          terminal.writeLine('Authentication successful. Entering admin mode...', OutputStyle.Success);
          terminal.writeLine('Type "help" to see available admin commands.\n', OutputStyle.Info);
        }
      } else if (authResult.error) {
        const errorMsg = formatter.formatError(authResult.error.message);
        terminal.writeLine(errorMsg.text, errorMsg.style);
        
        if (authResult.error.suggestion) {
          terminal.writeLine(authResult.error.suggestion, OutputStyle.Info);
        }
      }
      
      terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
    });
    return;
  }
  
  // Handle delete adventure confirmation prompt
  if (result.success && result.output.includes('PROMPT_DELETE_ADVENTURE_CONFIRMATION')) {
    // Extract adventure ID from the parsed command
    const adventureId = parsed.args[0];
    
    // Extract adventure name from the confirmation message
    // The format is: Delete adventure "Name" (id)?
    let adventureName = adventureId;
    const nameMatch = result.output.find(line => line.includes('Delete adventure "'));
    if (nameMatch) {
      const match = nameMatch.match(/Delete adventure "([^"]+)"/);
      if (match) {
        adventureName = match[1];
      }
    }
    
    // Display the confirmation message (skip the marker line)
    const confirmationLines = result.output.filter(line => line !== 'PROMPT_DELETE_ADVENTURE_CONFIRMATION');
    confirmationLines.forEach(line => {
      terminal.writeLine(line, OutputStyle.System);
    });
    
    terminal.promptConfirmation('', async (confirmed: boolean) => {
      if (confirmed) {
        terminal.showLoading('Deleting adventure');
        
        try {
          // Get session ID for authentication
          const sessionId = authManager.getSessionId();
          if (!sessionId) {
            terminal.hideLoading();
            terminal.writeLine('Error: Authentication required', OutputStyle.Error);
            terminal.writeLine('Your session may have expired. Use "sudo" to re-authenticate.', OutputStyle.Info);
            terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
            return;
          }
          
          // Send DELETE request to backend
          const response = await fetch(`/api/adventures/${adventureId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId
            }
          });
          
          terminal.hideLoading();
          
          if (!response.ok) {
            if (response.status === 404) {
              terminal.writeLine(`Error: Adventure '${adventureId}' not found`, OutputStyle.Error);
              terminal.writeLine('Use "list adventures" to see available adventures.', OutputStyle.Info);
            } else if (response.status === 401) {
              terminal.writeLine('Error: Authentication required to delete adventures', OutputStyle.Error);
              terminal.writeLine('Your session may have expired. Use "sudo" to re-authenticate.', OutputStyle.Info);
            } else {
              const errorText = await response.text();
              terminal.writeLine(`Error: Failed to delete adventure (${response.status})`, OutputStyle.Error);
              terminal.writeLine('Please try again later or contact support.', OutputStyle.Info);
              console.error('Delete adventure error:', errorText);
            }
          } else {
            // Backend returns 204 No Content, so no JSON to parse
            terminal.writeLine(`✓ Adventure "${adventureName}" deleted successfully`, OutputStyle.Success);
            terminal.writeLine('', OutputStyle.Normal);
          }
        } catch (error) {
          terminal.hideLoading();
          
          if (error instanceof TypeError && error.message.includes('fetch')) {
            terminal.writeLine('Error: Failed to connect to server', OutputStyle.Error);
            terminal.writeLine('Check your connection and try again.', OutputStyle.Info);
          } else {
            terminal.writeLine('Error: Failed to delete adventure', OutputStyle.Error);
            terminal.writeLine('An unexpected error occurred. Please try again.', OutputStyle.Info);
            console.error('Delete adventure error:', error);
          }
        }
      } else {
        terminal.writeLine('Deletion cancelled.', OutputStyle.Info);
        terminal.writeLine('', OutputStyle.Normal);
      }
      
      terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
    });
    return;
  }
  
  // Handle exit confirmation prompt
  if (result.success && result.output.includes('PROMPT_EXIT_CONFIRMATION')) {
    terminal.promptConfirmation('Are you sure you want to exit?', (confirmed: boolean) => {
      if (confirmed) {
        terminal.writeLine('Thanks for playing!', OutputStyle.Success);
        terminal.writeLine('Refresh the page to start a new game.', OutputStyle.Info);
      } else {
        terminal.writeLine('Exit cancelled.', OutputStyle.Info);
        terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
      }
    });
    return;
  }
  
  // Handle exit from admin mode
  if (result.success && result.output.includes('EXIT_ADMIN_MODE')) {
    terminal.writeLine('Exiting admin mode. Returning to player mode...', OutputStyle.Info);
    terminal.writeLine('', OutputStyle.Normal);
    return;
  }
  
  // Handle exit game
  if (result.success && result.output.includes('EXIT_GAME')) {
    // Just display the message, don't actually close the browser
    return;
  }
  
  // Display output
  if (result.success) {
    result.output.forEach(line => {
      // Skip special markers
      if (!line.startsWith('PROMPT_') && !line.startsWith('EXIT_') && !line.startsWith('ENTER_')) {
        terminal.writeLine(line, OutputStyle.Success);
      }
    });
  } else if (result.error) {
    // Display error message
    const errorMsg = formatter.formatError(result.error.message);
    terminal.writeLine(errorMsg.text, errorMsg.style);
    
    // Display suggestion if available
    if (result.error.suggestion) {
      terminal.writeLine(result.error.suggestion, OutputStyle.Info);
    }
  }
  
  // Always show prompt after command execution (unless it was a special command that handles its own prompt)
  // Check if in chat mode and show character name in prompt
  if (chatManager.isInChatMode()) {
    const session = chatManager.getSession();
    terminal.write(`[${session?.npcName}] > `);
  } else {
    terminal.write(gameContext.mode === GameMode.Admin ? '# ' : '$ ');
  }
});

console.log('Terminal Adventure Game - Frontend initialized');

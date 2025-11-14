import { 
  ICommandParser, 
  ParsedCommand, 
  Command, 
  GameMode, 
  GameContext,
  CommandResult,
  Character
} from '../types';
import { GameEngine, Adventure } from '../engine/GameEngine';
import { HelpSystem } from '../help/HelpSystem';
import { AuthenticationManager } from '../auth/AuthenticationManager';
import { AdministrationSystem } from '../admin/AdministrationSystem';
import { MapRenderer } from '../engine/MapRenderer';
import { AdminMapRenderer } from '../engine/AdminMapRenderer';
import { ChatManager } from '../chat/ChatManager';
import { Location } from '../engine/Location';
import { Item } from '../engine/GameState';

export class CommandParser implements ICommandParser {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private gameEngine: GameEngine | null = null;
  private helpSystem: HelpSystem;
  private authManager: AuthenticationManager | null = null;
  private adminSystem: AdministrationSystem;
  private passwordPromptCallback: ((callback: (password: string) => void) => void) | null = null;
  private chatManager: ChatManager | null = null;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private readonly maxHistorySize: number = 50;

  constructor() {
    this.helpSystem = new HelpSystem();
    this.adminSystem = new AdministrationSystem();
    // Initialize with default commands
    this.initializeDefaultCommands();
  }

  /**
   * Set the game engine instance
   */
  setGameEngine(engine: GameEngine): void {
    this.gameEngine = engine;
  }

  /**
   * Set the authentication manager instance
   */
  setAuthManager(authManager: AuthenticationManager): void {
    this.authManager = authManager;
  }

  /**
   * Set the chat manager instance
   */
  setChatManager(chatManager: ChatManager): void {
    this.chatManager = chatManager;
  }

  /**
   * Set password prompt callback
   */
  setPasswordPromptCallback(callback: (passwordCallback: (password: string) => void) => void): void {
    this.passwordPromptCallback = callback;
  }

  /**
   * Handle password authentication for sudo
   */
  async handlePasswordAuthentication(password: string): Promise<CommandResult> {
    if (!this.authManager) {
      return {
        success: false,
        output: [],
        error: {
          code: 'NO_AUTH_MANAGER',
          message: 'Authentication system not initialized',
          suggestion: 'Please restart the application'
        }
      };
    }

    const isAuthenticated = await this.authManager.authenticate(password);

    if (!isAuthenticated) {
      return {
        success: false,
        output: [],
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
          suggestion: 'Incorrect password. Please try again.'
        }
      };
    }

    // Elevate privileges
    this.authManager.elevatePrivileges();

    return {
      success: true,
      output: ['ENTER_ADMIN_MODE'],
      error: undefined
    };
  }

  /**
   * Parse raw command string into structured command
   */
  parse(input: string): ParsedCommand {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return {
        command: '',
        args: [],
        isValid: false,
        error: 'Empty command'
      };
    }

    // Tokenize input - split by spaces but respect quotes
    const tokens = this.tokenize(trimmed);
    
    if (tokens.length === 0) {
      return {
        command: '',
        args: [],
        isValid: false,
        error: 'Invalid command format'
      };
    }

    // Try to match multi-word commands first (longest match wins)
    // Check up to 3 words for command name
    let commandName = '';
    let args: string[] = [];
    let resolvedCommand = '';

    for (let wordCount = Math.min(3, tokens.length); wordCount >= 1; wordCount--) {
      const potentialCommand = tokens.slice(0, wordCount).join(' ').toLowerCase();
      
      // Check if it's a direct command
      if (this.commands.has(potentialCommand)) {
        commandName = potentialCommand;
        resolvedCommand = potentialCommand;
        args = tokens.slice(wordCount);
        break;
      }
      
      // Check if it's an alias
      if (this.aliases.has(potentialCommand)) {
        commandName = potentialCommand;
        resolvedCommand = this.aliases.get(potentialCommand)!;
        args = tokens.slice(wordCount);
        break;
      }
    }

    // If no match found, treat first token as command
    if (!resolvedCommand) {
      commandName = tokens[0].toLowerCase();
      args = tokens.slice(1);
      resolvedCommand = this.aliases.get(commandName) || commandName;
    }

    // Check if command exists
    if (!this.commands.has(resolvedCommand)) {
      return {
        command: commandName,
        args,
        isValid: false,
        error: `Unknown command: ${commandName}`
      };
    }

    return {
      command: resolvedCommand,
      args,
      isValid: true
    };
  }

  /**
   * Tokenize command string, respecting quoted strings
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Get all available commands for a specific game mode
   */
  getAvailableCommands(mode: GameMode): Command[] {
    return Array.from(this.commands.values()).filter(
      cmd => cmd.mode === mode || cmd.mode === 'both'
    );
  }

  /**
   * Suggest commands based on fuzzy matching for typos
   */
  suggestCommand(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const suggestions: Array<{ command: string; score: number }> = [];

    for (const [commandName] of this.commands) {
      const score = this.calculateSimilarity(lowerInput, commandName);
      if (score > 0.5) {
        suggestions.push({ command: commandName, score });
      }
    }

    // Also check aliases
    for (const [alias, commandName] of this.aliases) {
      const score = this.calculateSimilarity(lowerInput, alias);
      if (score > 0.5) {
        suggestions.push({ command: commandName, score });
      }
    }

    // Sort by score (highest first) and remove duplicates
    const uniqueSuggestions = Array.from(
      new Set(suggestions.map(s => s.command))
    );

    return uniqueSuggestions
      .map(cmd => ({
        command: cmd,
        score: Math.max(...suggestions.filter(s => s.command === cmd).map(s => s.score))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.command);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Check for prefix match (higher score)
    if (str2.startsWith(str1)) {
      return 0.9;
    }

    // Calculate Levenshtein distance
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    
    return 1 - distance / maxLen;
  }

  /**
   * Register a new command
   */
  registerCommand(command: Command): void {
    this.commands.set(command.name, command);
    
    // Register aliases
    for (const alias of command.aliases) {
      this.aliases.set(alias, command.name);
    }

    // Register with help system
    this.helpSystem.registerCommand(command);
  }

  /**
   * Execute a parsed command with context
   */
  async executeCommand(parsed: ParsedCommand, context: GameContext): Promise<CommandResult> {
    if (!parsed.isValid) {
      return {
        success: false,
        output: [],
        error: {
          code: 'INVALID_COMMAND',
          message: parsed.error || 'Invalid command',
          suggestion: this.getSuggestionMessage(parsed.command)
        }
      };
    }

    const command = this.commands.get(parsed.command);
    
    if (!command) {
      return {
        success: false,
        output: [],
        error: {
          code: 'COMMAND_NOT_FOUND',
          message: `Command not found: ${parsed.command}`,
          suggestion: this.getSuggestionMessage(parsed.command)
        }
      };
    }

    // Check if command is available in current mode
    if (command.mode !== 'both' && command.mode !== context.mode) {
      return {
        success: false,
        output: [],
        error: {
          code: 'COMMAND_NOT_AVAILABLE',
          message: `Command "${parsed.command}" is not available in ${context.mode} mode`,
          suggestion: context.mode === GameMode.Player 
            ? 'Use "sudo" to enter admin mode' 
            : 'Use "exit" to return to player mode'
        }
      };
    }

    try {
      return await command.handler(parsed.args, context);
    } catch (error) {
      return {
        success: false,
        output: [],
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Command execution failed',
          suggestion: 'Try "help ' + parsed.command + '" for usage information'
        }
      };
    }
  }

  /**
   * Get suggestion message for invalid command
   */
  private getSuggestionMessage(input: string): string {
    const suggestions = this.suggestCommand(input);
    
    if (suggestions.length > 0) {
      return `Did you mean: ${suggestions.join(', ')}?`;
    }
    
    return 'Type "help" to see available commands';
  }

  /**
   * Add command to history with 50 command limit
   */
  addToHistory(command: string): void {
    // Don't add empty commands
    if (!command.trim()) {
      return;
    }

    // Don't add duplicate consecutive commands
    if (this.commandHistory.length > 0 && this.commandHistory[this.commandHistory.length - 1] === command) {
      this.historyIndex = -1;
      return;
    }

    // Add to history
    this.commandHistory.push(command);

    // Limit history size to maxHistorySize
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }

    // Reset history index
    this.historyIndex = -1;
  }

  /**
   * Get command from history for arrow key navigation
   */
  getHistoryCommand(direction: 'up' | 'down'): string | null {
    if (this.commandHistory.length === 0) {
      return null;
    }

    if (direction === 'up') {
      // Navigate backward through history
      if (this.historyIndex === -1) {
        // Start from the most recent command
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        // Move to older command
        this.historyIndex--;
      }
      // If already at the oldest command, stay there
      return this.commandHistory[this.historyIndex];
    } else {
      // Navigate forward through history
      if (this.historyIndex === -1) {
        // Already at the end, return null to clear input
        return null;
      } else if (this.historyIndex < this.commandHistory.length - 1) {
        // Move to newer command
        this.historyIndex++;
        return this.commandHistory[this.historyIndex];
      } else {
        // Reached the end, clear input
        this.historyIndex = -1;
        return null;
      }
    }
  }

  /**
   * Get full command history
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Get autocomplete suggestions for partial input
   */
  getAutocomplete(input: string, cursorPos: number, context: GameContext): { suggestions: string[]; completionText?: string } {
    // Parse the input to identify command and argument position
    const beforeCursor = input.substring(0, cursorPos);
    const tokens = this.tokenize(beforeCursor);
    
    // If no tokens or empty input, return empty result
    if (tokens.length === 0) {
      return { suggestions: [] };
    }

    // Get the partial token at cursor position
    const lastToken = tokens[tokens.length - 1];
    const isPartialToken = !beforeCursor.endsWith(' ');
    
    // Build the partial command string from tokens
    const partialCommand = tokens.join(' ').toLowerCase();
    
    // Try to match complete multi-word commands (up to 3 words)
    let matchedCommand = '';
    let commandTokenCount = 0;
    
    // Only look for complete command match if we have a space after the last token
    // (indicating we're done typing the command)
    if (!isPartialToken) {
      for (let wordCount = Math.min(3, tokens.length); wordCount >= 1; wordCount--) {
        const potentialCommand = tokens.slice(0, wordCount).join(' ').toLowerCase();
        
        if (this.commands.has(potentialCommand) || this.aliases.has(potentialCommand)) {
          matchedCommand = this.aliases.get(potentialCommand) || potentialCommand;
          commandTokenCount = wordCount;
          break;
        }
      }
    }
    
    // Special case: if we have a partial token and didn't match a command above,
    // try matching the first N-1 tokens to see if we're completing an argument
    // for a multi-word command (e.g., "edit location entr" -> completing argument for "edit location")
    if (!matchedCommand && isPartialToken && tokens.length > 1) {
      for (let wordCount = Math.min(3, tokens.length - 1); wordCount >= 1; wordCount--) {
        const potentialCommand = tokens.slice(0, wordCount).join(' ').toLowerCase();
        
        if (this.commands.has(potentialCommand) || this.aliases.has(potentialCommand)) {
          // Check if this command expects arguments (location ID commands)
          const resolvedCmd = this.aliases.get(potentialCommand) || potentialCommand;
          const locationIdCommands = ['edit location', 'remove connection', 'delete location'];
          
          if (locationIdCommands.includes(resolvedCmd)) {
            matchedCommand = resolvedCmd;
            commandTokenCount = wordCount;
            break;
          }
        }
      }
    }
    
    // If we haven't matched a complete command, we're still completing the command name
    if (!matchedCommand) {
      const { commands: commandNames, aliases: aliasNames } = this.getCommandSuggestionsDetailed(partialCommand, context.mode);
      const allSuggestions = [...commandNames, ...aliasNames];
      
      // Set completionText only if there's exactly one primary command match (ignoring aliases)
      if (commandNames.length === 1) {
        return { 
          suggestions: allSuggestions,
          completionText: commandNames[0]
        };
      }
      
      return { suggestions: allSuggestions };
    }

    // We're completing an argument
    const resolvedCommand = matchedCommand;
    
    // Check if this command supports location ID autocomplete
    const locationIdCommands = ['edit location', 'remove connection', 'delete location'];
    
    if (!locationIdCommands.includes(resolvedCommand)) {
      return { suggestions: [] };
    }

    // Only provide autocomplete in admin mode with an active edit session
    if (context.mode !== GameMode.Admin) {
      return { suggestions: [] };
    }

    const currentAdventure = this.adminSystem.getCurrentAdventure();
    if (!currentAdventure) {
      return { suggestions: [] };
    }

    // Get all location IDs
    const locationIds = this.adminSystem.getLocationIds();
    
    // Determine which argument position we're at (after the command tokens)
    let argIndex = tokens.length - commandTokenCount; // 0-based index for arguments (excluding command)
    if (!isPartialToken) {
      argIndex++; // We're starting a new argument
    }

    // Check if current argument position should be a location ID
    let shouldAutocomplete = false;
    
    if (resolvedCommand === 'edit location' && argIndex === 1) {
      // First argument is location ID
      shouldAutocomplete = true;
    } else if (resolvedCommand === 'remove connection' && argIndex === 1) {
      // First argument is location ID
      shouldAutocomplete = true;
    } else if (resolvedCommand === 'delete location' && argIndex === 1) {
      // First argument is location ID
      shouldAutocomplete = true;
    }

    if (!shouldAutocomplete) {
      return { suggestions: [] };
    }

    // Filter location IDs based on partial input
    const partialInput = isPartialToken ? lastToken : '';
    const matches = locationIds.filter(id => 
      id.toLowerCase().startsWith(partialInput.toLowerCase())
    );

    // If exactly one match, return as completion
    if (matches.length === 1) {
      return {
        suggestions: matches,
        completionText: matches[0]
      };
    }

    // Multiple matches or no matches
    return { suggestions: matches };
  }

  /**
   * Get command name suggestions with commands and aliases separated
   */
  private getCommandSuggestionsDetailed(partial: string, mode: GameMode): { commands: string[]; aliases: string[] } {
    const lowerPartial = partial.toLowerCase();
    const commandNames: string[] = [];
    const aliasNames: string[] = [];

    // Split partial into words for multi-word matching
    const partialWords = lowerPartial.split(' ');
    const lastPartialWord = partialWords[partialWords.length - 1];
    const completeWords = partialWords.slice(0, -1);

    // Check command names (primary names with spaces)
    for (const [commandName, command] of this.commands) {
      if (command.mode === mode || command.mode === 'both') {
        const commandWords = commandName.split(' ');
        
        // Check if command matches the partial input
        let matches = false;
        
        if (completeWords.length === 0) {
          // Single word partial - simple prefix match
          matches = commandName.startsWith(lowerPartial);
        } else {
          // Multi-word partial - check if all complete words match and last word is partial match
          if (commandWords.length > completeWords.length) {
            // Check all complete words match exactly
            const allCompleteWordsMatch = completeWords.every((word, i) => commandWords[i] === word);
            // Check last partial word matches
            const lastWordMatches = commandWords[completeWords.length].startsWith(lastPartialWord);
            matches = allCompleteWordsMatch && lastWordMatches;
          }
        }
        
        if (matches) {
          commandNames.push(commandName);
        }
      }
    }

    // Check aliases (including hyphenated versions)
    // Match hyphenated aliases by converting spaces to hyphens in the partial input
    const hyphenatedPartial = lowerPartial.replace(/ /g, '-');
    
    for (const [alias, commandName] of this.aliases) {
      const command = this.commands.get(commandName);
      if (command && (command.mode === mode || command.mode === 'both')) {
        let matches = false;
        
        // Direct prefix match (e.g., "cre" matches "create")
        if (alias.startsWith(lowerPartial) && !commandNames.includes(alias)) {
          matches = true;
        }
        // Hyphenated match (e.g., "edit t" matches "edit-title" via "edit-t")
        else if (alias.startsWith(hyphenatedPartial) && !commandNames.includes(alias)) {
          // Only add hyphenated alias if the actual command name is also in the suggestions
          const actualCommandName = this.commands.get(commandName)?.name;
          if (actualCommandName && commandNames.includes(actualCommandName)) {
            matches = true;
          }
        }
        
        if (matches) {
          aliasNames.push(alias);
        }
      }
    }

    // Sort each group alphabetically
    return { 
      commands: commandNames.sort(), 
      aliases: aliasNames.sort() 
    };
  }

  /**
   * Get command name suggestions based on partial input
   * Prioritizes space-separated command names over hyphenated aliases
   * Supports partial matching of multi-word commands (e.g., "create adv" matches "create adventure")
   */
  private getCommandSuggestions(partial: string, mode: GameMode): string[] {
    const { commands, aliases } = this.getCommandSuggestionsDetailed(partial, mode);
    return [...commands, ...aliases];
  }

  /**
   * Find a location by ID or name (case-insensitive)
   */
  private findLocationByIdOrName(identifier: string, adventure: Adventure): Location | null {
    // Try exact ID match first
    const byId = adventure.locations.get(identifier);
    if (byId) {
      return byId;
    }
    
    // Try case-insensitive name match
    const lowerIdentifier = identifier.toLowerCase();
    for (const [, location] of adventure.locations) {
      if (location.name.toLowerCase() === lowerIdentifier) {
        return location;
      }
    }
    
    return null;
  }

  /**
   * Format detailed location information with exits, characters, and items
   */
  private formatLocationDetails(location: Location, adventure: Adventure): string[] {
    const output: string[] = [];
    
    output.push(`Selected location: "${location.name}"`);
    output.push(`ID: ${location.id}`);
    output.push(`Description: ${location.description}`);
    output.push('');
    
    // Format exits
    const exits = location.getExits();
    if (exits.size > 0) {
      output.push(`Exits (${exits.size}):`);
      for (const [direction, targetId] of exits) {
        const targetLocation = adventure.locations.get(targetId);
        const targetName = targetLocation ? targetLocation.name : 'Unknown';
        output.push(`  ${direction} → ${targetName} (${targetId})`);
      }
      output.push('');
    } else {
      output.push('Exits (0): None');
      output.push('');
    }
    
    // Format characters
    const characters = location.getCharacters();
    if (characters.length > 0) {
      output.push(`Characters (${characters.length}):`);
      for (const character of characters) {
        const aiMarker = character.isAiPowered ? ' [AI]' : '';
        output.push(`  • ${character.name}${aiMarker}`);
        
        if (character.isAiPowered && character.personality) {
          const personalityPreview = character.personality.length > 50 
            ? character.personality.substring(0, 50) + '...' 
            : character.personality;
          output.push(`    ${personalityPreview}`);
        } else if (character.dialogue && character.dialogue.length > 0) {
          const dialoguePreview = character.dialogue[0].length > 50 
            ? character.dialogue[0].substring(0, 50) + '...' 
            : character.dialogue[0];
          output.push(`    "${dialoguePreview}"`);
        }
      }
      output.push('');
    } else {
      output.push('Characters (0): None');
      output.push('');
    }
    
    // Format items
    const items = location.getItems();
    if (items.length > 0) {
      output.push(`Items (${items.length}):`);
      for (const item of items) {
        output.push(`  • ${item.name}`);
        const descPreview = item.description.length > 50 
          ? item.description.substring(0, 50) + '...' 
          : item.description;
        output.push(`    ${descPreview}`);
      }
    } else {
      output.push('Items (0): None');
    }
    
    return output;
  }

  /**
   * Format character list with optional location information
   */
  private formatCharacterList(characters: Character[], adventure: Adventure, showLocation: boolean): string[] {
    const output: string[] = [];
    
    characters.forEach((character, index) => {
      const aiMarker = character.isAiPowered ? ' [AI]' : '';
      output.push(`${index + 1}. ${character.name}${aiMarker}`);
      output.push(`   ID: ${character.id}`);
      
      // Show location if requested
      if (showLocation) {
        // Find which location this character is in
        let locationName = 'Unknown';
        for (const [, location] of adventure.locations) {
          const chars = location.getCharacters();
          if (chars.some(c => c.id === character.id)) {
            locationName = location.name;
            break;
          }
        }
        output.push(`   Location: ${locationName}`);
      }
      
      // Show dialogue or personality preview
      if (character.isAiPowered && character.personality) {
        const personalityPreview = character.personality.length > 50 
          ? character.personality.substring(0, 50) + '...' 
          : character.personality;
        output.push(`   Personality: ${personalityPreview}`);
      } else if (character.dialogue && character.dialogue.length > 0) {
        const dialoguePreview = character.dialogue[0].length > 50 
          ? character.dialogue[0].substring(0, 50) + '...' 
          : character.dialogue[0];
        output.push(`   Dialogue: "${dialoguePreview}"`);
      }
      
      output.push('');
    });
    
    return output;
  }

  /**
   * Format item list with optional location information
   */
  private formatItemList(items: Item[], adventure: Adventure, showLocation: boolean): string[] {
    const output: string[] = [];
    
    items.forEach((item, index) => {
      output.push(`${index + 1}. ${item.name}`);
      output.push(`   ID: ${item.id}`);
      
      // Show location if requested
      if (showLocation) {
        // Find which location this item is in
        let locationName = 'Unknown';
        for (const [, location] of adventure.locations) {
          const locationItems = location.getItems();
          if (locationItems.some(i => i.id === item.id)) {
            locationName = location.name;
            break;
          }
        }
        output.push(`   Location: ${locationName}`);
      }
      
      output.push(`   Description: ${item.description}`);
      output.push('');
    });
    
    return output;
  }

  /**
   * Initialize default commands (placeholders for now)
   */
  private initializeDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: 'help',
      aliases: ['?', 'h'],
      description: 'Display help information',
      syntax: 'help [command]',
      examples: ['help', 'help move', 'help talk'],
      mode: 'both',
      handler: async (args: string[], context: GameContext) => {
        // If no arguments, show command list
        if (args.length === 0) {
          const commandList = this.helpSystem.getCommandList(context.mode);
          return {
            success: true,
            output: commandList.split('\n'),
            error: undefined
          };
        }

        // Get help for specific command
        const commandName = args[0].toLowerCase();
        
        // Resolve alias to actual command name
        const resolvedCommand = this.aliases.get(commandName) || commandName;
        
        const helpPage = this.helpSystem.getCommandHelp(resolvedCommand, context.mode);

        if (!helpPage) {
          // Try to find similar commands
          const suggestions = this.suggestCommand(commandName);
          return {
            success: false,
            output: [],
            error: {
              code: 'COMMAND_NOT_FOUND',
              message: `No help available for "${commandName}"`,
              suggestion: suggestions.length > 0 
                ? `Did you mean: ${suggestions.join(', ')}?` 
                : 'Type "help" to see all available commands'
            }
          };
        }

        // Format and return help page
        const formattedHelp = this.helpSystem.formatHelpPage(helpPage);
        return {
          success: true,
          output: formattedHelp,
          error: undefined
        };
      }
    });

    // Clear command
    this.registerCommand({
      name: 'clear',
      aliases: ['cls'],
      description: 'Clear the terminal screen',
      syntax: 'clear',
      examples: ['clear'],
      mode: 'both',
      handler: async (_args: string[]) => {
        return {
          success: true,
          output: ['CLEAR_SCREEN'], // Special marker
          error: undefined
        };
      }
    });

    // History command
    this.registerCommand({
      name: 'history',
      aliases: [],
      description: 'Display command history',
      syntax: 'history',
      examples: ['history'],
      mode: 'both',
      handler: async (_args: string[]) => {
        const history = this.getHistory();
        
        if (history.length === 0) {
          return {
            success: true,
            output: ['No commands in history.'],
            error: undefined
          };
        }

        const output = ['Command History:', ''];
        history.forEach((cmd, index) => {
          output.push(`${index + 1}. ${cmd}`);
        });

        return {
          success: true,
          output,
          error: undefined
        };
      }
    });

    // Exit command
    this.registerCommand({
      name: 'exit',
      aliases: ['quit', 'q'],
      description: 'Exit the game or admin mode',
      syntax: 'exit',
      examples: ['exit'],
      mode: 'both',
      handler: async (_args: string[], context: GameContext) => {
        if (context.mode === GameMode.Admin) {
          // Drop privileges and return to player mode
          if (this.authManager) {
            this.authManager.dropPrivileges();
          }
          return {
            success: true,
            output: ['EXIT_ADMIN_MODE'],
            error: undefined
          };
        }
        
        // Player mode - prompt for confirmation
        return {
          success: true,
          output: ['PROMPT_EXIT_CONFIRMATION'],
          error: undefined
        };
      }
    });

    // Player mode commands
    this.registerCommand({
      name: 'move',
      aliases: ['go'],
      description: 'Move in a direction',
      syntax: 'move <direction>',
      examples: ['move north', 'move south', 'go east'],
      mode: GameMode.Player,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Direction required',
              suggestion: 'Usage: move <direction> (e.g., move north)'
            }
          };
        }

        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        return await this.gameEngine.handleMove(args[0]);
      }
    });

    this.registerCommand({
      name: 'talk',
      aliases: ['speak', 't'],
      description: 'Talk to a character',
      syntax: 'talk [character]',
      examples: ['talk', 'talk guard', 'talk "temple guard"'],
      mode: GameMode.Player,
      handler: async (args: string[]) => {
        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        const characterName = args.length > 0 ? args.join(' ') : undefined;
        return await this.gameEngine.handleTalk(characterName);
      }
    });

    this.registerCommand({
      name: 'chat',
      aliases: ['talk-ai', 'converse'],
      description: 'Start a conversation with an AI-powered NPC',
      syntax: 'chat [npc-name]',
      examples: [
        'chat',
        'chat "Ancient Sage"',
        'chat sage'
      ],
      mode: GameMode.Player,
      handler: async (args: string[]) => {
        // Validate game engine
        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        // Validate chat manager
        if (!this.chatManager) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_CHAT_MANAGER',
              message: 'Chat system not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        // Get current location
        const currentLocation = this.gameEngine.getCurrentLocation();
        if (!currentLocation) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_LOCATION',
              message: 'No adventure loaded',
              suggestion: 'Load an adventure first'
            }
          };
        }

        // Get all characters in current location
        const characters = currentLocation.getCharacters();
        
        // Filter for AI-powered NPCs
        const aiNpcs = characters.filter(char => char.isAiPowered === true);

        // If NPC name provided, handle that first
        if (args.length > 0) {
          const npcName = args.join(' ');
          const npc = currentLocation.findCharacter(npcName);

          // Check if NPC exists
          if (!npc) {
            const npcList = aiNpcs.map(npc => npc.name).join(', ');
            return {
              success: false,
              output: [],
              error: {
                code: 'NPC_NOT_FOUND',
                message: `${npcName} is not here.`,
                suggestion: aiNpcs.length > 0 
                  ? `Available AI NPCs: ${npcList}` 
                  : 'There are no AI NPCs here.'
              }
            };
          }

          // Check if NPC is AI-powered
          if (!npc.isAiPowered) {
            return {
              success: false,
              output: [],
              error: {
                code: 'NOT_AI_POWERED',
                message: `${npc.name} is not an AI-powered NPC.`,
                suggestion: 'Use "talk" for scripted conversations with regular NPCs.'
              }
            };
          }

          // Start chat session with specified NPC
          this.chatManager.startSession(npc.id, npc.name, currentLocation.id);

          return {
            success: true,
            output: [
              `Starting conversation with ${npc.name}...`,
              '',
              'You are now in chat mode. Your messages will be sent to the AI NPC.',
              'Type "exit" or "quit" to end the conversation.',
              ''
            ],
            error: undefined
          };
        }

        // No NPC name provided - check if there are any AI NPCs
        if (aiNpcs.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_AI_NPCS',
              message: 'There are no AI-powered NPCs here to chat with.',
              suggestion: characters.length > 0 
                ? 'Try using "talk" for scripted conversations with regular NPCs.' 
                : 'Try exploring other locations.'
            }
          };
        }

        // If exactly one AI NPC, use that one
        if (aiNpcs.length === 1) {
          const npc = aiNpcs[0];
          this.chatManager.startSession(npc.id, npc.name, currentLocation.id);
          
          return {
            success: true,
            output: [
              `Starting conversation with ${npc.name}...`,
              '',
              'You are now in chat mode. Your messages will be sent to the AI NPC.',
              'Type "exit" or "quit" to end the conversation.',
              ''
            ],
            error: undefined
          };
        }

        // Multiple AI NPCs - list them
        const npcList = aiNpcs.map(npc => npc.name).join(', ');
        return {
          success: false,
          output: [],
          error: {
            code: 'MULTIPLE_AI_NPCS',
            message: 'Multiple AI NPCs are present.',
            suggestion: `Please specify which NPC to chat with: ${npcList}`
          }
        };
      }
    });

    this.registerCommand({
      name: 'look',
      aliases: ['l', 'examine'],
      description: 'Look at current location',
      syntax: 'look',
      examples: ['look'],
      mode: GameMode.Player,
      handler: async (_args: string[]) => {
        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        return await this.gameEngine.handleLook();
      }
    });

    this.registerCommand({
      name: 'map',
      aliases: ['m'],
      description: 'Display map of visited locations (player) or complete adventure map (admin)',
      syntax: 'map',
      examples: ['map'],
      mode: 'both',
      handler: async (_args: string[], context: GameContext) => {
        // Admin mode: show complete adventure map
        if (context.mode === GameMode.Admin) {
          // Validate that an adventure is selected
          const adventure = this.adminSystem.getCurrentAdventure();
          
          if (!adventure) {
            return {
              success: false,
              output: [],
              error: {
                code: 'NO_ADVENTURE_SELECTED',
                message: 'No adventure selected',
                suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
              }
            };
          }

          // Get selected location ID from adminSystem
          const selectedLocationId = this.adminSystem.getCurrentLocationId();

          // Create AdminMapRenderer instance with adventure locations and selected location
          const renderer = new AdminMapRenderer(
            adventure.locations,
            selectedLocationId
          );

          // Call renderer's render() method and return output
          const mapOutput = renderer.render();

          return {
            success: true,
            output: mapOutput,
            error: undefined
          };
        }

        // Player mode: show visited locations map
        // Validate game engine initialization
        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        // Get current adventure
        const adventure = this.gameEngine.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE',
              message: 'No adventure loaded',
              suggestion: 'Use "load <adventure-id>" to start an adventure'
            }
          };
        }

        // Get visited locations from game state
        const gameState = this.gameEngine.getGameState();
        const mapData = gameState.getLocationMapData();
        const visitedLocationIds = mapData.map(data => data.locationId);

        // Handle no locations visited
        if (visitedLocationIds.length === 0) {
          return {
            success: true,
            output: ['No locations visited yet.'],
            error: undefined
          };
        }

        // Get current location
        const currentLocationId = gameState.getCurrentLocation();

        // Create MapRenderer instance
        const renderer = new MapRenderer(
          adventure.locations,
          visitedLocationIds,
          currentLocationId
        );

        // Render and return map
        const mapOutput = renderer.render();

        return {
          success: true,
          output: mapOutput,
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'adventures',
      aliases: [],
      description: 'List all available adventures',
      syntax: 'adventures',
      examples: ['adventures'],
      mode: GameMode.Player,
      handler: async (_args: string[]) => {
        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        try {
          const adventures = await this.gameEngine.listAdventures();
          
          if (adventures.length === 0) {
            return {
              success: true,
              output: ['No adventures available.'],
              error: undefined
            };
          }

          const output = ['Available Adventures:', ''];
          
          adventures.forEach((adventure, index) => {
            output.push(`${index + 1}. ${adventure.name}`);
            output.push(`   ID: ${adventure.id}`);
            output.push(`   ${adventure.description || 'No description'}`);
            output.push(`   Locations: ${adventure.locations.size}`);
            output.push('');
          });

          output.push('Use "load <adventure-id>" to play an adventure.');

          return {
            success: true,
            output,
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'LIST_FAILED',
              message: error instanceof Error ? error.message : 'Failed to list adventures',
              suggestion: 'Please try again or check the server connection'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'load',
      aliases: ['play'],
      description: 'Load and play an adventure',
      syntax: 'load <adventure-id>',
      examples: ['load demo-adventure', 'play my-adventure'],
      mode: GameMode.Player,
      handler: async (args: string[], context: GameContext) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Adventure ID required',
              suggestion: 'Usage: load <adventure-id>. Use "adventures" to see available adventures.'
            }
          };
        }

        if (!this.gameEngine) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ENGINE',
              message: 'Game engine not initialized',
              suggestion: 'Please restart the game'
            }
          };
        }

        const adventureId = args[0];

        try {
          await this.gameEngine.loadAdventure(adventureId);
          const location = this.gameEngine.getCurrentLocation();
          
          if (!location) {
            return {
              success: false,
              output: [],
              error: {
                code: 'NO_LOCATION',
                message: 'Adventure loaded but no starting location found',
                suggestion: 'This adventure may be incomplete'
              }
            };
          }

          // Update game context
          context.currentLocation = location.id;

          const output = [
            `Adventure loaded: ${adventureId}`,
            '',
            ...location.getFormattedDescription()
          ];

          return {
            success: true,
            output,
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'LOAD_FAILED',
              message: error instanceof Error ? error.message : 'Failed to load adventure',
              suggestion: 'Check the adventure ID and try again. Use "adventures" to see available adventures.'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'sudo',
      aliases: [],
      description: 'Enter administration mode',
      syntax: 'sudo',
      examples: ['sudo'],
      mode: GameMode.Player,
      handler: async (_args: string[], _context: GameContext) => {
        if (!this.authManager) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_AUTH_MANAGER',
              message: 'Authentication system not initialized',
              suggestion: 'Please restart the application'
            }
          };
        }

        if (!this.passwordPromptCallback) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_PROMPT_CALLBACK',
              message: 'Password prompt not available',
              suggestion: 'Please restart the application'
            }
          };
        }

        // Return a special marker to trigger password prompt
        return {
          success: true,
          output: ['PROMPT_PASSWORD'],
          error: undefined
        };
      }
    });

    // Admin mode commands
    this.registerCommand({
      name: 'create adventure',
      aliases: ['create', 'create-adventure'],
      description: 'Create a new adventure',
      syntax: 'create adventure <name>',
      examples: ['create adventure "My Adventure"'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Adventure name required',
              suggestion: 'Usage: create-adventure <name>'
            }
          };
        }

        const name = args.join(' ');
        
        try {
          const adventure = this.adminSystem.createAdventure(name);
          
          return {
            success: true,
            output: [
              `Created new adventure: "${adventure.name}"`,
              `Adventure ID: ${adventure.id}`,
              '',
              'Use "add-location" to add locations to your adventure.',
              'Use "save" when you\'re ready to save your adventure.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'CREATE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to create adventure',
              suggestion: 'Please try again'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'add location',
      aliases: ['addloc', 'add-location'],
      description: 'Add a location to the adventure',
      syntax: 'add location <name> <description>',
      examples: ['add location "Temple Entrance" "You stand before an ancient temple..."'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Location name required',
              suggestion: 'Usage: add-location <name> <description>'
            }
          };
        }

        if (args.length < 2) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Location description required',
              suggestion: 'Usage: add-location <name> <description>'
            }
          };
        }

        // First arg is name, rest is description
        const name = args[0];
        const description = args.slice(1).join(' ');

        try {
          const locationId = this.adminSystem.addLocation(name, description);
          const adventure = this.adminSystem.getCurrentAdventure();
          
          const output = [
            `Added location: "${name}"`,
            `Location ID: ${locationId}`
          ];

          if (adventure && adventure.locations.size === 1) {
            output.push('', 'This is the first location and has been set as the starting location.');
          }

          output.push('', 'Use "add-character" to add characters to this location.');
          output.push('Use "connect" to link this location to others.');

          return {
            success: true,
            output,
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'ADD_LOCATION_FAILED',
              message: error instanceof Error ? error.message : 'Failed to add location',
              suggestion: 'Make sure you have created an adventure first with "create-adventure"'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'add character',
      aliases: ['addchar', 'add-character'],
      description: 'Add a character to current location',
      syntax: 'add character <name> <dialogue...>',
      examples: ['add character "Temple Guard" "Welcome, traveler." "The temple holds many secrets."'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Character name required',
              suggestion: 'Usage: add-character <name> <dialogue...>'
            }
          };
        }

        if (args.length < 2) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'At least one dialogue line required',
              suggestion: 'Usage: add-character <name> <dialogue...>'
            }
          };
        }

        const name = args[0];
        const dialogue = args.slice(1);

        try {
          const characterId = this.adminSystem.addCharacterToCurrentLocation(name, dialogue);
          
          return {
            success: true,
            output: [
              `Added character: "${name}"`,
              `Character ID: ${characterId}`,
              `Dialogue lines: ${dialogue.length}`,
              '',
              'The character has been added to the current location.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'ADD_CHARACTER_FAILED',
              message: error instanceof Error ? error.message : 'Failed to add character',
              suggestion: 'Make sure you have added at least one location first'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'connect',
      aliases: ['link'],
      description: 'Connect two locations',
      syntax: 'connect <from-id> <to-id> <direction>',
      examples: ['connect entrance-123 hall-456 north', 'connect hall-456 entrance-123 south'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length < 3) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Three arguments required: from-id, to-id, direction',
              suggestion: 'Usage: connect <from-id> <to-id> <direction>'
            }
          };
        }

        const fromId = args[0];
        const toId = args[1];
        const direction = args[2];

        // Validate direction
        const validDirections = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
        if (!validDirections.includes(direction.toLowerCase())) {
          return {
            success: false,
            output: [],
            error: {
              code: 'INVALID_DIRECTION',
              message: `Invalid direction: ${direction}`,
              suggestion: `Valid directions: ${validDirections.join(', ')}`
            }
          };
        }

        try {
          this.adminSystem.connectLocations(fromId, toId, direction);
          
          return {
            success: true,
            output: [
              `Connected locations:`,
              `  From: ${fromId}`,
              `  To: ${toId}`,
              `  Direction: ${direction}`,
              '',
              'Note: This creates a one-way connection.',
              'To create a two-way connection, use connect again with reversed locations.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'CONNECT_FAILED',
              message: error instanceof Error ? error.message : 'Failed to connect locations',
              suggestion: 'Make sure both location IDs exist in the current adventure'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'save adventure',
      aliases: ['save', 'save-adventure'],
      description: 'Save current adventure',
      syntax: 'save adventure',
      examples: ['save adventure'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        if (!this.authManager) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_AUTH',
              message: 'Authentication manager not available',
              suggestion: 'Please restart the application'
            }
          };
        }

        const sessionId = this.authManager.getSessionId();
        if (!sessionId) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NOT_AUTHENTICATED',
              message: 'Not authenticated',
              suggestion: 'Please use "sudo" to authenticate first'
            }
          };
        }

        // Validate adventure before saving
        const validation = this.adminSystem.validateAdventure();
        
        if (!validation.isValid) {
          const output = ['Cannot save adventure. The following errors must be fixed:', ''];
          validation.errors.forEach(error => {
            output.push(`  ✗ ${error}`);
          });
          
          return {
            success: false,
            output,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Adventure validation failed',
              suggestion: 'Fix the errors listed above and try again'
            }
          };
        }

        // Display warnings if any
        const output: string[] = [];
        if (validation.warnings.length > 0) {
          output.push('Warnings:');
          validation.warnings.forEach(warning => {
            output.push(`  ⚠ ${warning}`);
          });
          output.push('');
        }

        try {
          await this.adminSystem.saveAdventure(sessionId);
          
          output.push('Adventure saved successfully!');
          
          return {
            success: true,
            output,
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'SAVE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to save adventure',
              suggestion: 'Please try again or check the server logs'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'list adventures',
      aliases: ['list', 'ls', 'list-adventures'],
      description: 'List all adventures',
      syntax: 'list adventures',
      examples: ['list adventures'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        try {
          const adventures = await this.adminSystem.listAdventures();
          
          if (adventures.length === 0) {
            return {
              success: true,
              output: ['No adventures found.', '', 'Use "create-adventure" to create a new adventure.'],
              error: undefined
            };
          }

          const output = ['Available Adventures:', ''];
          
          adventures.forEach((adventure, index) => {
            output.push(`${index + 1}. ${adventure.name}`);
            output.push(`   ID: ${adventure.id}`);
            output.push(`   Locations: ${adventure.locations.size}`);
            
            if (adventure.createdAt) {
              output.push(`   Created: ${adventure.createdAt.toLocaleDateString()}`);
            }
            
            output.push('');
          });

          return {
            success: true,
            output,
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'LIST_FAILED',
              message: error instanceof Error ? error.message : 'Failed to list adventures',
              suggestion: 'Please try again or check the server connection'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'select adventure',
      aliases: ['select', 'select-adventure'],
      description: 'Select an adventure for editing',
      syntax: 'select adventure <adventure-id>',
      examples: ['select adventure demo-adventure', 'select my-adventure-123'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Adventure ID required',
              suggestion: 'Usage: select-adventure <adventure-id>. Use "list-adventures" to see available adventures.'
            }
          };
        }

        const adventureId = args[0];

        try {
          const adventure = await this.adminSystem.loadAdventure(adventureId);
          
          return {
            success: true,
            output: [
              `Selected adventure: "${adventure.name}"`,
              `Adventure ID: ${adventure.id}`,
              `Locations: ${adventure.locations.size}`,
              '',
              'You can now edit this adventure using commands like:',
              '  - edit-title <new-title>',
              '  - edit-description <new-description>',
              '  - edit-location <location-id> <property> <value>',
              '  - add-location <name> <description>',
              '',
              'Use "show-adventure" to view full adventure details.',
              'Use "save" when you\'re ready to save your changes.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'LOAD_FAILED',
              message: error instanceof Error ? error.message : 'Failed to load adventure',
              suggestion: 'Check the adventure ID and try again. Use "list-adventures" to see available adventures.'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'show adventure',
      aliases: ['show', 'view-adventure', 'show-adventure'],
      description: 'Display current adventure details',
      syntax: 'show adventure',
      examples: ['show adventure', 'show'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        const adventure = this.adminSystem.getCurrentAdventure();
        
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "list adventures" to see available adventures, then "select adventure <id>" to select one.'
            }
          };
        }

        const output = [
          `Adventure: ${adventure.name}`,
          `ID: ${adventure.id}`,
          `Description: ${adventure.description || '(no description)'}`,
          `Starting Location: ${adventure.startLocationId}`,
          '',
          `Locations (${adventure.locations.size}):`
        ];

        // List all locations with details
        for (const [locationId, location] of adventure.locations) {
          const isStart = locationId === adventure.startLocationId ? ' [START]' : '';
          output.push(`  • ${location.name}${isStart}`);
          output.push(`    ID: ${locationId}`);
          
          const exits = location.getExits();
          if (exits.size > 0) {
            const exitList = Array.from(exits.entries())
              .map(([dir, target]) => `${dir} → ${target}`)
              .join(', ');
            output.push(`    Exits: ${exitList}`);
          }
          
          const characters = location.getCharacters();
          if (characters.length > 0) {
            const charList = characters
              .map(char => char.isAiPowered ? `${char.name} [AI]` : char.name)
              .join(', ');
            output.push(`    Characters: ${charList}`);
          }
          
          const items = location.getItems();
          if (items.length > 0) {
            const itemList = items.map(item => item.name).join(', ');
            output.push(`    Items: ${itemList}`);
          }
          
          output.push('');
        }

        if (adventure.createdAt) {
          output.push(`Created: ${adventure.createdAt.toLocaleDateString()}`);
        }
        
        if (adventure.modifiedAt) {
          output.push(`Modified: ${adventure.modifiedAt.toLocaleDateString()}`);
        }

        return {
          success: true,
          output,
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'deselect adventure',
      aliases: ['deselect', 'deselect-adventure'],
      description: 'Deselect current adventure',
      syntax: 'deselect adventure',
      examples: ['deselect adventure', 'deselect'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        const adventure = this.adminSystem.getCurrentAdventure();
        
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure is currently selected',
              suggestion: 'Use "select adventure <id>" to select an adventure.'
            }
          };
        }

        const adventureName = adventure.name;
        this.adminSystem.clearCurrentAdventure();
        
        return {
          success: true,
          output: [
            `Deselected adventure: "${adventureName}"`,
            '',
            'You can now select a different adventure or create a new one.',
            'Use "list-adventures" to see available adventures.'
          ],
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'edit title',
      aliases: ['edit-title'],
      description: 'Edit the title of the current adventure',
      syntax: 'edit title <new-title>',
      examples: ['edit title "The Lost Temple"', 'edit title "My Amazing Adventure"'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'New title required',
              suggestion: 'Usage: edit-title <new-title>'
            }
          };
        }

        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const newTitle = args.join(' ');

        try {
          this.adminSystem.updateAdventureTitle(newTitle);
          
          return {
            success: true,
            output: [
              `Updated adventure title to: "${newTitle}"`,
              '',
              'Use "save" to persist your changes.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'EDIT_TITLE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to edit title',
              suggestion: 'Please try again'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'edit description',
      aliases: ['edit-description'],
      description: 'Edit the description of the current adventure',
      syntax: 'edit description <new-description>',
      examples: ['edit description "An epic journey through ancient ruins"'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const newDescription = args.join(' ');

        try {
          this.adminSystem.updateAdventureDescription(newDescription);
          
          return {
            success: true,
            output: [
              'Updated adventure description.',
              '',
              'Use "save" to persist your changes.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'EDIT_DESCRIPTION_FAILED',
              message: error instanceof Error ? error.message : 'Failed to edit description',
              suggestion: 'Please try again'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'edit location',
      aliases: ['edit-location'],
      description: 'Edit a location property',
      syntax: 'edit location <location-id> <property> <value>',
      examples: [
        'edit location entrance-123 name "Grand Entrance"',
        'edit location hall-456 description "A vast hall with towering columns"'
      ],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length < 3) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Three arguments required: location-id, property, value',
              suggestion: 'Usage: edit-location <location-id> <property> <value>. Valid properties: name, description'
            }
          };
        }

        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const locationId = args[0];
        const property = args[1].toLowerCase();
        const value = args.slice(2).join(' ');

        // Validate property
        if (property !== 'name' && property !== 'description') {
          return {
            success: false,
            output: [],
            error: {
              code: 'INVALID_PROPERTY',
              message: `Invalid property: ${property}`,
              suggestion: 'Valid properties: name, description'
            }
          };
        }

        try {
          if (property === 'name') {
            this.adminSystem.updateLocationName(locationId, value);
          } else {
            this.adminSystem.updateLocationDescription(locationId, value);
          }
          
          return {
            success: true,
            output: [
              `Updated location ${property}: "${value}"`,
              '',
              'Use "save" to persist your changes.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'EDIT_LOCATION_FAILED',
              message: error instanceof Error ? error.message : 'Failed to edit location',
              suggestion: 'Make sure the location ID is correct. Use "show-adventure" to see available locations.'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'remove connection',
      aliases: ['remove-exit', 'remove-connection'],
      description: 'Remove a connection from a location',
      syntax: 'remove connection <from-location-id> <direction>',
      examples: ['remove connection entrance-123 north', 'remove connection hall-456 south'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length < 2) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Two arguments required: from-location-id, direction',
              suggestion: 'Usage: remove-connection <from-location-id> <direction>'
            }
          };
        }

        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const fromLocationId = args[0];
        const direction = args[1];

        try {
          this.adminSystem.removeConnection(fromLocationId, direction);
          
          return {
            success: true,
            output: [
              `Removed ${direction} exit from location ${fromLocationId}`,
              '',
              'Use "save" to persist your changes.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'REMOVE_CONNECTION_FAILED',
              message: error instanceof Error ? error.message : 'Failed to remove connection',
              suggestion: 'Make sure the location ID and direction are correct. Use "show-adventure" to see available locations and exits.'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'create ai character',
      aliases: ['create-ai-npc', 'create-ai-character'],
      description: 'Create an AI-powered character in current location',
      syntax: 'create ai character <name> <personality>',
      examples: ['create ai character "Ancient Sage" "A wise mystic who knows the temple secrets"'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Character name required',
              suggestion: 'Usage: create-ai-character <name> <personality>'
            }
          };
        }

        if (args.length < 2) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Personality description required',
              suggestion: 'Usage: create-ai-character <name> <personality>'
            }
          };
        }

        const name = args[0];
        const personality = args.slice(1).join(' ');

        try {
          const characterId = this.adminSystem.addAiCharacterToCurrentLocation(name, personality);
          
          return {
            success: true,
            output: [
              `Created AI character: "${name}"`,
              `Character ID: ${characterId}`,
              `Personality: ${personality}`,
              '',
              'The AI character has been added to the current location.',
              'Use "set-ai-config" to customize AI parameters if needed.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'CREATE_AI_CHARACTER_FAILED',
              message: error instanceof Error ? error.message : 'Failed to create AI character',
              suggestion: 'Make sure you have added at least one location first'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'edit character personality',
      aliases: ['edit-personality', 'edit-character-personality'],
      description: 'Edit the personality of an AI character',
      syntax: 'edit character personality <character-id> <new-personality>',
      examples: ['edit character personality sage-123 "A mysterious oracle with cryptic wisdom"'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Character ID required',
              suggestion: 'Usage: edit-character-personality <character-id> <new-personality>'
            }
          };
        }

        if (args.length < 2) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'New personality description required',
              suggestion: 'Usage: edit-character-personality <character-id> <new-personality>'
            }
          };
        }

        const characterId = args[0];
        const newPersonality = args.slice(1).join(' ');

        try {
          this.adminSystem.updateCharacterPersonality(characterId, newPersonality);
          
          return {
            success: true,
            output: [
              `Updated personality for character: ${characterId}`,
              `New personality: ${newPersonality}`,
              '',
              'The character\'s personality has been updated.',
              'Use "save" to persist your changes.'
            ],
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'EDIT_PERSONALITY_FAILED',
              message: error instanceof Error ? error.message : 'Failed to edit character personality',
              suggestion: 'Make sure the character ID is correct'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'set ai config',
      aliases: ['config-ai', 'set-ai-config'],
      description: 'Configure AI parameters for a character',
      syntax: 'set ai config <character-id> [temperature=<value>] [max-tokens=<value>]',
      examples: [
        'set ai config sage-123 temperature=0.9',
        'set ai config sage-123 max-tokens=200',
        'set ai config sage-123 temperature=0.7 max-tokens=150'
      ],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Character ID required',
              suggestion: 'Usage: set-ai-config <character-id> [temperature=<value>] [max-tokens=<value>]'
            }
          };
        }

        if (args.length < 2) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'At least one configuration parameter required',
              suggestion: 'Usage: set-ai-config <character-id> [temperature=<value>] [max-tokens=<value>]'
            }
          };
        }

        const characterId = args[0];
        let temperature: number | undefined;
        let maxTokens: number | undefined;

        // Parse configuration parameters
        for (let i = 1; i < args.length; i++) {
          const param = args[i];
          
          if (param.startsWith('temperature=')) {
            const value = parseFloat(param.split('=')[1]);
            if (isNaN(value)) {
              return {
                success: false,
                output: [],
                error: {
                  code: 'INVALID_PARAMETER',
                  message: 'Invalid temperature value',
                  suggestion: 'Temperature must be a number between 0 and 2'
                }
              };
            }
            temperature = value;
          } else if (param.startsWith('max-tokens=')) {
            const value = parseInt(param.split('=')[1], 10);
            if (isNaN(value)) {
              return {
                success: false,
                output: [],
                error: {
                  code: 'INVALID_PARAMETER',
                  message: 'Invalid max-tokens value',
                  suggestion: 'Max tokens must be an integer between 1 and 500'
                }
              };
            }
            maxTokens = value;
          } else {
            return {
              success: false,
              output: [],
              error: {
                code: 'INVALID_PARAMETER',
                message: `Unknown parameter: ${param}`,
                suggestion: 'Valid parameters: temperature=<value>, max-tokens=<value>'
              }
            };
          }
        }

        try {
          this.adminSystem.updateAiConfig(characterId, temperature, maxTokens);
          
          const output = [
            `Updated AI configuration for character: ${characterId}`
          ];

          if (temperature !== undefined) {
            output.push(`  Temperature: ${temperature}`);
          }

          if (maxTokens !== undefined) {
            output.push(`  Max Tokens: ${maxTokens}`);
          }

          output.push('');
          output.push('The AI configuration has been updated.');
          output.push('Use "save" to persist your changes.');

          return {
            success: true,
            output,
            error: undefined
          };
        } catch (error) {
          return {
            success: false,
            output: [],
            error: {
              code: 'SET_AI_CONFIG_FAILED',
              message: error instanceof Error ? error.message : 'Failed to set AI configuration',
              suggestion: 'Make sure the character ID is correct and parameter values are within valid ranges'
            }
          };
        }
      }
    });

    this.registerCommand({
      name: 'delete location',
      aliases: ['del-location', 'delete-location'],
      description: 'Delete a location from the current adventure',
      syntax: 'delete location <location-id>',
      examples: ['delete location entrance-123', 'delete location hall-456'],
      mode: GameMode.Admin,
      handler: async (args: string[], context: GameContext) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Location ID required',
              suggestion: 'Usage: delete-location <location-id>. Use "show-adventure" to see available locations.'
            }
          };
        }

        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const locationId = args[0];
        const location = adventure.locations.get(locationId);

        if (!location) {
          return {
            success: false,
            output: [],
            error: {
              code: 'LOCATION_NOT_FOUND',
              message: `Location not found: ${locationId}`,
              suggestion: 'Use "show-adventure" to see available locations.'
            }
          };
        }

        // Prompt for confirmation (confirmation flow not yet implemented)
        // TODO: Implement confirmation mechanism
        return {
          success: true,
          output: ['PROMPT_CONFIRMATION', `Delete location "${location.name}" (${locationId})? This will also remove all connections to this location.`],
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'delete character',
      aliases: ['del-character', 'delete-character'],
      description: 'Delete a character from the current adventure',
      syntax: 'delete character <character-id>',
      examples: ['delete character guard-123', 'delete character sage-456'],
      mode: GameMode.Admin,
      handler: async (args: string[], context: GameContext) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Character ID required',
              suggestion: 'Usage: delete-character <character-id>. Use "show-adventure" to see available characters.'
            }
          };
        }

        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const characterId = args[0];
        
        // Find the character in any location
        let foundCharacter = null;
        for (const [, location] of adventure.locations) {
          const characters = location.getCharacters();
          const character = characters.find(char => char.id === characterId);
          if (character) {
            foundCharacter = character;
            break;
          }
        }

        if (!foundCharacter) {
          return {
            success: false,
            output: [],
            error: {
              code: 'CHARACTER_NOT_FOUND',
              message: `Character not found: ${characterId}`,
              suggestion: 'Use "show-adventure" to see available characters.'
            }
          };
        }

        // Prompt for confirmation (confirmation flow not yet implemented)
        // TODO: Implement confirmation mechanism
        return {
          success: true,
          output: ['PROMPT_CONFIRMATION', `Delete character "${foundCharacter.name}" (${characterId})?`],
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'delete item',
      aliases: ['del-item', 'delete-item'],
      description: 'Delete an item from the current adventure',
      syntax: 'delete item <item-id>',
      examples: ['delete item key-123', 'delete item sword-456'],
      mode: GameMode.Admin,
      handler: async (args: string[], context: GameContext) => {
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Item ID required',
              suggestion: 'Usage: delete-item <item-id>. Use "show-adventure" to see available items.'
            }
          };
        }

        const adventure = this.adminSystem.getCurrentAdventure();
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const itemId = args[0];
        
        // Find the item in any location
        let foundItem = null;
        for (const [, location] of adventure.locations) {
          const items = location.getItems();
          const item = items.find(itm => itm.id === itemId);
          if (item) {
            foundItem = item;
            break;
          }
        }

        if (!foundItem) {
          return {
            success: false,
            output: [],
            error: {
              code: 'ITEM_NOT_FOUND',
              message: `Item not found: ${itemId}`,
              suggestion: 'Use "show-adventure" to see available items.'
            }
          };
        }

        // Prompt for confirmation (confirmation flow not yet implemented)
        // TODO: Implement confirmation mechanism
        return {
          success: true,
          output: ['PROMPT_CONFIRMATION', `Delete item "${foundItem.name}" (${itemId})?`],
          error: undefined
        };
      }
    });

    // Navigation & Inspection Commands
    this.registerCommand({
      name: 'show locations',
      aliases: [],
      description: 'Display all locations in selected adventure',
      syntax: 'show locations',
      examples: ['show locations'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        // Validate that an adventure is selected
        const adventure = this.adminSystem.getCurrentAdventure();
        
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        const output: string[] = [];
        const locationCount = adventure.locations.size;
        
        // Header with count
        output.push(`Locations in "${adventure.name}" (${locationCount} total):`);
        output.push('');

        // Iterate through all locations
        let index = 1;
        for (const [locationId, location] of adventure.locations) {
          // Mark starting location
          const startMarker = locationId === adventure.startLocationId ? ' [START]' : '';
          output.push(`${index}. ${location.name}${startMarker}`);
          output.push(`   ID: ${locationId}`);
          output.push(`   Description: ${location.description}`);
          
          // Format exits
          const exits = location.getExits();
          if (exits.size > 0) {
            const exitList: string[] = [];
            for (const [direction, targetId] of exits) {
              const targetLocation = adventure.locations.get(targetId);
              const targetName = targetLocation ? targetLocation.name : 'Unknown';
              exitList.push(`${direction} → ${targetName}`);
            }
            output.push(`   Exits: ${exitList.join(', ')}`);
          } else {
            output.push(`   Exits: None`);
          }
          
          output.push('');
          index++;
        }

        return {
          success: true,
          output,
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'show characters',
      aliases: [],
      description: 'Display characters (filtered by selected location)',
      syntax: 'show characters',
      examples: ['show characters'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        // Validate that an adventure is selected
        const adventure = this.adminSystem.getCurrentAdventure();
        
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        // Check if a location is selected
        const selectedLocationId = this.adminSystem.getCurrentLocationId();
        const output: string[] = [];
        let characters: Character[] = [];
        let contextName = '';
        
        if (selectedLocationId) {
          // Filter characters to only the selected location
          const selectedLocation = adventure.locations.get(selectedLocationId);
          if (selectedLocation) {
            characters = selectedLocation.getCharacters();
            contextName = selectedLocation.name;
            output.push(`Characters in "${contextName}" (${characters.length} total):`);
          }
        } else {
          // Show all characters from all locations in the adventure
          contextName = adventure.name;
          for (const [, location] of adventure.locations) {
            characters.push(...location.getCharacters());
          }
          output.push(`Characters in "${contextName}" (${characters.length} total):`);
        }
        
        output.push('');

        // If no characters found
        if (characters.length === 0) {
          output.push('No characters found.');
          return {
            success: true,
            output,
            error: undefined
          };
        }

        // Format character list
        const showLocation = !selectedLocationId; // Show location if no specific location selected
        const formattedList = this.formatCharacterList(characters, adventure, showLocation);
        output.push(...formattedList);

        return {
          success: true,
          output,
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'show items',
      aliases: [],
      description: 'Display items (filtered by selected location)',
      syntax: 'show items',
      examples: ['show items'],
      mode: GameMode.Admin,
      handler: async (_args: string[]) => {
        // Validate that an adventure is selected
        const adventure = this.adminSystem.getCurrentAdventure();
        
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        // Check if a location is selected
        const selectedLocationId = this.adminSystem.getCurrentLocationId();
        const output: string[] = [];
        let items: Item[] = [];
        let contextName = '';
        
        if (selectedLocationId) {
          // Filter items to only the selected location
          const selectedLocation = adventure.locations.get(selectedLocationId);
          if (selectedLocation) {
            items = selectedLocation.getItems();
            contextName = selectedLocation.name;
            output.push(`Items in "${contextName}" (${items.length} total):`);
          }
        } else {
          // Show all items from all locations in the adventure
          contextName = adventure.name;
          for (const [, location] of adventure.locations) {
            items.push(...location.getItems());
          }
          output.push(`Items in "${contextName}" (${items.length} total):`);
        }
        
        output.push('');

        // If no items found
        if (items.length === 0) {
          output.push('No items found.');
          return {
            success: true,
            output,
            error: undefined
          };
        }

        // Format item list
        const showLocation = !selectedLocationId; // Show location if no specific location selected
        const formattedList = this.formatItemList(items, adventure, showLocation);
        output.push(...formattedList);

        return {
          success: true,
          output,
          error: undefined
        };
      }
    });

    this.registerCommand({
      name: 'select location',
      aliases: [],
      description: 'Select a location to view details and set context',
      syntax: 'select location <id|name>',
      examples: ['select location entrance-123', 'select location "Temple Entrance"'],
      mode: GameMode.Admin,
      handler: async (args: string[]) => {
        // Validate that an adventure is selected
        const adventure = this.adminSystem.getCurrentAdventure();
        
        if (!adventure) {
          return {
            success: false,
            output: [],
            error: {
              code: 'NO_ADVENTURE_SELECTED',
              message: 'No adventure selected',
              suggestion: 'Use "select adventure <id>" to select an adventure for editing.'
            }
          };
        }

        // Validate that identifier argument is provided
        if (args.length === 0) {
          return {
            success: false,
            output: [],
            error: {
              code: 'MISSING_ARGUMENT',
              message: 'Location identifier required',
              suggestion: 'Usage: select location <id|name>. Use "show locations" to see available locations.'
            }
          };
        }

        // Use findLocationByIdOrName helper to locate the location
        const identifier = args.join(' ');
        const location = this.findLocationByIdOrName(identifier, adventure);
        
        // Return error if location not found
        if (!location) {
          return {
            success: false,
            output: [],
            error: {
              code: 'LOCATION_NOT_FOUND',
              message: `Location not found: ${identifier}`,
              suggestion: 'Use "show locations" to see available locations.'
            }
          };
        }

        // Call adminSystem.setCurrentLocation to update admin context
        this.adminSystem.setCurrentLocation(location.id);

        // Format and display detailed location information
        const output = this.formatLocationDetails(location, adventure);

        return {
          success: true,
          output,
          error: undefined
        };
      }
    });


  }
}


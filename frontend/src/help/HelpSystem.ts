import { 
  IHelpSystem, 
  HelpPage, 
  Command, 
  GameMode 
} from '../types';

export class HelpSystem implements IHelpSystem {
  private commands: Map<string, Command> = new Map();
  private helpPages: Map<string, HelpPage> = new Map();

  constructor() {
    this.initializeHelpPages();
  }

  /**
   * Register a command with the help system
   */
  registerCommand(command: Command): void {
    this.commands.set(command.name, command);
    
    // Generate help page from command metadata only if one doesn't exist
    if (!this.helpPages.has(command.name)) {
      const helpPage = this.generateHelpPage(command);
      this.helpPages.set(command.name, helpPage);
    }
  }

  /**
   * Get a formatted list of all available commands for a mode
   */
  getCommandList(mode: GameMode): string {
    const availableCommands = Array.from(this.commands.values())
      .filter(cmd => cmd.mode === mode || cmd.mode === 'both')
      .sort((a, b) => a.name.localeCompare(b.name));

    if (availableCommands.length === 0) {
      return 'No commands available.';
    }

    const lines: string[] = [];
    lines.push('Available Commands:');
    lines.push('');

    // Calculate max command name length for alignment
    const maxNameLength = Math.max(
      ...availableCommands.map(cmd => cmd.name.length)
    );

    for (const cmd of availableCommands) {
      const padding = ' '.repeat(maxNameLength - cmd.name.length + 2);
      const aliases = cmd.aliases.length > 0 
        ? ` (${cmd.aliases.join(', ')})` 
        : '';
      lines.push(`  ${cmd.name}${padding}${cmd.description}${aliases}`);
    }

    lines.push('');
    lines.push('Type "help <command>" for detailed information about a specific command.');

    return lines.join('\n');
  }

  /**
   * Get detailed help page for a specific command
   */
  getCommandHelp(commandName: string, mode: GameMode): HelpPage | null {
    const command = this.commands.get(commandName);
    
    if (!command) {
      return null;
    }

    // Check if command is available in current mode
    if (command.mode !== 'both' && command.mode !== mode) {
      return null;
    }

    // Use the command's actual name to look up the help page (handles aliases)
    return this.helpPages.get(command.name) || null;
  }

  /**
   * Search for commands matching a query
   */
  searchCommands(query: string): Command[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.commands.values()).filter(cmd => {
      return cmd.name.toLowerCase().includes(lowerQuery) ||
             cmd.description.toLowerCase().includes(lowerQuery) ||
             cmd.aliases.some(alias => alias.toLowerCase().includes(lowerQuery));
    });
  }

  /**
   * Format a help page for display in man page style
   */
  formatHelpPage(helpPage: HelpPage): string[] {
    const lines: string[] = [];

    // NAME section
    lines.push(`NAME`);
    lines.push(`    ${helpPage.name}`);
    lines.push('');

    // SYNOPSIS section
    lines.push(`SYNOPSIS`);
    lines.push(`    ${helpPage.synopsis}`);
    lines.push('');

    // DESCRIPTION section
    lines.push(`DESCRIPTION`);
    const descLines = helpPage.description.split('\n');
    descLines.forEach(line => {
      lines.push(`    ${line}`);
    });
    lines.push('');

    // OPTIONS section (if any)
    if (helpPage.options.length > 0) {
      lines.push(`OPTIONS`);
      for (const option of helpPage.options) {
        lines.push(`    ${option.flag}`);
        lines.push(`        ${option.description}`);
        lines.push('');
      }
    }

    // EXAMPLES section
    if (helpPage.examples.length > 0) {
      lines.push(`EXAMPLES`);
      for (const example of helpPage.examples) {
        lines.push(`    ${example.command}`);
        lines.push(`        ${example.description}`);
        lines.push('');
      }
    }

    // SEE ALSO section
    if (helpPage.seeAlso.length > 0) {
      lines.push(`SEE ALSO`);
      lines.push(`    ${helpPage.seeAlso.join(', ')}`);
      lines.push('');
    }

    return lines;
  }

  /**
   * Generate a help page from command metadata
   */
  private generateHelpPage(command: Command): HelpPage {
    return {
      name: command.name,
      synopsis: command.syntax,
      description: command.description,
      options: [],
      examples: command.examples.map(ex => ({
        command: ex,
        description: ''
      })),
      seeAlso: []
    };
  }

  /**
   * Initialize comprehensive help pages for all commands
   */
  private initializeHelpPages(): void {
    // Player mode commands
    this.helpPages.set('move', {
      name: 'move',
      synopsis: 'move <direction>',
      description: `Move the player to an adjacent location in the specified direction.
The direction must be a valid exit from the current location.
Common directions include: north, south, east, west, up, down.`,
      options: [],
      examples: [
        { command: 'move north', description: 'Move to the location north of here' },
        { command: 'move east', description: 'Move to the location east of here' },
        { command: 'go south', description: 'Using the "go" alias to move south' }
      ],
      seeAlso: ['look']
    });

    this.helpPages.set('talk', {
      name: 'talk',
      synopsis: 'talk [character]',
      description: `Interact with a character in the current location.
If no character name is provided, lists all characters present.
Character names with spaces should be enclosed in quotes.`,
      options: [],
      examples: [
        { command: 'talk', description: 'List all characters in the current location' },
        { command: 'talk guard', description: 'Talk to the guard' },
        { command: 'talk "temple guard"', description: 'Talk to a character with spaces in name' }
      ],
      seeAlso: ['look']
    });

    this.helpPages.set('look', {
      name: 'look',
      synopsis: 'look',
      description: `Examine the current location in detail.
Displays the location name, description, available exits, characters present,
and any items in the location.`,
      options: [],
      examples: [
        { command: 'look', description: 'Examine your current surroundings' },
        { command: 'l', description: 'Using the short alias' }
      ],
      seeAlso: ['move', 'talk']
    });

    this.helpPages.set('help', {
      name: 'help',
      synopsis: 'help [command]',
      description: `Display help information about available commands.
Without arguments, shows a list of all available commands.
With a command name, shows detailed documentation for that command.`,
      options: [],
      examples: [
        { command: 'help', description: 'Show list of all commands' },
        { command: 'help move', description: 'Show detailed help for the move command' },
        { command: '?', description: 'Using the ? alias to show help' }
      ],
      seeAlso: []
    });

    this.helpPages.set('sudo', {
      name: 'sudo',
      synopsis: 'sudo',
      description: `Enter administration mode with elevated privileges.
Prompts for an administrator password. Once authenticated, you can create
and modify adventures. Use "exit" to return to player mode.`,
      options: [],
      examples: [
        { command: 'sudo', description: 'Enter administration mode' }
      ],
      seeAlso: ['exit']
    });

    this.helpPages.set('exit', {
      name: 'exit',
      synopsis: 'exit',
      description: `Exit the current mode or quit the game.
In player mode, exits the game entirely.
In admin mode, returns to player mode without exiting the game.`,
      options: [],
      examples: [
        { command: 'exit', description: 'Exit the game or return to player mode' },
        { command: 'quit', description: 'Using the quit alias' }
      ],
      seeAlso: ['sudo']
    });

    this.helpPages.set('clear', {
      name: 'clear',
      synopsis: 'clear',
      description: `Clear the terminal screen.
Removes all previous output and provides a clean screen.
Command history is preserved and can still be accessed.`,
      options: [],
      examples: [
        { command: 'clear', description: 'Clear the terminal screen' },
        { command: 'cls', description: 'Using the cls alias' }
      ],
      seeAlso: []
    });

    this.helpPages.set('map', {
      name: 'map',
      synopsis: 'map',
      description: `Display an ASCII-based visual map of all locations you have visited.
The map shows the spatial layout of explored areas and their directional
connections. Your current location is highlighted, and the map builds
progressively as you explore the adventure world.

Map Symbols:
  [@] - Your current location (highlighted)
  [*] - Visited location
  |   - North/South connection
  -   - East/West connection
  +   - Intersection point
  ↑   - Up exit available
  ↓   - Down exit available

The map automatically tracks your exploration and persists across game
sessions. Each adventure maintains its own separate map data.`,
      options: [],
      examples: [
        { command: 'map', description: 'Display the map of visited locations' },
        { command: 'm', description: 'Using the short alias' }
      ],
      seeAlso: ['move', 'look']
    });

    this.helpPages.set('chat', {
      name: 'chat',
      synopsis: 'chat [npc-name]',
      description: `Enter conversational mode with an AI-powered NPC in the current location.
This command allows you to have natural language conversations with NPCs
that are powered by a local language model. Unlike the "talk" command which
displays pre-scripted dialogue, the "chat" command enables dynamic,
context-aware interactions.

When you enter chat mode, all your input will be sent as messages to the
AI NPC until you exit the conversation. The NPC will respond based on its
personality and the context of your conversation.

Usage:
  - With NPC name: Starts a conversation with the specified AI NPC
  - Without NPC name: If exactly one AI NPC is present, starts conversation
    with that NPC. If multiple AI NPCs are present, lists available NPCs.

Exiting Chat Mode:
  Type "exit" or "quit" to end the conversation and return to normal
  command mode. Your conversation history will be cleared when you exit.

Note: This command only works with AI-powered NPCs. Use the "talk" command
for regular NPCs with scripted dialogue.`,
      options: [],
      examples: [
        { command: 'chat', description: 'Start conversation with the only AI NPC in the location' },
        { command: 'chat "Ancient Sage"', description: 'Start conversation with the Ancient Sage' },
        { command: 'chat sage', description: 'Start conversation using partial name match' },
        { command: 'talk-ai guard', description: 'Using the "talk-ai" alias' },
        { command: 'converse merchant', description: 'Using the "converse" alias' }
      ],
      seeAlso: ['talk', 'look', 'help']
    });

    // Admin mode commands
    this.helpPages.set('create adventure', {
      name: 'create adventure',
      synopsis: 'create adventure <name>',
      description: `Create a new adventure with the specified name.
This initializes a new adventure definition that you can populate with
locations, characters, and connections. The adventure is not saved until
you use the "save" command.

Aliases: create, create-adventure (deprecated)`,
      options: [],
      examples: [
        { command: 'create adventure "The Lost Temple"', description: 'Create an adventure with a multi-word name' },
        { command: 'create MyAdventure', description: 'Using the short alias' },
        { command: 'create-adventure MyAdventure', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['add location', 'save adventure']
    });

    this.helpPages.set('add location', {
      name: 'add location',
      synopsis: 'add location <name>',
      description: `Add a new location to the current adventure.
After creating a location, you will be prompted to provide a description.
Locations can be connected using the "connect" command.

Aliases: addloc, add-location (deprecated)`,
      options: [],
      examples: [
        { command: 'add location "Temple Entrance"', description: 'Add a location with a multi-word name' },
        { command: 'addloc Hall', description: 'Using the short alias' },
        { command: 'add-location Hall', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['create adventure', 'connect', 'add character']
    });

    this.helpPages.set('add character', {
      name: 'add character',
      synopsis: 'add character <name>',
      description: `Add a character to the current location.
After creating a character, you will be prompted to provide dialogue lines.
Characters can have multiple dialogue lines that cycle when talked to.

Aliases: addchar, add-character (deprecated)`,
      options: [],
      examples: [
        { command: 'add character "Temple Guard"', description: 'Add a character with a multi-word name' },
        { command: 'addchar Merchant', description: 'Using the short alias' },
        { command: 'add-character Merchant', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['add location', 'talk']
    });

    this.helpPages.set('connect', {
      name: 'connect',
      synopsis: 'connect <from> <to> <direction>',
      description: `Connect two locations with a directional exit.
Creates a one-way connection from the "from" location to the "to" location
in the specified direction. To create a two-way connection, use the command
twice with reversed from/to and opposite directions.`,
      options: [],
      examples: [
        { command: 'connect entrance hall north', description: 'Connect entrance to hall going north' },
        { command: 'connect hall entrance south', description: 'Create the reverse connection' }
      ],
      seeAlso: ['add location', 'move']
    });

    this.helpPages.set('save adventure', {
      name: 'save adventure',
      synopsis: 'save adventure',
      description: `Save the current adventure to the database.
Validates the adventure for completeness before saving. All locations
must be reachable from the starting location, and the adventure must
have at least one location defined.

Aliases: save, save-adventure (deprecated)`,
      options: [],
      examples: [
        { command: 'save adventure', description: 'Save the current adventure' },
        { command: 'save', description: 'Using the short alias' },
        { command: 'save-adventure', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['create adventure', 'list adventures']
    });

    this.helpPages.set('list adventures', {
      name: 'list adventures',
      synopsis: 'list adventures',
      description: `Display a list of all saved adventures.
Shows the adventure name, ID, and creation date for each adventure
stored in the database.

Aliases: list, ls, list-adventures (deprecated)`,
      options: [],
      examples: [
        { command: 'list adventures', description: 'Show all adventures' },
        { command: 'list', description: 'Using the short alias' },
        { command: 'list-adventures', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['create adventure', 'save adventure']
    });

    // Navigation & Inspection commands
    this.helpPages.set('show locations', {
      name: 'show locations',
      synopsis: 'show locations',
      description: `Display all locations in the selected adventure.
Shows a formatted list with each location's ID, name, description, and exits.
The starting location is marked with [START]. This command provides a
comprehensive overview of all places in the adventure.

Note: You must have an adventure selected using "select adventure" before
using this command.`,
      options: [],
      examples: [
        { command: 'show locations', description: 'Display all locations in the selected adventure' }
      ],
      seeAlso: ['select location', 'show characters', 'show items', 'map']
    });

    this.helpPages.set('show characters', {
      name: 'show characters',
      synopsis: 'show characters',
      description: `Display characters based on your current context.
This command is context-aware:
  - If you have selected a location: Shows only characters in that location
  - If you have only selected an adventure: Shows all characters in the adventure

Each character entry displays the ID, name, location name, dialogue preview,
and personality preview for AI-powered characters. AI characters are marked
with [AI].

Note: You must have an adventure selected using "select adventure" before
using this command. Use "select location" to filter results to a specific
location.`,
      options: [],
      examples: [
        { command: 'show characters', description: 'Display characters in current context' },
        { command: 'select location entrance', description: 'First select a location to filter results' },
        { command: 'show characters', description: 'Now shows only characters in the entrance' }
      ],
      seeAlso: ['select location', 'show locations', 'show items']
    });

    this.helpPages.set('show items', {
      name: 'show items',
      synopsis: 'show items',
      description: `Display items based on your current context.
This command is context-aware:
  - If you have selected a location: Shows only items in that location
  - If you have only selected an adventure: Shows all items in the adventure

Each item entry displays the ID, name, location name, and description.

Note: You must have an adventure selected using "select adventure" before
using this command. Use "select location" to filter results to a specific
location.`,
      options: [],
      examples: [
        { command: 'show items', description: 'Display items in current context' },
        { command: 'select location hall', description: 'First select a location to filter results' },
        { command: 'show items', description: 'Now shows only items in the hall' }
      ],
      seeAlso: ['select location', 'show locations', 'show characters']
    });

    this.helpPages.set('select location', {
      name: 'select location',
      synopsis: 'select location <id|name>',
      description: `Select a specific location to view details and set it as your current context.
You can identify the location by either its ID (number) or name (string).
Location name matching is case-insensitive.

Once a location is selected, the "show characters" and "show items" commands
will automatically filter their results to only that location. The selected
location is also highlighted in the "map" command output.

The command displays detailed information about the selected location including:
  - Location name, ID, and description
  - All exits with direction and destination names
  - Characters present with dialogue previews
  - Items present with descriptions

Note: You must have an adventure selected using "select adventure" before
using this command.`,
      options: [],
      examples: [
        { command: 'select location 1', description: 'Select location by ID' },
        { command: 'select location entrance', description: 'Select location by name' },
        { command: 'select location "Temple Entrance"', description: 'Select location with multi-word name' }
      ],
      seeAlso: ['show locations', 'show characters', 'show items', 'map']
    });

    this.helpPages.set('map', {
      name: 'map',
      synopsis: 'map',
      description: `Display a complete visual map of the selected adventure.
In admin mode, the map shows ALL locations and their connections, not just
visited locations. This provides a comprehensive overview of the entire
adventure structure.

The map displays:
  - All locations with their names and IDs
  - Directional connections between locations (north, south, east, west, up, down)
  - The currently selected location marked with [*]
  - Visual grouping of connected locations

This is useful for understanding the spatial layout of your adventure and
verifying that all locations are properly connected.

Note: In player mode, the map only shows visited locations. In admin mode,
you must have an adventure selected using "select adventure" before using
this command.`,
      options: [],
      examples: [
        { command: 'map', description: 'Display the complete adventure map' },
        { command: 'select location entrance', description: 'Select a location first' },
        { command: 'map', description: 'The selected location will be highlighted' }
      ],
      seeAlso: ['show locations', 'select location']
    });

    this.helpPages.set('edit location', {
      name: 'edit location',
      synopsis: 'edit location <id> [property] [value]',
      description: `Edit properties of an existing location in the selected adventure.
This command supports two modes of operation:

INTERACTIVE MODE (Recommended):
  When you provide only the location ID, the system enters an interactive
  form-based editing mode. You will be prompted field-by-field to update
  each property. This mode is ideal for editing multi-line content like
  descriptions and makes it easy to see current values.

COMMAND-LINE MODE:
  When you provide all arguments (ID, property, and value), the system
  performs a direct edit without prompting. This mode is faster for
  single-property updates but requires careful quoting for multi-word values.

Editable Properties:
  - name: The location's display name
  - description: A detailed description of the location (multi-line supported)

Multi-Line Input:
  In interactive mode, when editing the description field, you can enter
  multiple lines of text. Type END on its own line to finish entering
  multi-line content.

Cancellation:
  In interactive mode, you can cancel the edit session at any time by:
  - Typing "cancel" at any prompt
  - Pressing Ctrl+C

Keeping Values:
  In interactive mode, press Enter without typing anything to keep the
  current value of a field unchanged.

Note: You must have an adventure selected using "select adventure" before
using this command.

Aliases: edit-location (deprecated)`,
      options: [],
      examples: [
        { command: 'edit location 1', description: 'Enter interactive mode to edit location with ID 1' },
        { command: 'edit location entrance', description: 'Enter interactive mode using location name' },
        { command: 'edit location 1 name "Grand Entrance"', description: 'Directly change the name (command-line mode)' },
        { command: 'edit location 1 description "A vast hall"', description: 'Directly change the description (command-line mode)' },
        { command: 'edit-location 1', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['edit character', 'show locations', 'select location', 'add location']
    });

    this.helpPages.set('edit character', {
      name: 'edit character',
      synopsis: 'edit character <id> [property] [value]',
      description: `Edit properties of an existing character in the selected adventure.
This command supports two modes of operation:

INTERACTIVE MODE (Recommended):
  When you provide only the character ID, the system enters an interactive
  form-based editing mode. You will be prompted field-by-field to update
  each property. This mode is ideal for editing dialogue lines and makes
  it easy to manage multiple dialogue entries.

COMMAND-LINE MODE:
  When you provide all arguments (ID, property, and value), the system
  performs a direct edit without prompting. This mode is faster for
  single-property updates but is limited for complex edits like dialogue.

Editable Properties:
  - name: The character's display name
  - dialogue: The character's dialogue lines (interactive mode only)
  - personality: AI personality description (for AI-powered characters only)

Dialogue Editing (Interactive Mode):
  When editing dialogue, you will be presented with three options:
  - k (keep): Keep all existing dialogue lines unchanged
  - e (edit): Edit individual dialogue lines one by one
  - r (replace): Replace all dialogue with new lines

  When replacing dialogue, type each line and press Enter. Type END on
  its own line to finish entering dialogue.

Multi-Line Input:
  In interactive mode, when editing multi-line fields like personality,
  you can enter multiple lines of text. Type END on its own line to
  finish entering multi-line content.

Cancellation:
  In interactive mode, you can cancel the edit session at any time by:
  - Typing "cancel" at any prompt
  - Pressing Ctrl+C

Keeping Values:
  In interactive mode, press Enter without typing anything to keep the
  current value of a field unchanged.

Note: You must have an adventure selected using "select adventure" before
using this command.

Aliases: edit-character (deprecated)`,
      options: [],
      examples: [
        { command: 'edit character 1', description: 'Enter interactive mode to edit character with ID 1' },
        { command: 'edit character guard', description: 'Enter interactive mode using character name' },
        { command: 'edit character 1 name "Temple Guardian"', description: 'Directly change the name (command-line mode)' },
        { command: 'edit character 2 personality "Wise and mysterious"', description: 'Change AI personality (command-line mode)' },
        { command: 'edit-character 1', description: 'Using the deprecated hyphenated alias' }
      ],
      seeAlso: ['edit location', 'show characters', 'add character', 'chat']
    });
  }
}

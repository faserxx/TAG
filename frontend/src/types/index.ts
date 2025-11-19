// Type definitions for the frontend application

export enum OutputStyle {
  Normal = 'normal',
  Success = 'success',
  Error = 'error',
  Info = 'info',
  Dialogue = 'dialogue',
  Description = 'description',
  System = 'system'
}

export interface ITerminalInterface {
  initialize(container: HTMLElement): void;
  write(text: string, style?: OutputStyle): void;
  writeLine(text: string, style?: OutputStyle): void;
  clear(): void;
  setPrompt(prompt: string): void;
  onCommand(callback: (command: string) => void): void;
  promptForInput(prompt: string, defaultValue?: string): Promise<string>;
  promptForMultiLineInput(prompt: string, currentValue?: string[]): Promise<string[]>;
  promptForConfirmation(prompt: string): Promise<boolean>;
  displayFieldHeader(fieldName: string, fieldNumber: number, totalFields: number): void;
  displayCurrentValue(value: string | string[]): void;
}

export enum GameMode {
  Player = 'player',
  Admin = 'admin'
}

export interface ParsedCommand {
  command: string;
  args: string[];
  isValid: boolean;
  error?: string;
}

export interface CommandResult {
  success: boolean;
  output: string[];
  error?: ErrorInfo;
}

export interface ErrorInfo {
  code: string;
  message: string;
  suggestion?: string;
}

export interface GameContext {
  mode: GameMode;
  currentLocation?: string;
  isAuthenticated: boolean;
}

export type CommandHandler = (args: string[], context: GameContext) => CommandResult | Promise<CommandResult>;

export interface Command {
  name: string;
  aliases: string[];
  description: string;
  syntax: string;
  examples: string[];
  handler: CommandHandler;
  mode: GameMode | 'both';
}

export interface ICommandParser {
  parse(input: string): ParsedCommand;
  getAvailableCommands(mode: GameMode): Command[];
  suggestCommand(input: string): string[];
  registerCommand(command: Command): void;
  executeCommand(parsed: ParsedCommand, context: GameContext): Promise<CommandResult>;
}

export interface HelpPage {
  name: string;
  synopsis: string;
  description: string;
  options: HelpOption[];
  examples: HelpExample[];
  seeAlso: string[];
}

export interface HelpOption {
  flag: string;
  description: string;
}

export interface HelpExample {
  command: string;
  description: string;
}

export interface IHelpSystem {
  getCommandList(mode: GameMode): string;
  getCommandHelp(commandName: string, mode: GameMode): HelpPage | null;
  searchCommands(query: string): Command[];
  registerCommand(command: Command): void;
}

export interface LocationMapData {
  locationId: string;
  visitedFrom?: string;
  entryDirection?: string;
}

export interface AiCharacterConfig {
  temperature?: number;
  maxTokens?: number;
  systemPromptTemplate?: string;
}

export interface Character {
  id: string;
  name: string;
  dialogue: string[];
  currentDialogueIndex: number;
  isAiPowered?: boolean;
  personality?: string;
  aiConfig?: AiCharacterConfig;
}

export interface AutocompleteResult {
  suggestions: string[];
  completionText?: string;
}

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ITerminalInterface, OutputStyle } from '../types';

export class TerminalInterface implements ITerminalInterface {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private currentPrompt: string = '$ ';
  private currentInput: string = '';
  private commandCallback?: (command: string) => void;
  private cursorPosition: number = 0;
  private passwordMode: boolean = false;
  private passwordCallback?: (password: string) => void;
  private isLoading: boolean = false;
  private loadingInterval?: number;
  private onTabCallback?: (input: string, cursorPos: number) => { suggestions: string[]; completionText?: string };
  private onArrowCallback?: (direction: 'up' | 'down') => string | null;

  constructor() {
    // Initialize xterm.js with appropriate configuration
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      scrollback: 1000
    });

    // Initialize fit addon
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
  }

  initialize(container: HTMLElement): void {
    // Set up terminal rendering in HTML container
    this.terminal.open(container);
    
    // Fit terminal to container
    this.fitAddon.fit();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.fitAddon.fit();
    });
    
    // Implement input handling and command submission
    this.setupInputHandling();
    
    // Display initial prompt
    this.terminal.write(this.currentPrompt);
  }

  private setupInputHandling(): void {
    this.terminal.onData((data: string) => {
      const code = data.charCodeAt(0);

      // Handle Tab key (autocomplete)
      if (code === 9) {
        if (this.passwordMode || !this.onTabCallback) {
          return;
        }
        
        const result = this.onTabCallback(this.currentInput, this.cursorPosition);
        
        if (result.completionText !== undefined) {
          // Single match - replace input with completion
          this.replaceInput(result.completionText);
        } else if (result.suggestions.length > 0) {
          // Multiple matches - display suggestions
          this.terminal.write('\r\n');
          for (const suggestion of result.suggestions) {
            this.terminal.write(suggestion + '  ');
          }
          this.terminal.write('\r\n' + this.currentPrompt + this.currentInput);
        }
        return;
      }

      // Handle Arrow keys (escape sequences)
      // Arrow Up: \x1b[A
      // Arrow Down: \x1b[B
      if (data === '\x1b[A' || data === '\x1b[B') {
        if (this.passwordMode || !this.onArrowCallback) {
          return;
        }
        
        const direction = data === '\x1b[A' ? 'up' : 'down';
        const command = this.onArrowCallback(direction);
        
        if (command !== null) {
          this.replaceInput(command);
        } else if (direction === 'down' && command === null) {
          // At the end of history, clear input
          this.replaceInput('');
        }
        return;
      }

      // Handle Enter key (submit command)
      if (code === 13) {
        this.terminal.write('\r\n');
        const input = this.currentInput.trim();
        this.currentInput = '';
        this.cursorPosition = 0;
        
        // Handle password mode
        if (this.passwordMode && this.passwordCallback) {
          this.passwordMode = false;
          this.passwordCallback(input);
          this.passwordCallback = undefined;
          return;
        }
        
        // Handle normal command mode
        if (input && this.commandCallback) {
          this.commandCallback(input);
        }
        
        this.terminal.write(this.currentPrompt);
        return;
      }

      // Handle Backspace
      if (code === 127) {
        if (this.cursorPosition > 0) {
          this.currentInput = 
            this.currentInput.slice(0, this.cursorPosition - 1) + 
            this.currentInput.slice(this.cursorPosition);
          this.cursorPosition--;
          this.terminal.write('\b \b');
        }
        return;
      }

      // Handle Ctrl+C
      if (code === 3) {
        this.terminal.write('^C\r\n');
        this.currentInput = '';
        this.cursorPosition = 0;
        
        // Cancel password mode if active
        if (this.passwordMode) {
          this.passwordMode = false;
          this.passwordCallback = undefined;
        }
        
        this.terminal.write(this.currentPrompt);
        return;
      }

      // Handle Ctrl+L (clear screen)
      if (code === 12) {
        this.clear();
        return;
      }

      // Handle printable characters
      if (code >= 32 && code < 127) {
        this.currentInput = 
          this.currentInput.slice(0, this.cursorPosition) + 
          data + 
          this.currentInput.slice(this.cursorPosition);
        this.cursorPosition++;
        
        // In password mode, show asterisks instead of actual characters
        if (this.passwordMode) {
          this.terminal.write('*');
        } else {
          this.terminal.write(data);
        }
      }
    });
  }

  /**
   * Replace the current input with new text
   */
  private replaceInput(newInput: string): void {
    // Clear current input from terminal
    const clearLength = this.currentInput.length;
    for (let i = 0; i < clearLength; i++) {
      this.terminal.write('\b \b');
    }
    
    // Write new input
    this.currentInput = newInput;
    this.cursorPosition = newInput.length;
    this.terminal.write(newInput);
  }

  write(text: string, style?: OutputStyle): void {
    const styledText = this.applyStyle(text, style);
    this.terminal.write(styledText);
  }

  writeLine(text: string, style?: OutputStyle): void {
    this.write(text + '\r\n', style);
  }

  clear(): void {
    this.terminal.clear();
    this.terminal.write(this.currentPrompt);
  }

  setPrompt(prompt: string): void {
    this.currentPrompt = prompt;
  }

  onCommand(callback: (command: string) => void): void {
    this.commandCallback = callback;
  }

  /**
   * Register callback for Tab key autocomplete
   */
  onTab(callback: (input: string, cursorPos: number) => { suggestions: string[]; completionText?: string }): void {
    this.onTabCallback = callback;
  }

  /**
   * Register callback for Arrow key history navigation
   */
  onArrow(callback: (direction: 'up' | 'down') => string | null): void {
    this.onArrowCallback = callback;
  }

  /**
   * Prompt for password input (masked with asterisks)
   */
  promptPassword(callback: (password: string) => void): void {
    this.passwordMode = true;
    this.passwordCallback = callback;
    this.write('[sudo] password: ', OutputStyle.System);
  }

  /**
   * Prompt for confirmation (y/n)
   */
  promptConfirmation(message: string, callback: (confirmed: boolean) => void): void {
    this.write(`${message} (y/n): `, OutputStyle.System);
    
    // Set up one-time handler for confirmation
    const originalCallback = this.commandCallback;
    this.commandCallback = (input: string) => {
      const response = input.toLowerCase().trim();
      const confirmed = response === 'y' || response === 'yes';
      
      // Restore original callback
      this.commandCallback = originalCallback;
      
      // Call the confirmation callback
      callback(confirmed);
    };
  }

  /**
   * Update the prompt to reflect current mode
   */
  updatePrompt(prompt: string): void {
    this.currentPrompt = prompt;
  }

  /**
   * Show loading indicator
   */
  showLoading(message: string = 'Loading'): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    let dots = 0;
    
    this.write(`${message}`, OutputStyle.System);
    
    this.loadingInterval = window.setInterval(() => {
      dots = (dots + 1) % 4;
      const dotsStr = '.'.repeat(dots);
      const spaces = ' '.repeat(3 - dots);
      this.terminal.write(`\r${message}${dotsStr}${spaces}`);
    }, 500);
  }

  /**
   * Hide loading indicator
   */
  hideLoading(): void {
    if (!this.isLoading) return;
    
    this.isLoading = false;
    
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = undefined;
    }
    
    // Clear the loading line
    this.terminal.write('\r' + ' '.repeat(50) + '\r');
  }

  private applyStyle(text: string, style?: OutputStyle): string {
    if (!style || style === OutputStyle.Normal) {
      return text;
    }

    // ANSI color codes for terminal styling
    const styles: Record<OutputStyle, string> = {
      [OutputStyle.Normal]: '',
      [OutputStyle.Success]: '\x1b[32m',      // Green
      [OutputStyle.Error]: '\x1b[31m',        // Red
      [OutputStyle.Info]: '\x1b[36m',         // Cyan
      [OutputStyle.Dialogue]: '\x1b[33m',     // Yellow
      [OutputStyle.Description]: '\x1b[37m',  // White
      [OutputStyle.System]: '\x1b[90m'        // Bright Black (Gray)
    };

    const reset = '\x1b[0m';
    const styleCode = styles[style] || '';
    
    return `${styleCode}${text}${reset}`;
  }
}

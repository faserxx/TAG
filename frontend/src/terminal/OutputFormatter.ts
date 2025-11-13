import { OutputStyle } from '../types';

export interface IOutputFormatter {
  formatDescription(text: string): FormattedOutput;
  formatDialogue(characterName: string, text: string): FormattedOutput;
  formatError(message: string, suggestion?: string): FormattedOutput;
  formatSuccess(message: string): FormattedOutput;
  formatInfo(message: string): FormattedOutput;
  formatSystem(message: string): FormattedOutput;
  formatList(items: string[], style?: OutputStyle): FormattedOutput;
  formatHelp(title: string, content: string): FormattedOutput;
}

export interface FormattedOutput {
  text: string;
  style: OutputStyle;
}

export class OutputFormatter implements IOutputFormatter {
  
  formatDescription(text: string): FormattedOutput {
    return {
      text: this.wrapText(text, 78),
      style: OutputStyle.Description
    };
  }

  formatDialogue(characterName: string, text: string): FormattedOutput {
    const formatted = `${this.bold(characterName)}: "${text}"`;
    return {
      text: formatted,
      style: OutputStyle.Dialogue
    };
  }

  formatError(message: string, suggestion?: string): FormattedOutput {
    let text = `${this.bold('Error:')} ${message}`;
    if (suggestion) {
      text += `\n${this.italic('Suggestion:')} ${suggestion}`;
    }
    return {
      text,
      style: OutputStyle.Error
    };
  }

  formatSuccess(message: string): FormattedOutput {
    return {
      text: `✓ ${message}`,
      style: OutputStyle.Success
    };
  }

  formatInfo(message: string): FormattedOutput {
    return {
      text: `ℹ ${message}`,
      style: OutputStyle.Info
    };
  }

  formatSystem(message: string): FormattedOutput {
    return {
      text: `[System] ${message}`,
      style: OutputStyle.System
    };
  }

  formatList(items: string[], style: OutputStyle = OutputStyle.Normal): FormattedOutput {
    const formatted = items.map(item => `  • ${item}`).join('\n');
    return {
      text: formatted,
      style
    };
  }

  formatHelp(title: string, content: string): FormattedOutput {
    const formatted = `${this.bold(title.toUpperCase())}\n\n${this.wrapText(content, 78)}`;
    return {
      text: formatted,
      style: OutputStyle.Info
    };
  }

  // Text formatting utilities
  private bold(text: string): string {
    // Use ANSI bold codes
    return `\x1b[1m${text}\x1b[22m`;
  }

  private italic(text: string): string {
    // Use ANSI italic codes
    return `\x1b[3m${text}\x1b[23m`;
  }

  private wrapText(text: string, maxWidth: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      // Check if adding this word would exceed the max width
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (this.getVisibleLength(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  private getVisibleLength(text: string): number {
    // Remove ANSI escape codes to get actual visible length
    return text.replace(/\x1b\[[0-9;]*m/g, '').length;
  }

  // Additional formatting methods for specific use cases
  formatLocationName(name: string): FormattedOutput {
    return {
      text: `\n${this.bold('=== ' + name + ' ===')}`,
      style: OutputStyle.Info
    };
  }

  formatExits(exits: string[]): FormattedOutput {
    if (exits.length === 0) {
      return {
        text: 'No visible exits.',
        style: OutputStyle.System
      };
    }

    const exitText = `${this.bold('Exits:')} ${exits.join(', ')}`;
    return {
      text: exitText,
      style: OutputStyle.Info
    };
  }

  formatCharacters(characters: string[]): FormattedOutput {
    if (characters.length === 0) {
      return {
        text: '',
        style: OutputStyle.Normal
      };
    }

    const charText = `${this.bold('Characters:')} ${characters.join(', ')}`;
    return {
      text: charText,
      style: OutputStyle.Info
    };
  }

  formatCommandPrompt(mode: string): string {
    if (mode === 'admin') {
      return '\x1b[31m# \x1b[0m'; // Red # for admin
    }
    return '\x1b[32m$ \x1b[0m'; // Green $ for player
  }
}

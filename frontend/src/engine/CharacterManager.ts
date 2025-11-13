import { Character } from './Location';

export class CharacterManager {
  /**
   * Get the next dialogue line from a character
   * Cycles through dialogue lines, wrapping back to the start
   */
  static getNextDialogue(character: Character): string {
    if (!character.dialogue || character.dialogue.length === 0) {
      return `${character.name} has nothing to say.`;
    }

    const dialogue = character.dialogue[character.currentDialogueIndex];
    
    // Advance to next dialogue line (with wrapping)
    character.currentDialogueIndex = 
      (character.currentDialogueIndex + 1) % character.dialogue.length;

    return dialogue;
  }

  /**
   * Reset character dialogue to the beginning
   */
  static resetDialogue(character: Character): void {
    character.currentDialogueIndex = 0;
  }

  /**
   * Check if character has more unique dialogue
   */
  static hasMoreDialogue(character: Character): boolean {
    return character.currentDialogueIndex < character.dialogue.length - 1;
  }

  /**
   * Get all dialogue from a character (for admin/debug purposes)
   */
  static getAllDialogue(character: Character): string[] {
    return [...character.dialogue];
  }

  /**
   * Add dialogue line to character
   */
  static addDialogue(character: Character, dialogue: string): void {
    character.dialogue.push(dialogue);
  }

  /**
   * Format character dialogue for display
   */
  static formatDialogue(character: Character, dialogue: string): string[] {
    return [
      `\n${character.name} says:`,
      `"${dialogue}"`
    ];
  }

  /**
   * Create a new character
   */
  static createCharacter(
    id: string,
    name: string,
    dialogue: string[] = []
  ): Character {
    return {
      id,
      name,
      dialogue,
      currentDialogueIndex: 0
    };
  }

  /**
   * Clone a character (useful for instancing)
   */
  static cloneCharacter(character: Character): Character {
    return {
      id: character.id,
      name: character.name,
      dialogue: [...character.dialogue],
      currentDialogueIndex: character.currentDialogueIndex
    };
  }
}

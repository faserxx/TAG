import { describe, it, expect, beforeEach } from 'vitest';
import { HelpSystem } from './HelpSystem';
import { GameMode } from '../types';

describe('HelpSystem', () => {
  let helpSystem: HelpSystem;

  beforeEach(() => {
    helpSystem = new HelpSystem();
    
    // Register the chat command to simulate CommandParser behavior
    helpSystem.registerCommand({
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
      handler: async () => ({ success: true, output: [], error: undefined })
    });
  });

  describe('chat command help', () => {
    it('should have a help page for the chat command', () => {
      const helpPage = helpSystem.getCommandHelp('chat', GameMode.Player);
      
      expect(helpPage).toBeDefined();
      expect(helpPage?.name).toBe('chat');
      expect(helpPage?.synopsis).toBe('chat [npc-name]');
      expect(helpPage?.description).toContain('conversational mode');
      expect(helpPage?.description).toContain('AI-powered NPC');
    });

    it('should include exit/quit instructions in chat help', () => {
      const helpPage = helpSystem.getCommandHelp('chat', GameMode.Player);
      
      expect(helpPage?.description).toContain('exit');
      expect(helpPage?.description).toContain('quit');
    });

    it('should include examples in chat help', () => {
      const helpPage = helpSystem.getCommandHelp('chat', GameMode.Player);
      
      expect(helpPage?.examples.length).toBeGreaterThan(0);
      expect(helpPage?.examples.some(ex => ex.command.includes('chat'))).toBe(true);
    });

    it('should include see also references', () => {
      const helpPage = helpSystem.getCommandHelp('chat', GameMode.Player);
      
      expect(helpPage?.seeAlso).toContain('talk');
      expect(helpPage?.seeAlso).toContain('look');
      expect(helpPage?.seeAlso).toContain('help');
    });

    it('should appear in player mode command list', () => {
      const commandList = helpSystem.getCommandList(GameMode.Player);
      
      expect(commandList).toContain('chat');
      expect(commandList).toContain('Start a conversation with an AI-powered NPC');
    });
  });
});

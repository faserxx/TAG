import { describe, it, expect, beforeEach } from 'vitest';
import { ChatManager } from './ChatManager';

describe('ChatManager', () => {
  let chatManager: ChatManager;

  beforeEach(() => {
    chatManager = new ChatManager();
  });

  describe('session lifecycle', () => {
    it('should start with no active session', () => {
      expect(chatManager.isInChatMode()).toBe(false);
      expect(chatManager.getSession()).toBeNull();
    });

    it('should start a new chat session', () => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');

      expect(chatManager.isInChatMode()).toBe(true);
      
      const session = chatManager.getSession();
      expect(session).not.toBeNull();
      expect(session?.npcId).toBe('npc-1');
      expect(session?.npcName).toBe('Ancient Sage');
      expect(session?.locationId).toBe('temple-sanctum');
      expect(session?.conversationHistory).toEqual([]);
    });

    it('should end an active session', () => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');
      chatManager.endSession();

      expect(chatManager.isInChatMode()).toBe(false);
      expect(chatManager.getSession()).toBeNull();
    });

    it('should replace existing session when starting a new one', () => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');
      chatManager.addMessage('user', 'Hello');
      
      chatManager.startSession('npc-2', 'Merchant', 'marketplace');

      const session = chatManager.getSession();
      expect(session?.npcId).toBe('npc-2');
      expect(session?.npcName).toBe('Merchant');
      expect(session?.conversationHistory).toEqual([]);
    });
  });

  describe('conversation history management', () => {
    beforeEach(() => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');
    });

    it('should add user messages to conversation history', () => {
      chatManager.addMessage('user', 'Hello, wise one');

      const history = chatManager.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello, wise one');
    });

    it('should add assistant messages to conversation history', () => {
      chatManager.addMessage('assistant', 'Greetings, traveler');

      const history = chatManager.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('assistant');
      expect(history[0].content).toBe('Greetings, traveler');
    });

    it('should maintain message order in conversation history', () => {
      chatManager.addMessage('user', 'First message');
      chatManager.addMessage('assistant', 'First response');
      chatManager.addMessage('user', 'Second message');
      chatManager.addMessage('assistant', 'Second response');

      const history = chatManager.getConversationHistory();
      expect(history).toHaveLength(4);
      expect(history[0].content).toBe('First message');
      expect(history[1].content).toBe('First response');
      expect(history[2].content).toBe('Second message');
      expect(history[3].content).toBe('Second response');
    });

    it('should throw error when adding message without active session', () => {
      chatManager.endSession();

      expect(() => {
        chatManager.addMessage('user', 'Hello');
      }).toThrow('Cannot add message: No active chat session');
    });

    it('should throw error when getting history without active session', () => {
      chatManager.endSession();

      expect(() => {
        chatManager.getConversationHistory();
      }).toThrow('Cannot get conversation history: No active chat session');
    });

    it('should clear conversation history when ending session', () => {
      chatManager.addMessage('user', 'Hello');
      chatManager.addMessage('assistant', 'Hi there');
      
      chatManager.endSession();
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');

      const history = chatManager.getConversationHistory();
      expect(history).toEqual([]);
    });
  });

  describe('state validation', () => {
    it('should return false for isInChatMode when no session exists', () => {
      expect(chatManager.isInChatMode()).toBe(false);
    });

    it('should return true for isInChatMode when session is active', () => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');
      expect(chatManager.isInChatMode()).toBe(true);
    });

    it('should return false for isInChatMode after ending session', () => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');
      chatManager.endSession();
      expect(chatManager.isInChatMode()).toBe(false);
    });
  });

  describe('history formatting for API', () => {
    beforeEach(() => {
      chatManager.startSession('npc-1', 'Ancient Sage', 'temple-sanctum');
    });

    it('should return a copy of conversation history', () => {
      chatManager.addMessage('user', 'Test message');
      
      const history1 = chatManager.getConversationHistory();
      const history2 = chatManager.getConversationHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // Different array instances
    });

    it('should format empty history correctly', () => {
      const history = chatManager.getConversationHistory();
      expect(history).toEqual([]);
    });

    it('should format multi-turn conversation correctly', () => {
      chatManager.addMessage('user', 'What is this place?');
      chatManager.addMessage('assistant', 'This is the ancient temple.');
      chatManager.addMessage('user', 'Tell me more.');
      chatManager.addMessage('assistant', 'It was built centuries ago.');

      const history = chatManager.getConversationHistory();
      
      expect(history).toHaveLength(4);
      expect(history[0]).toEqual({ role: 'user', content: 'What is this place?' });
      expect(history[1]).toEqual({ role: 'assistant', content: 'This is the ancient temple.' });
      expect(history[2]).toEqual({ role: 'user', content: 'Tell me more.' });
      expect(history[3]).toEqual({ role: 'assistant', content: 'It was built centuries ago.' });
    });
  });
});

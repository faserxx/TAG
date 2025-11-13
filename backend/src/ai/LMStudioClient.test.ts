import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LMStudioClient } from './LMStudioClient.js';
import { LMStudioConfig } from '../config/lmstudio.js';
import { Character } from '../types/index.js';

// Mock the @lmstudio/sdk module
vi.mock('@lmstudio/sdk', () => {
  const mockLLM = {
    get: vi.fn().mockResolvedValue({
      respond: vi.fn().mockResolvedValue({ content: 'Mocked response' })
    }),
    listLoaded: vi.fn().mockResolvedValue([{ identifier: 'test-model' }])
  };

  return {
    LMStudioClient: class MockLMStudioClient {
      llm = mockLLM;
      constructor() {}
    }
  };
});

describe('LMStudioClient', () => {
  let client: LMStudioClient;
  let config: LMStudioConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'http://localhost:1234',
      model: 'default',
      timeout: 30000,
      temperature: 0.8,
      maxTokens: 150
    };
    client = new LMStudioClient(config);
  });

  describe('connect', () => {
    it('should connect to LMStudio successfully', async () => {
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build system prompt with NPC personality', () => {
      const npc: Character = {
        id: 'sage',
        name: 'Ancient Sage',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'a wise and mystical sage who speaks in riddles'
      };

      const prompt = client.buildSystemPrompt(npc);

      expect(prompt).toContain('Ancient Sage');
      expect(prompt).toContain('a wise and mystical sage who speaks in riddles');
      expect(prompt).toContain('Respond in character');
    });

    it('should include location context when provided', () => {
      const npc: Character = {
        id: 'guard',
        name: 'Guard',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'a stern guard'
      };

      const prompt = client.buildSystemPrompt(npc, 'the temple entrance');

      expect(prompt).toContain('Guard');
      expect(prompt).toContain('a stern guard');
      expect(prompt).toContain('the temple entrance');
    });

    it('should use default personality when not provided', () => {
      const npc: Character = {
        id: 'npc',
        name: 'Generic NPC',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true
      };

      const prompt = client.buildSystemPrompt(npc);

      expect(prompt).toContain('Generic NPC');
      expect(prompt).toContain('a helpful character');
    });
  });

  describe('generateResponse', () => {
    it('should throw error when not connected', async () => {
      const npc: Character = {
        id: 'sage',
        name: 'Sage',
        dialogue: [],
        currentDialogueIndex: 0,
        isAiPowered: true,
        personality: 'wise'
      };

      await expect(
        client.generateResponse({
          npc,
          message: 'Hello',
          conversationHistory: []
        })
      ).rejects.toThrow('LMStudio client not connected');
    });
  });
});

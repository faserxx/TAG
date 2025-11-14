import { LMStudioConfig } from '../config/lmstudio.js';
import { Character } from '../types/index.js';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateResponseOptions {
  npc: Character;
  message: string;
  conversationHistory: ConversationMessage[];
  locationContext?: string;
}

export class LMStudioClient {
  private config: LMStudioConfig;
  private connected: boolean = false;

  constructor(config: LMStudioConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Ensure baseUrl has http:// protocol for REST API
      let baseUrl = this.config.baseUrl;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      
      // Test connection by checking if models endpoint is accessible
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to LMStudio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateResponse(options: GenerateResponseOptions): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    const { npc, message, conversationHistory, locationContext } = options;

    // Build system prompt with NPC personality and context
    const systemPrompt = this.buildSystemPrompt(npc, locationContext);

    // Prepare messages for the OpenAI-compatible API
    const messages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    try {
      // Ensure baseUrl has http:// protocol
      let baseUrl = this.config.baseUrl;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }

      // Call LMStudio's OpenAI-compatible chat completions endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model === 'default' ? undefined : this.config.model,
          messages,
          temperature: npc.aiConfig?.temperature ?? this.config.temperature,
          max_tokens: npc.aiConfig?.maxTokens ?? this.config.maxTokens,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LMStudio API error (${response.status}): ${errorText}`);
      }
      
      
      const data = await response.json() as any; 
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated');
      }

      const rawContent = data.choices[0].message.content;
      
      // Clean up the response for terminal display
      return this.sanitizeResponse(rawContent);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('LMStudio request timed out');
        }
        throw new Error(`Failed to generate response: ${error.message}`);
      }
      throw new Error('Failed to generate response: Unknown error');
    }
  }

  buildSystemPrompt(npc: Character, locationContext?: string): string {
    const personality = npc.personality || 'a helpful character';
    
    let prompt = `You are ${npc.name}, ${personality}.`;
    
    if (locationContext) {
      prompt += ` You are currently in ${locationContext}.`;
    }
    
    prompt += ' Respond in character, keeping your responses concise and engaging. Stay true to your personality and the game world.';
    prompt += ' Do not use markdown formatting, bullet points, or special characters. Speak naturally in plain text.';
    prompt += ' This is a CHAT interaction, answers must be short and colloquial. One short sentence, maximum two short sentences.';
    
    return prompt;
  }

  /**
   * Sanitize AI response for terminal display
   * Removes markdown formatting and cleans up the text
   */
  private sanitizeResponse(text: string): string {
    return text
      // Remove markdown headers (###, ##, #)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove markdown bold (**text** or __text__)
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // Remove markdown italic (*text* or _text_)
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove markdown code blocks (```text```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code (`text`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove bullet points and list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      // Remove numbered lists
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove tabs
      .replace(/\t/g, ' ')
      // Replace multiple spaces with single space
      .replace(/  +/g, ' ')
      // Replace all newlines with spaces (flatten to single line)
      .replace(/\n/g, ' ')
      // Remove carriage returns
      .replace(/\r/g, '')
      // Remove other control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Clean up multiple spaces again after newline removal
      .replace(/  +/g, ' ')
      // Trim whitespace
      .trim();
  }

  async healthCheck(): Promise<boolean> {
    try {
      let baseUrl = this.config.baseUrl;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

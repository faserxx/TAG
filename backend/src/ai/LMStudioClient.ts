import { LMStudioConfig } from '../config/lmstudio.js';
import { Character } from '../types/index.js';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LocationContext {
  name: string;
  description: string;
  characters: string[];
  items: string[];
  exits: string[];
}

export interface GenerateResponseOptions {
  npc: Character;
  message: string;
  conversationHistory: ConversationMessage[];
  locationContext?: LocationContext | string;
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

  buildSystemPrompt(npc: Character, locationContext?: LocationContext | string): string {
    const personality = npc.personality || 'a helpful character';
    
    let prompt = `You are ${npc.name}, ${personality}.`;
    
    if (locationContext) {
      if (typeof locationContext === 'string') {
        // Legacy string format
        prompt += ` You are currently in ${locationContext}.`;
      } else {
        // Rich context format
        prompt += `\n\nYou are currently in ${locationContext.name}.`;
        
        if (locationContext.description) {
          prompt += ` ${locationContext.description}`;
        }
        
        if (locationContext.characters && locationContext.characters.length > 0) {
          prompt += ` Other characters here: ${locationContext.characters.join(', ')}.`;
        }
        
        if (locationContext.items && locationContext.items.length > 0) {
          prompt += ` Items you can see: ${locationContext.items.join(', ')}.`;
        }
        
        if (locationContext.exits && locationContext.exits.length > 0) {
          prompt += ` Exits lead: ${locationContext.exits.join(', ')}.`;
        }
      }
    }
    
    prompt += '\n\nRespond in character, keeping your responses concise and engaging. Stay true to your personality and the game world.';
    prompt += ' Do not use markdown formatting, bullet points, or special characters. Speak naturally in plain text.';
    prompt += ' This is a CHAT interaction, answers must be short and colloquial. One short sentence, maximum two short sentences.';
    
    return prompt;
  }

  /**
   * Sanitize AI response for terminal display
   * Removes markdown formatting and cleans up the text
   */
  private sanitizeResponse(text: string): string {
    let cleaned = text
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
    
    // Remove incomplete sentences (sentences not ending with proper punctuation)
    // Find the last occurrence of sentence-ending punctuation
    const sentenceEnders = /[.!?…]["']?$/;
    const lastPunctuationMatch = cleaned.match(/[.!?…]["']?(?=[^.!?…]*$)/);
    
    if (lastPunctuationMatch && !sentenceEnders.test(cleaned)) {
      // There's punctuation in the middle but not at the end - truncate after last complete sentence
      const lastPunctuationIndex = cleaned.lastIndexOf(lastPunctuationMatch[0]);
      cleaned = cleaned.substring(0, lastPunctuationIndex + lastPunctuationMatch[0].length).trim();
    } else if (!sentenceEnders.test(cleaned)) {
      // No sentence-ending punctuation at all - add a period if there's content
      if (cleaned.length > 0) {
        cleaned += '.';
      }
    }
    
    return cleaned;
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

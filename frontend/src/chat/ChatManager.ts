/**
 * ChatManager - Manages chat sessions with AI-powered NPCs
 * 
 * Handles conversation state, message history, and session lifecycle
 * for player interactions with AI NPCs.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  npcId: string;
  npcName: string;
  locationId: string;
  conversationHistory: ChatMessage[];
}

export class ChatManager {
  private currentSession: ChatSession | null = null;

  /**
   * Start a new chat session with an AI NPC
   * @param npcId - The unique identifier of the NPC
   * @param npcName - The display name of the NPC
   * @param locationId - The current location ID
   */
  startSession(npcId: string, npcName: string, locationId: string): void {
    this.currentSession = {
      npcId,
      npcName,
      locationId,
      conversationHistory: []
    };
  }

  /**
   * End the current chat session and clear conversation history
   */
  endSession(): void {
    this.currentSession = null;
  }

  /**
   * Add a message to the current conversation history
   * @param role - The role of the message sender ('user' or 'assistant')
   * @param content - The message content
   * @throws Error if no active session exists
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    if (!this.currentSession) {
      throw new Error('Cannot add message: No active chat session');
    }

    this.currentSession.conversationHistory.push({
      role,
      content
    });
  }

  /**
   * Get the current chat session
   * @returns The current session or null if no session is active
   */
  getSession(): ChatSession | null {
    return this.currentSession;
  }

  /**
   * Check if currently in chat mode
   * @returns true if a chat session is active, false otherwise
   */
  isInChatMode(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Get the conversation history formatted for API requests
   * @returns Array of chat messages
   * @throws Error if no active session exists
   */
  getConversationHistory(): ChatMessage[] {
    if (!this.currentSession) {
      throw new Error('Cannot get conversation history: No active chat session');
    }

    return [...this.currentSession.conversationHistory];
  }
}

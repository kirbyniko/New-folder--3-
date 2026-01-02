/**
 * Conversation Memory for Multi-Turn Agent Interactions
 * Allows agent to remember previous exchanges within a session
 */

import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

export interface ConversationSession {
  id: string;
  context: string;
  messages: BaseMessage[];
  createdAt: Date;
  lastActivity: Date;
}

class AgentMemoryManager {
  private sessions: Map<string, ConversationSession>;
  private maxMessagesPerSession: number;

  constructor(maxMessages = 20) {
    this.sessions = new Map();
    this.maxMessagesPerSession = maxMessages;
  }

  // Create new conversation session
  createSession(context: string = 'general'): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    this.sessions.set(sessionId, {
      id: sessionId,
      context,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });

    return sessionId;
  }

  // Add message to session
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const message = role === 'user' 
      ? new HumanMessage(content)
      : new AIMessage(content);

    session.messages.push(message);
    session.lastActivity = new Date();

    // Trim old messages if exceeding limit
    if (session.messages.length > this.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.maxMessagesPerSession);
    }
  }

  // Get conversation history
  getHistory(sessionId: string): BaseMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  // Get session info
  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Clear session
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // List all active sessions
  listSessions(): ConversationSession[] {
    return Array.from(this.sessions.values());
  }

  // Clean up old sessions (older than 1 hour)
  cleanupOldSessions(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }

  // Get conversation summary
  getSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return 'Session not found';

    const duration = Date.now() - session.createdAt.getTime();
    const minutes = Math.floor(duration / 60000);
    
    return `Session: ${sessionId}
Context: ${session.context}
Messages: ${session.messages.length}
Duration: ${minutes} min
Last Activity: ${session.lastActivity.toLocaleTimeString()}`;
  }
}

// Singleton instance
export const agentMemory = new AgentMemoryManager();

// Auto-cleanup every 30 minutes
setInterval(() => {
  agentMemory.cleanupOldSessions();
}, 1800000);

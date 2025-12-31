export class ConversationMemory {
  private storageKey = 'agentConversations';
  private conversations: Conversation[] = [];
  private currentConversation: Conversation | null = null;
  private maxConversations = 50;

  constructor() {
    this.conversations = this.loadConversations();
  }

  private loadConversations(): Conversation[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  private saveConversations(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (this.conversations.length > this.maxConversations) {
      this.conversations = this.conversations.slice(-this.maxConversations);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.conversations));
  }

  startConversation(scraperConfig: any): number {
    this.currentConversation = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      config: scraperConfig,
      messages: [],
      outcome: null
    };
    return this.currentConversation.id;
  }

  addMessage(role: string, content: string, metadata: any = {}): void {
    if (!this.currentConversation) {
      console.warn('No active conversation');
      return;
    }

    this.currentConversation.messages.push({
      role,
      content,
      metadata,
      timestamp: new Date().toISOString()
    });

    this.saveConversations();
  }

  endConversation(outcome: string, finalResult: any = null): number | null {
    if (!this.currentConversation) return null;

    this.currentConversation.outcome = outcome;
    this.currentConversation.endTime = new Date().toISOString();
    this.currentConversation.finalResult = finalResult;
    
    this.currentConversation.stats = {
      duration: Date.now() - this.currentConversation.id,
      messageCount: this.currentConversation.messages.length,
      userInteractions: this.currentConversation.messages.filter(m => m.role === 'user').length,
      toolCalls: this.currentConversation.messages.filter(m => m.role === 'tool').length
    };

    this.conversations.push(this.currentConversation);
    this.saveConversations();
    
    const conversationId = this.currentConversation.id;
    this.currentConversation = null;
    
    return conversationId;
  }

  getConversation(id: number): Conversation | undefined {
    return this.conversations.find(c => c.id === id);
  }

  findSimilarConversations(currentConfig: any, limit = 5): Conversation[] {
    const domain = this.extractDomain(currentConfig.url);
    const template = currentConfig.templateName;

    return this.conversations
      .filter(c => 
        this.extractDomain(c.config.url) === domain || 
        c.config.templateName === template
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  getStats() {
    const total = this.conversations.length;
    const successful = this.conversations.filter(c => c.outcome === 'success').length;
    const failed = this.conversations.filter(c => c.outcome === 'failure').length;
    const abandoned = this.conversations.filter(c => c.outcome === 'abandoned').length;

    return {
      total,
      successful,
      failed,
      abandoned,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : '0',
      avgDuration: this.average(this.conversations.map(c => c.stats?.duration || 0))
    };
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((sum, val) => sum + val, 0) / arr.length);
  }

  clearAll(): void {
    this.conversations = [];
    this.currentConversation = null;
    this.saveConversations();
  }
}

interface Conversation {
  id: number;
  timestamp: string;
  config: any;
  messages: Message[];
  outcome: string | null;
  endTime?: string;
  finalResult?: any;
  stats?: ConversationStats;
}

interface Message {
  role: string;
  content: string;
  metadata: any;
  timestamp: string;
}

interface ConversationStats {
  duration: number;
  messageCount: number;
  userInteractions: number;
  toolCalls: number;
}

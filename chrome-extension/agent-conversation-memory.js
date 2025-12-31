// Persistent Conversation Memory - Retains chat history across sessions
class ConversationMemory {
  constructor() {
    this.storageKey = 'agentConversations';
    this.conversations = this.loadConversations();
    this.currentConversation = null;
    this.maxConversations = 50; // Keep last 50 conversations
  }

  loadConversations() {
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

  saveConversations() {
    // Prune old conversations
    if (this.conversations.length > this.maxConversations) {
      this.conversations = this.conversations.slice(-this.maxConversations);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.conversations));
  }

  // Start new conversation
  startConversation(scraperConfig) {
    this.currentConversation = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      config: scraperConfig,
      messages: [],
      outcome: null // 'success' | 'failure' | 'abandoned'
    };
    return this.currentConversation.id;
  }

  // Add message to current conversation
  addMessage(role, content, metadata = {}) {
    if (!this.currentConversation) {
      console.warn('No active conversation');
      return;
    }

    this.currentConversation.messages.push({
      role, // 'system', 'agent', 'user', 'tool'
      content,
      metadata,
      timestamp: new Date().toISOString()
    });

    this.saveConversations();
  }

  // End current conversation
  endConversation(outcome, finalResult = null) {
    if (!this.currentConversation) return;

    this.currentConversation.outcome = outcome;
    this.currentConversation.endTime = new Date().toISOString();
    this.currentConversation.finalResult = finalResult;
    
    // Calculate conversation stats
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

  // Get conversation by ID
  getConversation(id) {
    return this.conversations.find(c => c.id === id);
  }

  // Find similar past conversations
  findSimilarConversations(currentConfig, limit = 5) {
    const domain = this.extractDomain(currentConfig.url);
    const template = currentConfig.templateName;

    return this.conversations
      .filter(c => 
        this.extractDomain(c.config.url) === domain || 
        c.config.templateName === template
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get successful conversation patterns
  getSuccessPatterns() {
    const successfulConvs = this.conversations.filter(c => c.outcome === 'success');
    
    return {
      avgDuration: this.average(successfulConvs.map(c => c.stats?.duration || 0)),
      avgMessageCount: this.average(successfulConvs.map(c => c.stats?.messageCount || 0)),
      avgUserInteractions: this.average(successfulConvs.map(c => c.stats?.userInteractions || 0)),
      commonSuccessFactors: this.extractSuccessFactors(successfulConvs)
    };
  }

  extractSuccessFactors(conversations) {
    // Analyze what made conversations successful
    const factors = {};
    
    conversations.forEach(conv => {
      // Check if user provided feedback
      if (conv.stats?.userInteractions > 0) {
        factors['user-feedback'] = (factors['user-feedback'] || 0) + 1;
      }
      
      // Check if multiple iterations
      if (conv.messages.filter(m => m.metadata.isRegeneration).length > 0) {
        factors['iterative-refinement'] = (factors['iterative-refinement'] || 0) + 1;
      }
      
      // Check if context guides used
      const contextMsgs = conv.messages.filter(m => m.metadata.contextsUsed);
      if (contextMsgs.length > 0) {
        factors['context-guides'] = (factors['context-guides'] || 0) + 1;
      }
    });
    
    return Object.entries(factors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([factor, count]) => ({
        factor,
        count,
        percentage: (count / conversations.length * 100).toFixed(1)
      }));
  }

  average(arr) {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((sum, val) => sum + val, 0) / arr.length);
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  // Get conversation statistics
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
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
      avgDuration: this.average(this.conversations.map(c => c.stats?.duration || 0))
    };
  }

  // Export conversations for analysis
  exportConversations() {
    return JSON.stringify(this.conversations, null, 2);
  }

  // Clear all conversations
  clearAll() {
    this.conversations = [];
    this.currentConversation = null;
    this.saveConversations();
  }
}

if (typeof window !== 'undefined') {
  window.ConversationMemory = ConversationMemory;
}

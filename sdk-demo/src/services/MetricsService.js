/**
 * Metrics Service
 * 
 * Tracks and stores metrics for:
 * - Token usage over time
 * - Model selection distribution
 * - Agent success/failure rates
 * - Response times
 * - Conversation analytics
 */

export class MetricsService {
  constructor() {
    this.storageKey = 'ollama-sdk-metrics';
    this.metrics = this.loadMetrics();
  }

  loadMetrics() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      sessions: [],
      tokenUsage: [],
      modelUsage: {},
      agentPerformance: {},
      responseTimers: [],
      conversationStats: {
        total: 0,
        successful: 0,
        failed: 0,
        paused: 0,
        regenerated: 0
      }
    };
  }

  saveMetrics() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.metrics));
  }

  // Track token usage
  trackTokens(tokens, model, timestamp = Date.now()) {
    this.metrics.tokenUsage.push({
      timestamp,
      tokens,
      model,
      date: new Date(timestamp).toLocaleDateString()
    });
    
    // Keep only last 1000 entries
    if (this.metrics.tokenUsage.length > 1000) {
      this.metrics.tokenUsage = this.metrics.tokenUsage.slice(-1000);
    }
    
    this.saveMetrics();
  }

  // Track model usage
  trackModelUsage(model) {
    if (!this.metrics.modelUsage[model]) {
      this.metrics.modelUsage[model] = 0;
    }
    this.metrics.modelUsage[model]++;
    this.saveMetrics();
  }

  // Track agent performance
  trackAgentExecution(agentName, success, duration, error = null) {
    if (!this.metrics.agentPerformance[agentName]) {
      this.metrics.agentPerformance[agentName] = {
        executions: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        avgDuration: 0,
        errors: []
      };
    }

    const perf = this.metrics.agentPerformance[agentName];
    perf.executions++;
    perf.totalDuration += duration;
    perf.avgDuration = perf.totalDuration / perf.executions;

    if (success) {
      perf.successes++;
    } else {
      perf.failures++;
      if (error) {
        perf.errors.push({
          timestamp: Date.now(),
          error: error.toString()
        });
        // Keep only last 10 errors per agent
        if (perf.errors.length > 10) {
          perf.errors = perf.errors.slice(-10);
        }
      }
    }

    this.saveMetrics();
  }

  // Track response time
  trackResponseTime(duration, model, timestamp = Date.now()) {
    this.metrics.responseTimers.push({
      timestamp,
      duration,
      model,
      date: new Date(timestamp).toLocaleDateString()
    });

    // Keep only last 500 entries
    if (this.metrics.responseTimers.length > 500) {
      this.metrics.responseTimers = this.metrics.responseTimers.slice(-500);
    }

    this.saveMetrics();
  }

  // Track conversation events
  trackConversation(event) {
    this.metrics.conversationStats.total++;
    
    switch(event) {
      case 'success':
        this.metrics.conversationStats.successful++;
        break;
      case 'failed':
        this.metrics.conversationStats.failed++;
        break;
      case 'paused':
        this.metrics.conversationStats.paused++;
        break;
      case 'regenerated':
        this.metrics.conversationStats.regenerated++;
        break;
    }

    this.saveMetrics();
  }

  // Start a new session
  startSession() {
    const session = {
      id: Date.now(),
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      messagesCount: 0,
      tokensUsed: 0
    };
    
    this.metrics.sessions.push(session);
    this.saveMetrics();
    
    return session.id;
  }

  // End a session
  endSession(sessionId, messagesCount, tokensUsed) {
    const session = this.metrics.sessions.find(s => s.id === sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      session.messagesCount = messagesCount;
      session.tokensUsed = tokensUsed;
      this.saveMetrics();
    }
  }

  // Get aggregated metrics for dashboard
  getAggregatedMetrics(days = 7) {
    const now = Date.now();
    const cutoff = now - (days * 24 * 60 * 60 * 1000);

    // Token usage by day
    const tokensByDay = {};
    this.metrics.tokenUsage
      .filter(t => t.timestamp >= cutoff)
      .forEach(t => {
        const date = new Date(t.timestamp).toLocaleDateString();
        tokensByDay[date] = (tokensByDay[date] || 0) + t.tokens;
      });

    // Response times by day
    const responseTimesByDay = {};
    this.metrics.responseTimers
      .filter(r => r.timestamp >= cutoff)
      .forEach(r => {
        const date = new Date(r.timestamp).toLocaleDateString();
        if (!responseTimesByDay[date]) {
          responseTimesByDay[date] = { total: 0, count: 0 };
        }
        responseTimesByDay[date].total += r.duration;
        responseTimesByDay[date].count++;
      });

    const avgResponseTimesByDay = {};
    Object.keys(responseTimesByDay).forEach(date => {
      avgResponseTimesByDay[date] = 
        responseTimesByDay[date].total / responseTimesByDay[date].count;
    });

    return {
      tokensByDay,
      modelDistribution: this.metrics.modelUsage,
      agentPerformance: this.metrics.agentPerformance,
      avgResponseTimesByDay,
      conversationStats: this.metrics.conversationStats,
      totalSessions: this.metrics.sessions.length,
      activeSessions: this.metrics.sessions.filter(s => !s.endTime).length
    };
  }

  // Get real-time stats
  getRealTimeStats() {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentTokens = this.metrics.tokenUsage
      .filter(t => t.timestamp >= last24h)
      .reduce((sum, t) => sum + t.tokens, 0);

    const recentConversations = this.metrics.conversationStats.total;
    
    const successRate = recentConversations > 0
      ? (this.metrics.conversationStats.successful / recentConversations) * 100
      : 0;

    const avgResponseTime = this.metrics.responseTimers.length > 0
      ? this.metrics.responseTimers
          .slice(-50)
          .reduce((sum, r) => sum + r.duration, 0) / 
        Math.min(50, this.metrics.responseTimers.length)
      : 0;

    return {
      tokensLast24h: recentTokens,
      totalConversations: recentConversations,
      successRate: successRate.toFixed(1),
      avgResponseTime: avgResponseTime.toFixed(0)
    };
  }

  // Export metrics
  exportMetrics() {
    const data = JSON.stringify(this.metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = {
      sessions: [],
      tokenUsage: [],
      modelUsage: {},
      agentPerformance: {},
      responseTimers: [],
      conversationStats: {
        total: 0,
        successful: 0,
        failed: 0,
        paused: 0,
        regenerated: 0
      }
    };
    this.saveMetrics();
  }
}

export default new MetricsService();

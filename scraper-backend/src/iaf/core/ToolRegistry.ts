/**
 * Tool Registry - Manages reusable tool definitions
 * 
 * Allows workflows to define tools once and share them across multiple agents.
 * Supports tool lifecycle, access control, and rate limiting.
 */

import { ToolConfig } from './types.js';

export interface ToolUsageStats {
  totalCalls: number;
  lastCalled?: Date;
  callsPerMinute: number;
  errors: number;
}

export class ToolRegistry {
  private tools: Map<string, ToolConfig> = new Map();
  private usageStats: Map<string, ToolUsageStats> = new Map();
  private callHistory: Map<string, Date[]> = new Map(); // For rate limiting

  /**
   * Register a new tool
   */
  register(tool: ToolConfig): void {
    if (!tool.id) {
      throw new Error('Tool must have an id');
    }

    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id '${tool.id}' already exists`);
    }

    // Validate tool configuration
    this.validateTool(tool);

    this.tools.set(tool.id, tool);
    this.usageStats.set(tool.id, {
      totalCalls: 0,
      callsPerMinute: 0,
      errors: 0
    });
  }

  /**
   * Get a tool by ID
   */
  get(id: string): ToolConfig | undefined {
    return this.tools.get(id);
  }

  /**
   * Check if a tool exists
   */
  has(id: string): boolean {
    return this.tools.has(id);
  }

  /**
   * List all registered tools
   */
  listTools(): ToolConfig[] {
    return Array.from(this.tools.values());
  }

  /**
   * Update an existing tool
   */
  update(id: string, updates: Partial<ToolConfig>): void {
    const existing = this.tools.get(id);
    if (!existing) {
      throw new Error(`Tool with id '${id}' not found`);
    }

    const updated = { ...existing, ...updates, id }; // Preserve ID
    this.validateTool(updated);
    this.tools.set(id, updated);
  }

  /**
   * Remove a tool from the registry
   */
  remove(id: string): boolean {
    this.usageStats.delete(id);
    this.callHistory.delete(id);
    return this.tools.delete(id);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.usageStats.clear();
    this.callHistory.clear();
  }

  /**
   * Load tools from a registry object (from workflow config)
   */
  loadFromRegistry(registry: { [toolId: string]: ToolConfig }): void {
    for (const [id, tool] of Object.entries(registry)) {
      // Ensure ID matches
      tool.id = id;
      this.register(tool);
    }
  }

  /**
   * Export tools to registry object format
   */
  exportToRegistry(): { [toolId: string]: ToolConfig } {
    const registry: { [toolId: string]: ToolConfig } = {};
    for (const [id, tool] of this.tools.entries()) {
      registry[id] = tool;
    }
    return registry;
  }

  /**
   * Check if an agent has access to a tool
   */
  checkAccess(toolId: string, agentId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }

    // No restrictions = open access
    if (!tool.restrictions?.allowedAgents) {
      return true;
    }

    // Check if agent is in allowed list
    return tool.restrictions.allowedAgents.includes(agentId);
  }

  /**
   * Check rate limiting for a tool
   */
  checkRateLimit(toolId: string): { allowed: boolean; reason?: string } {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { allowed: false, reason: 'Tool not found' };
    }

    // No rate limit configured
    if (!tool.restrictions?.maxCallsPerMinute) {
      return { allowed: true };
    }

    const maxCalls = tool.restrictions.maxCallsPerMinute;
    const history = this.callHistory.get(toolId) || [];
    
    // Remove calls older than 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentCalls = history.filter(date => date > oneMinuteAgo);
    this.callHistory.set(toolId, recentCalls);

    if (recentCalls.length >= maxCalls) {
      return { 
        allowed: false, 
        reason: `Rate limit exceeded: ${maxCalls} calls/minute` 
      };
    }

    return { allowed: true };
  }

  /**
   * Record a tool call (for rate limiting and stats)
   */
  recordCall(toolId: string, success: boolean = true): void {
    // Update call history
    const history = this.callHistory.get(toolId) || [];
    history.push(new Date());
    this.callHistory.set(toolId, history);

    // Update stats
    const stats = this.usageStats.get(toolId);
    if (stats) {
      stats.totalCalls++;
      stats.lastCalled = new Date();
      
      if (!success) {
        stats.errors++;
      }

      // Calculate calls per minute (last 60 seconds)
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentCalls = history.filter(date => date > oneMinuteAgo);
      stats.callsPerMinute = recentCalls.length;
    }
  }

  /**
   * Get usage statistics for a tool
   */
  getStats(toolId: string): ToolUsageStats | undefined {
    return this.usageStats.get(toolId);
  }

  /**
   * Get all usage statistics
   */
  getAllStats(): Map<string, ToolUsageStats> {
    return new Map(this.usageStats);
  }

  /**
   * Find tools by type
   */
  findByType(type: ToolConfig['type']): ToolConfig[] {
    return Array.from(this.tools.values()).filter(tool => tool.type === type);
  }

  /**
   * Find tools accessible to a specific agent
   */
  findAccessibleTools(agentId: string): ToolConfig[] {
    return Array.from(this.tools.values()).filter(tool =>
      this.checkAccess(tool.id, agentId)
    );
  }

  /**
   * Validate tool configuration
   */
  private validateTool(tool: ToolConfig): void {
    if (!tool.name) {
      throw new Error(`Tool '${tool.id}' must have a name`);
    }

    if (!tool.type) {
      throw new Error(`Tool '${tool.id}' must have a type`);
    }

    const validTypes = ['llm_query', 'execute_server', 'http', 'scraper', 'custom'];
    if (!validTypes.includes(tool.type)) {
      throw new Error(`Tool '${tool.id}' has invalid type: ${tool.type}`);
    }

    if (!tool.description) {
      throw new Error(`Tool '${tool.id}' must have a description`);
    }

    if (!tool.schema) {
      throw new Error(`Tool '${tool.id}' must have a schema`);
    }

    if (!tool.implementation) {
      throw new Error(`Tool '${tool.id}' must have an implementation`);
    }

    // Validate restrictions if present
    if (tool.restrictions) {
      const restrictions = tool.restrictions;

      if (restrictions.maxCallsPerMinute !== undefined && restrictions.maxCallsPerMinute < 1) {
        throw new Error(`Tool '${tool.id}' maxCallsPerMinute must be >= 1`);
      }

      if (restrictions.allowedAgents && restrictions.allowedAgents.length === 0) {
        console.warn(`Tool '${tool.id}' has empty allowedAgents array (no agents can access)`);
      }
    }
  }

  /**
   * Clone a tool with a new ID
   */
  clone(sourceId: string, newId: string, overrides?: Partial<ToolConfig>): ToolConfig {
    const source = this.tools.get(sourceId);
    if (!source) {
      throw new Error(`Tool '${sourceId}' not found`);
    }

    const cloned: ToolConfig = {
      ...JSON.parse(JSON.stringify(source)), // Deep clone
      id: newId,
      ...overrides
    };

    this.register(cloned);
    return cloned;
  }

  /**
   * Get summary statistics about all tools
   */
  getSummaryStats(): {
    total: number;
    byType: Record<string, number>;
    withRestrictions: number;
    totalCalls: number;
    totalErrors: number;
  } {
    const tools = Array.from(this.tools.values());
    
    const byType: Record<string, number> = {};
    let withRestrictions = 0;
    let totalCalls = 0;
    let totalErrors = 0;

    for (const tool of tools) {
      // Count by type
      byType[tool.type] = (byType[tool.type] || 0) + 1;

      // Count restrictions
      if (tool.restrictions) {
        withRestrictions++;
      }

      // Aggregate usage stats
      const stats = this.usageStats.get(tool.id);
      if (stats) {
        totalCalls += stats.totalCalls;
        totalErrors += stats.errors;
      }
    }

    return {
      total: tools.length,
      byType,
      withRestrictions,
      totalCalls,
      totalErrors
    };
  }

  /**
   * Reset usage statistics
   */
  resetStats(): void {
    for (const [toolId, _] of this.tools.entries()) {
      this.usageStats.set(toolId, {
        totalCalls: 0,
        callsPerMinute: 0,
        errors: 0
      });
    }
    this.callHistory.clear();
  }
}

/**
 * Singleton instance for global tool registry
 */
export const globalToolRegistry = new ToolRegistry();

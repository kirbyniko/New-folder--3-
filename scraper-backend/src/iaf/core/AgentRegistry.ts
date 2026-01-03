/**
 * Agent Registry - Manages reusable agent definitions
 * 
 * Allows workflows to define agents once and reference them multiple times.
 * Supports agent lifecycle, validation, and dependency management.
 */

import { AgentConfig, ToolConfig } from './types.js';

export class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map();

  /**
   * Register a new agent
   */
  register(agent: AgentConfig): void {
    if (!agent.id) {
      throw new Error('Agent must have an id');
    }

    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id '${agent.id}' already exists`);
    }

    // Validate agent configuration
    this.validateAgent(agent);

    this.agents.set(agent.id, agent);
  }

  /**
   * Get an agent by ID
   */
  get(id: string): AgentConfig | undefined {
    return this.agents.get(id);
  }

  /**
   * Check if an agent exists
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all tools for a specific agent
   */
  getAgentTools(agentId: string): ToolConfig[] {
    const agent = this.agents.get(agentId);
    return agent?.tools || [];
  }

  /**
   * Update an existing agent
   */
  update(id: string, updates: Partial<AgentConfig>): void {
    const existing = this.agents.get(id);
    if (!existing) {
      throw new Error(`Agent with id '${id}' not found`);
    }

    const updated = { ...existing, ...updates, id }; // Preserve ID
    this.validateAgent(updated);
    this.agents.set(id, updated);
  }

  /**
   * Remove an agent from the registry
   */
  remove(id: string): boolean {
    return this.agents.delete(id);
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Load agents from a registry object (from workflow config)
   */
  loadFromRegistry(registry: { [agentId: string]: AgentConfig }): void {
    for (const [id, agent] of Object.entries(registry)) {
      // Ensure ID matches
      agent.id = id;
      this.register(agent);
    }
  }

  /**
   * Export agents to registry object format
   */
  exportToRegistry(): { [agentId: string]: AgentConfig } {
    const registry: { [agentId: string]: AgentConfig } = {};
    for (const [id, agent] of this.agents.entries()) {
      registry[id] = agent;
    }
    return registry;
  }

  /**
   * Find agents by tag
   */
  findByTag(tag: string): AgentConfig[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.metadata?.tags?.includes(tag)
    );
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: string): AgentConfig[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.metadata?.capabilities?.includes(capability)
    );
  }

  /**
   * Find agents by model
   */
  findByModel(model: string): AgentConfig[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.model === model
    );
  }

  /**
   * Validate agent configuration
   */
  private validateAgent(agent: AgentConfig): void {
    if (!agent.name) {
      throw new Error(`Agent '${agent.id}' must have a name`);
    }

    if (!agent.model) {
      throw new Error(`Agent '${agent.id}' must have a model`);
    }

    if (!agent.systemPrompt) {
      throw new Error(`Agent '${agent.id}' must have a systemPrompt`);
    }

    if (agent.temperature < 0 || agent.temperature > 1) {
      throw new Error(`Agent '${agent.id}' temperature must be between 0 and 1`);
    }

    // Validate tools if present
    if (agent.tools && agent.tools.length > 0) {
      for (const tool of agent.tools) {
        if (!tool.id || !tool.name || !tool.type) {
          throw new Error(`Agent '${agent.id}' has invalid tool: ${JSON.stringify(tool)}`);
        }
      }
    }

    // Validate iterative wrapper if present
    if (agent.iterativeWrapper) {
      const wrapper = agent.iterativeWrapper;
      
      if (!wrapper.enabled && wrapper.maxAttempts) {
        console.warn(`Agent '${agent.id}' has iterativeWrapper.enabled=false but maxAttempts set`);
      }

      if (wrapper.enabled && (!wrapper.maxAttempts || wrapper.maxAttempts < 1)) {
        throw new Error(`Agent '${agent.id}' iterativeWrapper must have maxAttempts >= 1`);
      }

      if (wrapper.strategy && !['retry', 'refinement', 'validation'].includes(wrapper.strategy)) {
        throw new Error(`Agent '${agent.id}' iterativeWrapper has invalid strategy: ${wrapper.strategy}`);
      }
    }
  }

  /**
   * Clone an agent with a new ID
   */
  clone(sourceId: string, newId: string, overrides?: Partial<AgentConfig>): AgentConfig {
    const source = this.agents.get(sourceId);
    if (!source) {
      throw new Error(`Agent '${sourceId}' not found`);
    }

    const cloned: AgentConfig = {
      ...JSON.parse(JSON.stringify(source)), // Deep clone
      id: newId,
      ...overrides
    };

    this.register(cloned);
    return cloned;
  }

  /**
   * Get statistics about agents
   */
  getStats(): {
    total: number;
    byModel: Record<string, number>;
    byCapability: Record<string, number>;
    withIterativeWrapper: number;
    averageToolCount: number;
  } {
    const agents = Array.from(this.agents.values());
    
    const byModel: Record<string, number> = {};
    const byCapability: Record<string, number> = {};
    let withIterativeWrapper = 0;
    let totalTools = 0;

    for (const agent of agents) {
      // Count by model
      byModel[agent.model] = (byModel[agent.model] || 0) + 1;

      // Count by capability
      if (agent.metadata?.capabilities) {
        for (const capability of agent.metadata.capabilities) {
          byCapability[capability] = (byCapability[capability] || 0) + 1;
        }
      }

      // Count iterative wrappers
      if (agent.iterativeWrapper?.enabled) {
        withIterativeWrapper++;
      }

      // Count tools
      totalTools += agent.tools?.length || 0;
    }

    return {
      total: agents.length,
      byModel,
      byCapability,
      withIterativeWrapper,
      averageToolCount: agents.length > 0 ? totalTools / agents.length : 0
    };
  }
}

/**
 * Singleton instance for global agent registry
 */
export const globalAgentRegistry = new AgentRegistry();

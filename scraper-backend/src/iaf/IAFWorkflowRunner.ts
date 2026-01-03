/**
 * IAF Workflow Runner
 * Executes IAF workflows loaded from configuration
 * Enhanced with hierarchical agent architecture support
 */

import { IterativeWrapper } from './core/IterativeWrapper.js';
import { ToolRegistry as ToolRegistryImpl } from './tools/ToolRegistry.js';
import { ValidatorRegistry } from './validators/ValidatorRegistry.js';
import { AgentRegistry } from './core/AgentRegistry.js';
import { ToolRegistry } from './core/ToolRegistry.js';
import type { 
  WorkflowConfig, 
  LayerConfig, 
  AgentConfig,
  ExecutionContext,
  ToolConfig,
  AttemptResult
} from './core/types.js';

export class IAFWorkflowRunner {
  private agentRegistry: AgentRegistry;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.agentRegistry = new AgentRegistry();
    this.toolRegistry = new ToolRegistry();
  }

  /**
   * Execute a workflow with hierarchical agent support
   */
  async executeWorkflow(
    workflow: WorkflowConfig,
    initialContext: Record<string, any>,
    onProgress?: (layer: number, attempt: number, status: string, message: string) => void
  ): Promise<any> {
    console.log(`\n🚀 Executing IAF Workflow: ${workflow.name}`);
    console.log(`Version: ${workflow.version || '1.0.0'}`);
    console.log(`Layers: ${workflow.iterativeWrapper.layers?.length || 0}`);
    
    // Load agent registry if present
    if (workflow.agentRegistry) {
      console.log(`\n👥 Loading ${Object.keys(workflow.agentRegistry).length} agents from registry...`);
      this.agentRegistry.loadFromRegistry(workflow.agentRegistry);
      
      const stats = this.agentRegistry.getStats();
      console.log(`   Models: ${Object.keys(stats.byModel).join(', ')}`);
      console.log(`   With iterative wrappers: ${stats.withIterativeWrapper}`);
    }
    
    // Load tool registry if present
    if (workflow.toolRegistry) {
      console.log(`\n🔧 Loading ${Object.keys(workflow.toolRegistry).length} tools from registry...`);
      this.toolRegistry.loadFromRegistry(workflow.toolRegistry);
      
      const stats = this.toolRegistry.getSummaryStats();
      console.log(`   By type: ${JSON.stringify(stats.byType)}`);
      console.log(`   With restrictions: ${stats.withRestrictions}`);
    }
    
    // BACKWARD COMPATIBILITY: Support old flat structure
    if (workflow.agent && !workflow.agentRegistry) {
      console.log(`\n⚠️  Using legacy single-agent workflow structure`);
      // Register the single agent as default
      const legacyAgent = { ...workflow.agent, id: 'default-agent' };
      this.agentRegistry.register(legacyAgent);
    }
    
    if (workflow.tools && !workflow.toolRegistry) {
      console.log(`\n⚠️  Using legacy workflow-level tools`);
      // Register workflow-level tools
      workflow.tools.forEach(tool => {
        if (!tool.id) {
          tool.id = tool.name;
        }
        this.toolRegistry.register(tool);
      });
    }
    
    // Execute workflow through IterativeWrapper
    const result = await this.executeWorkflowWithWrapper(
      workflow,
      initialContext,
      onProgress
    );
    
    console.log(`\n✅ Workflow complete!`);
    console.log(`Success: ${result.success}`);
    
    // Print usage stats
    const toolStats = this.toolRegistry.getSummaryStats();
    console.log(`\n📊 Tool Usage: ${toolStats.totalCalls} calls, ${toolStats.totalErrors} errors`);
    
    return result;
  }

  /**
   * Execute workflow using IterativeWrapper
   */
  private async executeWorkflowWithWrapper(
    workflow: WorkflowConfig,
    initialContext: Record<string, any>,
    onProgress?: (layer: number, attempt: number, status: string, message: string) => void
  ): Promise<any> {
    const wrapper = new IterativeWrapper(workflow);
    
    const context: ExecutionContext = {
      task: workflow.name,
      config: workflow,
      metadata: initialContext
    };
    
    // Execute with agent-aware attempt function
    const result = await wrapper.execute(context, async (layerName, attemptNum, ctx, previousResults) => {
      return await this.executeLayerAttempt(
        workflow,
        layerName,
        attemptNum,
        ctx,
        previousResults,
        onProgress
      );
    });
    
    return result;
  }

  /**
   * Execute a single attempt for a layer (with agent support)
   */
  private async executeLayerAttempt(
    workflow: WorkflowConfig,
    layerName: string,
    attemptNum: number,
    context: ExecutionContext,
    previousResults: any[] = [],
    onProgress?: (layer: number, attempt: number, status: string, message: string) => void
  ): Promise<AttemptResult> {
    // Find the layer config
    const layerConfig = workflow.iterativeWrapper.layers.find(l => l.name === layerName);
    if (!layerConfig) {
      throw new Error(`Layer '${layerName}' not found in workflow`);
    }

    if (onProgress) {
      onProgress(0, attemptNum, 'info', `Executing ${layerName} (attempt ${attemptNum})`);
    }

    // Get agents for this layer
    const agents = await this.getLayerAgents(layerConfig);
    
    if (agents.length === 0) {
      throw new Error(`No agents found for layer '${layerName}'`);
    }

    console.log(`\n🔄 Layer: ${layerName} (Attempt ${attemptNum})`);
    console.log(`   Agents: ${agents.map(a => a.name).join(', ')}`);
    console.log(`   Strategy: ${layerConfig.strategy || 'sequential'}`);

    // Execute agents based on layer strategy
    let result: AttemptResult;
    
    switch (layerConfig.strategy) {
      case 'parallel':
        result = await this.executeAgentsInParallel(agents, context, layerConfig);
        break;
      
      case 'consensus':
        result = await this.executeAgentsWithConsensus(agents, context, layerConfig);
        break;
      
      case 'sequential':
      default:
        result = await this.executeAgentsSequentially(agents, context, layerConfig);
        break;
    }

    return result;
  }

  /**
   * Get agents for a layer (from registry or inline)
   */
  private async getLayerAgents(layerConfig: LayerConfig): Promise<AgentConfig[]> {
    const agents: AgentConfig[] = [];

    // Load from agent references
    if (layerConfig.agentRefs && layerConfig.agentRefs.length > 0) {
      for (const agentId of layerConfig.agentRefs) {
        const agent = this.agentRegistry.get(agentId);
        if (agent) {
          agents.push(agent);
        } else {
          console.warn(`⚠️  Agent '${agentId}' not found in registry`);
        }
      }
    }

    // Load inline agents
    if (layerConfig.agents && layerConfig.agents.length > 0) {
      agents.push(...layerConfig.agents);
    }

    // BACKWARD COMPATIBILITY: If no agents, use fallback agent
    if (agents.length === 0 && layerConfig.fallbackAgent) {
      agents.push(layerConfig.fallbackAgent);
    }

    // Last resort: use default agent from registry
    if (agents.length === 0) {
      const defaultAgent = this.agentRegistry.get('default-agent');
      if (defaultAgent) {
        agents.push(defaultAgent);
      }
    }

    return agents;
  }

  /**
   * Execute agents sequentially (one after another)
   */
  private async executeAgentsSequentially(
    agents: AgentConfig[],
    context: ExecutionContext,
    layerConfig: LayerConfig
  ): Promise<AttemptResult> {
    let lastOutput: any = context.metadata;
    let allSuccess = true;

    for (const agent of agents) {
      console.log(`   → Running agent: ${agent.name}`);
      
      const result = await this.executeAgent(agent, { ...context, metadata: lastOutput });
      
      if (!result.success) {
        allSuccess = false;
        if (layerConfig.onFailure === 'fail') {
          return result;
        }
      }
      
      lastOutput = result.output;
    }

    return {
      success: allSuccess,
      output: lastOutput,
      validated: true
    };
  }

  /**
   * Execute agents in parallel (all at once)
   */
  private async executeAgentsInParallel(
    agents: AgentConfig[],
    context: ExecutionContext,
    layerConfig: LayerConfig
  ): Promise<AttemptResult> {
    console.log(`   → Running ${agents.length} agents in parallel...`);
    
    const results = await Promise.all(
      agents.map(agent => this.executeAgent(agent, context))
    );

    // Merge outputs
    const outputs = results.map(r => r.output);
    const allSuccess = results.every(r => r.success);

    return {
      success: allSuccess,
      output: outputs,
      validated: true
    };
  }

  /**
   * Execute agents with consensus (majority vote)
   */
  private async executeAgentsWithConsensus(
    agents: AgentConfig[],
    context: ExecutionContext,
    layerConfig: LayerConfig
  ): Promise<AttemptResult> {
    console.log(`   → Running ${agents.length} agents for consensus...`);
    
    const results = await Promise.all(
      agents.map(agent => this.executeAgent(agent, context))
    );

    // Find most common output (simple consensus)
    const outputs = results.map(r => JSON.stringify(r.output));
    const counts = new Map<string, number>();
    
    outputs.forEach(output => {
      counts.set(output, (counts.get(output) || 0) + 1);
    });

    // Get output with highest count
    let maxCount = 0;
    let consensusOutput = results[0].output;
    
    for (const [output, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        consensusOutput = JSON.parse(output);
      }
    }

    const consensusReached = maxCount > agents.length / 2;
    console.log(`   → Consensus: ${consensusReached ? 'YES' : 'NO'} (${maxCount}/${agents.length})`);

    return {
      success: consensusReached,
      output: consensusOutput,
      validated: true
    };
  }

  /**
   * Execute a single agent (with its own iterative wrapper if configured)
   */
  private async executeAgent(
    agent: AgentConfig,
    context: ExecutionContext
  ): Promise<AttemptResult> {
    // Check if agent has its own iterative wrapper
    if (agent.iterativeWrapper?.enabled) {
      return await this.executeAgentWithIteration(agent, context);
    } else {
      return await this.executeAgentOnce(agent, context);
    }
  }

  /**
   * Execute agent with its own iterative wrapper
   */
  private async executeAgentWithIteration(
    agent: AgentConfig,
    context: ExecutionContext
  ): Promise<AttemptResult> {
    const maxAttempts = agent.iterativeWrapper!.maxAttempts;
    const strategy = agent.iterativeWrapper!.strategy;
    
    console.log(`      ↻ Agent iterative wrapper: ${strategy} (max ${maxAttempts})`);

    let bestResult: AttemptResult | null = null;
    let lastOutput: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Modify context based on strategy
      const attemptContext = { ...context };
      
      if (strategy === 'refinement' && lastOutput) {
        // Add previous output as context for refinement
        attemptContext.metadata = {
          ...attemptContext.metadata,
          previousAttempt: lastOutput,
          refinementIteration: attempt
        };
      }

      const result = await this.executeAgentOnce(agent, attemptContext);
      lastOutput = result.output;

      if (!bestResult || (result.success && !bestResult.success)) {
        bestResult = result;
      }

      if (result.success && strategy === 'retry') {
        // Success on retry strategy, return immediately
        return result;
      }

      if (result.validated && strategy === 'validation') {
        // Validated successfully
        return result;
      }
    }

    return bestResult || { success: false, output: null, validated: false };
  }

  /**
   * Execute agent once (single invocation)
   */
  private async executeAgentOnce(
    agent: AgentConfig,
    context: ExecutionContext
  ): Promise<AttemptResult> {
    // Check tool access for this agent
    const accessibleTools = agent.tools.filter(tool => 
      this.toolRegistry.checkAccess(tool.id, agent.id)
    );

    if (accessibleTools.length < agent.tools.length) {
      console.warn(`      ⚠️  Some tools restricted for agent '${agent.name}'`);
    }

    // Check rate limits
    for (const tool of accessibleTools) {
      const rateCheck = this.toolRegistry.checkRateLimit(tool.id);
      if (!rateCheck.allowed) {
        console.warn(`      ⚠️  Rate limit: ${rateCheck.reason}`);
        return {
          success: false,
          output: null,
          validated: false,
          error: rateCheck.reason
        };
      }
    }

    // TODO: Actually invoke agent with LLM/Ollama
    // For now, simulate execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    // Record tool usage
    accessibleTools.forEach(tool => {
      this.toolRegistry.recordCall(tool.id, true);
    });

    // Simulate result
    const success = Math.random() > 0.2; // 80% success rate
    return {
      success,
      output: {
        agent: agent.name,
        task: context.task,
        result: `Simulated output from ${agent.name}`,
        toolsUsed: accessibleTools.map(t => t.name)
      },
      validated: success
    };
  }

  /**
   * Get agent registry (for external access)
   */
  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  /**
   * Get tool registry (for external access)
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Reset registries (for testing)
   */
  reset(): void {
    this.agentRegistry.clear();
    this.toolRegistry.clear();
  }
}

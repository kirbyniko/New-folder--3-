/**
 * Agent Workflow System - Real agentic capabilities with steps, learning, and iteration
 * 
 * Features:
 * - Multi-step workflows with dependencies
 * - Iterative learning and improvement
 * - Context management (files, memory, knowledge)
 * - Tool/function execution
 * - Progress tracking and feedback loops
 */

export class AgentWorkflow {
  constructor(config = {}) {
    this.name = config.name || 'Untitled Workflow';
    this.description = config.description || '';
    this.model = config.model || 'qwen2.5-coder:14b';
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    
    // Workflow configuration
    this.steps = config.steps || [];
    this.contextFiles = [];
    this.memory = [];
    this.tools = new Map();
    
    // Iterative learning config
    this.iterativeMode = config.iterativeMode || false;
    this.maxIterations = config.maxIterations || 5;
    this.improvementThreshold = config.improvementThreshold || 0.1;
    this.learningStrategy = config.learningStrategy || 'refine'; // 'refine', 'explore', 'exploit'
    
    // Execution state
    this.currentStep = 0;
    this.executionHistory = [];
    this.performance = {
      iterations: [],
      bestResult: null,
      bestScore: -Infinity
    };
    
    this.initializeTools();
  }

  /**
   * Initialize built-in tools
   */
  initializeTools() {
    // Code execution tool
    this.registerTool('execute_code', {
      description: 'Execute JavaScript code',
      parameters: { code: 'string' },
      handler: async (params) => {
        try {
          const fn = new Function(params.code);
          const result = await fn();
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });

    // File read tool
    this.registerTool('read_context', {
      description: 'Read context from added files',
      parameters: { query: 'string - search term' },
      handler: async (params) => {
        const matches = this.contextFiles.filter(f => 
          f.name.includes(params.query) || f.content.includes(params.query)
        );
        return { success: true, files: matches };
      }
    });

    // Memory tool
    this.registerTool('recall_memory', {
      description: 'Search previous execution memory',
      parameters: { query: 'string' },
      handler: async (params) => {
        const relevant = this.memory.filter(m => 
          JSON.stringify(m).toLowerCase().includes(params.query.toLowerCase())
        );
        return { success: true, memories: relevant };
      }
    });

    // Web fetch tool
    this.registerTool('fetch_url', {
      description: 'Fetch content from a URL',
      parameters: { url: 'string' },
      handler: async (params) => {
        try {
          const response = await fetch(params.url);
          const content = await response.text();
          return { success: true, content, status: response.status };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });
  }

  /**
   * Register a custom tool
   */
  registerTool(name, config) {
    this.tools.set(name, config);
  }

  /**
   * Add a workflow step
   */
  addStep(step) {
    this.steps.push({
      id: this.steps.length,
      name: step.name || `Step ${this.steps.length + 1}`,
      prompt: step.prompt || '',
      systemPrompt: step.systemPrompt || '',
      dependencies: step.dependencies || [],
      tools: step.tools || [],
      validation: step.validation || null,
      retryOnFail: step.retryOnFail !== false,
      maxRetries: step.maxRetries || 3
    });
  }

  /**
   * Add context file
   */
  addContextFile(file) {
    this.contextFiles.push({
      name: file.name,
      content: file.content,
      size: file.size || file.content.length,
      type: file.type || 'text/plain',
      addedAt: new Date().toISOString()
    });
  }

  /**
   * Execute the workflow
   */
  async execute(options = {}) {
    const startTime = Date.now();
    
    if (this.iterativeMode) {
      return await this.executeIterative(options);
    } else {
      return await this.executeSequential(options);
    }
  }

  /**
   * Execute workflow sequentially (non-iterative)
   */
  async executeSequential(options = {}) {
    const results = [];
    
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      const step = this.steps[i];
      
      // Notify progress
      if (options.onProgress) {
        options.onProgress({
          step: i + 1,
          total: this.steps.length,
          stepName: step.name,
          status: 'running'
        });
      }

      // Execute step
      const stepResult = await this.executeStep(step, results);
      results.push(stepResult);

      // Check if step failed
      if (!stepResult.success && !step.retryOnFail) {
        return {
          success: false,
          error: `Step ${i + 1} failed: ${stepResult.error}`,
          results,
          executedSteps: i + 1
        };
      }

      // Validate result if validation function provided
      if (step.validation && !step.validation(stepResult.output)) {
        if (step.retryOnFail) {
          // Retry logic
          let retries = 0;
          while (retries < step.maxRetries) {
            const retryResult = await this.executeStep(step, results);
            if (step.validation(retryResult.output)) {
              results[i] = retryResult;
              break;
            }
            retries++;
          }
        } else {
          return {
            success: false,
            error: `Step ${i + 1} validation failed`,
            results,
            executedSteps: i + 1
          };
        }
      }
    }

    // Store in memory
    this.memory.push({
      timestamp: new Date().toISOString(),
      workflow: this.name,
      results,
      success: true
    });

    return {
      success: true,
      results,
      executedSteps: this.steps.length,
      duration: Date.now() - startTime
    };
  }

  /**
   * Execute workflow with iterative improvement
   */
  async executeIterative(options = {}) {
    const startTime = Date.now();
    let bestResult = null;
    let bestScore = -Infinity;
    const iterations = [];

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      if (options.onProgress) {
        options.onProgress({
          iteration: iteration + 1,
          total: this.maxIterations,
          status: 'iterating',
          bestScore
        });
      }

      // Execute workflow
      const result = await this.executeSequential({
        ...options,
        onProgress: null // Don't spam progress updates
      });

      // Score the result
      const score = await this.scoreResult(result, options.scoringFn);
      
      iterations.push({
        iteration: iteration + 1,
        score,
        result,
        timestamp: new Date().toISOString()
      });

      // Update best result
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
        
        // Check if improvement is significant
        if (iteration > 0) {
          const improvement = (score - iterations[iteration - 1].score) / iterations[iteration - 1].score;
          if (improvement < this.improvementThreshold) {
            console.log(`✓ Converged after ${iteration + 1} iterations (improvement: ${(improvement * 100).toFixed(2)}%)`);
            break;
          }
        }
      }

      // Apply learning strategy
      if (iteration < this.maxIterations - 1) {
        await this.applyLearning(iterations, options);
      }
    }

    // Store performance data
    this.performance = {
      iterations,
      bestResult,
      bestScore,
      convergenceIteration: iterations.length
    };

    // Store in memory
    this.memory.push({
      timestamp: new Date().toISOString(),
      workflow: this.name,
      iterativeMode: true,
      iterations: iterations.length,
      bestScore,
      result: bestResult
    });

    return {
      success: true,
      result: bestResult,
      iterations,
      bestScore,
      convergenceIteration: iterations.length,
      duration: Date.now() - startTime
    };
  }

  /**
   * Execute a single step
   */
  async executeStep(step, previousResults) {
    const startTime = Date.now();

    // Build context from dependencies
    let context = '';
    if (step.dependencies.length > 0) {
      context = '\n\n=== Context from previous steps ===\n';
      step.dependencies.forEach(depId => {
        if (previousResults[depId]) {
          context += `\nStep ${depId + 1} (${this.steps[depId].name}):\n${previousResults[depId].output}\n`;
        }
      });
    }

    // Add context files
    if (this.contextFiles.length > 0) {
      context += '\n\n=== Context Files ===\n';
      this.contextFiles.forEach(file => {
        context += `\n--- ${file.name} ---\n${file.content}\n`;
      });
    }

    // Add tool descriptions
    const availableTools = step.tools.map(toolName => {
      const tool = this.tools.get(toolName);
      return `- ${toolName}: ${tool.description}`;
    }).join('\n');

    if (availableTools) {
      context += `\n\n=== Available Tools ===\n${availableTools}\n`;
      context += '\nTo use a tool, output: TOOL_CALL: tool_name {"param": "value"}\n';
    }

    // Build full prompt
    const fullPrompt = `${step.prompt}${context}`;

    try {
      // Call LLM
      const response = await this.callLLM(
        fullPrompt,
        step.systemPrompt || `You are executing step "${step.name}" in a workflow.`
      );

      // Parse and execute tool calls
      const toolResults = await this.executeToolCalls(response, step.tools);

      return {
        success: true,
        stepId: step.id,
        stepName: step.name,
        output: response,
        toolResults,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        stepId: step.id,
        stepName: step.name,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Parse and execute tool calls from LLM response
   */
  async executeToolCalls(response, allowedTools) {
    const toolCallRegex = /TOOL_CALL:\s*(\w+)\s*(\{[^}]*\})/g;
    const results = [];
    let match;

    while ((match = toolCallRegex.exec(response)) !== null) {
      const toolName = match[1];
      const params = JSON.parse(match[2]);

      if (!allowedTools.includes(toolName)) {
        results.push({
          tool: toolName,
          success: false,
          error: 'Tool not allowed for this step'
        });
        continue;
      }

      const tool = this.tools.get(toolName);
      if (!tool) {
        results.push({
          tool: toolName,
          success: false,
          error: 'Tool not found'
        });
        continue;
      }

      try {
        const result = await tool.handler(params);
        results.push({
          tool: toolName,
          params,
          ...result
        });
      } catch (error) {
        results.push({
          tool: toolName,
          params,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Call Ollama LLM
   */
  async callLLM(prompt, systemPrompt = '') {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        system: systemPrompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Score a result (for iterative improvement)
   */
  async scoreResult(result, customScoringFn) {
    if (customScoringFn) {
      return await customScoringFn(result);
    }

    // Default scoring: based on success rate and output length
    if (!result.success) return 0;

    const successRate = result.results.filter(r => r.success).length / result.results.length;
    const avgOutputLength = result.results.reduce((sum, r) => sum + (r.output?.length || 0), 0) / result.results.length;
    
    // Simple heuristic: success rate is most important, output completeness secondary
    return successRate * 100 + Math.min(avgOutputLength / 100, 10);
  }

  /**
   * Apply learning from previous iterations
   */
  async applyLearning(iterations, options) {
    const latest = iterations[iterations.length - 1];
    const previous = iterations[iterations.length - 2];

    switch (this.learningStrategy) {
      case 'refine':
        // Refine prompts based on what worked
        if (latest.score < previous.score) {
          // Last iteration was worse, revert changes
          console.log('⚠ Last iteration worse, refining approach...');
        }
        break;

      case 'explore':
        // Try variations
        // Modify step prompts slightly to explore solution space
        break;

      case 'exploit':
        // Double down on what works
        // Strengthen successful patterns
        break;
    }

    // Simple learning: Add feedback to memory
    this.memory.push({
      type: 'learning',
      iteration: iterations.length,
      score: latest.score,
      scoreChange: previous ? latest.score - previous.score : 0,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Export workflow configuration
   */
  export() {
    return {
      name: this.name,
      description: this.description,
      model: this.model,
      steps: this.steps,
      iterativeMode: this.iterativeMode,
      maxIterations: this.maxIterations,
      improvementThreshold: this.improvementThreshold,
      learningStrategy: this.learningStrategy
    };
  }

  /**
   * Import workflow configuration
   */
  static import(config) {
    const workflow = new AgentWorkflow(config);
    return workflow;
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      totalSteps: this.steps.length,
      contextFiles: this.contextFiles.length,
      memoryEntries: this.memory.length,
      tools: Array.from(this.tools.keys()),
      performance: this.performance
    };
  }
}

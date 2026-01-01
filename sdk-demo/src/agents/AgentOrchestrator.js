/**
 * Agent Orchestrator - Master coordinator for multi-agent workflows
 * 
 * This orchestrator acts as the "brain" that:
 * 1. Analyzes incoming requests
 * 2. Breaks them into subtasks
 * 3. Routes to specialized agents
 * 4. Calls tools/functions when needed
 * 5. Synthesizes results
 * 
 * Architecture: Modular Neural Network
 * - Each agent is a specialized "neuron cluster"
 * - Orchestrator is the "routing layer"
 * - Tools are "external senses/actuators"
 */

export class AgentOrchestrator {
  constructor(ollamaConfig = {}) {
    this.ollamaUrl = ollamaConfig.url || 'http://localhost:11434';
    this.defaultModel = ollamaConfig.model || 'qwen2.5-coder:14b';
    
    // Registry of specialized agents
    this.agents = new Map();
    
    // Registry of available tools
    this.tools = new Map();
    
    // Execution history for context
    this.executionHistory = [];
    
    // Model preferences for different task types
    this.modelRouter = {
      'code': 'qwen2.5-coder:14b',
      'reasoning': 'qwen2.5:14b',
      'fast': 'qwen2.5:7b',
      'creative': 'llama3.2:latest',
      'vision': 'llava:latest'
    };
    
    this.initializeAgents();
    this.initializeTools();
  }

  /**
   * Initialize specialized agents
   */
  initializeAgents() {
    // Code Generation Agent
    this.registerAgent('code', {
      name: 'Code Generator',
      model: this.modelRouter.code,
      systemPrompt: `You are an expert software engineer. Generate clean, efficient, production-ready code.
You have access to tools and can break complex tasks into steps.
When writing code:
- Include error handling
- Add comments for complex logic
- Follow best practices
- Consider edge cases
Output ONLY code unless asked for explanations.`,
      capabilities: ['generate_code', 'debug_code', 'optimize_code', 'write_tests']
    });

    // Web Scraping Agent
    this.registerAgent('scraper', {
      name: 'Web Scraper',
      model: this.modelRouter.code,
      systemPrompt: `You are a web scraping specialist. Generate robust scrapers using Puppeteer or Cheerio.
Always include:
- Error handling for network failures
- Retry logic
- Data validation
- Rate limiting considerations
You can call tools to test scrapers or analyze HTML structure.`,
      capabilities: ['generate_scraper', 'analyze_html', 'test_scraper', 'extract_selectors']
    });

    // Data Analysis Agent
    this.registerAgent('analyst', {
      name: 'Data Analyst',
      model: this.modelRouter.reasoning,
      systemPrompt: `You are a data analyst. Analyze data, identify patterns, generate insights.
You can:
- Call tools to fetch data
- Process datasets
- Generate visualizations
- Create reports
Focus on actionable insights backed by data.`,
      capabilities: ['analyze_data', 'generate_chart', 'statistical_analysis', 'create_report']
    });

    // Planning Agent (Meta-agent)
    this.registerAgent('planner', {
      name: 'Task Planner',
      model: this.modelRouter.reasoning,
      systemPrompt: `You are a task planning specialist. Break complex requests into actionable steps.
Output a JSON plan with:
{
  "steps": [
    {"agent": "code", "task": "...", "dependencies": []},
    {"agent": "scraper", "task": "...", "dependencies": [0]}
  ],
  "tools": ["tool_name"],
  "reasoning": "why this approach"
}`,
      capabilities: ['plan_workflow', 'route_tasks', 'synthesize_results']
    });

    // Research Agent
    this.registerAgent('researcher', {
      name: 'Researcher',
      model: this.modelRouter.reasoning,
      systemPrompt: `You are a research assistant. Find information, synthesize knowledge, fact-check.
You can call tools to:
- Search documentation
- Fetch web content
- Query knowledge bases
Always cite sources and verify accuracy.`,
      capabilities: ['search', 'summarize', 'fact_check', 'cite_sources']
    });
  }

  /**
   * Initialize available tools (functions agents can call)
   */
  initializeTools() {
    // Execute code tool
    this.registerTool('execute_code', {
      description: 'Execute JavaScript code and return the result',
      parameters: {
        code: 'string - The JavaScript code to execute',
        timeout: 'number - Timeout in ms (default 5000)'
      },
      handler: async (params) => {
        try {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction(params.code);
          const result = await Promise.race([
            fn(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), params.timeout || 5000)
            )
          ]);
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });

    // Fetch URL tool
    this.registerTool('fetch_url', {
      description: 'Fetch content from a URL',
      parameters: {
        url: 'string - The URL to fetch',
        method: 'string - HTTP method (default GET)'
      },
      handler: async (params) => {
        try {
          const response = await fetch(params.url, { method: params.method || 'GET' });
          const content = await response.text();
          return { 
            success: true, 
            content, 
            status: response.status,
            headers: Object.fromEntries(response.headers)
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });

    // Query template database
    this.registerTool('query_templates', {
      description: 'Search scraper templates by category or keyword',
      parameters: {
        category: 'string - Template category (optional)',
        search: 'string - Search term (optional)'
      },
      handler: async (params) => {
        try {
          let url = 'http://localhost:8788/api/scraper-templates';
          const queryParams = [];
          if (params.category) queryParams.push(`category=${params.category}`);
          if (params.search) queryParams.push(`search=${params.search}`);
          if (queryParams.length) url += '?' + queryParams.join('&');
          
          const response = await fetch(url);
          const data = await response.json();
          return { success: true, templates: data.templates };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });

    // Call another LLM
    this.registerTool('call_llm', {
      description: 'Call a specific LLM model for specialized tasks',
      parameters: {
        model: 'string - Model name (e.g., qwen2.5-coder:14b)',
        prompt: 'string - The prompt to send',
        system: 'string - System prompt (optional)'
      },
      handler: async (params) => {
        try {
          const response = await this.callOllama(
            params.prompt,
            params.model,
            params.system || ''
          );
          return { success: true, response };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });

    // Save to file (simulated - would need backend)
    this.registerTool('save_file', {
      description: 'Save content to a file',
      parameters: {
        filename: 'string - Filename',
        content: 'string - File content'
      },
      handler: async (params) => {
        // In real implementation, this would call a backend API
        console.log('Save file:', params.filename);
        return { 
          success: true, 
          message: `File ${params.filename} would be saved (simulated)`,
          path: `/output/${params.filename}`
        };
      }
    });
  }

  /**
   * Register a specialized agent
   */
  registerAgent(id, config) {
    this.agents.set(id, {
      ...config,
      callCount: 0,
      successRate: 1.0,
      avgResponseTime: 0
    });
    console.log(`✅ Registered agent: ${config.name}`);
  }

  /**
   * Register a tool
   */
  registerTool(name, config) {
    this.tools.set(name, {
      ...config,
      callCount: 0
    });
    console.log(`🔧 Registered tool: ${name}`);
  }

  /**
   * Main orchestration method - analyzes request and executes workflow
   */
  async execute(userRequest, options = {}) {
    const startTime = Date.now();
    console.log('🎯 Orchestrator received request:', userRequest);

    try {
      // Step 1: Analyze request and create execution plan
      const plan = await this.planExecution(userRequest, options);
      console.log('📋 Execution plan:', plan);

      // Step 2: Execute plan steps
      const results = [];
      for (const step of plan.steps) {
        const stepResult = await this.executeStep(step, results);
        results.push(stepResult);
        
        // Yield progress if callback provided
        if (options.onProgress) {
          options.onProgress({
            step: results.length,
            total: plan.steps.length,
            currentTask: step.task,
            result: stepResult
          });
        }
      }

      // Step 3: Synthesize final result
      const finalResult = await this.synthesizeResults(userRequest, plan, results);

      const duration = Date.now() - startTime;
      console.log(`✅ Orchestration complete in ${duration}ms`);

      return {
        success: true,
        result: finalResult,
        plan,
        steps: results,
        duration,
        agentsCalled: [...new Set(plan.steps.map(s => s.agent))],
        toolsCalled: [...new Set(results.flatMap(r => r.toolsCalled || []))]
      };

    } catch (error) {
      console.error('❌ Orchestration failed:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Create execution plan using planner agent
   */
  async planExecution(request, options) {
    // For simple requests, use direct routing
    if (options.forceAgent) {
      return {
        steps: [{
          agent: options.forceAgent,
          task: request,
          dependencies: []
        }],
        reasoning: 'User specified agent'
      };
    }

    // Use planner agent for complex requests
    const plannerPrompt = `Analyze this request and create an execution plan:
"${request}"

Available agents: ${Array.from(this.agents.keys()).join(', ')}
Available tools: ${Array.from(this.tools.keys()).join(', ')}

Create a step-by-step plan. Output JSON only.`;

    try {
      const planAgent = this.agents.get('planner');
      const response = await this.callOllama(plannerPrompt, planAgent.model, planAgent.systemPrompt);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('⚠️ Planning failed, using simple routing:', error.message);
    }

    // Fallback: simple keyword-based routing
    return this.simpleRouting(request);
  }

  /**
   * Simple keyword-based routing for fallback
   */
  simpleRouting(request) {
    const lower = request.toLowerCase();
    
    if (lower.includes('code') || lower.includes('function') || lower.includes('class')) {
      return { steps: [{ agent: 'code', task: request, dependencies: [] }] };
    }
    if (lower.includes('scrape') || lower.includes('extract') || lower.includes('web')) {
      return { steps: [{ agent: 'scraper', task: request, dependencies: [] }] };
    }
    if (lower.includes('analyze') || lower.includes('data') || lower.includes('chart')) {
      return { steps: [{ agent: 'analyst', task: request, dependencies: [] }] };
    }
    if (lower.includes('research') || lower.includes('find') || lower.includes('search')) {
      return { steps: [{ agent: 'researcher', task: request, dependencies: [] }] };
    }
    
    // Default to code agent for general tasks
    return { steps: [{ agent: 'code', task: request, dependencies: [] }] };
  }

  /**
   * Execute a single step in the plan
   */
  async executeStep(step, previousResults) {
    console.log(`🔄 Executing step: ${step.task} (agent: ${step.agent})`);
    
    const agent = this.agents.get(step.agent);
    if (!agent) {
      throw new Error(`Agent ${step.agent} not found`);
    }

    // Build context from dependencies
    let context = '';
    if (step.dependencies && step.dependencies.length > 0) {
      context = '\n\nContext from previous steps:\n';
      step.dependencies.forEach(depIndex => {
        if (previousResults[depIndex]) {
          context += `\nStep ${depIndex + 1}: ${previousResults[depIndex].output}\n`;
        }
      });
    }

    // Build prompt with tool descriptions
    const toolsList = Array.from(this.tools.entries())
      .map(([name, tool]) => `- ${name}: ${tool.description}`)
      .join('\n');

    const prompt = `${step.task}${context}

Available tools you can call:
${toolsList}

To call a tool, output: TOOL_CALL: tool_name {"param": "value"}
You can call multiple tools in sequence.`;

    const startTime = Date.now();
    const response = await this.callOllama(prompt, agent.model, agent.systemPrompt);
    const duration = Date.now() - startTime;

    // Parse tool calls from response
    const toolsCalled = [];
    const toolResults = [];
    const toolCallRegex = /TOOL_CALL:\s*(\w+)\s*(\{[^}]*\})/g;
    let match;

    while ((match = toolCallRegex.exec(response)) !== null) {
      const toolName = match[1];
      const toolParams = JSON.parse(match[2]);
      
      console.log(`🔧 Calling tool: ${toolName}`, toolParams);
      const tool = this.tools.get(toolName);
      
      if (tool) {
        const result = await tool.handler(toolParams);
        toolsCalled.push(toolName);
        toolResults.push({ tool: toolName, params: toolParams, result });
        tool.callCount++;
      }
    }

    // Update agent metrics
    agent.callCount++;
    agent.avgResponseTime = (agent.avgResponseTime * (agent.callCount - 1) + duration) / agent.callCount;

    return {
      agent: step.agent,
      task: step.task,
      output: response,
      toolsCalled,
      toolResults,
      duration
    };
  }

  /**
   * Synthesize final result from all steps
   */
  async synthesizeResults(originalRequest, plan, stepResults) {
    if (stepResults.length === 1) {
      // Single step - return directly
      return stepResults[0].output;
    }

    // Multiple steps - synthesize
    const synthesisPrompt = `Original request: "${originalRequest}"

The following steps were executed:
${stepResults.map((r, i) => `${i + 1}. ${r.task}\nResult: ${r.output}`).join('\n\n')}

Synthesize these results into a coherent final answer. Be concise but complete.`;

    const plannerAgent = this.agents.get('planner');
    return await this.callOllama(synthesisPrompt, plannerAgent.model, plannerAgent.systemPrompt);
  }

  /**
   * Call Ollama API
   */
  async callOllama(prompt, model, systemPrompt = '') {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultModel,
        prompt,
        system: systemPrompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
        id,
        name: agent.name,
        model: agent.model,
        calls: agent.callCount,
        avgResponseTime: Math.round(agent.avgResponseTime),
        capabilities: agent.capabilities
      })),
      tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        calls: tool.callCount
      })),
      totalExecutions: this.executionHistory.length
    };
  }

  /**
   * Get available agents list
   */
  getAvailableAgents() {
    return Array.from(this.agents.keys());
  }

  /**
   * Get available tools list
   */
  getAvailableTools() {
    return Array.from(this.tools.keys());
  }
}

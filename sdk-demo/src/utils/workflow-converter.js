/**
 * Workflow Converter
 * Converts between AgentWorkflow and IAF Workflow formats
 */

/**
 * Convert AgentWorkflow to IAF Workflow format
 */
export function agentWorkflowToIAF(agentWorkflow) {
  // Handle both AgentWorkflow format and simple agent editor format
  const systemPrompt = agentWorkflow.systemPrompt 
    || agentWorkflow.system_prompt 
    || `You are an agent executing: ${agentWorkflow.name || 'Unnamed'}\n\n${agentWorkflow.description || ''}`;
  
  // Map AgentWorkflow steps to IAF layers
  const layers = agentWorkflow.steps?.map((step, index) => ({
    maxAttempts: agentWorkflow.iterativeMode ? agentWorkflow.maxIterations : 3,
    strategy: agentWorkflow.learningStrategy === 'refine' ? 'progressive_refinement' : 'pattern_detection',
    patterns: [],
    successAction: index < (agentWorkflow.steps?.length || 0) - 1 ? 'continue' : 'stop',
    failureAction: 'escalate',
    description: step.prompt || step.description || `Step ${index + 1}`
  })) || [];

  // If no steps but iterative mode, create a default layer
  if (layers.length === 0 && agentWorkflow.iterativeMode) {
    layers.push({
      maxAttempts: agentWorkflow.maxIterations || 5,
      strategy: agentWorkflow.learningStrategy === 'refine' ? 'progressive_refinement' : 'pattern_detection',
      patterns: [],
      successAction: 'stop',
      failureAction: 'stop'
    });
  }
  
  // If still no layers (simple agent), create one default layer
  if (layers.length === 0) {
    layers.push({
      maxAttempts: 3,
      strategy: 'progressive_refinement',
      patterns: [],
      successAction: 'stop',
      failureAction: 'stop'
    });
  }

  return {
    id: `agent-workflow-${Date.now()}`,
    name: agentWorkflow.name || 'Converted Agent',
    version: '1.0.0',
    description: agentWorkflow.description || systemPrompt.substring(0, 100) || 'Converted from Agent Editor',
    layers: layers,
    tools: ['execute_code', 'fetch_url', 'recall_memory'],
    agent: {
      model: agentWorkflow.model || 'qwen2.5-coder:14b',
      temperature: agentWorkflow.temperature || 0.7,
      systemPrompt: systemPrompt
    },
    validation: {
      validators: [
        { type: 'field_coverage' }
      ]
    },
    metadata: {
      source: 'AgentWorkflow',
      originalConfig: agentWorkflow
    }
  };
}

/**
 * Convert IAF Workflow to AgentWorkflow format
 */
export function iafToAgentWorkflow(iafWorkflow) {
  // Map IAF layers to AgentWorkflow steps
  const steps = iafWorkflow.layers?.map((layer, index) => ({
    name: `Layer ${index + 1}`,
    description: layer.description || `Execute with ${layer.strategy} strategy`,
    prompt: layer.description || '',
    maxAttempts: layer.maxAttempts || 3,
    dependencies: index > 0 ? [`Layer ${index}`] : []
  })) || [];

  return {
    name: iafWorkflow.name || 'Converted IAF Workflow',
    description: iafWorkflow.description || 'Converted from IAF',
    model: iafWorkflow.agent?.model || 'qwen2.5-coder:14b',
    steps: steps,
    iterativeMode: iafWorkflow.layers && iafWorkflow.layers.length > 0,
    maxIterations: iafWorkflow.layers?.[0]?.maxAttempts || 5,
    improvementThreshold: 0.1,
    learningStrategy: iafWorkflow.layers?.[0]?.strategy === 'progressive_refinement' ? 'refine' : 'explore'
  };
}

/**
 * Detect workflow type from configuration
 */
export function detectWorkflowType(config) {
  if (!config || typeof config !== 'object') {
    return 'Unknown';
  }
  
  // IAF workflow
  if (config.layers && Array.isArray(config.layers)) {
    return 'IAF';
  }
  
  // AgentWorkflow with explicit steps array
  if (config.steps && Array.isArray(config.steps)) {
    return 'AgentWorkflow';
  }
  
  // AgentWorkflow with iterative config
  if (config.iterativeMode !== undefined || config.learningStrategy) {
    return 'AgentWorkflow';
  }
  
  // Agent editor saved format - has name, model, and system_prompt or systemPrompt
  if (config.name && (config.model || config.system_prompt || config.systemPrompt)) {
    return 'AgentWorkflow';
  }
  
  return 'Unknown';
}

/**
 * IAF Workflow Builder - Vanilla JS Version
 * Visual interface for creating IAF workflows, tools, and multi-agent systems
 */

import { agentWorkflowToIAF, detectWorkflowType } from '../utils/workflow-converter.js';
import { sampleWorkflows } from '../data/sample-workflows.js';

export class IAFWorkflowBuilder {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentView = 'list'; // list, edit, tools, test
    this.workflows = [];
    this.tools = [];
    this.validators = [];
    this.selectedWorkflow = null;
    this.testingWorkflow = null;
    this.testProgress = [];
    
    this.init();
  }
  
  async init() {
    await this.loadData();
    this.render();
  }
  
  async loadData() {
    console.log('🔍 Loading workflows from all sources...');
    
    // Start with sample workflows
    this.workflows = [...sampleWorkflows];
    console.log(`📦 Loaded ${this.workflows.length} sample workflows`);
    
    // Load workflows from backend (with error handling)
    try {
      const workflowsRes = await fetch('http://localhost:3003/iaf/workflows');
      if (workflowsRes.ok) {
        const backendWorkflows = await workflowsRes.json();
        this.workflows.push(...backendWorkflows);
        console.log(`📦 Loaded ${backendWorkflows.length} workflows from backend`);
      }
    } catch (err) {
      console.warn('⚠️ Backend API not available:', err.message);
    }
    
    // Check localStorage for saved AgentWorkflows and convert them
    const savedWorkflows = [];
    console.log(`🔍 Scanning localStorage (${localStorage.length} items)...`);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`  Checking key: ${key}`);
      
      // Check for workflow_ prefixed items
      if (key && key.startsWith('workflow_')) {
        try {
          const workflowData = JSON.parse(localStorage.getItem(key));
          const workflowType = detectWorkflowType(workflowData);
          
          console.log(`    Type detected: ${workflowType}`);
          
          if (workflowType === 'AgentWorkflow') {
            // Convert AgentWorkflow to IAF format
            const iafWorkflow = agentWorkflowToIAF(workflowData);
            iafWorkflow.id = key.replace('workflow_', '');
            iafWorkflow.source = 'localStorage';
            savedWorkflows.push(iafWorkflow);
            console.log(`    ✅ Converted AgentWorkflow: ${iafWorkflow.name}`);
          } else if (workflowType === 'IAF') {
            workflowData.id = key.replace('workflow_', '');
            workflowData.source = 'localStorage';
            savedWorkflows.push(workflowData);
            console.log(`    ✅ Loaded IAF workflow: ${workflowData.name}`);
          } else {
            console.log(`    ⏭️ Skipping unknown type: ${workflowType}`);
          }
        } catch (err) {
          console.warn(`    ⚠️ Could not parse workflow ${key}:`, err);
        }
      }
      
      // Also check saved_agents which might contain workflow configurations
      if (key === 'saved_agents') {
        try {
          const agents = JSON.parse(localStorage.getItem(key));
          console.log(`  Found saved_agents with ${agents?.length || 0} items`);
          
          if (Array.isArray(agents)) {
            agents.forEach((agent, idx) => {
              // Log agent properties for debugging
              const props = Object.keys(agent).slice(0, 5).join(', ');
              console.log(`    Agent ${idx}: ${agent.name || 'Unnamed'} - Props: ${props}`);
              
              // Check if this agent has workflow-like properties
              if (agent && typeof agent === 'object' && agent.name) {
                const workflowType = detectWorkflowType(agent);
                console.log(`    Type detected: ${workflowType}`);
                
                if (workflowType === 'AgentWorkflow') {
                  const iafWorkflow = agentWorkflowToIAF(agent);
                  iafWorkflow.id = `saved_agent_${idx}`;
                  iafWorkflow.source = 'localStorage';
                  savedWorkflows.push(iafWorkflow);
                  console.log(`    ✅ Converted agent to workflow: ${iafWorkflow.name}`);
                }
              }
            });
          }
        } catch (err) {
          console.warn(`    ⚠️ Could not parse saved_agents:`, err);
        }
      }
    }
    
    console.log(`📦 Found ${savedWorkflows.length} workflows in localStorage`);
    
    // Merge with backend workflows (backend takes precedence)
    const backendIds = new Set(this.workflows.map(w => w.id));
    savedWorkflows.forEach(w => {
      if (!backendIds.has(w.id)) {
        this.workflows.push(w);
      }
    });
    
    console.log(`📋 Total ${this.workflows.length} workflows available`);
    
    // Load tools (with error handling)
    try {
      const toolsRes = await fetch('http://localhost:3003/iaf/tools');
      if (toolsRes.ok) {
        this.tools = await toolsRes.json();
      } else {
        this.setDefaultTools();
      }
    } catch (err) {
      this.setDefaultTools();
    }
    
    // Load validators (with error handling)
    try {
      const validatorsRes = await fetch('http://localhost:3003/iaf/validators');
      if (validatorsRes.ok) {
        this.validators = await validatorsRes.json();
      } else {
        this.setDefaultValidators();
      }
    } catch (err) {
      this.setDefaultValidators();
    }
  }
  
  setDefaultTools() {
    // Fallback tools if backend is unavailable
    this.tools = [
      { name: 'execute_code', description: 'Execute JavaScript code snippets', type: 'builtin' },
      { name: 'fetch_url', description: 'Fetch content from a URL', type: 'builtin' },
      { name: 'test_scraper', description: 'Test a scraper implementation', type: 'builtin' }
    ];
  }
  
  setDefaultValidators() {
    this.validators = [
      { name: 'field_coverage', description: 'Check field coverage', type: 'builtin' },
      { name: 'json_schema', description: 'Validate JSON schema', type: 'builtin' },
      { name: 'item_count', description: 'Validate item count', type: 'builtin' }
    ];
  }
  
  render() {
    this.container.innerHTML = `
      <div class="workflow-builder">
        <!-- Header -->
        <div class="workflow-builder-header">
          <h1>⚙️ IAF Workflow Builder</h1>
          <div class="header-tabs">
            <button class="tab-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list">
              📋 Workflows
            </button>
            <button class="tab-btn ${this.currentView === 'tools' ? 'active' : ''}" data-view="tools">
              🔧 Tool Manager
            </button>
            <button class="tab-btn ${this.currentView === 'test' ? 'active' : ''}" data-view="test">
              🧪 Test Runner
            </button>
          </div>
        </div>
        
        <!-- Content Area -->
        <div class="workflow-builder-content">
          ${this.renderCurrentView()}
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  renderCurrentView() {
    switch (this.currentView) {
      case 'list':
        return this.selectedWorkflow ? this.renderWorkflowEditor() : this.renderWorkflowList();
      case 'tools':
        return this.renderToolManager();
      case 'test':
        return this.renderTestRunner();
      default:
        return this.renderWorkflowList();
    }
  }
  
  renderWorkflowList() {
    return `
      <div class="workflow-list-view">
        <div class="view-header">
          <h2>Your Workflows</h2>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="generate-example-btn" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 8px 16px; font-weight: 600;">
              ✨ Random Example
            </button>
            <button class="btn-secondary" id="ai-generate-workflow-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 8px 16px; font-weight: 600;">
              🤖 AI Generate
            </button>
            <button class="btn-primary" id="create-workflow-btn">
              ➕ Create New Workflow
            </button>
          </div>
        </div>
        
        <div class="workflow-grid">
          ${this.workflows.length === 0 ? `
            <div class="empty-state">
              <p>No workflows yet. Create your first IAF workflow!</p>
            </div>
          ` : this.workflows.map(workflow => `
            <div class="workflow-card ${workflow.metadata?.originalConfig ? 'converted-workflow' : ''} ${sampleWorkflows.some(s => s.id === workflow.id) ? 'sample-workflow' : ''}">
              <div class="workflow-card-header">
                <h3>${workflow.name}</h3>
                ${workflow.metadata?.originalConfig ? `
                  <span class="badge-converted" title="Converted from AgentWorkflow format">
                    🔄 Converted
                  </span>
                ` : ''}
                ${sampleWorkflows.some(s => s.id === workflow.id) ? `
                  <span class="badge-sample" title="Example workflow based on real use case">
                    ⭐ Example
                  </span>
                ` : ''}
              </div>
              <p>${workflow.description || 'No description'}</p>
              <div class="workflow-meta">
                <span>${workflow.layers?.length || 0} layers</span>
                <span>${workflow.tools?.length || 0} tools</span>
                ${workflow.source === 'localStorage' ? `<span title="Stored locally">💾 Local</span>` : ''}
                ${workflow.metadata?.tags ? `<span title="Tags: ${workflow.metadata.tags.join(', ')}">#${workflow.metadata.tags[0]}</span>` : ''}
              </div>
              <div class="workflow-actions">
                <button class="btn-small btn-primary" data-workflow-id="${workflow.id}" data-action="edit">
                  ✏️ Edit
                </button>
                <button class="btn-small btn-secondary" data-workflow-id="${workflow.id}" data-action="test">
                  🧪 Test
                </button>
                <button class="btn-small btn-danger" data-workflow-id="${workflow.id}" data-action="delete">
                  🗑️ Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  renderWorkflowEditor() {
    const workflow = this.selectedWorkflow;
    
    // Detect if this is hierarchical (v2) or legacy (v1) workflow
    // Check for iterativeWrapper structure OR presence of registry fields (even if empty)
    const isHierarchical = workflow.iterativeWrapper || 
                           (workflow.version && workflow.version.startsWith('2.')) ||
                           (workflow.agentRegistry !== undefined) || 
                           (workflow.toolRegistry !== undefined);
    
    return `
      <div class="workflow-editor">
        <div class="editor-header">
          <button class="btn-back" id="back-to-list">← Back to Workflows</button>
          <h2>${workflow.id ? 'Edit' : 'Create'} Workflow</h2>
          ${isHierarchical ? '<span class="version-badge">v2.0 Hierarchical</span>' : '<span class="version-badge-legacy">v1.0 Legacy</span>'}
          <div class="editor-header-actions">
            <button class="btn-secondary" id="ai-enhance-workflow-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
              🤖 AI Enhance
            </button>
            <button class="btn-secondary" id="random-example-editor-btn" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white;">
              ✨ Inspiration
            </button>
            ${!isHierarchical ? '<button class="btn-secondary" id="upgrade-workflow-btn">⬆️ Upgrade to v2.0</button>' : ''}
            <button class="btn-primary" id="save-workflow-btn">💾 Save Workflow</button>
          </div>
        </div>
        
        <div class="editor-tabs">
          <button class="editor-tab active" data-tab="general">General</button>
          ${isHierarchical ? '<button class="editor-tab" data-tab="agents">👥 Agents</button>' : ''}
          ${isHierarchical ? '<button class="editor-tab" data-tab="tools-registry">🔧 Tools</button>' : ''}
          <button class="editor-tab" data-tab="layers">Layers</button>
          ${!isHierarchical ? '<button class="editor-tab" data-tab="agent">Agent Config</button>' : ''}
          ${!isHierarchical ? '<button class="editor-tab" data-tab="tools">Tools</button>' : ''}
          <button class="editor-tab" data-tab="validation">Validation</button>
        </div>
        
        <div class="editor-content">
          <div class="tab-content active" data-tab-content="general">
            ${this.renderGeneralTab(workflow)}
          </div>
          ${isHierarchical ? `
            <div class="tab-content" data-tab-content="agents">
              ${this.renderAgentsRegistryTab(workflow)}
            </div>
          ` : ''}
          ${isHierarchical ? `
            <div class="tab-content" data-tab-content="tools-registry">
              ${this.renderToolsRegistryTab(workflow)}
            </div>
          ` : ''}
          <div class="tab-content" data-tab-content="layers">
            ${this.renderLayersTab(workflow, isHierarchical)}
          </div>
          ${!isHierarchical ? `
            <div class="tab-content" data-tab-content="agent">
              ${this.renderAgentTab(workflow)}
            </div>
          ` : ''}
          ${!isHierarchical ? `
            <div class="tab-content" data-tab-content="tools">
              ${this.renderToolsTab(workflow)}
            </div>
          ` : ''}
          <div class="tab-content" data-tab-content="validation">
            ${this.renderValidationTab(workflow)}
          </div>
        </div>
      </div>
    `;
  }
  
  renderGeneralTab(workflow) {
    return `
      <div class="form-section">
        <div class="form-group">
          <label for="workflow-name">Workflow Name</label>
          <input 
            type="text" 
            id="workflow-name" 
            value="${workflow.name || ''}" 
            placeholder="My Awesome Workflow"
          />
        </div>
        
        <div class="form-group">
          <label for="workflow-version">Version</label>
          <input 
            type="text" 
            id="workflow-version" 
            value="${workflow.version || '1.0.0'}" 
            placeholder="1.0.0"
          />
        </div>
        
        <div class="form-group">
          <label for="workflow-description">Description</label>
          <textarea 
            id="workflow-description" 
            rows="4"
            placeholder="Describe what this workflow does..."
          >${workflow.description || ''}</textarea>
        </div>
      </div>
    `;
  }
  
  renderLayersTab(workflow, isHierarchical = false) {
    const layers = workflow.iterativeWrapper?.layers || workflow.layers || [];
    const agentRegistry = workflow.agentRegistry || {};
    const availableAgents = Object.keys(agentRegistry);
    
    return `
      <div class="layers-section">
        <div class="section-header">
          <h3>Workflow Layers</h3>
          ${isHierarchical ? '<p class="section-description">Each layer can use multiple specialized agents with different execution strategies</p>' : ''}
          <button class="btn-secondary" id="add-layer-btn">➕ Add Layer</button>
        </div>
        
        <div class="layers-list">
          ${layers.length === 0 ? `
            <div class="empty-state">
              <p>No layers yet. Add layers to build your iterative workflow.</p>
              ${isHierarchical ? `
                <p class="hint">💡 Tip: Assign different agents to different layers for specialized processing</p>
              ` : ''}
            </div>
          ` : layers.map((layer, index) => `
            <div class="layer-card" data-layer-index="${index}">
              <div class="layer-header">
                <h4>${layer.name || `Layer ${index + 1}`}</h4>
                <button class="btn-small btn-danger" data-action="remove-layer" data-layer-index="${index}">
                  🗑️ Remove
                </button>
              </div>
              
              <div class="layer-config">
                ${isHierarchical ? `
                  <div class="form-group">
                    <label>Layer Name</label>
                    <input 
                      type="text" 
                      class="layer-name" 
                      data-layer-index="${index}"
                      value="${layer.name || ''}" 
                      placeholder="e.g., Scraping Layer, Validation Layer"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label>Agents for this Layer</label>
                    ${availableAgents.length === 0 ? `
                      <div class="empty-state-inline">
                        <p class="form-hint warning">⚠️ No agents in registry yet</p>
                        <button class="btn-small btn-primary" onclick="document.querySelector('[data-tab=\"agents\"]').click()">➕ Add Agents First</button>
                      </div>
                    ` : `
                      <div class="agent-checkboxes">
                        ${availableAgents.map(agentId => {
                          const agent = agentRegistry[agentId];
                          const hasIterativeWrapper = agent.iterativeWrapper?.enabled;
                          return `
                            <label class="agent-checkbox-label">
                              <input 
                                type="checkbox" 
                                class="agent-checkbox" 
                                data-layer-index="${index}"
                                data-agent-id="${agentId}"
                                ${(layer.agentRefs || []).includes(agentId) ? 'checked' : ''}
                              />
                              <span class="agent-checkbox-content">
                                <strong>${agent.name}${hasIterativeWrapper ? ' 🔄' : ''}</strong>
                                <span class="agent-checkbox-meta">${agentId} • ${agent.model}${hasIterativeWrapper ? ' • Self-iterating' : ''}</span>
                              </span>
                            </label>
                          `;
                        }).join('')}
                      </div>
                      <p class="form-hint">💡 Select agents for this layer. Agents with 🔄 can refine their own outputs iteratively</p>
                    `}
                  </div>
                  
                  <div class="form-group">
                    <label>Execution Strategy</label>
                    <select class="layer-strategy" data-layer-index="${index}">
                      <option value="sequential" ${layer.strategy === 'sequential' ? 'selected' : ''}>
                        ⬇️ Sequential (one after another)
                      </option>
                      <option value="parallel" ${layer.strategy === 'parallel' ? 'selected' : ''}>
                        ⚡ Parallel (all at once)
                      </option>
                      <option value="consensus" ${layer.strategy === 'consensus' ? 'selected' : ''}>
                        🗳️ Consensus (majority vote)
                      </option>
                      <option value="pattern_detection" ${layer.strategy === 'pattern_detection' ? 'selected' : ''}>
                        🔍 Pattern Detection
                      </option>
                      <option value="progressive_refinement" ${layer.strategy === 'progressive_refinement' ? 'selected' : ''}>
                        ✨ Progressive Refinement
                      </option>
                    </select>
                  </div>
                ` : `
                  <div class="form-group">
                    <label>Strategy</label>
                    <select class="layer-strategy" data-layer-index="${index}">
                      <option value="pattern_detection" ${layer.strategy === 'pattern_detection' ? 'selected' : ''}>
                        Pattern Detection
                      </option>
                      <option value="progressive_refinement" ${layer.strategy === 'progressive_refinement' ? 'selected' : ''}>
                        Progressive Refinement
                      </option>
                    </select>
                  </div>
                `}
                
                <div class="form-group">
                  <label>Max Attempts</label>
                  <input 
                    type="number" 
                    class="layer-max-attempts" 
                    data-layer-index="${index}"
                    value="${layer.maxAttempts || 3}" 
                    min="1" 
                    max="10"
                  />
                </div>
                
                <div class="form-group">
                  <label>Error Patterns <span class="form-hint-inline">(optional)</span></label>
                  <div class="patterns-list">
                    ${(layer.patterns || []).map((pattern, pIndex) => {
                      const patternObj = typeof pattern === 'string' ? { pattern, fix: 'Retry' } : pattern;
                      return `
                        <div class="pattern-card" data-layer-index="${index}" data-pattern-index="${pIndex}">
                          <div class="pattern-header">
                            <input type="text" class="pattern-text" value="${this.escapeHtml(patternObj.pattern)}" placeholder="e.g., connection timeout, empty result" />
                            <button class="btn-small btn-danger" data-action="remove-pattern" data-layer-index="${index}" data-pattern-index="${pIndex}">×</button>
                          </div>
                          <input type="text" class="pattern-fix" value="${this.escapeHtml(patternObj.fix || '')}" placeholder="Fix action: e.g., retry with backoff" />
                        </div>
                      `;
                    }).join('')}
                    <button class="btn-small btn-secondary" data-action="add-pattern" data-layer-index="${index}">
                      ➕ Add Pattern
                    </button>
                  </div>
                  <p class="form-hint">Error patterns help the system detect and fix common issues automatically</p>
                </div>
                
                <div class="form-group">
                  <label>On Success</label>
                  <select class="layer-success-action" data-layer-index="${index}">
                    <option value="continue" ${(layer.onSuccess || layer.successAction) === 'continue' ? 'selected' : ''}>Continue to next layer</option>
                    <option value="return" ${(layer.onSuccess || layer.successAction) === 'return' ? 'selected' : ''}>Return immediately</option>
                    <option value="return_best" ${(layer.onSuccess || layer.successAction) === 'return_best' ? 'selected' : ''}>Return best result</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>On Failure</label>
                  <select class="layer-failure-action" data-layer-index="${index}">
                    <option value="escalate" ${(layer.onFailure || layer.failureAction) === 'escalate' ? 'selected' : ''}>Escalate to next layer</option>
                    <option value="fail" ${(layer.onFailure || layer.failureAction) === 'fail' ? 'selected' : ''}>Fail workflow</option>
                    <option value="retry" ${(layer.onFailure || layer.failureAction) === 'retry' ? 'selected' : ''}>Retry current layer</option>
                    <option value="return_best" ${(layer.onFailure || layer.failureAction) === 'return_best' ? 'selected' : ''}>Return best attempt</option>
                  </select>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  renderAgentTab(workflow) {
    const agent = workflow.agent || {};
    const commonModels = [
      'llama3.2:1b',
      'llama3.2:3b',
      'mistral-nemo:12b-instruct-2407-q8_0',
      'qwen2.5:14b',
      'qwen2.5:7b',
      'deepseek-r1:14b',
      'gpt-4',
      'claude-3-opus'
    ];
    
    return `
      <div class="form-section">
        <div class="form-group">
          <label for="agent-model">Model</label>
          <select id="agent-model">
            ${commonModels.map(model => `
              <option value="${model}" ${agent.model === model ? 'selected' : ''}>${model}</option>
            `).join('')}
            <option value="custom" ${!commonModels.includes(agent.model) ? 'selected' : ''}>Custom...</option>
          </select>
          <input 
            type="text" 
            id="agent-model-custom" 
            value="${agent.model || ''}" 
            placeholder="Enter custom model name"
            style="display: ${!commonModels.includes(agent.model) ? 'block' : 'none'}; margin-top: 8px;"
          />
        </div>
        
        <div class="form-group">
          <label for="agent-temperature">Temperature: <span id="temp-value">${agent.temperature || 0.7}</span></label>
          <input 
            type="range" 
            id="agent-temperature" 
            value="${agent.temperature || 0.7}" 
            min="0" 
            max="2" 
            step="0.1"
          />
        </div>
        
        <div class="form-group">
          <label for="agent-system-prompt">System Prompt</label>
          <textarea 
            id="agent-system-prompt" 
            rows="8"
            placeholder="You are an expert assistant that..."
          >${agent.systemPrompt || 'You are a helpful AI assistant specializing in iterative problem solving.'}</textarea>
        </div>
      </div>
    `;
  }
  
  renderToolsTab(workflow) {
    const selectedTools = workflow.tools || [];
    return `
      <div class="tools-section">
        <h3>Select Tools</h3>
        <div class="tools-grid">
          ${this.tools.map(tool => `
            <div class="tool-card ${selectedTools.includes(tool.name) ? 'selected' : ''}">
              <input 
                type="checkbox" 
                class="tool-checkbox" 
                data-tool-name="${tool.name}"
                ${selectedTools.includes(tool.name) ? 'checked' : ''}
              />
              <div class="tool-info">
                <h4>${tool.name}</h4>
                <p>${tool.description}</p>
                <span class="tool-type">${tool.type}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  renderAgentsRegistryTab(workflow) {
    const agentRegistry = workflow.agentRegistry || {};
    const agents = Object.entries(agentRegistry);
    
    return `
      <div class="agents-registry-section">
        <div class="section-header">
          <h3>👥 Agent Registry</h3>
          <p class="section-description">Define reusable agents with specialized capabilities, models, and tools</p>
          <button class="btn-primary" id="add-agent-to-registry-btn">➕ Add Agent</button>
        </div>
        
        ${agents.length === 0 ? `
          <div class="empty-state">
            <p>No agents registered yet. Add specialized agents with their own tools and configurations.</p>
            <ul class="feature-list">
              <li>🎯 Each agent can use different AI models</li>
              <li>🔧 Agents own their tools (not shared)</li>
              <li>🔄 Agents can have their own iteration logic</li>
              <li>💰 Optimize costs by using cheap models for simple tasks</li>
            </ul>
          </div>
        ` : `
          <div class="agents-list">
            ${agents.map(([agentId, agent]) => `
              <div class="agent-registry-card" data-agent-id="${agentId}">
                <div class="agent-header">
                  <div class="agent-title">
                    <h4>${agent.name}</h4>
                    <span class="agent-id-badge">${agentId}</span>
                    <span class="model-badge">${agent.model}</span>
                  </div>
                  <div class="agent-actions">
                    <button class="btn-small btn-primary" data-action="edit-agent" data-agent-id="${agentId}">✏️ Edit</button>
                    <button class="btn-small btn-danger" data-action="remove-agent" data-agent-id="${agentId}">🗑️ Remove</button>
                  </div>
                </div>
                
                <div class="agent-details">
                  <div class="agent-stat">
                    <span class="stat-icon">🔧</span>
                    <span>${agent.tools?.length || 0} tools</span>
                  </div>
                  <div class="agent-stat">
                    <span class="stat-icon">🌡️</span>
                    <span>temp: ${agent.temperature}</span>
                  </div>
                  ${agent.iterativeWrapper?.enabled ? `
                    <div class="agent-stat highlighted">
                      <span class="stat-icon">🔄</span>
                      <span>iterative (${agent.iterativeWrapper.strategy}, max ${agent.iterativeWrapper.maxAttempts})</span>
                    </div>
                  ` : ''}
                  ${agent.metadata?.capabilities ? `
                    <div class="agent-capabilities">
                      ${agent.metadata.capabilities.map(cap => `<span class="capability-tag">${cap}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
                
                <div class="agent-prompt-preview">
                  <details>
                    <summary>System Prompt</summary>
                    <pre>${agent.systemPrompt.substring(0, 200)}${agent.systemPrompt.length > 200 ? '...' : ''}</pre>
                  </details>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
  
  renderToolsRegistryTab(workflow) {
    const toolRegistry = workflow.toolRegistry || {};
    const tools = Object.entries(toolRegistry);
    
    return `
      <div class="tools-registry-section">
        <div class="section-header">
          <h3>🔧 Tool Registry</h3>
          <p class="section-description">Define shared tools that multiple agents can access</p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn-secondary" id="import-global-tools-btn" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
              🔄 Import Global Tools
            </button>
            <button class="btn-primary" id="add-tool-to-registry-btn">➕ Create Custom Tool</button>
          </div>
        </div>
        
        ${tools.length === 0 ? `
          <div class="empty-state">
            <p>No shared tools yet. Import from global tools or create custom tools.</p>
            <ul class="feature-list">
              <li>🔄 Import tools from the global Tool Manager</li>
              <li>🔒 Control which agents can access each tool</li>
              <li>⏱️ Set rate limits (calls per minute)</li>
              <li>📊 Track usage statistics</li>
              <li>🔗 Share tools across multiple agents</li>
            </ul>
          </div>
        ` : `
          <div class="tools-list">
            ${tools.map(([toolId, tool]) => `
              <div class="tool-registry-card" data-tool-id="${toolId}">
                <div class="tool-header">
                  <div class="tool-title">
                    <h4>${tool.name}</h4>
                    <span class="tool-id-badge">${toolId}</span>
                    <span class="tool-type-badge ${tool.type}">${tool.type}</span>
                  </div>
                  <div class="tool-actions">
                    <button class="btn-small btn-primary" data-action="edit-tool" data-tool-id="${toolId}">✏️ Edit</button>
                    <button class="btn-small btn-danger" data-action="remove-tool" data-tool-id="${toolId}">🗑️ Remove</button>
                  </div>
                </div>
                
                <p class="tool-description">${tool.description}</p>
                
                <div class="tool-restrictions">
                  ${tool.restrictions?.allowedAgents ? `
                    <div class="restriction-item">
                      <span class="restriction-icon">🔒</span>
                      <span>Allowed: ${tool.restrictions.allowedAgents.join(', ')}</span>
                    </div>
                  ` : '<div class="restriction-item"><span class="restriction-icon">🌐</span><span>Open access</span></div>'}
                  
                  ${tool.restrictions?.maxCallsPerMinute ? `
                    <div class="restriction-item">
                      <span class="restriction-icon">⏱️</span>
                      <span>Rate limit: ${tool.restrictions.maxCallsPerMinute} calls/min</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
  
  renderValidationTab(workflow) {
    const validation = workflow.validation || {};
    const selectedValidators = validation.validators || [];
    
    return `
      <div class="validation-section">
        <h3>Validation Rules</h3>
        <p class="section-description" style="color: #94a3b8; margin-bottom: 16px;">⚙️ Scraper-specific validators for checking data extraction quality</p>
        <div class="validators-grid">
          ${this.validators.map(validator => `
            <div class="validator-card ${selectedValidators.some(v => v.type === validator.name) ? 'selected' : ''}">
              <input 
                type="checkbox" 
                class="validator-checkbox" 
                data-validator-name="${validator.name}"
                ${selectedValidators.some(v => v.type === validator.name) ? 'checked' : ''}
              />
              <div class="validator-info">
                <h4>${validator.name}</h4>
                <p>${validator.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  renderToolManager() {
    return `
      <div class="tool-manager">
        <div class="view-header">
          <h2>Tool Manager</h2>
          <button class="btn-primary" id="create-tool-btn">➕ Create New Tool</button>
        </div>
        
        <div class="tools-list">
          ${this.tools.map(tool => `
            <div class="tool-manager-card">
              <div class="tool-header">
                <h3>${tool.name}</h3>
                <span class="tool-badge ${tool.type}">${tool.type}</span>
              </div>
              <p>${tool.description}</p>
              ${tool.type === 'llm' ? `
                <div class="tool-details">
                  <span>Model: ${tool.model}</span>
                  <span>Endpoint: ${tool.endpoint}</span>
                </div>
              ` : ''}
              <div class="tool-actions">
                <button class="btn-small btn-primary" data-tool-name="${tool.name}" data-action="edit-tool">
                  ✏️ Edit
                </button>
                ${tool.type !== 'builtin' ? `
                  <button class="btn-small btn-danger" data-tool-name="${tool.name}" data-action="delete-tool">
                    🗑️ Delete
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Tool Creation Modal (hidden by default) -->
        <div id="tool-modal" class="modal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Create New Tool</h3>
              <button class="modal-close" id="close-tool-modal">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Tool Type</label>
                <select id="tool-type-select">
                  <option value="llm">LLM Tool (Call another AI model)</option>
                  <option value="custom">Custom Tool (Write code)</option>
                </select>
              </div>
              
              <div id="llm-tool-form" class="tool-form">
                <div class="form-group">
                  <label for="llm-tool-name">Tool Name</label>
                  <input type="text" id="llm-tool-name" placeholder="gpt4_analyzer" />
                </div>
                <div class="form-group">
                  <label for="llm-tool-model">Model</label>
                  <input type="text" id="llm-tool-model" placeholder="gpt-4, claude-3-opus, etc." />
                </div>
                <div class="form-group">
                  <label for="llm-tool-endpoint">Endpoint URL</label>
                  <input type="text" id="llm-tool-endpoint" placeholder="https://api.openai.com/v1/chat/completions" />
                </div>
                <div class="form-group">
                  <label for="llm-tool-description">Description</label>
                  <textarea id="llm-tool-description" rows="3" placeholder="What does this tool do?"></textarea>
                </div>
              </div>
              
              <div id="custom-tool-form" class="tool-form" style="display: none;">
                <div class="form-group">
                  <label for="custom-tool-name">Tool Name</label>
                  <input type="text" id="custom-tool-name" placeholder="my_custom_tool" />
                </div>
                <div class="form-group">
                  <label for="custom-tool-description">Description</label>
                  <textarea id="custom-tool-description" rows="2" placeholder="What does this tool do?"></textarea>
                </div>
                <div class="form-group">
                  <label for="custom-tool-code">Implementation Code</label>
                  <textarea id="custom-tool-code" rows="10" placeholder="async function execute(context, params) {
  // Your tool code here
  return { success: true, data: ... };
}"></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" id="cancel-tool">Cancel</button>
              <button class="btn-primary" id="save-tool">Save Tool</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderTestRunner() {
    return `
      <div class="test-runner">
        <div class="view-header">
          <h2>Test Workflow</h2>
          <select id="test-workflow-select" class="workflow-select">
            <option value="">Select a workflow...</option>
            ${this.workflows.map(w => `
              <option value="${w.id}" ${this.testingWorkflow?.id === w.id ? 'selected' : ''}>${w.name}</option>
            `).join('')}
          </select>
          <button class="btn-primary" id="run-test-btn" ${!this.testingWorkflow ? 'disabled' : ''}>
            ▶️ Run Test
          </button>
        </div>
        
        ${this.testingWorkflow ? `
          <div class="test-config">
            <h3>Workflow: ${this.testingWorkflow.name}</h3>
            <p>${this.testingWorkflow.description}</p>
            <div class="workflow-info">
              <span>🎯 ${this.testingWorkflow.layers?.length || 0} layers</span>
              <span>🔧 ${this.testingWorkflow.tools?.length || 0} tools</span>
              <span>🤖 ${this.testingWorkflow.agent?.model || 'N/A'}</span>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
              <label for="test-input">Test Input (URL or JSON)</label>
              <textarea 
                id="test-input" 
                rows="3" 
                placeholder="Enter test URL or JSON data...\ne.g., https://lis.virginia.gov/">https://lis.virginia.gov/</textarea>
            </div>
          </div>
          
          <div class="test-progress">
            <h3>Execution Progress</h3>
            <div class="progress-log" id="progress-log">
              ${this.testProgress.length === 0 ? `
                <p class="empty-state">Click "Run Test" to start execution...</p>
              ` : this.testProgress.map(log => `
                <div class="log-entry log-${log.type}">
                  <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span class="log-message">${log.message}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          ${this.testResult ? `
            <div class="test-results">
              <h3>Execution Results</h3>
              <div class="result-summary">
                <div class="result-stat">
                  <span class="stat-label">Status:</span>
                  <span class="stat-value ${this.testResult.success ? 'success' : 'error'}">
                    ${this.testResult.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                <div class="result-stat">
                  <span class="stat-label">Total Iterations:</span>
                  <span class="stat-value">${this.testResult.iterations || 0}</span>
                </div>
                <div class="result-stat">
                  <span class="stat-label">Final Score:</span>
                  <span class="stat-value">${this.testResult.score || 0}%</span>
                </div>
              </div>
              
              <div class="result-actions">
                <button class="btn-primary" id="copy-result-btn">
                  📋 Copy Results
                </button>
                <button class="btn-secondary" id="download-result-btn">
                  💾 Download JSON
                </button>
                ${this.testResult.data?.code ? `
                  <button class="btn-success" id="execute-scraper-btn">
                    🚀 Run Scraper Now
                  </button>
                ` : `
                  <button class="btn-success" id="execute-scraper-btn">
                    ➡️ Open in Scraper Agent
                  </button>
                `}
              </div>
              
              ${this.testResult.data?.code ? `
                <div style="margin-top: 20px; padding: 16px; background: rgba(74, 222, 128, 0.1); border: 2px solid rgba(74, 222, 128, 0.3); border-radius: 8px;">
                  ${this.testResult.data.code.includes('No valid scraper generated') ? `
                    <h4 style="margin: 0 0 8px 0; color: #f59e0b;">⚠️ Scraper Generation Failed</h4>
                    <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">
                      The scraper generation didn't complete successfully. You can retry or check the diagnostics below.
                    </p>
                    <button class="btn-primary" id="retry-generation-btn" style="margin-right: 8px;">
                      🔄 Retry Generation
                    </button>
                    <button class="btn-secondary" id="view-diagnostics-btn">
                      📊 View Diagnostics
                    </button>
                  ` : `
                    <h4 style="margin: 0 0 8px 0; color: #4ade80;">✅ Scraper Code Generated!</h4>
                    <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                      A working scraper has been generated. Click "🚀 Run Scraper Now" to test it on the target URL.
                    </p>
                    ${this.testResult.data?.validated ? `
                      <p style="margin: 8px 0 0 0; color: #4ade80; font-size: 13px;">
                        ✓ Validated: Extracted ${this.testResult.data?.itemCount || 0} items
                      </p>
                    ` : this.testResult.data?.itemCount > 0 ? `
                      <p style="margin: 8px 0 0 0; color: #fbbf24; font-size: 13px;">
                        ⚠️ Partial: Extracted ${this.testResult.data?.itemCount || 0} items, but ${this.testResult.data?.missingFields?.length || 0} fields missing
                      </p>
                      ${this.testResult.data?.missingFields?.length > 0 ? `
                        <p style="margin: 4px 0 0 0; color: #f59e0b; font-size: 12px;">
                          Missing: ${this.testResult.data.missingFields.join(', ')}
                        </p>
                        <button class="btn-primary" id="continue-iteration-btn" style="margin-top: 12px; padding: 8px 16px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                          🔄 Continue Iterating (Auto-improve)
                        </button>
                      ` : ''}
                    ` : ''}
                  `}
                </div>
              ` : ''}
              
              <div class="result-data">
                <h4>Output Data</h4>
                <pre id="result-output">${JSON.stringify(this.testResult.data || {}, null, 2)}</pre>
              </div>
            </div>
          ` : ''}
        ` : `
          <div class="empty-state">
            <p>Select a workflow to test</p>
          </div>
        `}
      </div>
    `;
  }
  
  attachEventListeners() {
    // Tab navigation
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentView = e.target.dataset.view;
        this.render();
      });
    });
    
    // Workflow list actions
    const createBtn = this.container.querySelector('#create-workflow-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.createWorkflow());
    }
    
    const aiGenerateBtn = this.container.querySelector('#ai-generate-workflow-btn');
    if (aiGenerateBtn) {
      aiGenerateBtn.addEventListener('click', () => this.showAIGenerateModal());
    }
    
    const generateExampleBtn = this.container.querySelector('#generate-example-btn');
    if (generateExampleBtn) {
      generateExampleBtn.addEventListener('click', () => this.generateRandomExample());
    }
    
    this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.editWorkflow(e.target.dataset.workflowId));
    });
    
    this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.deleteWorkflow(e.target.dataset.workflowId));
    });
    
    this.container.querySelectorAll('[data-action="test"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectWorkflowForTest(e.target.dataset.workflowId));
    });
    
    // Editor actions
    const backBtn = this.container.querySelector('#back-to-list');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.selectedWorkflow = null;
        this.render();
      });
    }
    
    const saveBtn = this.container.querySelector('#save-workflow-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveWorkflow());
    }
    
    // AI features in editor
    const aiEnhanceBtn = this.container.querySelector('#ai-enhance-workflow-btn');
    if (aiEnhanceBtn) {
      aiEnhanceBtn.addEventListener('click', () => this.showAIEnhanceModal());
    }
    
    const randomExampleEditorBtn = this.container.querySelector('#random-example-editor-btn');
    if (randomExampleEditorBtn) {
      randomExampleEditorBtn.addEventListener('click', () => this.showInspirationModal());
    }
    
    const upgradeBtn = this.container.querySelector('#upgrade-workflow-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => this.upgradeToV2());
    }
    
    // Editor tabs
    this.container.querySelectorAll('.editor-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchEditorTab(e.target.dataset.tab));
    });
    
    // Layer actions
    const addLayerBtn = this.container.querySelector('#add-layer-btn');
    if (addLayerBtn) {
      addLayerBtn.addEventListener('click', () => this.addLayer());
    }
    
    this.container.querySelectorAll('[data-action="remove-layer"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.removeLayer(parseInt(e.target.dataset.layerIndex)));
    });
    
    this.container.querySelectorAll('[data-action="add-pattern"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.addPattern(parseInt(e.target.dataset.layerIndex)));
    });
    
    // Tool manager
    const createToolBtn = this.container.querySelector('#create-tool-btn');
    if (createToolBtn) {
      createToolBtn.addEventListener('click', () => this.showToolModal());
    }
    
    const toolTypeSelect = this.container.querySelector('#tool-type-select');
    if (toolTypeSelect) {
      toolTypeSelect.addEventListener('change', (e) => this.switchToolForm(e.target.value));
    }
    
    const closeModal = this.container.querySelector('#close-tool-modal');
    if (closeModal) {
      closeModal.addEventListener('click', () => this.hideToolModal());
    }
    
    const cancelTool = this.container.querySelector('#cancel-tool');
    if (cancelTool) {
      cancelTool.addEventListener('click', () => this.hideToolModal());
    }
    
    const saveTool = this.container.querySelector('#save-tool');
    if (saveTool) {
      saveTool.addEventListener('click', () => this.saveTool());
    }
    
    // Test runner
    const testSelect = this.container.querySelector('#test-workflow-select');
    if (testSelect) {
      testSelect.addEventListener('change', (e) => {
        this.testingWorkflow = this.workflows.find(w => w.id === e.target.value);
        this.render();
      });
    }
    
    const runTestBtn = this.container.querySelector('#run-test-btn');
    if (runTestBtn) {
      runTestBtn.addEventListener('click', () => this.runTest());
    }
    
    // Result actions
    const copyResultBtn = this.container.querySelector('#copy-result-btn');
    if (copyResultBtn) {
      copyResultBtn.addEventListener('click', () => this.copyResults());
    }
    
    const downloadResultBtn = this.container.querySelector('#download-result-btn');
    if (downloadResultBtn) {
      downloadResultBtn.addEventListener('click', () => this.downloadResults());
    }
    
    const executeScraperBtn = this.container.querySelector('#execute-scraper-btn');
    if (executeScraperBtn) {
      executeScraperBtn.addEventListener('click', () => this.executeGeneratedScraper());
    }
    
    const continueIterationBtn = this.container.querySelector('#continue-iteration-btn');
    if (continueIterationBtn) {
      continueIterationBtn.addEventListener('click', () => this.continueIteration());
    }
    
    const retryGenerationBtn = this.container.querySelector('#retry-generation-btn');
    if (retryGenerationBtn) {
      retryGenerationBtn.addEventListener('click', () => this.retryGeneration());
    }
    
    const viewDiagnosticsBtn = this.container.querySelector('#view-diagnostics-btn');
    if (viewDiagnosticsBtn) {
      viewDiagnosticsBtn.addEventListener('click', () => this.viewDiagnostics());
    }
    
    // Temperature slider
    const tempSlider = this.container.querySelector('#agent-temperature');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        this.container.querySelector('#temp-value').textContent = e.target.value;
      });
    }
    
    // Model dropdown - show/hide custom input
    const modelSelect = this.container.querySelector('#agent-model');
    const modelCustom = this.container.querySelector('#agent-model-custom');
    if (modelSelect && modelCustom) {
      modelSelect.addEventListener('change', (e) => {
        modelCustom.style.display = e.target.value === 'custom' ? 'block' : 'none';
      });
    }
    
    // Hierarchical workflow features
    const addAgentBtn = this.container.querySelector('#add-agent-to-registry-btn');
    if (addAgentBtn) {
      addAgentBtn.addEventListener('click', () => this.showAddAgentModal());
    }
    
    const addToolToRegistryBtn = this.container.querySelector('#add-tool-to-registry-btn');
    if (addToolToRegistryBtn) {
      addToolToRegistryBtn.addEventListener('click', () => this.showAddToolModal());
    }
    
    const importGlobalToolsBtn = this.container.querySelector('#import-global-tools-btn');
    if (importGlobalToolsBtn) {
      importGlobalToolsBtn.addEventListener('click', () => this.showImportGlobalToolsModal());
    }
    
    this.container.querySelectorAll('[data-action="edit-agent"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.showAgentEditorModal(e.target.dataset.agentId));
    });
    
    this.container.querySelectorAll('[data-action="remove-agent"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.removeRegistryAgent(e.target.dataset.agentId));
    });
    
    this.container.querySelectorAll('[data-action="edit-tool"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.editRegistryTool(e.target.dataset.toolId));
    });
    
    this.container.querySelectorAll('[data-action="remove-tool"]').forEach(btn => {
      btn.addEventListener('click', (e) => this.removeRegistryTool(e.target.dataset.toolId));
    });
  }
  
  createWorkflow() {
    // Create new v2.0 hierarchical workflow by default
    this.selectedWorkflow = {
      name: 'New Workflow',
      version: '2.0.0',
      description: '',
      agentRegistry: {
        'default-agent': {
          id: 'default-agent',
          name: 'Default Agent',
          model: 'llama3.2:3b',
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant specialized in iterative problem solving.',
          tools: [],
          metadata: {
            cost: 0.001,
            latency: 500,
            capabilities: ['general'],
            tags: ['default']
          }
        }
      },
      toolRegistry: {},
      iterativeWrapper: {
        layers: [
          {
            name: 'Processing Layer',
            agentRefs: ['default-agent'],
            maxAttempts: 3,
            strategy: 'sequential',
            patterns: [],
            onSuccess: 'continue',
            onFailure: 'retry'
          }
        ]
      },
      settings: {
        timeout: 300000,
        maxCost: 1.0,
        parallelism: 1
      },
      metadata: {
        created: new Date().toISOString(),
        tags: []
      }
    };
    this.render();
  }
  
  async editWorkflow(workflowId) {
    this.selectedWorkflow = this.workflows.find(w => w.id === workflowId);
    
    // Ensure workflow has registry properties for v2.0 features
    // This allows editing older workflows with new v2.0 UI features
    if (!this.selectedWorkflow.agentRegistry) {
      this.selectedWorkflow.agentRegistry = {};
      
      // Migrate v1.0 single agent to v2.0 agent registry
      if (this.selectedWorkflow.agent) {
        const legacyAgent = this.selectedWorkflow.agent;
        this.selectedWorkflow.agentRegistry['migrated-agent'] = {
          id: 'migrated-agent',
          name: 'Main Agent (Migrated)',
          model: legacyAgent.model || 'llama3.2:3b',
          temperature: legacyAgent.temperature || 0.7,
          systemPrompt: legacyAgent.systemPrompt || 'You are a helpful AI assistant specialized in iterative problem solving.',
          tools: this.selectedWorkflow.tools || [],
          metadata: {
            cost: 0.001,
            latency: 500,
            capabilities: ['general'],
            tags: ['migrated', 'legacy']
          }
        };
        
        // Update layers to reference the migrated agent
        if (this.selectedWorkflow.layers && this.selectedWorkflow.layers.length > 0) {
          this.selectedWorkflow.layers.forEach(layer => {
            if (!layer.agentRefs || layer.agentRefs.length === 0) {
              layer.agentRefs = ['migrated-agent'];
            }
          });
        }
      } else {
        // No legacy agent - create a default one
        this.selectedWorkflow.agentRegistry['default-agent'] = {
          id: 'default-agent',
          name: 'Default Agent',
          model: 'llama3.2:3b',
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant specialized in iterative problem solving.',
          tools: [],
          metadata: {
            cost: 0.001,
            latency: 500,
            capabilities: ['general'],
            tags: ['default']
          }
        };
      }
    }
    
    if (!this.selectedWorkflow.toolRegistry) {
      this.selectedWorkflow.toolRegistry = {};
    }
    
    // Ensure iterativeWrapper structure exists
    if (!this.selectedWorkflow.iterativeWrapper) {
      this.selectedWorkflow.iterativeWrapper = {
        layers: this.selectedWorkflow.layers || []
      };
      
      // If no layers exist, create a default one
      if (this.selectedWorkflow.iterativeWrapper.layers.length === 0) {
        const firstAgentId = Object.keys(this.selectedWorkflow.agentRegistry)[0];
        this.selectedWorkflow.iterativeWrapper.layers = [
          {
            name: 'Processing Layer',
            agentRefs: firstAgentId ? [firstAgentId] : [],
            maxAttempts: 3,
            strategy: 'sequential',
            patterns: [],
            onSuccess: 'continue',
            onFailure: 'retry'
          }
        ];
      }
    }
    
    this.render();
  }
  
  async deleteWorkflow(workflowId) {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const res = await fetch(`http://localhost:3003/iaf/workflows/${workflowId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        this.workflows = this.workflows.filter(w => w.id !== workflowId);
        this.render();
      }
    } catch (err) {
      alert('Error deleting workflow: ' + err.message);
    }
  }
  
  async saveWorkflow() {
    const workflow = this.selectedWorkflow;
    const isHierarchical = workflow.agentRegistry || workflow.toolRegistry;
    
    // Collect basic data
    workflow.name = this.container.querySelector('#workflow-name').value;
    workflow.version = this.container.querySelector('#workflow-version').value;
    workflow.description = this.container.querySelector('#workflow-description').value;
    
    if (isHierarchical) {
      // Handle hierarchical workflow (v2.0)
      // Update layers with name, agent refs, and strategy
      const layers = workflow.iterativeWrapper?.layers || [];
      layers.forEach((layer, index) => {
        const nameInput = this.container.querySelector(`.layer-name[data-layer-index="${index}"]`);
        if (nameInput) layer.name = nameInput.value;
        
        // Collect checked agents (checkboxes instead of multi-select)
        const agentCheckboxes = this.container.querySelectorAll(`.agent-checkbox[data-layer-index="${index}"]:checked`);
        if (agentCheckboxes.length > 0) {
          layer.agentRefs = Array.from(agentCheckboxes).map(cb => cb.dataset.agentId);
        }
        
        // Update patterns from inline editors
        const patternCards = this.container.querySelectorAll(`.pattern-card[data-layer-index="${index}"]`);
        layer.patterns = Array.from(patternCards).map(card => ({
          pattern: card.querySelector('.pattern-text').value,
          fix: card.querySelector('.pattern-fix').value
        })).filter(p => p.pattern.trim());
        
        
        const strategySelect = this.container.querySelector(`.layer-strategy[data-layer-index="${index}"]`);
        if (strategySelect) layer.strategy = strategySelect.value;
        
        const maxAttemptsInput = this.container.querySelector(`.layer-max-attempts[data-layer-index="${index}"]`);
        if (maxAttemptsInput) layer.maxAttempts = parseInt(maxAttemptsInput.value);
        
        const successSelect = this.container.querySelector(`.layer-success-action[data-layer-index="${index}"]`);
        if (successSelect) layer.onSuccess = successSelect.value;
        
        const failureSelect = this.container.querySelector(`.layer-failure-action[data-layer-index="${index}"]`);
        if (failureSelect) layer.onFailure = failureSelect.value;
      });
      
      // Agent registry and tool registry are managed separately through modals
      // They're already in workflow.agentRegistry and workflow.toolRegistry
      
    } else {
      // Handle legacy workflow (v1.0)
      const agentModel = this.container.querySelector('#agent-model');
      const agentTemp = this.container.querySelector('#agent-temperature');
      const agentPrompt = this.container.querySelector('#agent-system-prompt');
      
      if (agentModel && agentTemp && agentPrompt) {
        workflow.agent = workflow.agent || {};
        const modelSelect = agentModel.value;
        const modelCustom = this.container.querySelector('#agent-model-custom');
        workflow.agent.model = modelSelect === 'custom' ? modelCustom.value : modelSelect;
        workflow.agent.temperature = parseFloat(agentTemp.value);
        workflow.agent.systemPrompt = agentPrompt.value;
      }
      
      // Collect selected tools
      const toolCheckboxes = this.container.querySelectorAll('.tool-checkbox:checked');
      if (toolCheckboxes.length > 0) {
        workflow.tools = Array.from(toolCheckboxes).map(cb => cb.dataset.toolName);
      }
      
      // Collect selected validators
      const validatorCheckboxes = this.container.querySelectorAll('.validator-checkbox:checked');
      if (validatorCheckboxes.length > 0) {
        workflow.validation = workflow.validation || {};
        workflow.validation.validators = Array.from(validatorCheckboxes)
          .map(cb => ({ type: cb.dataset.validatorName }));
      }
    }
    
    try {
      const res = await fetch('http://localhost:3003/iaf/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });
      
      if (res.ok) {
        const saved = await res.json();
        if (!workflow.id) {
          this.workflows.push(saved);
        } else {
          const index = this.workflows.findIndex(w => w.id === workflow.id);
          this.workflows[index] = saved;
        }
        this.selectedWorkflow = null;
        this.render();
        alert('Workflow saved successfully!');
      }
    } catch (err) {
      alert('Error saving workflow: ' + err.message);
    }
  }
  
  switchEditorTab(tabName) {
    this.container.querySelectorAll('.editor-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    this.container.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tabContent === tabName);
    });
  }
  
  addLayer() {
    const layers = this.selectedWorkflow.iterativeWrapper?.layers || this.selectedWorkflow.layers || [];
    const isHierarchical = this.selectedWorkflow.iterativeWrapper !== undefined;
    
    const newLayer = {
      name: `Layer ${layers.length + 1}`,
      maxAttempts: 3,
      strategy: 'sequential',
      patterns: [],
      onSuccess: 'continue',
      onFailure: 'retry'
    };
    
    if (isHierarchical) {
      newLayer.agentRefs = [];
      if (!this.selectedWorkflow.iterativeWrapper.layers) {
        this.selectedWorkflow.iterativeWrapper.layers = [];
      }
      this.selectedWorkflow.iterativeWrapper.layers.push(newLayer);
    } else {
      newLayer.successAction = 'continue';
      newLayer.failureAction = 'escalate';
      if (!this.selectedWorkflow.layers) {
        this.selectedWorkflow.layers = [];
      }
      this.selectedWorkflow.layers.push(newLayer);
    }
    
    this.render();
  }
  
  removeLayer(index) {
    this.selectedWorkflow.layers.splice(index, 1);
    this.render();
  }
  
  addPattern(layerIndex) {
    const layers = this.selectedWorkflow.iterativeWrapper?.layers || this.selectedWorkflow.layers;
    if (!layers[layerIndex].patterns) {
      layers[layerIndex].patterns = [];
    }
    layers[layerIndex].patterns.push({
      pattern: '',
      fix: 'Retry'
    });
    
    // Save the current active tab before re-rendering
    const activeTab = this.container.querySelector('.editor-tab.active')?.dataset.tab || 'general';
    this.render();
    
    // Restore the active tab after render
    setTimeout(() => {
      const tabToActivate = this.container.querySelector(`[data-tab="${activeTab}"]`);
      const contentToShow = this.container.querySelector(`[data-tab-content="${activeTab}"]`);
      if (tabToActivate && contentToShow) {
        this.container.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
        this.container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tabToActivate.classList.add('active');
        contentToShow.classList.add('active');
      }
    }, 0);
  }
  
  showToolModal() {
    const modal = this.container.querySelector('#tool-modal');
    modal.style.display = 'flex';
  }
  
  hideToolModal() {
    const modal = this.container.querySelector('#tool-modal');
    modal.style.display = 'none';
  }
  
  switchToolForm(type) {
    const llmForm = this.container.querySelector('#llm-tool-form');
    const customForm = this.container.querySelector('#custom-tool-form');
    
    if (type === 'llm') {
      llmForm.style.display = 'block';
      customForm.style.display = 'none';
    } else {
      llmForm.style.display = 'none';
      customForm.style.display = 'block';
    }
  }
  
  async saveTool() {
    const type = this.container.querySelector('#tool-type-select').value;
    let tool;
    
    if (type === 'llm') {
      tool = {
        name: this.container.querySelector('#llm-tool-name').value,
        type: 'llm',
        model: this.container.querySelector('#llm-tool-model').value,
        endpoint: this.container.querySelector('#llm-tool-endpoint').value,
        description: this.container.querySelector('#llm-tool-description').value
      };
    } else {
      tool = {
        name: this.container.querySelector('#custom-tool-name').value,
        type: 'custom',
        description: this.container.querySelector('#custom-tool-description').value,
        code: this.container.querySelector('#custom-tool-code').value
      };
    }
    
    try {
      const res = await fetch('http://localhost:3003/iaf/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool)
      });
      
      if (res.ok) {
        const saved = await res.json();
        this.tools.push(saved);
        this.hideToolModal();
        this.render();
      }
    } catch (err) {
      alert('Error saving tool: ' + err.message);
    }
  }
  
  selectWorkflowForTest(workflowId) {
    this.testingWorkflow = this.workflows.find(w => w.id === workflowId);
    this.currentView = 'test';
    this.testProgress = [];
    this.render();
  }
  
  async runTest() {
    const inputEl = this.container.querySelector('#test-input');
    const testInput = inputEl ? inputEl.value : '';
    
    this.testProgress = [];
    this.testResult = null;
    this.testProgress.push({
      type: 'info',
      message: `Starting workflow execution with input: ${testInput.substring(0, 50)}...`,
      timestamp: Date.now()
    });
    
    // Update just the log area, not the whole page
    this.updateProgressLog();
    
    try {
      let layerResults = [];
      
      // Helper to handle SSE messages - defined before readStream
      const handleSSEMessage = (data) => {
        console.log('🔍 Processing SSE:', { type: data.type, hasOutput: !!data.output, hasCode: !!data.code, messagePreview: data.message?.substring(0, 30) });
        
        // Capture layer completion scores
        if (data.message?.includes('Complete (score:')) {
          const scoreMatch = data.message.match(/score: (\d+)/);
          if (scoreMatch) {
            layerResults.push(parseInt(scoreMatch[1]));
          }
        }
        
        // Check for completion with code/data
        if (data.type === 'complete' && data.output) {
          console.log('✅ COMPLETION RECEIVED!', {
            codeLength: data.output?.length,
            validated: data.validated,
            itemCount: data.itemCount,
            missingFields: data.missingFields
          });
          
          const avgScore = layerResults.length > 0 
            ? Math.round(layerResults.reduce((a, b) => a + b, 0) / layerResults.length)
            : (data.validated ? 95 : 75);
          
          this.testResult = {
            success: data.validated || data.itemCount > 0,
            iterations: data.supervisorIterations || this.testingWorkflow.layers?.length || 0,
            attempts: data.attempts || 0,
            score: avgScore,
            data: {
              code: data.output,
              validated: data.validated,
              itemCount: data.itemCount || 0,
              missingFields: data.missingFields || [],
              fieldsRequired: data.fieldsRequired || [],
              workflow: this.testingWorkflow.name,
              input: testInput,
              config: data.config,
              layerScores: layerResults,
              timestamp: new Date().toISOString()
            }
          };
          return;
        }
        
        // Legacy: Check for completion by message string
        if (data.message?.includes('Workflow execution complete')) {
          const avgScore = layerResults.length > 0 
            ? Math.round(layerResults.reduce((a, b) => a + b, 0) / layerResults.length)
            : 0;
          
          this.testResult = {
            success: avgScore >= 70,
            iterations: this.testingWorkflow.layers?.length || 0,
            score: avgScore,
            data: {
              workflow: this.testingWorkflow.name,
              input: testInput,
              layerScores: layerResults,
              timestamp: new Date().toISOString()
            }
          };
        }
        
        // Store code and validation data if present
        if (data.code) {
          if (!this.testResult) this.testResult = {};
          if (!this.testResult.data) this.testResult.data = {};
          this.testResult.data.code = data.code;
          this.testResult.data.validated = data.validated || false;
          this.testResult.data.itemCount = data.itemCount || 0;
          this.testResult.data.missingFields = data.missingFields || [];
          this.testResult.data.fieldsRequired = data.fieldsRequired || [];
        }
        
        this.testProgress.push({
          type: data.type || 'info',
          message: data.message,
          timestamp: Date.now()
        });
        this.updateProgressLog();
      };
      
      // Use fetch instead of EventSource to send POST data
      const response = await fetch(`http://localhost:3003/iaf/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: this.testingWorkflow.id,
          input: testInput
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(line.substring(6));
              console.log('📨 SSE message received:', data.type, data.message?.substring(0, 50));
              handleSSEMessage(data);
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      };
      
      await readStream();
      
      // Execution complete
      this.testProgress.push({
        type: 'info',
        message: 'Execution complete - Connection closed',
        timestamp: Date.now()
      });
      this.updateProgressLog();
      
      // Re-render to show results
      if (this.testResult) {
        this.render();
      }
    } catch (err) {
      this.testProgress.push({
        type: 'error',
        message: 'Error: ' + err.message,
        timestamp: Date.now()
      });
      this.updateProgressLog();
    }
  }
  
  updateProgressLog() {
    const logContainer = this.container.querySelector('#progress-log');
    if (!logContainer) return;
    
    logContainer.innerHTML = this.testProgress.length === 0 ? `
      <p class="empty-state">Click "Run Test" to start execution...</p>
    ` : this.testProgress.map(log => `
      <div class="log-entry log-${log.type}">
        <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
        <span class="log-message">${log.message}</span>
      </div>
    `).join('');
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }
  
  copyResults() {
    const resultOutput = this.container.querySelector('#result-output');
    if (resultOutput) {
      navigator.clipboard.writeText(resultOutput.textContent);
      alert('✅ Results copied to clipboard!');
    }
  }
  
  downloadResults() {
    if (!this.testResult) return;
    
    const blob = new Blob([JSON.stringify(this.testResult, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-result-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Continue iteration with automatic feedback for missing fields
   */
  async continueIteration() {
    if (!this.testResult?.data?.missingFields || !this.testResult?.data?.code) {
      alert('No missing fields to improve');
      return;
    }
    
    this.testProgress.push({
      type: 'info',
      message: '🔄 Continuing iteration with automatic feedback for missing fields...',
      timestamp: Date.now()
    });
    this.updateProgressLog();
    
    // Build automatic feedback for missing fields
    const feedback = this.testResult.data.missingFields.map(field => ({
      field: field,
      issue: 'missing',
      notes: `Please find the correct selector for the "${field}" field. Look for elements that contain this data in the HTML structure.`
    }));
    
    console.log('🤖 Auto-generated feedback:', feedback);
    
    // Re-run the workflow with feedback context
    // For now, just show a message that this feature is coming
    alert(`🔄 Iteration feature:\n\nWould improve these fields:\n${feedback.map(f => `  • ${f.field}`).join('\n')}\n\nFor full iteration support, use the Scraper Agent UI on the main page.`);
  }
  
  async executeGeneratedScraper() {
    // Check if we have generated scraper code
    const generatedCode = this.testResult?.data?.code;
    
    if (generatedCode) {
      // We have actual scraper code - run it!
      await this.runGeneratedScraper(generatedCode);
      return;
    }
    
    // Fallback: transfer config to Scraper Agent
    if (!this.testResult?.data?.input && !this.testResult?.data?.config) {
      alert('❌ No scraper code or configuration found in results');
      return;
    }
    
    try {
      // Parse the input/config which contains the scraper config
      const scraperConfig = this.testResult.data.config || 
        (typeof this.testResult.data.input === 'string'
          ? JSON.parse(this.testResult.data.input)
          : this.testResult.data.input);
      
      // Navigate to the scraper agent UI with this config
      if (confirm('Transfer to Scraper Agent?\n\nThis will open the Scraper Agent to generate the scraper.')) {
        // Store config in localStorage for the scraper agent to pick up
        localStorage.setItem('pending_scraper_config', JSON.stringify(scraperConfig));
        
        // Navigate to scraper agent
        window.location.href = '/';
      }
    } catch (err) {
      alert('Error parsing scraper configuration: ' + err.message);
      console.error('Scraper config error:', err);
    }
  }
  
  async runGeneratedScraper(code) {
    const runModal = document.createElement('div');
    runModal.className = 'modal-overlay';
    runModal.innerHTML = `
      <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow: auto;">
        <h2>🚀 Run Generated Scraper</h2>
        
        <div style="margin: 20px 0;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">
            Target URL:
          </label>
          <input 
            type="text" 
            id="scraper-target-url" 
            value="${this.testResult?.data?.config?.startUrl || ''}"
            placeholder="https://example.com"
            style="width: 100%; padding: 8px; border: 1px solid #444; background: #1a1a1a; color: #e0e0e0; border-radius: 4px;"
          />
        </div>
        
        <div style="margin: 20px 0;">
          <button id="run-scraper-btn" class="btn-primary" style="margin-right: 8px;">
            ▶️ Run Scraper
          </button>
          <button id="copy-code-btn" class="btn-secondary" style="margin-right: 8px;">
            📋 Copy Code
          </button>
          <button id="close-modal-btn" class="btn-secondary">
            ✖️ Close
          </button>
        </div>
        
        <details open style="margin: 20px 0;">
          <summary style="cursor: pointer; font-weight: 600; margin-bottom: 12px;">Generated Scraper Code</summary>
          <pre style="background: #0d1117; padding: 16px; border-radius: 6px; overflow: auto; max-height: 300px; font-size: 13px; line-height: 1.5;"><code>${this.escapeHtml(code)}</code></pre>
        </details>
        
        <div id="scraper-output" style="margin: 20px 0; display: none;">
          <h3 style="margin-bottom: 12px;">📊 Scraper Output</h3>
          <div id="output-content" style="background: #0d1117; padding: 16px; border-radius: 6px; max-height: 400px; overflow: auto;">
            <div class="loading-spinner">Running scraper...</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(runModal);
    
    // Event listeners
    document.getElementById('run-scraper-btn').addEventListener('click', async () => {
      const url = document.getElementById('scraper-target-url').value.trim();
      if (!url) {
        alert('Please enter a target URL');
        return;
      }
      
      const outputDiv = document.getElementById('scraper-output');
      const outputContent = document.getElementById('output-content');
      outputDiv.style.display = 'block';
      outputContent.innerHTML = '<div class="loading-spinner">🔄 Running scraper on ' + url + '...</div>';
      
      try {
        // Send to execute server
        const response = await fetch('http://localhost:3002/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, url })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          // Store results for feedback
          this.lastScraperResult = {
            items: result.items,
            code: code,
            url: url,
            fieldsRequired: this.testResult?.data?.fieldsRequired || []
          };
          
          // Render field-level output table
          outputContent.innerHTML = this.renderFieldTable(result.items, code);
          
          // Attach field feedback buttons
          this.attachFieldFeedbackListeners();
        } else {
          outputContent.innerHTML = `
            <div style="color: #f87171; margin-bottom: 12px;">❌ Error: ${result.error || 'Unknown error'}</div>
            ${result.logs ? `<div style="margin-top: 12px; color: #94a3b8;"><strong>Logs:</strong><pre style="margin-top: 8px;">${result.logs.join('\n')}</pre></div>` : ''}
          `;
        }
      } catch (err) {
        outputContent.innerHTML = `
          <div style="color: #f87171;">❌ Failed to run scraper: ${err.message}</div>
          <div style="margin-top: 12px; color: #94a3b8;">Make sure the execute server is running on port 3002</div>
        `;
      }
    });
    
    document.getElementById('copy-code-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(code);
      alert('✅ Scraper code copied to clipboard!');
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', () => {
      document.body.removeChild(runModal);
    });
    
    // Close on overlay click
    runModal.addEventListener('click', (e) => {
      if (e.target === runModal) {
        document.body.removeChild(runModal);
      }
    });
  }
  
  renderFieldTable(items, code) {
    if (!items || items.length === 0) {
      return `<div style="color: #fbbf24;">⚠️ No items extracted</div>`;
    }
    
    // Get all unique field names
    const fields = new Set();
    items.forEach(item => Object.keys(item).forEach(key => fields.add(key)));
    const fieldNames = Array.from(fields);
    
    // Build table
    const tableHTML = `
      <div style="color: #4ade80; margin-bottom: 16px;">
        ✅ Success! Extracted ${items.length} items
        <button id="refine-scraper-btn" class="btn-primary" style="margin-left: 12px; padding: 6px 12px; font-size: 13px;">
          🔧 Fix Fields & Re-generate
          <span id="feedback-count-badge" style="display: none; margin-left: 6px; padding: 2px 6px; background: #4ade80; color: #000; border-radius: 10px; font-size: 11px; font-weight: 700;"></span>
        </button>
      </div>
      
      <div style="overflow-x: auto; border: 1px solid #333; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #1a1a1a; border-bottom: 2px solid #333;">
              <th style="padding: 10px; text-align: left; font-weight: 600; color: #94a3b8;">#</th>
              ${fieldNames.map(field => {
                // Check if field is empty in most items
                const emptyCount = items.filter(item => !item[field] || item[field].trim() === '').length;
                const coverage = Math.round(((items.length - emptyCount) / items.length) * 100);
                const hasIssue = coverage < 50;
                
                return `<th style="padding: 10px; text-align: left; font-weight: 600; color: ${hasIssue ? '#f59e0b' : coverage < 100 ? '#94a3b8' : '#4ade80'};">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span>${field}</span>
                    <button class="fix-field-btn" data-field="${field}" style="padding: 4px 8px; background: ${hasIssue ? '#f59e0b' : '#3b82f6'}; color: ${hasIssue ? '#000' : '#fff'}; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; white-space: nowrap;">
                      ${hasIssue ? '⚠️ Fix' : '💬 Comment'}
                    </button>
                    <span style="padding: 2px 6px; background: ${hasIssue ? 'rgba(251, 191, 36, 0.2)' : coverage < 100 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(74, 222, 128, 0.2)'}; border-radius: 4px; font-size: 10px; font-weight: 600; color: ${hasIssue ? '#f59e0b' : coverage < 100 ? '#94a3b8' : '#4ade80'};">
                      ${coverage}%
                    </span>
                  </div>
                </th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${items.slice(0, 10).map((item, idx) => `
              <tr style="border-bottom: 1px solid #2a2a2a; ${idx % 2 === 0 ? 'background: #0d1117;' : ''}">
                <td style="padding: 8px; color: #6b7280;">${idx + 1}</td>
                ${fieldNames.map(field => {
                  const value = item[field] || '';
                  const isEmpty = !value || value.trim() === '';
                  return `<td style="padding: 8px; color: ${isEmpty ? '#6b7280' : '#e0e0e0'}; ${isEmpty ? 'font-style: italic;' : ''}">
                    ${isEmpty ? '(empty)' : this.escapeHtml(value.substring(0, 100))}
                  </td>`;
                }).join('')}
              </tr>
            `).join('')}
            ${items.length > 10 ? `
              <tr>
                <td colspan="${fieldNames.length + 1}" style="padding: 12px; text-align: center; color: #6b7280; font-style: italic;">
                  ... and ${items.length - 10} more items
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      
      <details style="margin-top: 16px;">
        <summary style="cursor: pointer; color: #94a3b8; font-size: 13px;">View Raw JSON</summary>
        <pre style="margin-top: 8px; color: #e0e0e0; font-size: 12px; line-height: 1.5;">${JSON.stringify(items, null, 2)}</pre>
      </details>
    `;
    
    return tableHTML;
  }
  
  attachFieldFeedbackListeners() {
    // Attach fix field buttons
    document.querySelectorAll('.fix-field-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const field = e.target.dataset.field;
        this.showFieldFeedbackModal(field);
      });
    });
    
    // Attach refine button
    const refineBtn = document.getElementById('refine-scraper-btn');
    if (refineBtn) {
      refineBtn.addEventListener('click', () => this.refineScraperWithFeedback());
    }
  }
  
  showFieldFeedbackModal(field) {
    // Extract current selector for this field from the code
    const selectorMatch = this.lastScraperResult.code.match(
      new RegExp(`${field}:\\s*\\$\\(el\\)\\.find\\(['"]([^'"]+)['"]\\)`, 'i')
    );
    const currentSelector = selectorMatch ? selectorMatch[1] : '(not found)';
    
    // Analyze field status
    const items = this.lastScraperResult.items || [];
    const populatedItems = items.filter(item => item[field] && String(item[field]).trim());
    const coverage = items.length > 0 ? Math.round((populatedItems.length / items.length) * 100) : 0;
    const sampleValues = populatedItems.slice(0, 3).map(item => item[field]);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <h2>💬 Provide Feedback: "${field}"</h2>
        
        <div style="margin: 20px 0; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px;">
            <div>
              <strong style="color: #94a3b8;">Coverage:</strong>
              <div style="font-size: 24px; font-weight: 700; color: ${coverage < 50 ? '#f59e0b' : coverage < 100 ? '#3b82f6' : '#4ade80'};">
                ${coverage}%
              </div>
              <small style="color: #6b7280;">${populatedItems.length}/${items.length} items</small>
            </div>
            <div style="grid-column: span 2;">
              <strong style="color: #94a3b8;">Current Selector:</strong>
              <code style="display: block; background: #1a1a1a; padding: 6px 8px; border-radius: 3px; margin-top: 4px; word-break: break-all; font-size: 12px;">${this.escapeHtml(currentSelector)}</code>
            </div>
          </div>
          
          ${sampleValues.length > 0 ? `
            <div style="margin-top: 12px;">
              <strong style="color: #94a3b8;">Sample Values:</strong>
              <ul style="margin: 8px 0; padding-left: 20px; color: #e0e0e0; font-size: 13px;">
                ${sampleValues.map(val => `<li style="margin: 4px 0;">"${this.escapeHtml(String(val).substring(0, 100))}"</li>`).join('')}
              </ul>
            </div>
          ` : `
            <div style="margin-top: 12px; color: #f59e0b;">
              ⚠️ No data currently extracted for this field
            </div>
          `}
        </div>
        
        <form id="field-feedback-form">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
              What type of feedback are you providing?
            </label>
            <select name="issue" id="feedback-issue-type" style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 4px;">
              ${coverage === 0 ? `
                <option value="missing">❌ No data extracted (all empty)</option>
                <option value="wrong-selector">🎯 Selector pointing to wrong element</option>
              ` : coverage < 50 ? `
                <option value="partial">⚠️ Some rows work, others don't</option>
                <option value="wrong-selector">🎯 Selector inconsistent/wrong</option>
                <option value="missing">❌ Should extract more data</option>
              ` : coverage < 100 ? `
                <option value="partial">⚠️ Missing in some rows</option>
                <option value="format">📝 Wrong format or needs cleaning</option>
                <option value="wrong">🔄 Extracting wrong data</option>
                <option value="improvement">💡 Suggestion for improvement</option>
              ` : `
                <option value="format">📝 Format needs adjustment</option>
                <option value="wrong">🔄 Extracting wrong data</option>
                <option value="improvement">💡 Suggestion for improvement</option>
                <option value="quality">✨ Data quality issue</option>
              `}
            </select>
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
              Correct CSS Selector (optional):
            </label>
            <input 
              type="text" 
              name="correctSelector" 
              placeholder="e.g., .event-time, div.datetime .time, etc."
              style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 4px;"
            />
            <small style="display: block; margin-top: 6px; color: #6b7280; font-size: 12px;">
              💡 <strong>Tip:</strong> Right-click the correct element on the page → Inspect → Copy selector from DevTools
            </small>
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
              Expected Value(s) - Show Examples:
            </label>
            <div id="expected-values-container" style="display: flex; flex-direction: column; gap: 8px;">
              <input 
                type="text" 
                name="expectedValue1"
                placeholder="Example: 9:00 AM, or Meeting Title, etc."
                style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 4px;"
              />
            </div>
            <button type="button" id="add-expected-value" style="margin-top: 8px; padding: 6px 12px; background: #374151; color: #e0e0e0; border: 1px solid #4b5563; border-radius: 4px; cursor: pointer; font-size: 12px;">
              + Add Another Example
            </button>
            <small style="display: block; margin-top: 6px; color: #6b7280; font-size: 12px;">
              Show what the field SHOULD contain with real examples from the page
            </small>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
              Detailed Feedback / Guidance:
            </label>
            <textarea 
              name="notes" 
              rows="4"
              placeholder="Examples:
• The time is in the sidebar, not the main content
• Should extract HH:MM format, currently getting full datetime
• Look for the element with class 'meeting-time' inside each event card
• Field should be a URL, not just text"
              style="width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 4px; resize: vertical; font-family: inherit; line-height: 1.5;"
            ></textarea>
            <small style="display: block; margin-top: 6px; color: #6b7280; font-size: 12px;">
              Be specific! The AI will use this to understand what you want.
            </small>
          </div>
          
          <div style="display: flex; gap: 8px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #333;">
            <button type="button" id="cancel-feedback-btn" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
              💾 Save Feedback
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add expected value inputs dynamically
    let expectedValueCount = 1;
    document.getElementById('add-expected-value').addEventListener('click', () => {
      expectedValueCount++;
      const container = document.getElementById('expected-values-container');
      const input = document.createElement('input');
      input.type = 'text';
      input.name = `expectedValue${expectedValueCount}`;
      input.placeholder = `Example ${expectedValueCount}`;
      input.style.cssText = 'width: 100%; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 4px;';
      container.appendChild(input);
    });
    
    // Initialize feedback collection
    if (!this.fieldFeedback) this.fieldFeedback = [];
    
    // Form submission
    const form = document.getElementById('field-feedback-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      
      // Collect all expected values
      const expectedValues = [];
      for (let i = 1; i <= expectedValueCount; i++) {
        const value = formData.get(`expectedValue${i}`);
        if (value && value.trim()) {
          expectedValues.push(value.trim());
        }
      }
      
      const feedback = {
        field: field,
        issue: formData.get('issue'),
        correctSelector: formData.get('correctSelector'),
        notes: formData.get('notes'),
        expectedValues: expectedValues.length > 0 ? expectedValues : undefined,
        currentCoverage: coverage,
        currentSelector: currentSelector
      };
      
      // Remove any existing feedback for this field
      this.fieldFeedback = this.fieldFeedback.filter(f => f.field !== field);
      // Add new feedback
      this.fieldFeedback.push(feedback);
      
      console.log('💾 Saved feedback for field:', field, feedback);
      document.body.removeChild(modal);
      
      // Update the button to show feedback was provided
      const btn = document.querySelector(`.fix-field-btn[data-field="${field}"]`);
      if (btn) {
        btn.innerHTML = '✓ Feedback';
        btn.style.background = '#4ade80';
        btn.style.color = '#000';
      }
      
      // Show feedback count
      this.updateFeedbackCount();
    });
    
    // Cancel button
    document.getElementById('cancel-feedback-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  async refineScraperWithFeedback() {
    if (!this.fieldFeedback || this.fieldFeedback.length === 0) {
      alert('Please provide feedback for at least one field first.\n\nClick the "Fix" button next to problematic fields.');
      return;
    }
    
    if (!confirm(`Re-generate scraper with feedback for ${this.fieldFeedback.length} field(s)?\n\nThis will use your feedback to improve the scraper.`)) {
      return;
    }
    
    // Show loading state
    const outputDiv = document.getElementById('scraper-output');
    const outputContent = document.getElementById('output-content');
    outputContent.innerHTML = '<div class="loading-spinner">🔄 Re-generating scraper with your feedback...</div>';
    
    try {
      // Send to backend for refinement
      const response = await fetch('http://localhost:3003/iaf/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: 'real-scraper-agent',
          input: JSON.stringify({
            name: this.testResult.data.config?.name || 'Refined Scraper',
            startUrl: this.lastScraperResult.url,
            pageStructures: [{
              fields: this.lastScraperResult.fieldsRequired.map(field => ({
                fieldName: field,
                selectorSteps: [{ selector: '' }]
              }))
            }]
          }),
          refinement: {
            originalCode: this.lastScraperResult.code,
            feedback: this.fieldFeedback,
            fieldsRequired: this.lastScraperResult.fieldsRequired
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Handle SSE stream for progress
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'complete' && data.output) {
                // Got new scraper code!
                console.log('✅ Refined scraper received, length:', data.output.length);
                
                // Update stored code
                this.lastScraperResult.code = data.output;
                this.testResult.data.code = data.output;
                
                // Show success message
                outputContent.innerHTML = `
                  <div style="color: #4ade80; margin-bottom: 12px;">
                    ✅ Scraper re-generated with your feedback!
                    <button id="rerun-scraper-btn" class="btn-primary" style="margin-left: 12px; padding: 6px 12px;">
                      ▶️ Run Improved Scraper
                    </button>
                  </div>
                  <div style="color: #94a3b8; font-size: 13px;">
                    The scraper has been updated based on your feedback for ${this.fieldFeedback.length} field(s).
                    Click "Run Improved Scraper" to test it.
                  </div>
                `;
                
                // Reset feedback
                this.fieldFeedback = [];
                
                // Attach rerun button
                document.getElementById('rerun-scraper-btn').addEventListener('click', async () => {
                  const url = this.lastScraperResult.url;
                  await this.executeScraperDirectly(data.output, url, outputContent);
                });
                
                break;
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      };
      
      await readStream();
      
    } catch (err) {
      outputContent.innerHTML = `
        <div style="color: #f87171;">❌ Failed to refine scraper: ${err.message}</div>
      `;
    }
  }
  
  async executeScraperDirectly(code, url, outputContent) {
    outputContent.innerHTML = '<div class="loading-spinner">🔄 Running improved scraper on ' + url + '...</div>';
    
    try {
      const response = await fetch('http://localhost:3002/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, url })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.lastScraperResult.items = result.items;
        outputContent.innerHTML = this.renderFieldTable(result.items, code);
        this.attachFieldFeedbackListeners();
      } else {
        outputContent.innerHTML = `
          <div style="color: #f87171; margin-bottom: 12px;">❌ Error: ${result.error || 'Unknown error'}</div>
        `;
      }
    } catch (err) {
      outputContent.innerHTML = `
        <div style="color: #f87171;">❌ Failed to run scraper: ${err.message}</div>
      `;
    }
  }
  
  updateFeedbackCount() {
    const badge = document.getElementById('feedback-count-badge');
    if (badge && this.fieldFeedback && this.fieldFeedback.length > 0) {
      badge.textContent = this.fieldFeedback.length;
      badge.style.display = 'inline';
    } else if (badge) {
      badge.style.display = 'none';
    }
  }
  
  async retryGeneration() {
    if (!this.testingWorkflow) {
      alert('No workflow selected to retry');
      return;
    }
    
    if (!confirm('Retry scraper generation?\n\nThis will run the workflow again from scratch.')) {
      return;
    }
    
    console.log('🔄 Retrying scraper generation...');
    
    // Clear previous results
    this.testResult = null;
    this.testProgress = [];
    this.render();
    
    // Re-run the test
    await this.runTest();
  }
  
  viewDiagnostics() {
    const diagnostics = this.testResult?.data?.diagnostics || {};
    const allErrors = this.testResult?.data?.allErrors || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
        <h2>📊 Generation Diagnostics</h2>
        
        <div style="margin: 20px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div style="padding: 12px; background: #1a1a1a; border-radius: 6px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Attempts</div>
            <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${diagnostics.totalAttempts || 0}</div>
          </div>
          
          <div style="padding: 12px; background: #1a1a1a; border-radius: 6px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Best Attempt</div>
            <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">#${diagnostics.bestAttemptNumber || 0}</div>
          </div>
          
          <div style="padding: 12px; background: #1a1a1a; border-radius: 6px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Items Extracted</div>
            <div style="font-size: 24px; font-weight: 700; color: ${diagnostics.itemsExtracted > 0 ? '#4ade80' : '#f59e0b'};">${diagnostics.itemsExtracted || 0}</div>
          </div>
          
          <div style="padding: 12px; background: #1a1a1a; border-radius: 6px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Field Coverage</div>
            <div style="font-size: 24px; font-weight: 700; color: ${(diagnostics.fieldsWorking / diagnostics.fieldsTotal) > 0.7 ? '#4ade80' : '#f59e0b'};">${diagnostics.fieldsWorking || 0}/${diagnostics.fieldsTotal || 0}</div>
          </div>
        </div>
        
        ${diagnostics.missingFieldsList && diagnostics.missingFieldsList.length > 0 ? `
          <div style="margin: 20px 0; padding: 16px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 6px;">
            <h3 style="margin: 0 0 12px 0; color: #f59e0b;">⚠️ Missing Fields</h3>
            <ul style="margin: 0; padding-left: 20px; color: #e0e0e0;">
              ${diagnostics.missingFieldsList.map(field => `<li style="margin: 4px 0;">${field}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${diagnostics.suggestions && diagnostics.suggestions.length > 0 ? `
          <div style="margin: 20px 0; padding: 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px;">
            <h3 style="margin: 0 0 12px 0; color: #3b82f6;">💡 Suggestions</h3>
            <ul style="margin: 0; padding-left: 20px; color: #e0e0e0;">
              ${diagnostics.suggestions.map(s => `<li style="margin: 8px 0;">${s}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${allErrors && allErrors.length > 0 ? `
          <details style="margin: 20px 0;">
            <summary style="cursor: pointer; font-weight: 600; color: #94a3b8; padding: 8px; background: #1a1a1a; border-radius: 4px;">
              Error History (${allErrors.length} errors)
            </summary>
            <div style="margin-top: 12px; max-height: 300px; overflow-y: auto;">
              ${allErrors.map((err, idx) => `
                <div style="padding: 12px; background: #1a1a1a; border-left: 3px solid #f87171; margin-bottom: 8px; border-radius: 4px;">
                  <div style="font-size: 12px; color: #6b7280;">Attempt #${idx + 1}</div>
                  <div style="font-size: 13px; color: #f87171; margin-top: 4px;">
                    <strong>${err.type || 'ERROR'}:</strong> ${err.error || 'Unknown error'}
                  </div>
                </div>
              `).join('')}
            </div>
          </details>
        ` : ''}
        
        <div style="display: flex; gap: 8px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #333; margin-top: 20px;">
          <button id="close-diagnostics-btn" class="btn-primary">
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-diagnostics-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  async showAIGenerateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; margin: -24px -24px 24px -24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 28px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 36px;">🤖</span>
            AI Workflow Generator
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 15px;">
            Describe your automation goal - AI will design a complete workflow with intelligent layers, tools, and validation.
          </p>
        </div>
        
        <form id="ai-generate-form">
          <div style="margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 10px; font-weight: 600; font-size: 15px; color: #f59e0b;">
              📝 What should this workflow do?
            </label>
            <textarea 
              id="workflow-prompt"
              rows="6"
              placeholder="Examples:\n• Extract job listings from tech boards (Indeed, LinkedIn) and track applications\n• Monitor e-commerce prices across sites and alert on drops\n• Aggregate news articles, analyze sentiment, generate daily reports\n• Scrape real estate listings, validate data, export to spreadsheet\n• API data pipeline with rate limiting and retry logic"
              style="width: 100%; padding: 14px; background: rgba(0, 0, 0, 0.3); color: #e0e0e0; border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 8px; resize: vertical; font-family: inherit; line-height: 1.6; font-size: 14px; transition: all 0.3s;"
              onfocus="this.style.borderColor='rgba(245, 158, 11, 0.6)'; this.style.background='rgba(0, 0, 0, 0.4)';"
              onblur="this.style.borderColor='rgba(245, 158, 11, 0.3)'; this.style.background='rgba(0, 0, 0, 0.3)';"
            ></textarea>
          </div>
          
          <div style="margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 10px; font-weight: 600; font-size: 15px; color: #f59e0b;">
              ⚙️ Additional Requirements <span style="opacity: 0.6; font-weight: normal;">(optional)</span>
            </label>
            <textarea 
              id="workflow-requirements"
              rows="3"
              placeholder="Example: Must handle pagination, rate limiting, proxy rotation. Export to JSON and CSV. Include error notifications."
              style="width: 100%; padding: 14px; background: rgba(0, 0, 0, 0.3); color: #e0e0e0; border: 2px solid rgba(245, 158, 11, 0.2); border-radius: 8px; resize: vertical; font-family: inherit; font-size: 14px; transition: all 0.3s;"
              onfocus="this.style.borderColor='rgba(245, 158, 11, 0.5)'; this.style.background='rgba(0, 0, 0, 0.4)';"
              onblur="this.style.borderColor='rgba(245, 158, 11, 0.2)'; this.style.background='rgba(0, 0, 0, 0.3)';"
            ></textarea>
          </div>
          
          <div id="generation-status" style="display: none; margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 10px; color: #60a5fa;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div class="loading-spinner" style="width: 20px; height: 20px; border: 3px solid rgba(96, 165, 250, 0.3); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <strong style="font-size: 16px;">AI is thinking...</strong>
            </div>
            <div id="status-text" style="margin-left: 32px; font-size: 14px; line-height: 1.6; opacity: 0.9;">Initializing generation...</div>
            <div id="progress-bar" style="margin-top: 12px; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); width: 0%; transition: width 0.3s; animation: progress-pulse 2s ease-in-out infinite;"></div>
            </div>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" id="cancel-ai-generate-btn" class="btn-secondary" style="padding: 12px 24px; font-size: 15px;">
              ✕ Cancel
            </button>
            <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 12px 32px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
              ✨ Generate Workflow
            </button>
          </div>
        </form>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes progress-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      </style>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('ai-generate-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const prompt = document.getElementById('workflow-prompt').value.trim();
      const requirements = document.getElementById('workflow-requirements').value.trim();
      
      if (!prompt) {
        // Better error UI instead of ugly alert
        const statusDiv = document.getElementById('generation-status');
        const statusText = document.getElementById('status-text');
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'linear-gradient(135deg, rgba(248, 113, 113, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)';
        statusDiv.style.borderColor = 'rgba(248, 113, 113, 0.5)';
        statusDiv.style.color = '#f87171';
        statusText.innerHTML = '<strong>⚠️ Missing Information</strong><br/>Please describe what you want the workflow to do.';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
        return;
      }
      
      await this.generateWorkflowWithAI(prompt, requirements, modal);
    });
    
    document.getElementById('cancel-ai-generate-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  async generateWorkflowWithAI(prompt, requirements, modal) {
    const statusDiv = document.getElementById('generation-status');
    const statusText = document.getElementById('status-text');
    const progressBar = statusDiv.querySelector('#progress-bar div');
    const submitBtn = modal.querySelector('button[type="submit"]');
    
    statusDiv.style.display = 'block';
    submitBtn.disabled = true;
    
    try {
      const startTime = Date.now();
      statusText.innerHTML = '<strong>🚀 Connecting to AI...</strong><br/>Preparing your workflow generation request...';
      
      const response = await fetch('http://localhost:3003/iaf/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, requirements })
      });
      
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let generatedWorkflow = null;
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.substring(6));
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            
            if (data.stage === 'calling_ai') {
              statusText.innerHTML = `<strong>🧠 AI Model Loading...</strong><br/>Mistral-Nemo is analyzing your requirements...<br/><span style="opacity: 0.7;">⏱️ ${elapsed}s elapsed</span>`;
              if (progressBar) progressBar.style.width = '10%';
            } else if (data.stage === 'generating') {
              const charCount = data.chars || 0;
              const progress = Math.min(90, 10 + (charCount / 3000) * 80);
              statusText.innerHTML = `<strong>✨ AI is creating your workflow...</strong><br/>📝 ${charCount} characters generated<br/><span style="opacity: 0.7;">⏱️ ${elapsed}s • Progress: ${Math.round(progress)}%</span>`;
              if (progressBar) progressBar.style.width = `${progress}%`;
            } else if (data.stage === 'parsing') {
              statusText.innerHTML = `<strong>📋 Parsing workflow...</strong><br/>✅ Generated ${data.chars} characters total<br/><span style="opacity: 0.7;">⏱️ ${elapsed}s</span>`;
              if (progressBar) progressBar.style.width = '92%';
            } else if (data.stage === 'validating') {
              statusText.innerHTML = `<strong>✔️ Validating...</strong><br/>Checking structure and configuration<br/><span style="opacity: 0.7;">⏱️ ${elapsed}s</span>`;
              if (progressBar) progressBar.style.width = '95%';
            } else if (data.stage === 'finalizing') {
              statusText.innerHTML = `<strong>🎯 Finalizing...</strong><br/>Adding metadata...<br/><span style="opacity: 0.7;">⏱️ ${elapsed}s</span>`;
              if (progressBar) progressBar.style.width = '98%';
            } else if (data.stage === 'complete') {
              generatedWorkflow = data.workflow;
              statusText.innerHTML = `<strong>✅ Success!</strong><br/>Generated "${data.workflow.name}" in ${elapsed}s<br/>Opening in editor...`;
              if (progressBar) progressBar.style.width = '100%';
            } else if (data.stage === 'error') {
              throw new Error(data.error);
            } else if (data.message) {
              statusText.innerHTML = `<strong>${data.message}</strong><br/><span style="opacity: 0.7;">⏱️ ${elapsed}s</span>`;
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE line:', line, parseError);
          }
        }
      }
      
      if (!generatedWorkflow) {
        throw new Error('Workflow generation completed but no workflow received. Check backend logs.');
      }
      
      // Auto-save and open the generated workflow
      setTimeout(async () => {
        document.body.removeChild(modal);
        
        // Save the workflow to backend first
        try {
          const saveResponse = await fetch('http://localhost:3003/iaf/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generatedWorkflow)
          });
          
          if (saveResponse.ok) {
            const savedWorkflow = await saveResponse.json();
            console.log('✅ Auto-saved generated workflow:', savedWorkflow.id);
            
            // Reload workflows list
            await this.loadWorkflows();
            
            // Open in editor
            this.selectedWorkflow = savedWorkflow;
            this.currentView = 'editor';
            this.render();
            
            this.showSuccessNotification(
              `✨ AI Generated & Saved: "${generatedWorkflow.name}"`, 
              'The workflow has been saved and opened in the editor. You can test it now!'
            );
          } else {
            // Save failed but still open in editor
            this.selectedWorkflow = generatedWorkflow;
            this.currentView = 'editor';
            this.render();
            
            this.showSuccessNotification(
              `✨ AI Generated: "${generatedWorkflow.name}"`, 
              'Workflow generated! Click Save to store it.'
            );
          }
        } catch (saveError) {
          console.error('Auto-save failed:', saveError);
          // Still open in editor even if save fails
          this.selectedWorkflow = generatedWorkflow;
          this.currentView = 'editor';
          this.render();
          
          this.showSuccessNotification(
            `✨ AI Generated: "${generatedWorkflow.name}"`, 
            'Workflow generated! Click Save to store it.'
          );
        }
      }, 1500);
      
    } catch (error) {
      console.error('AI generation error:', error);
      statusDiv.style.background = 'linear-gradient(135deg, rgba(248, 113, 113, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)';
      statusDiv.style.borderColor = 'rgba(248, 113, 113, 0.5)';
      statusDiv.style.color = '#f87171';
      statusText.innerHTML = `<strong>❌ Generation Failed</strong><br/>${error.message}<br/><span style="opacity: 0.7;">Check that Ollama is running with mistral-nemo model</span>`;
      submitBtn.disabled = false;
    }
  }
  
  showSuccessNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      padding: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: 2px solid rgba(16, 185, 129, 0.5);
      border-radius: 12px;
      color: white;
      box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      </style>
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">✅</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${title}</div>
          <div style="opacity: 0.9; font-size: 14px; line-height: 1.5;">${message}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);
  }
  
  async generateRandomExample() {
    const examples = [
      {
        name: 'E-commerce Price Monitor',
        prompt: 'Create a workflow that monitors product prices across multiple e-commerce websites, compares them, and alerts when prices drop below a threshold',
        category: 'monitoring'
      },
      {
        name: 'News Aggregator & Summarizer',
        prompt: 'Build a workflow that fetches news articles from multiple sources, filters by topic, generates summaries using AI, and compiles a daily digest',
        category: 'content'
      },
      {
        name: 'Job Listing Tracker',
        prompt: 'Create a scraper that monitors job boards for new postings matching specific criteria (tech stack, location, salary), extracts details, and tracks applications',
        category: 'scraping'
      },
      {
        name: 'API Data Pipeline',
        prompt: 'Build a workflow that fetches data from multiple APIs, transforms and enriches the data, validates quality, and exports to database or CSV',
        category: 'data'
      },
      {
        name: 'Social Media Content Analyzer',
        prompt: 'Create a workflow that collects posts from social media, analyzes sentiment and engagement, identifies trends, and generates insights reports',
        category: 'analysis'
      },
      {
        name: 'Document Processor',
        prompt: 'Build a workflow that processes uploaded documents (PDFs, images), extracts text and structured data, categorizes content, and stores metadata',
        category: 'processing'
      },
      {
        name: 'Website Change Detector',
        prompt: 'Create a monitoring workflow that checks specific website elements for changes, compares with previous snapshots, and sends notifications when updates occur',
        category: 'monitoring'
      },
      {
        name: 'Multi-Step Form Automation',
        prompt: 'Build a workflow that fills out complex multi-page forms with validation at each step, handles errors, retries, and confirms submission',
        category: 'automation'
      },
      {
        name: 'Research Paper Analyzer',
        prompt: 'Create a workflow that searches academic databases, downloads papers, extracts key findings and citations, and generates literature review summaries',
        category: 'research'
      },
      {
        name: 'Real Estate Listings Aggregator',
        prompt: 'Build a scraper that collects property listings from multiple sites, normalizes data formats, calculates metrics (price per sqft), and creates comparison reports',
        category: 'scraping'
      }
    ];
    
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    
    if (confirm(`✨ Generate Example Workflow?\n\n${randomExample.name}\n\n${randomExample.prompt}\n\nClick OK to generate this workflow with AI.`)) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; text-align: center;">
          <h2>✨ Generating Example</h2>
          <p style="color: #94a3b8; margin: 20px 0;">${randomExample.name}</p>
          <div class="loading-spinner" style="margin: 20px auto;"></div>
          <p style="color: #6b7280; font-size: 14px;">This may take a moment...</p>
        </div>
      `;
      document.body.appendChild(modal);
      
      try {
        const response = await fetch('http://localhost:3003/iaf/generate-workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: randomExample.prompt,
            requirements: `Category: ${randomExample.category}. Make this a realistic, production-ready example with proper error handling and validation.`
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
        
        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let generatedWorkflow = null;
        const statusP = modal.querySelector('p:last-child');
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.substring(6));
              if (data.stage === 'generating' && data.chars) {
                statusP.textContent = `Generating... ${data.chars} characters created`;
              } else if (data.stage === 'complete') {
                generatedWorkflow = data.workflow;
              }
            } catch (e) {}
          }
        }
        
        if (!generatedWorkflow) {
          throw new Error('No workflow received from server');
        }
        
        document.body.removeChild(modal);
        
        // Auto-save the random example
        try {
          const saveResponse = await fetch('http://localhost:3003/iaf/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generatedWorkflow)
          });
          
          if (saveResponse.ok) {
            const savedWorkflow = await saveResponse.json();
            console.log('✅ Auto-saved example workflow:', savedWorkflow.id);
            
            // Reload workflows list
            await this.loadWorkflows();
            
            // Open in editor
            this.selectedWorkflow = savedWorkflow;
            this.currentView = 'editor';
            this.render();
            
            this.showSuccessNotification(
              `✅ Generated & Saved: ${randomExample.name}`, 
              'The example workflow is ready to test!'
            );
          } else {
            // Save failed but still open
            this.selectedWorkflow = generatedWorkflow;
            this.currentView = 'editor';
            this.render();
            
            this.showSuccessNotification(
              `✅ Generated: ${randomExample.name}`, 
              'Example generated! Click Save to store it.'
            );
          }
        } catch (saveError) {
          console.error('Auto-save failed:', saveError);
          this.selectedWorkflow = generatedWorkflow;
          this.currentView = 'editor';
          this.render();
          
          this.showSuccessNotification(
            `✅ Generated: ${randomExample.name}`, 
            'Example generated! Click Save to store it.'
          );
        }
        
      } catch (error) {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        this.showErrorNotification('Example Generation Failed', error.message);
      }
    }
  }
  
  async showAIEnhanceModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; margin: -24px -24px 24px -24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 28px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 36px;">🤖</span>
            AI Enhance Workflow
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 15px;">
            Describe improvements you want - AI will enhance your current workflow intelligently.
          </p>
        </div>
        
        <form id="ai-enhance-form">
          <div style="margin-bottom: 20px; padding: 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #60a5fa;">📋 Current Workflow</h3>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
              <strong>${this.selectedWorkflow.name}</strong><br/>
              ${this.selectedWorkflow.description || 'No description'}
            </p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 10px; font-weight: 600; font-size: 15px; color: #f59e0b;">
              ✨ What improvements do you want?
            </label>
            <textarea 
              id="enhancement-prompt"
              rows="6"
              placeholder="Examples:\n• Add error handling and retry logic for failed requests\n• Include data validation and quality checks\n• Add rate limiting and caching to reduce API calls\n• Improve performance with parallel processing\n• Add detailed logging and monitoring\n• Include export to multiple formats (CSV, JSON, Excel)"
              style="width: 100%; padding: 14px; background: rgba(0, 0, 0, 0.3); color: #e0e0e0; border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 8px; resize: vertical; font-family: inherit; line-height: 1.6; font-size: 14px; transition: all 0.3s;"
              onfocus="this.style.borderColor='rgba(245, 158, 11, 0.6)'; this.style.background='rgba(0, 0, 0, 0.4)';"
              onblur="this.style.borderColor='rgba(245, 158, 11, 0.3)'; this.style.background='rgba(0, 0, 0, 0.3)';"
            ></textarea>
          </div>
          
          <div id="enhancement-status" style="display: none; margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 10px; color: #60a5fa;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div class="loading-spinner" style="width: 20px; height: 20px; border: 3px solid rgba(96, 165, 250, 0.3); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <strong style="font-size: 16px;">AI is enhancing...</strong>
            </div>
            <div id="enhancement-status-text" style="margin-left: 32px; font-size: 14px; line-height: 1.6; opacity: 0.9;">Analyzing current workflow...</div>
            <div id="enhancement-progress-bar" style="margin-top: 12px; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" id="cancel-enhance-btn" class="btn-secondary" style="padding: 12px 24px; font-size: 15px;">
              ✕ Cancel
            </button>
            <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 12px 32px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
              ✨ Enhance Now
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('ai-enhance-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const enhancementPrompt = document.getElementById('enhancement-prompt').value.trim();
      
      if (!enhancementPrompt) {
        const statusDiv = document.getElementById('enhancement-status');
        const statusText = document.getElementById('enhancement-status-text');
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'linear-gradient(135deg, rgba(248, 113, 113, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)';
        statusDiv.style.borderColor = 'rgba(248, 113, 113, 0.5)';
        statusDiv.style.color = '#f87171';
        statusText.innerHTML = '<strong>⚠️ Missing Information</strong><br/>Please describe what improvements you want.';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
        return;
      }
      
      await this.enhanceWorkflowWithAI(enhancementPrompt, modal);
    });
    
    document.getElementById('cancel-enhance-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  async enhanceWorkflowWithAI(enhancementPrompt, modal) {
    const statusDiv = document.getElementById('enhancement-status');
    const statusText = document.getElementById('enhancement-status-text');
    const progressBar = statusDiv.querySelector('#enhancement-progress-bar div');
    const submitBtn = modal.querySelector('button[type="submit"]');
    
    statusDiv.style.display = 'block';
    submitBtn.disabled = true;
    
    try {
      // Build enhanced prompt that includes current workflow context
      const fullPrompt = `Enhance the following workflow based on user requirements:

CURRENT WORKFLOW:
Name: ${this.selectedWorkflow.name}
Description: ${this.selectedWorkflow.description || 'No description'}
Current Structure: ${JSON.stringify(this.selectedWorkflow, null, 2)}

ENHANCEMENT REQUIREMENTS:
${enhancementPrompt}

Please generate an improved version of this workflow incorporating the requested enhancements while preserving the existing structure and functionality.`;
      
      statusText.innerHTML = '<strong>🚀 Connecting to AI...</strong><br/>Analyzing your current workflow...';
      
      const response = await fetch('http://localhost:3003/iaf/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: fullPrompt,
          requirements: `Enhance existing workflow. Preserve ID: ${this.selectedWorkflow.id || 'new'}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let enhancedWorkflow = null;
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.substring(6));
            
            if (data.stage === 'generating') {
              const charCount = data.chars || 0;
              const progress = Math.min(90, 10 + (charCount / 3000) * 80);
              statusText.innerHTML = `<strong>✨ AI is enhancing...</strong><br/>📝 ${charCount} characters generated`;
              if (progressBar) progressBar.style.width = `${progress}%`;
            } else if (data.stage === 'complete') {
              enhancedWorkflow = data.workflow;
              // Preserve original ID if editing
              if (this.selectedWorkflow.id) {
                enhancedWorkflow.id = this.selectedWorkflow.id;
              }
              statusText.innerHTML = `<strong>✅ Enhancement Complete!</strong><br/>Applying changes...`;
              if (progressBar) progressBar.style.width = '100%';
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE line:', line, parseError);
          }
        }
      }
      
      if (!enhancedWorkflow) {
        throw new Error('Enhancement completed but no workflow received.');
      }
      
      // Apply the enhanced workflow
      setTimeout(() => {
        document.body.removeChild(modal);
        
        // Update the current workflow with enhancements
        this.selectedWorkflow = enhancedWorkflow;
        this.render();
        
        this.showSuccessNotification(
          `✨ Workflow Enhanced!`, 
          'Your workflow has been improved. Review the changes and click Save when ready.'
        );
      }, 1000);
      
    } catch (error) {
      console.error('Enhancement error:', error);
      statusDiv.style.background = 'linear-gradient(135deg, rgba(248, 113, 113, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)';
      statusDiv.style.borderColor = 'rgba(248, 113, 113, 0.5)';
      statusDiv.style.color = '#f87171';
      statusText.innerHTML = `<strong>❌ Enhancement Failed</strong><br/>${error.message}`;
      submitBtn.disabled = false;
    }
  }
  
  async showInspirationModal() {
    const examples = [
      {
        name: 'E-commerce Price Monitor',
        prompt: 'Create a workflow that monitors product prices across multiple e-commerce websites, compares them, and alerts when prices drop below a threshold',
        category: 'monitoring',
        icon: '🛒'
      },
      {
        name: 'News Aggregator & Summarizer',
        prompt: 'Build a workflow that fetches news articles from multiple sources, filters by topic, generates summaries using AI, and compiles a daily digest',
        category: 'content',
        icon: '📰'
      },
      {
        name: 'Job Listing Tracker',
        prompt: 'Create a scraper that monitors job boards for new postings matching specific criteria (tech stack, location, salary), extracts details, and tracks applications',
        category: 'scraping',
        icon: '💼'
      },
      {
        name: 'API Data Pipeline',
        prompt: 'Build a workflow that fetches data from multiple APIs, transforms and enriches the data, validates quality, and exports to database or CSV',
        category: 'data',
        icon: '🔌'
      },
      {
        name: 'Social Media Content Analyzer',
        prompt: 'Create a workflow that collects posts from social media, analyzes sentiment and engagement, identifies trends, and generates insights reports',
        category: 'analysis',
        icon: '📱'
      },
      {
        name: 'Document Processor',
        prompt: 'Build a workflow that processes uploaded documents (PDFs, images), extracts text and structured data, categorizes content, and stores metadata',
        category: 'processing',
        icon: '📄'
      },
      {
        name: 'Website Change Detector',
        prompt: 'Create a monitoring workflow that checks specific website elements for changes, compares with previous snapshots, and sends notifications when updates occur',
        category: 'monitoring',
        icon: '🔍'
      },
      {
        name: 'Real Estate Listings Aggregator',
        prompt: 'Build a scraper that collects property listings from multiple sites, normalizes data formats, calculates metrics (price per sqft), and creates comparison reports',
        category: 'scraping',
        icon: '🏠'
      }
    ];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 24px; margin: -24px -24px 24px -24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 28px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 36px;">✨</span>
            Workflow Inspiration
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 15px;">
            Browse example workflows to get ideas for your project
          </p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; max-height: 60vh; overflow-y: auto; padding: 4px;">
          ${examples.map((example, index) => `
            <div class="inspiration-card" data-example-index="${index}" style="background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
                <span style="font-size: 32px;">${example.icon}</span>
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #a78bfa;">${example.name}</h3>
                  <span style="display: inline-block; padding: 2px 8px; background: rgba(139, 92, 246, 0.2); border-radius: 4px; font-size: 11px; color: #c4b5fd; text-transform: uppercase;">${example.category}</span>
                </div>
              </div>
              <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">${example.prompt}</p>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
          <button id="close-inspiration-btn" class="btn-secondary" style="padding: 12px 24px;">
            Close
          </button>
        </div>
      </div>
      <style>
        .inspiration-card:hover {
          background: rgba(139, 92, 246, 0.2) !important;
          border-color: rgba(139, 92, 246, 0.5) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
      </style>
    `;
    
    document.body.appendChild(modal);
    
    // Add click handlers for each card
    modal.querySelectorAll('.inspiration-card').forEach(card => {
      card.addEventListener('click', async () => {
        const index = parseInt(card.dataset.exampleIndex);
        const example = examples[index];
        
        if (confirm(`Generate "${example.name}" workflow?\n\nThis will replace your current unsaved changes.\n\nClick OK to generate this example.`)) {
          document.body.removeChild(modal);
          
          // Show loading modal
          const loadingModal = document.createElement('div');
          loadingModal.className = 'modal-overlay';
          loadingModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: center;">
              <h2>✨ Generating ${example.icon}</h2>
              <p style="color: #94a3b8; margin: 20px 0;">${example.name}</p>
              <div class="loading-spinner" style="margin: 20px auto;"></div>
              <p style="color: #6b7280; font-size: 14px;">This may take a moment...</p>
            </div>
          `;
          document.body.appendChild(loadingModal);
          
          try {
            const response = await fetch('http://localhost:3003/iaf/generate-workflow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                prompt: example.prompt,
                requirements: `Category: ${example.category}. Make this a realistic, production-ready example with proper error handling and validation.`
              })
            });
            
            if (!response.ok) {
              throw new Error(`Server error (${response.status}): ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let generatedWorkflow = null;
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                try {
                  const data = JSON.parse(line.substring(6));
                  if (data.stage === 'complete') {
                    generatedWorkflow = data.workflow;
                  }
                } catch (e) {}
              }
            }
            
            if (!generatedWorkflow) {
              throw new Error('No workflow received from server');
            }
            
            document.body.removeChild(loadingModal);
            
            // Replace current workflow
            this.selectedWorkflow = generatedWorkflow;
            this.render();
            
            this.showSuccessNotification(
              `✨ Generated: ${example.name}`, 
              'Review the workflow and click Save when ready.'
            );
            
          } catch (error) {
            if (document.body.contains(loadingModal)) {
              document.body.removeChild(loadingModal);
            }
            this.showErrorNotification('Generation Failed', error.message);
          }
        }
      });
    });
    
    document.getElementById('close-inspiration-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  showErrorNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      padding: 20px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border: 2px solid rgba(239, 68, 68, 0.5);
      border-radius: 12px;
      color: white;
      box-shadow: 0 10px 40px rgba(239, 68, 68, 0.4);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      </style>
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">❌</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${title}</div>
          <div style="opacity: 0.9; font-size: 14px; line-height: 1.5;">${message}</div>
          <div style="opacity: 0.7; font-size: 12px; margin-top: 8px;">Check that Ollama is running</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 6000);
  }
  
  // ============ Hierarchical Workflow Methods ============
  
  upgradeToHierarchical() {
    if (!confirm('Upgrade this workflow to v2.0 hierarchical architecture?\n\nThis will:\n- Create an agent registry\n- Move agent config to registry\n- Convert workflow-level tools to tool registry\n- Update layers to reference agents\n\nYou can always revert by editing the JSON.')) {
      return;
    }
    
    const workflow = this.selectedWorkflow;
    
    // Create agent registry with single default agent
    workflow.agentRegistry = {
      'default-agent': {
        id: 'default-agent',
        name: workflow.agent?.name || 'Default Agent',
        model: workflow.agent?.model || 'gpt-4',
        temperature: workflow.agent?.temperature || 0.7,
        systemPrompt: workflow.agent?.systemPrompt || 'You are a helpful AI assistant.',
        tools: [], // Will be populated below
        metadata: {
          cost: 0.01,
          latency: 1000,
          capabilities: ['general'],
          tags: ['default']
        }
      }
    };
    
    // Move workflow-level tools to tool registry
    workflow.toolRegistry = {};
    if (workflow.tools && workflow.tools.length > 0) {
      workflow.tools.forEach(toolName => {
        const toolId = toolName.toLowerCase().replace(/\s+/g, '-');
        workflow.toolRegistry[toolId] = {
          id: toolId,
          name: toolName,
          type: 'custom',
          description: `Tool: ${toolName}`,
          schema: {
            input: {},
            output: {}
          },
          implementation: {
            type: 'custom'
          }
        };
        
        // Add reference to default agent
        workflow.agentRegistry['default-agent'].tools.push(workflow.toolRegistry[toolId]);
      });
    }
    
    // Update layers to use iterativeWrapper structure
    workflow.iterativeWrapper = {
      layers: workflow.layers || []
    };
    
    // Update each layer to reference default agent
    workflow.iterativeWrapper.layers.forEach(layer => {
      layer.name = layer.name || 'Processing Layer';
      layer.agentRefs = ['default-agent'];
      layer.strategy = layer.strategy || 'sequential';
      
      // Rename old field names to new ones
      if (layer.successAction) {
        layer.onSuccess = layer.successAction;
        delete layer.successAction;
      }
      if (layer.failureAction) {
        layer.onFailure = layer.failureAction;
        delete layer.failureAction;
      }
    });
    
    // Delete old flat structure fields
    delete workflow.agent;
    delete workflow.tools;
    delete workflow.layers;
    
    // Update version
    workflow.version = '2.0.0';
    
    this.showSuccessNotification(
      '⬆️ Upgraded to v2.0',
      'Workflow upgraded to hierarchical architecture with agent registry!'
    );
    
    this.render();
  }
  
  showAddAgentModal() {
    // Use null to indicate "create new" vs "edit existing"
    this.showAgentEditorModal(null);
  }
  
  showAgentEditorModal(agentId) {
    // agentId === null means "create new agent"
    const isCreating = agentId === null;
    
    let agent, existingId;
    
    if (isCreating) {
      // Defaults for new agent
      agent = {
        model: 'llama3.2:3b',
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.',
        tools: [],
        metadata: { cost: 0.001, latency: 500, capabilities: [], tags: [] },
        context: { maxSize: 4096, shared: false }
      };
      existingId = null;
    } else {
      agent = this.selectedWorkflow.agentRegistry[agentId];
      if (!agent) return;
      existingId = agentId;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    `;
    
    // Get available tools from tool registry
    const toolRegistry = this.selectedWorkflow.toolRegistry || {};
    const availableTools = Object.keys(toolRegistry);
    const agentToolIds = (agent.tools || []).map(t => t.id || t.name?.toLowerCase().replace(/\s+/g, '-'));
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto; width: 100%;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; border-radius: 12px 12px 0 0; margin: -24px -24px 24px -24px;">
          <h3 style="margin: 0; color: white; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 28px;">🤖</span>
            ${isCreating ? 'Create New Agent' : `Edit Agent: ${agent.name || existingId}`}
          </h3>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Basic Info -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 8px;">📋 Basic Information</h4>
            
            <div class="form-group">
              <label>Agent ID ${isCreating ? '' : '(read-only)'}</label>
              <input id="edit-agent-id" type="text" value="${existingId || ''}" placeholder="e.g., scraper-agent, validator-agent" ${isCreating ? '' : 'disabled style="opacity: 0.6; cursor: not-allowed;"'} />
              ${isCreating ? '<span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Unique identifier (lowercase, hyphens)</span>' : ''}
            </div>
            
            <div class="form-group">
              <label>Agent Name</label>
              <input id="edit-agent-name" type="text" value="${agent.name || ''}" placeholder="Web Scraper Agent" />
            </div>
            
            <div class="form-group">
              <label>Model</label>
              <select id="edit-agent-model">
                <option value="llama3.2:1b" ${agent.model === 'llama3.2:1b' ? 'selected' : ''}>llama3.2:1b (fast, cheap)</option>
                <option value="llama3.2:3b" ${agent.model === 'llama3.2:3b' ? 'selected' : ''}>llama3.2:3b (balanced)</option>
                <option value="mistral-nemo:12b-instruct-2407-q8_0" ${agent.model === 'mistral-nemo:12b-instruct-2407-q8_0' ? 'selected' : ''}>mistral-nemo:12b (powerful)</option>
                <option value="qwen2.5:7b" ${agent.model === 'qwen2.5:7b' ? 'selected' : ''}>qwen2.5:7b</option>
                <option value="qwen2.5:14b" ${agent.model === 'qwen2.5:14b' ? 'selected' : ''}>qwen2.5:14b (most powerful)</option>
                <option value="deepseek-r1:14b" ${agent.model === 'deepseek-r1:14b' ? 'selected' : ''}>deepseek-r1:14b</option>
                <option value="gpt-4" ${agent.model === 'gpt-4' ? 'selected' : ''}>gpt-4</option>
                <option value="claude-3-opus" ${agent.model === 'claude-3-opus' ? 'selected' : ''}>claude-3-opus</option>
                <option value="custom" ${!['llama3.2:1b', 'llama3.2:3b', 'mistral-nemo:12b-instruct-2407-q8_0', 'qwen2.5:7b', 'qwen2.5:14b', 'deepseek-r1:14b', 'gpt-4', 'claude-3-opus'].includes(agent.model) ? 'selected' : ''}>Custom...</option>
              </select>
              <input id="edit-agent-model-custom" type="text" value="${!['llama3.2:1b', 'llama3.2:3b', 'mistral-nemo:12b-instruct-2407-q8_0', 'qwen2.5:7b', 'qwen2.5:14b', 'deepseek-r1:14b', 'gpt-4', 'claude-3-opus'].includes(agent.model) ? agent.model : ''}" placeholder="custom-model-name" style="margin-top: 8px; display: ${!['llama3.2:1b', 'llama3.2:3b', 'mistral-nemo:12b-instruct-2407-q8_0', 'qwen2.5:7b', 'qwen2.5:14b', 'deepseek-r1:14b', 'gpt-4', 'claude-3-opus'].includes(agent.model) ? 'block' : 'none'};" />
            </div>
            
            <div class="form-group">
              <label>Temperature (${agent.temperature || 0.7})</label>
              <input id="edit-agent-temperature" type="range" min="0" max="2" step="0.1" value="${agent.temperature || 0.7}" />
              <span id="temp-value" style="color: #94a3b8; font-size: 14px; margin-top: 4px; display: block;">${agent.temperature || 0.7} - ${(agent.temperature || 0.7) < 0.3 ? 'Very focused' : (agent.temperature || 0.7) < 0.7 ? 'Balanced' : (agent.temperature || 0.7) < 1.2 ? 'Creative' : 'Very creative'}</span>
            </div>
          </div>
          
          <!-- System Prompt -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 8px;">💬 System Prompt</h4>
            <div class="form-group">
              <textarea id="edit-agent-prompt" rows="4" placeholder="You are a helpful AI assistant specialized in...">${agent.systemPrompt || ''}</textarea>
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Define the agent's role and behavior</span>
            </div>
          </div>
          
          <!-- Tools -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span>🛠️ Agent Tools</span>
              ${availableTools.length > 0 ? `<span style="font-size: 13px; font-weight: normal; color: #64748b;">${agentToolIds.length} of ${availableTools.length} selected</span>` : ''}
            </h4>
            <div style="color: #94a3b8; font-size: 14px; margin-bottom: 12px;">
              Select tools from the global Tool Registry for this agent to use
              ${availableTools.length > 0 ? '<button id="select-all-tools" class="btn-small" style="margin-left: 12px; padding: 4px 12px; font-size: 12px;">Select All</button><button id="deselect-all-tools" class="btn-small" style="margin-left: 8px; padding: 4px 12px; font-size: 12px;">Clear All</button>' : ''}
            </div>
            
            ${availableTools.length === 0 ? `
              <div style="padding: 20px; background: #1e293b; border: 2px dashed #334155; border-radius: 8px; text-align: center; color: #64748b;">
                <div style="font-size: 32px; margin-bottom: 8px;">🔧</div>
                <div style="font-weight: 600; margin-bottom: 8px;">No tools in global registry</div>
                <div style="font-size: 13px; margin-bottom: 12px;">Tools must be added to the Tool Registry first</div>
                <button class="btn-primary" onclick="document.querySelector('[data-tab=\\"tools-registry\\"]')?.click()" style="padding: 8px 16px; font-size: 14px;">
                  ➕ Go to Tool Registry
                </button>
              </div>
            ` : `
              <div class="agent-tools-checkboxes" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding: 4px;">
                ${availableTools.map(toolId => {
                  const tool = toolRegistry[toolId];
                  const isChecked = agentToolIds.includes(toolId);
                  return `
                    <label class="tool-checkbox-label" style="display: flex; align-items: start; padding: 12px; background: ${isChecked ? '#1e293b' : '#334155'}; border: 2px solid ${isChecked ? '#f59e0b' : '#475569'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                      <input type="checkbox" class="tool-checkbox" data-tool-id="${toolId}" ${isChecked ? 'checked' : ''} style="margin-right: 12px; margin-top: 2px; width: 18px; height: 18px; cursor: pointer; accent-color: #f59e0b;" />
                      <div style="flex: 1;">
                        <div style="font-weight: 600; color: ${isChecked ? '#fbbf24' : '#e2e8f0'}; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                          ${tool.name || toolId}
                          <span style="font-size: 11px; padding: 2px 6px; background: ${isChecked ? '#f59e0b' : '#475569'}; border-radius: 4px; font-weight: 500;">${tool.type || 'custom'}</span>
                        </div>
                        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">${toolId}</div>
                        ${tool.description ? `<div style="font-size: 12px; color: #64748b; line-height: 1.4; margin-top: 4px;">${tool.description.length > 80 ? tool.description.substring(0, 80) + '...' : tool.description}</div>` : ''}
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
              <div style="margin-top: 12px; padding: 12px; background: #1e293b; border-radius: 6px; border-left: 3px solid #f59e0b;">
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                  💡 <strong style="color: #e2e8f0;">Tip:</strong> Tools are shared across agents. Add more tools in the <strong>Tool Registry</strong> tab, then assign them to specific agents here.
                </div>
              </div>
            `}
          </div>
          
          <!-- Iterative Wrapper -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 8px;">🔄 Agent-Level Iteration</h4>
            <div class="form-group">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="enable-iteration" ${agent.iterativeWrapper?.enabled ? 'checked' : ''} style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;" />
                <span>Enable agent-level iterative refinement</span>
              </label>
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Agent will retry/refine its own outputs</span>
            </div>
            
            <div id="iteration-config" style="display: ${agent.iterativeWrapper?.enabled ? 'block' : 'none'}; margin-top: 16px; padding: 16px; background: #1e293b; border-radius: 8px;">
              <div class="form-group">
                <label>Max Attempts</label>
                <input id="iteration-max-attempts" type="number" min="1" max="10" value="${agent.iterativeWrapper?.maxAttempts || 3}" />
              </div>
              
              <div class="form-group">
                <label>Strategy</label>
                <select id="iteration-strategy">
                  <option value="retry" ${agent.iterativeWrapper?.strategy === 'retry' ? 'selected' : ''}>Retry (repeat until success)</option>
                  <option value="refinement" ${agent.iterativeWrapper?.strategy === 'refinement' ? 'selected' : ''}>Refinement (improve output iteratively)</option>
                  <option value="validation" ${agent.iterativeWrapper?.strategy === 'validation' ? 'selected' : ''}>Validation (retry until valid)</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Context Config -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 8px;">📦 Context Configuration</h4>
            <div class="form-group">
              <label>Max Context Size (tokens)</label>
              <input id="context-max-size" type="number" min="1000" max="128000" step="1000" value="${agent.context?.maxSize || 4096}" />
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Maximum context window size</span>
            </div>
            
            <div class="form-group">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="context-shared" ${agent.context?.shared ? 'checked' : ''} style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;" />
                <span>Share context across layers</span>
              </label>
            </div>
          </div>
          
          <!-- Metadata -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 8px;">🏷️ Metadata & Tags</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label>Estimated Cost ($/1K tokens)</label>
                <input id="metadata-cost" type="number" min="0" step="0.001" value="${agent.metadata?.cost || 0.01}" />
              </div>
              
              <div class="form-group">
                <label>Estimated Latency (ms)</label>
                <input id="metadata-latency" type="number" min="0" step="100" value="${agent.metadata?.latency || 1000}" />
              </div>
            </div>
            
            <div class="form-group">
              <label>Capabilities (comma-separated)</label>
              <input id="metadata-capabilities" type="text" value="${(agent.metadata?.capabilities || []).join(', ')}" placeholder="scraping, parsing, validation" />
            </div>
            
            <div class="form-group">
              <label>Tags (comma-separated)</label>
              <input id="metadata-tags" type="text" value="${(agent.metadata?.tags || []).join(', ')}" placeholder="production, high-priority" />
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="save-agent-edit" class="btn btn-primary" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 14px; font-size: 16px;">
            ✅ Save Changes
          </button>
          <button id="cancel-agent-edit" class="btn btn-secondary" style="padding: 14px 24px;">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    const modelSelect = modal.querySelector('#edit-agent-model');
    const modelCustomInput = modal.querySelector('#edit-agent-model-custom');
    
    modelSelect.addEventListener('change', () => {
      modelCustomInput.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
    });
    
    const tempSlider = modal.querySelector('#edit-agent-temperature');
    const tempValue = modal.querySelector('#temp-value');
    tempSlider.addEventListener('input', () => {
      const val = parseFloat(tempSlider.value);
      const desc = val < 0.3 ? 'Very focused' : val < 0.7 ? 'Balanced' : val < 1.2 ? 'Creative' : 'Very creative';
      tempValue.textContent = `${val} - ${desc}`;
    });
    
    const enableIteration = modal.querySelector('#enable-iteration');
    const iterationConfig = modal.querySelector('#iteration-config');
    enableIteration.addEventListener('change', () => {
      iterationConfig.style.display = enableIteration.checked ? 'block' : 'none';
    });
    
    // Tool checkbox styling on change
    const toolCheckboxes = modal.querySelectorAll('.tool-checkbox');
    toolCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const label = checkbox.closest('.tool-checkbox-label');
        const nameDiv = label.querySelector('div > div');
        const typeBadge = label.querySelector('div > div > span');
        if (checkbox.checked) {
          label.style.borderColor = '#f59e0b';
          label.style.background = '#1e293b';
          nameDiv.style.color = '#fbbf24';
          if (typeBadge) typeBadge.style.background = '#f59e0b';
        } else {
          label.style.borderColor = '#475569';
          label.style.background = '#334155';
          nameDiv.style.color = '#e2e8f0';
          if (typeBadge) typeBadge.style.background = '#475569';
        }
        
        // Update counter
        const counter = modal.querySelector('h4 span');
        if (counter) {
          const checkedCount = modal.querySelectorAll('.tool-checkbox:checked').length;
          const totalCount = toolCheckboxes.length;
          counter.textContent = `${checkedCount} of ${totalCount} selected`;
        }
      });
    });
    
    // Select/Deselect all buttons
    const selectAllBtn = modal.querySelector('#select-all-tools');
    const deselectAllBtn = modal.querySelector('#deselect-all-tools');
    
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        toolCheckboxes.forEach(cb => {
          cb.checked = true;
          cb.dispatchEvent(new Event('change'));
        });
      });
    }
    
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        toolCheckboxes.forEach(cb => {
          cb.checked = false;
          cb.dispatchEvent(new Event('change'));
        });
      });
    }
    
    modal.querySelector('#cancel-agent-edit').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#save-agent-edit').addEventListener('click', () => {
      // Collect all form values
      const agentIdValue = isCreating ? modal.querySelector('#edit-agent-id').value.trim().toLowerCase().replace(/\s+/g, '-') : existingId;
      const name = modal.querySelector('#edit-agent-name').value.trim();
      const modelValue = modelSelect.value === 'custom' ? modelCustomInput.value.trim() : modelSelect.value;
      const temperature = parseFloat(tempSlider.value);
      const systemPrompt = modal.querySelector('#edit-agent-prompt').value.trim();
      
      // Validation
      if (!agentIdValue || !name) {
        alert('Please fill in Agent ID and Name');
        return;
      }
      
      if (isCreating && this.selectedWorkflow.agentRegistry[agentIdValue]) {
        alert(`Agent with ID "${agentIdValue}" already exists!`);
        return;
      }
      
      // Collect selected tools
      const selectedToolIds = Array.from(modal.querySelectorAll('.tool-checkbox:checked'))
        .map(cb => cb.dataset.toolId);
      const tools = selectedToolIds.map(toolId => toolRegistry[toolId]);
      
      // Iteration config
      const iterationEnabled = enableIteration.checked;
      const iterativeWrapper = iterationEnabled ? {
        enabled: true,
        maxAttempts: parseInt(modal.querySelector('#iteration-max-attempts').value),
        strategy: modal.querySelector('#iteration-strategy').value
      } : undefined;
      
      // Context config
      const context = {
        maxSize: parseInt(modal.querySelector('#context-max-size').value),
        shared: modal.querySelector('#context-shared').checked
      };
      
      // Metadata
      const capabilities = modal.querySelector('#metadata-capabilities').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      const tags = modal.querySelector('#metadata-tags').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      const metadata = {
        cost: parseFloat(modal.querySelector('#metadata-cost').value),
        latency: parseInt(modal.querySelector('#metadata-latency').value),
        capabilities,
        tags
      };
      
      // Create or update agent
      this.selectedWorkflow.agentRegistry[agentIdValue] = {
        id: agentIdValue,
        name,
        model: modelValue,
        temperature,
        systemPrompt,
        tools,
        iterativeWrapper,
        context,
        metadata
      };
      
      document.body.removeChild(modal);
      this.render();
      
      this.showSuccessNotification(
        isCreating ? '✅ Agent Created' : '✅ Agent Updated',
        `"${name}" has been ${isCreating ? 'created' : 'updated'} successfully`
      );
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  removeRegistryAgent(agentId) {
    if (!confirm(`Remove agent "${agentId}"?\n\nLayers referencing this agent will need to be updated.`)) {
      return;
    }
    
    delete this.selectedWorkflow.agentRegistry[agentId];
    this.render();
  }

  showImportGlobalToolsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow: hidden; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px; border-radius: 12px 12px 0 0; margin: -24px -24px 0 -24px;">
          <h2 style="margin: 0; font-size: 28px; display: flex; align-items: center; gap: 12px; color: white;">
            <span style="font-size: 36px;">🔄</span>
            Import Global Tools
          </h2>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 15px; color: white;">
            Select tools from the global Tool Manager to add to this workflow
          </p>
        </div>
        
        <div style="padding: 24px;">
          ${this.tools.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px; color: #64748b;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔧</div>
              <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No Global Tools Found</div>
              <div style="font-size: 14px; margin-bottom: 16px;">Create tools in the Tool Manager tab first</div>
              <button class="btn-secondary" onclick="document.querySelector('[data-view=\\"tools\\"]')?.click(); this.closest('.modal-overlay').remove();" style="padding: 10px 20px;">
                Go to Tool Manager
              </button>
            </div>
          ` : `
            <div style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #94a3b8; font-size: 14px;">Select tools to import:</span>
                <div style="display: flex; gap: 8px;">
                  <button id="select-all-global" class="btn-small" style="padding: 6px 12px; font-size: 12px;">Select All</button>
                  <button id="deselect-all-global" class="btn-small" style="padding: 6px 12px; font-size: 12px;">Clear</button>
                </div>
              </div>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
              ${this.tools.map(tool => {
                const toolId = tool.name?.toLowerCase().replace(/\s+/g, '-') || tool.id;
                const alreadyExists = this.selectedWorkflow.toolRegistry?.[toolId];
                
                return `
                  <label class="global-tool-checkbox-label" style="display: flex; align-items: start; padding: 16px; background: ${alreadyExists ? '#1e293b' : '#334155'}; border: 2px solid ${alreadyExists ? '#64748b' : '#475569'}; border-radius: 8px; cursor: ${alreadyExists ? 'not-allowed' : 'pointer'}; opacity: ${alreadyExists ? 0.5 : 1}; transition: all 0.2s;">
                    <input 
                      type="checkbox" 
                      class="global-tool-checkbox" 
                      data-tool-name="${tool.name}"
                      ${alreadyExists ? 'disabled' : ''}
                      style="margin-right: 12px; margin-top: 2px; width: 18px; height: 18px; cursor: ${alreadyExists ? 'not-allowed' : 'pointer'}; accent-color: #3b82f6;" 
                    />
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: #e2e8f0; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                        ${tool.name}
                        <span style="font-size: 11px; padding: 2px 6px; background: ${tool.type === 'builtin' ? '#475569' : '#3b82f6'}; border-radius: 4px; font-weight: 500; text-transform: uppercase;">${tool.type}</span>
                        ${alreadyExists ? '<span style="font-size: 11px; padding: 2px 6px; background: #64748b; border-radius: 4px;">Already Imported</span>' : ''}
                      </div>
                      <div style="font-size: 13px; color: #94a3b8; margin-bottom: 4px;">${toolId}</div>
                      <div style="font-size: 12px; color: #64748b; line-height: 1.4;">${tool.description || 'No description'}</div>
                      ${tool.model ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Model: ${tool.model}</div>` : ''}
                      ${tool.endpoint ? `<div style="font-size: 11px; color: #6b7280;">Endpoint: ${tool.endpoint}</div>` : ''}
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; gap: 12px; justify-content: flex-end;">
              <button id="cancel-import-btn" class="btn-secondary" style="padding: 10px 24px;">
                Cancel
              </button>
              <button id="confirm-import-btn" class="btn-primary" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 10px 32px;">
                Import Selected Tools
              </button>
            </div>
          `}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    if (this.tools.length > 0) {
      // Select/deselect all
      const selectAllBtn = document.getElementById('select-all-global');
      const deselectAllBtn = document.getElementById('deselect-all-global');
      
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          modal.querySelectorAll('.global-tool-checkbox:not([disabled])').forEach(cb => cb.checked = true);
        });
      }
      
      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
          modal.querySelectorAll('.global-tool-checkbox').forEach(cb => cb.checked = false);
        });
      }
      
      // Import button
      document.getElementById('confirm-import-btn').addEventListener('click', () => {
        const selectedCheckboxes = modal.querySelectorAll('.global-tool-checkbox:checked');
        let importedCount = 0;
        
        if (!this.selectedWorkflow.toolRegistry) {
          this.selectedWorkflow.toolRegistry = {};
        }
        
        selectedCheckboxes.forEach(checkbox => {
          const toolName = checkbox.dataset.toolName;
          const tool = this.tools.find(t => t.name === toolName);
          
          if (tool) {
            const toolId = tool.name.toLowerCase().replace(/\s+/g, '-');
            
            // Convert global tool to registry format
            this.selectedWorkflow.toolRegistry[toolId] = {
              id: toolId,
              name: tool.name,
              type: tool.type || 'custom',
              description: tool.description || '',
              schema: {
                input: tool.schema?.input || {},
                output: tool.schema?.output || {}
              },
              implementation: {
                type: tool.type === 'llm' ? 'llm' : tool.type || 'custom',
                config: {
                  ...(tool.model && { model: tool.model }),
                  ...(tool.endpoint && { endpoint: tool.endpoint }),
                  ...(tool.config && tool.config)
                }
              },
              restrictions: { allowedAgents: [] },
              rateLimit: { callsPerMinute: 60 }
            };
            
            importedCount++;
          }
        });
        
        if (importedCount > 0) {
          document.body.removeChild(modal);
          this.render();
          
          this.showSuccessNotification(
            `✅ Imported ${importedCount} Tool${importedCount > 1 ? 's' : ''}`,
            `Tools added to registry! Assign them to agents in the Agents tab.`
          );
        } else {
          alert('Please select at least one tool to import.');
        }
      });
      
      document.getElementById('cancel-import-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  showAddToolModal() {
    this.showToolEditorModal(null);
  }
  
  editRegistryTool(toolId) {
    const tool = this.selectedWorkflow.toolRegistry[toolId];
    if (!tool) return;
    this.showToolEditorModal(tool);
  }
  
  async showToolEditorModal(existingTool = null) {
    const isEdit = existingTool !== null;
    const tool = existingTool || {
      id: '',
      name: '',
      type: 'custom',
      description: '',
      schema: { input: {}, output: {} },
      implementation: { type: 'custom' },
      restrictions: { allowedAgents: [] },
      rateLimit: { callsPerMinute: 60 }
    };
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    `;
    
    const agentRegistry = this.selectedWorkflow.agentRegistry || {};
    const availableAgents = Object.keys(agentRegistry);
    const allowedAgents = tool.restrictions?.allowedAgents || [];
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto; width: 100%;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 24px; border-radius: 12px 12px 0 0; margin: -24px -24px 24px -24px;">
          <h3 style="margin: 0; color: white; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 28px;">🔧</span>
            ${isEdit ? `Edit Tool: ${tool.name || tool.id}` : 'Create New Tool'}
          </h3>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            ${isEdit ? 'Update tool definition and access controls' : 'Define a reusable tool that agents can use to perform specific tasks'}
          </p>
        </div>
        
        ${!isEdit ? `
          <div style="padding: 16px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
            <div style="color: #1e40af; font-size: 14px; line-height: 1.6;">
              <strong style="display: block; margin-bottom: 8px;">💡 What are Tools?</strong>
              Tools are reusable functions/APIs that agents can call to perform specific actions:
              <ul style="margin: 8px 0 0 20px; padding: 0;">
                <li><strong>API Clients:</strong> HTTP requests, REST APIs, GraphQL</li>
                <li><strong>Web Scrapers:</strong> Extract data from websites</li>
                <li><strong>Database Connectors:</strong> Query/insert data</li>
                <li><strong>File Handlers:</strong> Read/write files, upload to S3</li>
                <li><strong>Data Parsers:</strong> JSON, CSV, XML parsing</li>
                <li><strong>Validators:</strong> Check data quality, schemas</li>
              </ul>
              <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px; font-size: 13px;">
                <strong>Example:</strong> Create a "geocoding-api" tool, then assign it to your "location-agent" so it can convert addresses to coordinates.
              </div>
            </div>
          </div>
        ` : ''}
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- AI Generation Section -->
          ${!isEdit ? `
            <div class="form-section" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b;">
              <h4 style="margin: 0 0 12px 0; color: #92400e; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">✨</span>
                AI Tool Generator
              </h4>
              <div style="color: #92400e; font-size: 13px; margin-bottom: 12px; line-height: 1.5;">
                Describe what you need and AI will generate a complete tool definition with schema, implementation details, and configuration.
              </div>
              <div class="form-group">
                <div style="position: relative;">
                  <textarea id="ai-tool-prompt" rows="3" placeholder="Examples:&#10;• 'A tool that fetches weather data from OpenWeatherMap API'&#10;• 'A web scraper that extracts product prices from e-commerce sites'&#10;• 'A database connector for PostgreSQL with query caching'&#10;• 'A JSON validator that checks data against schemas'" style="background: white; color: #1f2937; padding-right: 120px;"></textarea>
                  <button id="auto-prompt-btn" class="btn-small" style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ✨ Auto-Prompt
                  </button>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <button id="generate-tool-btn" class="btn btn-primary" style="flex: 1; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 12px;">
                    🤖 Generate Tool Definition with AI
                  </button>
                </div>
                <div id="ai-generation-status" style="margin-top: 8px; display: none; color: #92400e; font-size: 14px;"></div>
                <details style="margin-top: 12px; background: white; padding: 12px; border-radius: 6px; cursor: pointer;">
                  <summary style="color: #92400e; font-weight: 600; font-size: 13px; user-select: none;">💡 Tips for Better Prompts</summary>
                  <div style="color: #78350f; font-size: 12px; line-height: 1.6; margin-top: 8px;">
                    <strong>Good prompts include:</strong>
                    <ul style="margin: 4px 0 0 20px;">
                      <li><strong>Action:</strong> "A tool that fetches/extracts/validates..."</li>
                      <li><strong>Data source:</strong> "from OpenWeatherMap API / e-commerce sites / PostgreSQL"</li>
                      <li><strong>Input/Output:</strong> "accepts city name, returns temperature and conditions"</li>
                      <li><strong>Special features:</strong> "with caching / retry logic / rate limiting"</li>
                    </ul>
                    <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                      <strong>Example:</strong> "A tool that extracts job listings from Indeed API, accepts search query and location, returns title, company, salary, and date posted, with automatic pagination and 5 results per page"
                    </div>
                  </div>
                </details>
              </div>
            </div>
          ` : ''}
          
          <!-- Basic Info -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 8px;">📋 Basic Information</h4>
            
            <div class="form-group">
              <label>Tool ID ${isEdit ? '(read-only)' : ''}</label>
              <input id="tool-id" type="text" value="${tool.id || ''}" placeholder="http-client, geocoding-api" ${isEdit ? 'disabled' : ''} style="${isEdit ? 'opacity: 0.6; cursor: not-allowed;' : ''}" />
              ${!isEdit ? '<span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Lowercase, hyphen-separated (e.g., web-scraper)</span>' : ''}
            </div>
            
            <div class="form-group">
              <label>Tool Name</label>
              <input id="tool-name" type="text" value="${tool.name || ''}" placeholder="HTTP Client" />
            </div>
            
            <div class="form-group">
              <label>Type</label>
              <select id="tool-type">
                <option value="custom" ${tool.type === 'custom' ? 'selected' : ''}>Custom</option>
                <option value="api" ${tool.type === 'api' ? 'selected' : ''}>API Client</option>
                <option value="scraper" ${tool.type === 'scraper' ? 'selected' : ''}>Web Scraper</option>
                <option value="database" ${tool.type === 'database' ? 'selected' : ''}>Database</option>
                <option value="file" ${tool.type === 'file' ? 'selected' : ''}>File Handler</option>
                <option value="parser" ${tool.type === 'parser' ? 'selected' : ''}>Data Parser</option>
                <option value="validator" ${tool.type === 'validator' ? 'selected' : ''}>Validator</option>
                <option value="transformer" ${tool.type === 'transformer' ? 'selected' : ''}>Data Transformer</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <textarea id="tool-description" rows="3" placeholder="What this tool does and when to use it">${tool.description || ''}</textarea>
            </div>
          </div>
          
          <!-- Schema -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 8px;">📝 Input/Output Schema</h4>
            <div style="color: #94a3b8; font-size: 13px; margin-bottom: 12px; line-height: 1.5;">
              Define what data the tool accepts (input) and returns (output). This helps agents understand how to use the tool.
            </div>
            
            <div class="form-group">
              <label>Input Schema (JSON)</label>
              <textarea id="tool-input-schema" rows="5" placeholder='Example:&#10;{&#10;  "url": "string",&#10;  "method": "GET|POST",&#10;  "headers": "object"&#10;}' style="font-family: 'Courier New', monospace; font-size: 13px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">${JSON.stringify(tool.schema?.input || {}, null, 2)}</textarea>
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">📥 What parameters does this tool need?</span>
            </div>
            
            <div class="form-group">
              <label>Output Schema (JSON)</label>
              <textarea id="tool-output-schema" rows="5" placeholder='Example:&#10;{&#10;  "data": "object",&#10;  "status": "number",&#10;  "success": "boolean"&#10;}' style="font-family: 'Courier New', monospace; font-size: 13px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">${JSON.stringify(tool.schema?.output || {}, null, 2)}</textarea>
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">📤 What does this tool return?</span>
            </div>
          </div>
          
          <!-- Implementation -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 8px;">⚙️ Implementation</h4>
            <div style="color: #94a3b8; font-size: 13px; margin-bottom: 12px; line-height: 1.5;">
              Configure how this tool actually works - is it an API call, a script, or custom code?
            </div>
            
            <div class="form-group">
              <label>Implementation Type</label>
              <select id="tool-impl-type">
                <option value="custom" ${tool.implementation?.type === 'custom' ? 'selected' : ''}>Custom Function (your code)</option>
                <option value="api" ${tool.implementation?.type === 'api' ? 'selected' : ''}>API Endpoint (HTTP requests)</option>
                <option value="script" ${tool.implementation?.type === 'script' ? 'selected' : ''}>Script (execute code)</option>
                <option value="external" ${tool.implementation?.type === 'external' ? 'selected' : ''}>External Service (3rd party)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Configuration (JSON)</label>
              <textarea id="tool-impl-config" rows="6" placeholder='Example for API:&#10;{&#10;  "baseURL": "https://api.example.com",&#10;  "timeout": 30000,&#10;  "retries": 3,&#10;  "auth": "bearer"&#10;}' style="font-family: 'Courier New', monospace; font-size: 13px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">${JSON.stringify(tool.implementation?.config || {}, null, 2)}</textarea>
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">⚙️ Settings like timeout, retries, API keys, etc.</span>
            </div>
          </div>
          
          <!-- Access Control -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 8px;">🔒 Access Control</h4>
            
            <div class="form-group">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="restrict-access" ${allowedAgents.length > 0 ? 'checked' : ''} style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;" />
                <span>Restrict to specific agents</span>
              </label>
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">If unchecked, all agents can use this tool</span>
            </div>
            
            <div id="agent-access-list" style="display: ${allowedAgents.length > 0 ? 'block' : 'none'}; margin-top: 12px;">
              ${availableAgents.length === 0 ? `
                <div style="padding: 16px; background: #1e293b; border: 2px dashed #334155; border-radius: 8px; text-align: center; color: #64748b;">
                  No agents in registry yet
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto;">
                  ${availableAgents.map(agentId => `
                    <label style="display: flex; align-items: center; padding: 10px; background: #334155; border: 2px solid #475569; border-radius: 6px; cursor: pointer;">
                      <input type="checkbox" class="agent-access-checkbox" data-agent-id="${agentId}" ${allowedAgents.includes(agentId) ? 'checked' : ''} style="margin-right: 10px; width: 16px; height: 16px; cursor: pointer;" />
                      <span style="color: #e2e8f0;">${agentRegistry[agentId].name} <span style="color: #94a3b8; font-size: 13px;">(${agentId})</span></span>
                    </label>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
          
          <!-- Rate Limiting -->
          <div class="form-section">
            <h4 style="margin: 0 0 12px 0; color: #8b5cf6; border-bottom: 2px solid #334155; padding-bottom: 8px;">⏱️ Rate Limiting</h4>
            
            <div class="form-group">
              <label>Calls Per Minute</label>
              <input id="rate-limit" type="number" min="1" max="1000" value="${tool.rateLimit?.callsPerMinute || 60}" />
              <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Maximum calls allowed per minute</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="save-tool" class="btn btn-primary" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 14px; font-size: 16px;">
            ✅ ${isEdit ? 'Save Changes' : 'Create Tool'}
          </button>
          <button id="cancel-tool" class="btn btn-secondary" style="padding: 14px 24px;">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    const restrictCheckbox = modal.querySelector('#restrict-access');
    const agentAccessList = modal.querySelector('#agent-access-list');
    
    if (restrictCheckbox) {
      restrictCheckbox.addEventListener('change', () => {
        agentAccessList.style.display = restrictCheckbox.checked ? 'block' : 'none';
      });
    }
    
    // AI Generation
    if (!isEdit) {
      const generateBtn = modal.querySelector('#generate-tool-btn');
      const aiPrompt = modal.querySelector('#ai-tool-prompt');
      const aiStatus = modal.querySelector('#ai-generation-status');
      const autoPromptBtn = modal.querySelector('#auto-prompt-btn');
      
      // Auto-generate prompt button
      autoPromptBtn.addEventListener('click', async () => {
        autoPromptBtn.disabled = true;
        autoPromptBtn.textContent = '⏳ Thinking...';
        
        // Analyze workflow context
        const existingTools = Object.keys(this.selectedWorkflow.toolRegistry || {});
        const existingAgents = Object.keys(this.selectedWorkflow.agentRegistry || {});
        const workflowName = this.selectedWorkflow.name || 'Untitled';
        const workflowDesc = this.selectedWorkflow.description || '';
        
        // Generate smart suggestions based on context
        const suggestions = [
          // API tools
          `A tool that makes HTTP requests to REST APIs with automatic retry logic and timeout handling`,
          `A tool that fetches data from ${workflowName.includes('weather') ? 'OpenWeatherMap' : workflowName.includes('news') ? 'NewsAPI' : workflowName.includes('job') ? 'Indeed API' : 'a third-party'} API and returns structured JSON`,
          
          // Scraping tools
          `A web scraper that extracts ${workflowName.includes('price') ? 'product prices and availability' : workflowName.includes('article') ? 'article titles, authors, and content' : workflowName.includes('job') ? 'job listings with salary and location' : 'structured data'} from websites with pagination support`,
          
          // Database tools
          `A database connector for ${Math.random() > 0.5 ? 'PostgreSQL' : 'MongoDB'} that handles CRUD operations with connection pooling and transaction support`,
          
          // Data processing tools
          `A JSON validator that checks data against schemas and returns detailed error messages with line numbers`,
          `A data transformer that converts ${Math.random() > 0.5 ? 'CSV to JSON' : 'XML to JSON'} with field mapping and type conversion`,
          
          // File tools
          `A file uploader that handles chunked uploads to ${Math.random() > 0.5 ? 'AWS S3' : 'Azure Blob Storage'} with progress tracking and resume capability`,
          
          // Specialized tools based on workflow name
          ...(workflowName.includes('email') ? [`A tool that sends emails via SMTP with template support and attachment handling`] : []),
          ...(workflowName.includes('pdf') ? [`A PDF parser that extracts text, tables, and images from PDF documents`] : []),
          ...(workflowName.includes('image') ? [`A tool that processes images with resizing, compression, and format conversion using ImageMagick`] : []),
          ...(workflowName.includes('auth') ? [`A tool that handles OAuth2 authentication flow with token refresh and storage`] : []),
          
          // Complementary tools (if certain tools exist, suggest related ones)
          ...(existingTools.some(t => t.includes('scraper')) && !existingTools.some(t => t.includes('cache')) ? 
            [`A caching tool that stores scraped data in Redis with TTL and automatic invalidation`] : []),
          ...(existingTools.some(t => t.includes('api')) && !existingTools.some(t => t.includes('rate')) ? 
            [`A rate limiter that enforces API call limits with exponential backoff and queue management`] : []),
          ...(existingTools.some(t => t.includes('data')) && !existingTools.some(t => t.includes('valid')) ? 
            [`A data validator that checks completeness, accuracy, and format with customizable rules`] : []),
        ];
        
        // Pick a random suggestion that's contextually relevant
        const suggestion = suggestions[Math.floor(Math.random() * Math.min(suggestions.length, 10))];
        
        aiPrompt.value = suggestion;
        aiPrompt.focus();
        
        // Animate the textarea
        aiPrompt.style.transition = 'all 0.3s ease';
        aiPrompt.style.transform = 'scale(1.02)';
        aiPrompt.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.3)';
        
        setTimeout(() => {
          aiPrompt.style.transform = 'scale(1)';
          aiPrompt.style.boxShadow = 'none';
        }, 300);
        
        autoPromptBtn.textContent = '✨ Auto-Prompt';
        autoPromptBtn.disabled = false;
        
        aiStatus.style.display = 'block';
        aiStatus.style.color = '#059669';
        aiStatus.textContent = '✅ Smart prompt generated! Click "Generate Tool Definition" or edit the prompt first.';
      });
      
      generateBtn.addEventListener('click', async () => {
        const prompt = aiPrompt.value.trim();
        if (!prompt) {
          aiStatus.style.display = 'block';
          aiStatus.style.color = '#dc2626';
          aiStatus.textContent = '❌ Please describe the tool you need';
          return;
        }
        
        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Generating...';
        aiStatus.style.display = 'block';
        aiStatus.style.color = '#92400e';
        aiStatus.textContent = '🤖 AI is generating tool definition...';
        
        try {
          const systemPrompt = `You are a tool definition expert. Generate a complete tool specification based on the user's description.

Return ONLY valid JSON in this exact format:
{
  "id": "tool-id-lowercase",
  "name": "Tool Name",
  "type": "api|scraper|database|parser|validator|transformer|custom",
  "description": "Clear description of what the tool does",
  "schema": {
    "input": { "paramName": "type" },
    "output": { "resultName": "type" }
  },
  "implementation": {
    "type": "api|script|custom|external",
    "config": { "key": "value" }
  }
}`;
          
          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'mistral-nemo:12b-instruct-2407-q8_0',
              prompt: systemPrompt + '\\n\\nUser request: ' + prompt,
              stream: false,
              options: { temperature: 0.3, num_predict: 1000 }
            })
          });
          
          const data = await response.json();
          let generatedText = data.response;
          
          // Extract JSON from markdown fences if present
          const jsonMatch = generatedText.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
          if (jsonMatch) {
            generatedText = jsonMatch[1];
          }
          
          const toolDef = JSON.parse(generatedText);
          
          // Populate fields
          modal.querySelector('#tool-id').value = toolDef.id || '';
          modal.querySelector('#tool-name').value = toolDef.name || '';
          modal.querySelector('#tool-type').value = toolDef.type || 'custom';
          modal.querySelector('#tool-description').value = toolDef.description || '';
          modal.querySelector('#tool-input-schema').value = JSON.stringify(toolDef.schema?.input || {}, null, 2);
          modal.querySelector('#tool-output-schema').value = JSON.stringify(toolDef.schema?.output || {}, null, 2);
          modal.querySelector('#tool-impl-type').value = toolDef.implementation?.type || 'custom';
          modal.querySelector('#tool-impl-config').value = JSON.stringify(toolDef.implementation?.config || {}, null, 2);
          
          aiStatus.style.color = '#059669';
          aiStatus.textContent = '✅ Tool definition generated! Review and adjust as needed.';
          generateBtn.textContent = '🤖 Generate Tool Definition';
          generateBtn.disabled = false;
          
        } catch (error) {
          console.error('AI generation error:', error);
          aiStatus.style.color = '#dc2626';
          aiStatus.textContent = '❌ Generation failed: ' + error.message;
          generateBtn.textContent = '🤖 Generate Tool Definition';
          generateBtn.disabled = false;
        }
      });
    }
    
    modal.querySelector('#cancel-tool').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#save-tool').addEventListener('click', () => {
      const toolId = modal.querySelector('#tool-id').value.trim().toLowerCase().replace(/\s+/g, '-');
      const toolName = modal.querySelector('#tool-name').value.trim();
      
      if (!toolId || !toolName) {
        alert('Tool ID and Name are required');
        return;
      }
      
      // Check for duplicate ID (only when creating new)
      if (!isEdit && this.selectedWorkflow.toolRegistry[toolId]) {
        alert('Tool with this ID already exists!');
        return;
      }
      
      // Parse JSON fields
      let inputSchema, outputSchema, implConfig;
      try {
        inputSchema = JSON.parse(modal.querySelector('#tool-input-schema').value || '{}');
        outputSchema = JSON.parse(modal.querySelector('#tool-output-schema').value || '{}');
        implConfig = JSON.parse(modal.querySelector('#tool-impl-config').value || '{}');
      } catch (e) {
        alert('Invalid JSON in schema or config: ' + e.message);
        return;
      }
      
      // Collect allowed agents
      const restrictAccess = modal.querySelector('#restrict-access')?.checked;
      const allowedAgents = restrictAccess ? 
        Array.from(modal.querySelectorAll('.agent-access-checkbox:checked')).map(cb => cb.dataset.agentId) : 
        [];
      
      // Create/update tool
      const newTool = {
        id: toolId,
        name: toolName,
        type: modal.querySelector('#tool-type').value,
        description: modal.querySelector('#tool-description').value.trim(),
        schema: {
          input: inputSchema,
          output: outputSchema
        },
        implementation: {
          type: modal.querySelector('#tool-impl-type').value,
          config: implConfig
        },
        restrictions: {
          allowedAgents
        },
        rateLimit: {
          callsPerMinute: parseInt(modal.querySelector('#rate-limit').value)
        }
      };
      
      // If editing and ID changed, remove old entry
      if (isEdit && tool.id !== toolId) {
        delete this.selectedWorkflow.toolRegistry[tool.id];
      }
      
      this.selectedWorkflow.toolRegistry[toolId] = newTool;
      
      document.body.removeChild(modal);
      this.render();
      
      this.showSuccessNotification(
        `✅ Tool ${isEdit ? 'Updated' : 'Created'}`,
        `"${toolName}" has been ${isEdit ? 'updated' : 'added to the registry'} successfully`
      );
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  removeRegistryTool(toolId) {
    if (!confirm(`Remove tool "${toolId}"?`)) {
      return;
    }
    
    delete this.selectedWorkflow.toolRegistry[toolId];
    this.render();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

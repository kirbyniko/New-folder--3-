/**
 * Agent Editor Component
 * 
 * Full-featured agent configuration editor with:
 * - Monaco code editor for prompts and context
 * - Interactive sliders for all parameters
 * - Real-time token estimation
 * - Model selection
 * - Save/load/export functionality
 */

import AgentTemplates from '../lib/AgentTemplates.js';
import MetricsService from '../services/MetricsService.js';

import * as monaco from 'monaco-editor';

export class AgentEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.editor = null;
    this.config = this.getDefaultConfig();
    this.models = [];
    this.tokenEstimate = { total: 0, fitsGPU: true, cpuRisk: 'low' };
    
    this.init();
  }

  getDefaultConfig() {
    return {
      name: 'New Agent',
      mode: 'general',
      systemPrompt: `You are a helpful AI assistant.`,
      model: 'qwen2.5-coder:14b',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      contextWindow: 8192,
      useRAG: true,
      ragEpisodes: 3,
      useKnowledge: true,
      contextFiles: [],
      tools: [],
      enabledGuides: ['basic-selectors', 'error-handling']
    };
  }

  async init() {
    this.render();
    await this.initMonaco();
    await this.loadAvailableModels();
    this.attachEventListeners();
    this.updateTokenEstimate();
  }

  render() {
    this.container.innerHTML = `
      <div class="agent-editor">
        <!-- Header -->
        <div class="editor-header">
          <input type="text" id="agent-name" class="agent-name-input" 
                 value="${this.config.name}" placeholder="Agent Name">
          <div class="editor-actions">
            <button id="template-btn" class="btn btn-secondary">
              📋 Templates
            </button>
            <button id="save-agent" class="btn btn-primary">
              💾 Save
            </button>
            <button id="load-agent" class="btn">
              📂 Load
            </button>
            <button id="export-agent" class="btn">
              📤 Export
            </button>
            <button id="test-agent" class="btn btn-success">
              🧪 Test Agent
            </button>
          </div>
        </div>

        <!-- Main Layout -->
        <div class="editor-layout">
          <!-- Left: Configuration Panel -->
          <div class="config-panel">
            <h3>⚙️ Configuration</h3>
            
            <!-- Mode Selection -->
            <div class="config-section">
              <label>Agent Mode</label>
              <select id="agent-mode" class="form-select">
                <option value="general">General Assistant</option>
                <option value="web-scraper">Web Scraper</option>
                <option value="code-generator">Code Generator</option>
                <option value="analyst">Data Analyst</option>
                <option value="writer">Content Writer</option>
              </select>
            </div>

            <!-- Model Selection -->
            <div class="config-section">
              <label>Model</label>
              <select id="agent-model" class="form-select">
                <option value="loading">Loading models...</option>
              </select>
            </div>

            <!-- Temperature Slider -->
            <div class="config-section">
              <label>
                Temperature: <span id="temp-value">${this.config.temperature}</span>
                <small>(Creativity vs Consistency)</small>
              </label>
              <input type="range" id="temperature" class="slider" 
                     min="0" max="2" step="0.1" value="${this.config.temperature}">
              <div class="slider-labels">
                <span>Focused</span>
                <span>Balanced</span>
                <span>Creative</span>
              </div>
            </div>

            <!-- Top-P Slider -->
            <div class="config-section">
              <label>
                Top-P: <span id="topp-value">${this.config.topP}</span>
                <small>(Nucleus Sampling)</small>
              </label>
              <input type="range" id="top-p" class="slider" 
                     min="0" max="1" step="0.05" value="${this.config.topP}">
            </div>

            <!-- Max Tokens Slider -->
            <div class="config-section">
              <label>
                Max Tokens: <span id="maxtoken-value">${this.config.maxTokens}</span>
                <small>(Response Length)</small>
              </label>
              <input type="range" id="max-tokens" class="slider" 
                     min="512" max="8192" step="256" value="${this.config.maxTokens}">
            </div>

            <!-- Context Window Slider -->
            <div class="config-section">
              <label>
                Context Window: <span id="context-value">${this.config.contextWindow}</span>
                <small>(Total Available)</small>
              </label>
              <input type="range" id="context-window" class="slider" 
                     min="2048" max="32768" step="1024" value="${this.config.contextWindow}">
            </div>

            <!-- RAG Settings -->
            <div class="config-section">
              <label>
                <input type="checkbox" id="use-rag" ${this.config.useRAG ? 'checked' : ''}>
                Use RAG Memory
              </label>
              <div id="rag-settings" ${this.config.useRAG ? '' : 'style="display:none"'}>
                <label>
                  RAG Episodes: <span id="rag-value">${this.config.ragEpisodes}</span>
                </label>
                <input type="range" id="rag-episodes" class="slider" 
                       min="0" max="10" step="1" value="${this.config.ragEpisodes}">
              </div>
            </div>

            <!-- Knowledge Base -->
            <div class="config-section">
              <label>
                <input type="checkbox" id="use-knowledge" ${this.config.useKnowledge ? 'checked' : ''}>
                Use Knowledge Base
              </label>
            </div>
            
            <!-- Context Files -->
            <div class="config-section">
              <h4>📁 Context Files</h4>
              <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                Upload files to give your agent context and knowledge
              </p>
              <input type="file" id="context-file-input" multiple style="display: none;" />
              <button id="add-context-file" class="btn btn-secondary" style="width: 100%; margin-bottom: 8px;">
                + Add Context Files
              </button>
              <div id="context-files-list" class="context-files-list">
                ${this.renderContextFilesList()}
              </div>
            </div>
            
            <!-- Tools -->
            <div class="config-section">
              <h4>🛠️ Available Tools</h4>
              <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                Tools the agent can call during execution
              </p>
              <label style="display: block; font-size: 13px; margin: 4px 0;">
                <input type="checkbox" id="tool-execute-code" ${this.config.tools?.includes('execute_code') ? 'checked' : ''}>
                Execute Code
              </label>
              <label style="display: block; font-size: 13px; margin: 4px 0;">
                <input type="checkbox" id="tool-fetch-url" ${this.config.tools?.includes('fetch_url') ? 'checked' : ''}>
                Fetch URL
              </label>
              <label style="display: block; font-size: 13px; margin: 4px 0;">
                <input type="checkbox" id="tool-search-web" ${this.config.tools?.includes('search_web') ? 'checked' : ''}>
                Search Web
              </label>
              <label style="display: block; font-size: 13px; margin: 4px 0;">
                <input type="checkbox" id="tool-read-file" ${this.config.tools?.includes('read_file') ? 'checked' : ''}>
                Read File
              </label>
            </div>

            <!-- Token Estimate -->
            <div class="token-estimate">
              <h4>📊 Token Estimate</h4>
              <div class="estimate-bar">
                <div id="token-bar" class="token-bar-fill" style="width: 0%"></div>
              </div>
              <div class="estimate-details">
                <div>Total: <strong id="token-total">0</strong> tokens</div>
                <div>GPU Fit: <strong id="token-gpu">✅</strong></div>
                <div>CPU Risk: <span id="token-risk" class="badge">Low</span></div>
              </div>
            </div>
          </div>

          <!-- Right: Code Editor -->
          <div class="code-panel">
            <div class="editor-tabs">
              <button class="editor-tab active" data-tab="prompt">System Prompt</button>
              <button class="editor-tab" data-tab="context">Context Files</button>
              <button class="editor-tab" data-tab="output">Test Output</button>
            </div>
            
            <!-- Monaco Editor Container -->
            <div id="monaco-editor" class="monaco-container"></div>
            
            <!-- Test Output (hidden by default) -->
            <div id="test-output" class="test-output" style="display: none;">
              <div id="test-result"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async initMonaco() {
    const editorContainer = document.getElementById('monaco-editor');
    
    this.editor = monaco.editor.create(editorContainer, {
      value: this.config.systemPrompt,
      language: 'markdown',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: 'on',
      lineNumbers: 'on',
      scrollBeyondLastLine: false
    });

    // Update token estimate on content change
    this.editor.onDidChangeModelContent(() => {
      this.config.systemPrompt = this.editor.getValue();
      this.updateTokenEstimate();
    });
  }

  async loadAvailableModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      this.models = data.models || [];
      
      const modelSelect = document.getElementById('agent-model');
      modelSelect.innerHTML = this.models.map(m => 
        `<option value="${m.name}">${m.name}</option>`
      ).join('');
      
      modelSelect.value = this.config.model;
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
      document.getElementById('agent-model').innerHTML = 
        '<option value="qwen2.5-coder:14b">qwen2.5-coder:14b (offline)</option>';
    }
  }

  attachEventListeners() {
    // Templates
    document.getElementById('template-btn').addEventListener('click', () => this.showTemplates());
    
    // Agent name
    document.getElementById('agent-name').addEventListener('input', (e) => {
      this.config.name = e.target.value;
    });

    // Mode
    document.getElementById('agent-mode').addEventListener('change', (e) => {
      this.config.mode = e.target.value;
      this.updatePromptTemplate();
    });

    // Model
    document.getElementById('agent-model').addEventListener('change', (e) => {
      this.config.model = e.target.value;
      this.updateTokenEstimate();
    });

    // Temperature
    document.getElementById('temperature').addEventListener('input', (e) => {
      this.config.temperature = parseFloat(e.target.value);
      document.getElementById('temp-value').textContent = this.config.temperature;
    });

    // Top-P
    document.getElementById('top-p').addEventListener('input', (e) => {
      this.config.topP = parseFloat(e.target.value);
      document.getElementById('topp-value').textContent = this.config.topP;
    });

    // Max Tokens
    document.getElementById('max-tokens').addEventListener('input', (e) => {
      this.config.maxTokens = parseInt(e.target.value);
      document.getElementById('maxtoken-value').textContent = this.config.maxTokens;
      this.updateTokenEstimate();
    });

    // Context Window
    document.getElementById('context-window').addEventListener('input', (e) => {
      this.config.contextWindow = parseInt(e.target.value);
      document.getElementById('context-value').textContent = this.config.contextWindow;
      this.updateTokenEstimate();
    });

    // RAG
    document.getElementById('use-rag').addEventListener('change', (e) => {
      this.config.useRAG = e.target.checked;
      document.getElementById('rag-settings').style.display = e.target.checked ? 'block' : 'none';
      this.updateTokenEstimate();
    });

    document.getElementById('rag-episodes').addEventListener('input', (e) => {
      this.config.ragEpisodes = parseInt(e.target.value);
      document.getElementById('rag-value').textContent = this.config.ragEpisodes;
      this.updateTokenEstimate();
    });

    // Knowledge Base
    document.getElementById('use-knowledge').addEventListener('change', (e) => {
      this.config.useKnowledge = e.target.checked;
    });
    
    // Context Files
    document.getElementById('add-context-file')?.addEventListener('click', () => {
      document.getElementById('context-file-input').click();
    });
    
    document.getElementById('context-file-input')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await this.addContextFile(file);
      }
      e.target.value = ''; // Reset input
      this.renderContextFiles();
    });
    
    // Tools
    ['execute-code', 'fetch-url', 'search-web', 'read-file'].forEach(tool => {
      document.getElementById(`tool-${tool}`)?.addEventListener('change', (e) => {
        const toolName = tool.replace('-', '_');
        if (e.target.checked) {
          if (!this.config.tools.includes(toolName)) {
            this.config.tools.push(toolName);
          }
        } else {
          this.config.tools = this.config.tools.filter(t => t !== toolName);
        }
      });
    });

    // Actions
    document.getElementById('save-agent').addEventListener('click', () => this.saveAgent());
    document.getElementById('load-agent').addEventListener('click', () => this.loadAgent());
    document.getElementById('export-agent').addEventListener('click', () => this.exportAgent());
    document.getElementById('test-agent').addEventListener('click', () => this.testAgent());

    // Editor tabs
    document.querySelectorAll('.editor-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.switchEditorTab(e.target.dataset.tab);
      });
    });
  }

  updatePromptTemplate() {
    const templates = {
      'general': `You are a helpful AI assistant.`,
      'web-scraper': `You are an expert web scraping agent. Generate clean, efficient scraping code.

Skills:
- Puppeteer for JavaScript-heavy sites
- Cheerio for static HTML parsing
- Error handling and retries
- Data extraction and cleaning`,
      'code-generator': `You are an expert code generator. Write clean, efficient, well-documented code.

Guidelines:
- Follow best practices
- Include error handling
- Add helpful comments
- Ensure type safety`,
      'analyst': `You are a data analyst. Analyze data and provide clear insights.

Approach:
- Identify patterns
- Calculate statistics
- Create visualizations
- Provide recommendations`,
      'writer': `You are a content writer. Create engaging, clear content.

Style:
- Clear and concise
- Well-structured
- Engaging tone
- Proper formatting`
    };

    this.config.systemPrompt = templates[this.config.mode] || templates.general;
    this.editor.setValue(this.config.systemPrompt);
  }

  updateTokenEstimate() {
    // Rough estimation: ~4 chars per token
    const promptTokens = Math.ceil(this.config.systemPrompt.length / 4);
    const ragTokens = this.config.useRAG ? this.config.ragEpisodes * 500 : 0;
    const knowledgeTokens = this.config.useKnowledge ? 1000 : 0;
    const outputTokens = this.config.maxTokens;
    
    const total = promptTokens + ragTokens + knowledgeTokens + outputTokens;
    const percentage = (total / this.config.contextWindow) * 100;
    
    this.tokenEstimate.total = total;
    this.tokenEstimate.fitsGPU = total <= 4096;
    this.tokenEstimate.cpuRisk = total < 2000 ? 'low' : total < 6000 ? 'medium' : 'high';
    
    // Update UI
    document.getElementById('token-total').textContent = total;
    document.getElementById('token-bar').style.width = `${Math.min(percentage, 100)}%`;
    document.getElementById('token-bar').className = `token-bar-fill ${
      percentage < 50 ? 'success' : percentage < 80 ? 'warning' : 'danger'
    }`;
    document.getElementById('token-gpu').textContent = this.tokenEstimate.fitsGPU ? '✅' : '❌';
    
    const riskBadge = document.getElementById('token-risk');
    riskBadge.textContent = this.tokenEstimate.cpuRisk.toUpperCase();
    riskBadge.className = `badge badge-${this.tokenEstimate.cpuRisk}`;
  }
  
  renderContextFilesList() {
    if (!this.config.contextFiles || this.config.contextFiles.length === 0) {
      return '<p style="font-size: 12px; color: #9ca3af; text-align: center; padding: 12px;">No context files added</p>';
    }
    
    return this.config.contextFiles.map((file, index) => `
      <div class="context-file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 500; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            📄 ${file.name}
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            ${(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
        <button class="remove-context-file" data-index="${index}" style="padding: 4px 8px; background: #fee; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; cursor: pointer; font-size: 11px;">
          ✖
        </button>
      </div>
    `).join('');
  }
  
  renderContextFiles() {
    const listContainer = document.getElementById('context-files-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderContextFilesList();
      
      // Attach remove handlers
      listContainer.querySelectorAll('.remove-context-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          this.removeContextFile(index);
        });
      });
    }
  }
  
  async addContextFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.config.contextFiles.push({
          name: file.name,
          size: file.size,
          content: e.target.result,
          addedAt: new Date().toISOString()
        });
        console.log(`✅ Added context file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        resolve();
      };
      reader.readAsText(file);
    });
  }
  
  removeContextFile(index) {
    const file = this.config.contextFiles[index];
    if (confirm(`Remove "${file.name}" from context?`)) {
      this.config.contextFiles.splice(index, 1);
      this.renderContextFiles();
      console.log(`🗑️ Removed context file: ${file.name}`);
    }
  }

  switchEditorTab(tab) {
    const monacoContainer = document.getElementById('monaco-editor');
    const testOutput = document.getElementById('test-output');
    
    if (tab === 'output') {
      monacoContainer.style.display = 'none';
      testOutput.style.display = 'block';
    } else {
      monacoContainer.style.display = 'block';
      testOutput.style.display = 'none';
      
      if (tab === 'context') {
        // Show context files content
        if (this.config.contextFiles.length === 0) {
          this.editor.setValue('# Context Files\n\nNo context files added yet. Use the "+ Add Context Files" button to upload files.');
        } else {
          const contextContent = this.config.contextFiles.map(file => 
            `# ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n\n${file.content}\n\n---\n`
          ).join('\n');
          this.editor.setValue(contextContent);
        }
        this.editor.updateOptions({ language: 'markdown', readOnly: true });
      } else {
        this.editor.setValue(this.config.systemPrompt);
        this.editor.updateOptions({ language: 'markdown', readOnly: false });
      }
    }
  }

  saveAgent() {
    const agents = JSON.parse(localStorage.getItem('saved_agents') || '[]');
    const existingIndex = agents.findIndex(a => a.name === this.config.name);
    
    if (existingIndex >= 0) {
      agents[existingIndex] = this.config;
    } else {
      agents.push(this.config);
    }
    
    localStorage.setItem('saved_agents', JSON.stringify(agents));
    alert(`✅ Agent "${this.config.name}" saved!`);
  }

  loadAgent() {
    const agents = JSON.parse(localStorage.getItem('saved_agents') || '[]');
    if (agents.length === 0) {
      alert('No saved agents found');
      return;
    }
    
    const agentName = prompt(`Available agents:\n${agents.map(a => a.name).join('\n')}\n\nEnter agent name to load:`);
    const agent = agents.find(a => a.name === agentName);
    
    if (agent) {
      this.config = agent;
      this.init();
      alert(`✅ Agent "${agentName}" loaded!`);
    } else {
      alert('Agent not found');
    }
  }

  exportAgent() {
    const dataStr = JSON.stringify(this.config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.config.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async testAgent() {
    const testPrompt = prompt('Enter test prompt:', 'Hello, introduce yourself!');
    if (!testPrompt) return;
    
    document.querySelector('[data-tab="output"]').click();
    const output = document.getElementById('test-result');
    output.innerHTML = '<div class="loading">🔄 Testing agent...</div>';
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3002/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `// Agent Test
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: '${this.config.model}',
    prompt: \`${this.config.systemPrompt}\\n\\nUser: ${testPrompt}\\n\\nAssistant:\`,
    options: {
      temperature: ${this.config.temperature},
      top_p: ${this.config.topP},
      num_predict: ${this.config.maxTokens}
    },
    stream: false
  })
});
const data = await response.json();
return data.response;`
        })
      });
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        output.innerHTML = `
          <div class="test-success">
            <h4>✅ Test Successful</h4>
            <div class="test-response">${result.output}</div>
          </div>
        `;
        
        // Track successful agent execution
        MetricsService.trackAgentExecution(
          this.config.name || 'Unnamed Agent',
          true,
          duration
        );
      } else {
        output.innerHTML = `
          <div class="test-error">
            <h4>❌ Test Failed</h4>
            <pre>${result.error}</pre>
          </div>
        `;
        
        // Track failed agent execution
        MetricsService.trackAgentExecution(
          this.config.name || 'Unnamed Agent',
          false,
          duration,
          result.error
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      output.innerHTML = `
        <div class="test-error">
          <h4>❌ Connection Error</h4>
          <pre>${error.message}</pre>
        </div>
      `;
      
      // Track failed agent execution
      MetricsService.trackAgentExecution(
        this.config.name || 'Unnamed Agent',
        false,
        duration,
        error
      );
    }
  }

  showTemplates() {
    // Remove existing modal if any
    const existingModal = document.querySelector('.template-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'template-modal';
    modal.innerHTML = `
      <div class="template-modal-content">
        <div class="template-modal-header">
          <h2>📋 Agent Templates</h2>
          <button class="template-close-btn">✖</button>
        </div>
        <div class="template-modal-body">
          <div class="template-grid" id="template-grid"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('.template-close-btn');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Render templates
    this.renderTemplates();
  }

  renderTemplates() {
    const grid = document.getElementById('template-grid');
    const templates = AgentTemplates.getAllTemplates();

    grid.innerHTML = templates.map(({id, name, mode}) => {
      const template = AgentTemplates.getTemplate(id);
      const icon = this.getTemplateIcon(mode);
      return `
        <div class="template-card" data-template-id="${id}">
          <div class="template-card-header">
            <span class="template-icon">${icon}</span>
            <h3>${name}</h3>
          </div>
          <div class="template-card-body">
            <div class="template-mode-badge">${mode.replace('-', ' ')}</div>
            <p class="template-description">${template.systemPrompt.substring(0, 120)}...</p>
            <div class="template-specs">
              <span>🔥 ${template.temperature}</span>
              <span>🎯 ${template.maxTokens}</span>
              <span>📦 ${(template.contextWindow/1024).toFixed(0)}K</span>
            </div>
          </div>
          <div class="template-card-footer">
            <button class="btn btn-sm btn-primary template-use-btn" data-template-id="${id}">
              Use Template
            </button>
            <button class="btn btn-sm btn-secondary template-preview-btn" data-template-id="${id}">
              Preview
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners
    grid.querySelectorAll('.template-use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = e.target.dataset.templateId;
        this.applyTemplate(templateId);
      });
    });

    grid.querySelectorAll('.template-preview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = e.target.dataset.templateId;
        this.previewTemplate(templateId);
      });
    });
  }

  getTemplateIcon(mode) {
    const icons = {
      'web-scraper': '🕷️',
      'code-generator': '💻',
      'data-analyst': '📊',
      'content-writer': '✍️',
      'research-assistant': '🔬',
      'api-tester': '🔌',
      'bug-finder': '🐛',
      'documentation-writer': '📚',
      'general': '🤖'
    };
    return icons[mode] || '🤖';
  }

  applyTemplate(templateId) {
    const template = AgentTemplates.getTemplate(templateId);
    
    // Update config
    this.config = {...template};
    
    // Update UI with null checks
    const setValueIfExists = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    };
    
    const setTextIfExists = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    
    const setCheckedIfExists = (id, checked) => {
      const el = document.getElementById(id);
      if (el) el.checked = checked;
    };
    
    setValueIfExists('agent-name', template.name);
    setValueIfExists('agent-mode', template.mode);
    setValueIfExists('agent-model', template.model);
    setValueIfExists('temperature', template.temperature);
    setTextIfExists('temp-value', template.temperature);
    setValueIfExists('top-p', template.topP);
    setTextIfExists('topp-value', template.topP);
    setValueIfExists('max-tokens', template.maxTokens);
    setTextIfExists('maxtoken-value', template.maxTokens);
    setValueIfExists('context-window', template.contextWindow);
    setTextIfExists('context-value', template.contextWindow);
    setValueIfExists('rag-episodes', template.ragEpisodes);
    setTextIfExists('rag-value', template.ragEpisodes);
    setCheckedIfExists('use-rag', template.useRAG);
    setCheckedIfExists('use-knowledge', template.useKnowledge);
    
    // Update tools if present
    if (template.tools) {
      ['execute-code', 'fetch-url', 'search-web', 'read-file'].forEach(tool => {
        const toolName = tool.replace('-', '_');
        setCheckedIfExists(`tool-${tool}`, template.tools.includes(toolName));
      });
    }
    
    // Update Monaco editor
    if (this.editor) {
      this.editor.setValue(template.systemPrompt);
    }
    
    // Update token estimation
    this.updateTokenEstimation();
    
    // Close modal
    document.querySelector('.template-modal').remove();
    
    // Show success message
    const message = document.createElement('div');
    message.className = 'template-applied-message';
    message.textContent = `✅ Applied template: ${template.name}`;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
  }

  previewTemplate(templateId) {
    const template = AgentTemplates.getTemplate(templateId);
    
    const preview = document.createElement('div');
    preview.className = 'template-preview-modal';
    preview.innerHTML = `
      <div class="template-preview-content">
        <div class="template-preview-header">
          <h2>${this.getTemplateIcon(template.mode)} ${template.name}</h2>
          <button class="template-preview-close">✖</button>
        </div>
        <div class="template-preview-body">
          <div class="template-preview-section">
            <h3>📝 System Prompt</h3>
            <pre class="template-preview-prompt">${template.systemPrompt}</pre>
          </div>
          <div class="template-preview-section">
            <h3>⚙️ Configuration</h3>
            <div class="template-preview-grid">
              <div><strong>Mode:</strong> ${template.mode}</div>
              <div><strong>Model:</strong> ${template.model}</div>
              <div><strong>Temperature:</strong> ${template.temperature}</div>
              <div><strong>Top-P:</strong> ${template.topP}</div>
              <div><strong>Max Tokens:</strong> ${template.maxTokens}</div>
              <div><strong>Context Window:</strong> ${(template.contextWindow/1024).toFixed(0)}K</div>
              <div><strong>RAG Enabled:</strong> ${template.useRAG ? '✅' : '❌'}</div>
              <div><strong>RAG Episodes:</strong> ${template.ragEpisodes}</div>
            </div>
          </div>
          <div class="template-preview-section">
            <h3>📚 Enabled Guides</h3>
            <div class="template-preview-guides">
              ${template.enabledGuides.map(guide => `<span class="guide-badge">${guide}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="template-preview-footer">
          <button class="btn btn-primary template-preview-use" data-template-id="${templateId}">
            Use This Template
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(preview);
    
    // Close handler
    preview.querySelector('.template-preview-close').addEventListener('click', () => {
      preview.remove();
    });
    
    preview.addEventListener('click', (e) => {
      if (e.target === preview) preview.remove();
    });
    
    // Use button handler
    preview.querySelector('.template-preview-use').addEventListener('click', () => {
      preview.remove();
      this.applyTemplate(templateId);
    });
  }

  getConfig() {
    return this.config;
  }
}

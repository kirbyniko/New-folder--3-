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
      enabledGuides: ['basic-selectors', 'error-handling'],
      // Multi-step instructions
      instructions: [],
      // Coding environment
      environment: {
        runtime: 'nodejs',  // nodejs, python, deno, browser
        dependencies: [],
        environmentVars: {},
        sandboxed: true,
        timeout: 30000,
        memoryLimit: '512MB'
      }
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
              <button class="editor-tab" data-tab="instructions">📋 Instructions</button>
              <button class="editor-tab" data-tab="environment">⚙️ Environment</button>
              <button class="editor-tab" data-tab="context">Context Files</button>
              <button class="editor-tab" data-tab="output">Test Output</button>
            </div>
            
            <!-- Monaco Editor Container -->
            <div id="monaco-editor" class="monaco-container"></div>
            
            <!-- Instructions UI (hidden by default) -->
            <div id="instructions-ui" style="display: none; padding: 15px; background: #1e1e1e; height: 100%; overflow-y: auto;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #e0e0e0;">📋 Agent Instructions</h3>
                <button id="add-instruction-btn" style="padding: 8px 16px; background: #0e7490; color: white; border: none; border-radius: 4px; cursor: pointer;">+ Add Step</button>
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin-bottom: 15px;">
                Define multi-step workflows for your agent to follow. Each step executes in order.
              </p>
              <div id="instructions-list"></div>
            </div>
            
            <!-- Environment UI (hidden by default) -->
            <div id="environment-ui" style="display: none; padding: 15px; background: #1e1e1e; height: 100%; overflow-y: auto;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: #e0e0e0; margin: 0;">⚙️ Coding Environment</h3>
                <button id="auto-configure-env-btn" style="padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">
                  ✨ Auto-Configure
                </button>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 15px;">
                Let AI analyze your prompts to suggest optimal runtime and dependencies
              </p>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; color: #9ca3af; font-size: 13px; margin-bottom: 5px;">Runtime</label>
                <select id="env-runtime" style="width: 100%; padding: 8px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;">
                  <option value="nodejs">Node.js</option>
                  <option value="python">Python</option>
                  <option value="deno">Deno</option>
                  <option value="browser">Browser (Puppeteer)</option>
                </select>
              </div>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; color: #9ca3af; font-size: 13px; margin-bottom: 5px;">Dependencies</label>
                <textarea id="env-dependencies" placeholder="axios@1.6.0\nlodash@4.17.21\ncheerio@1.0.0" style="width: 100%; height: 100px; padding: 8px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 12px;"></textarea>
                <small style="color: #6b7280; font-size: 11px;">One per line: package@version</small>
              </div>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; color: #9ca3af; font-size: 13px; margin-bottom: 5px;">
                  <input type="checkbox" id="env-sandboxed" checked> Sandboxed Execution
                </label>
                <small style="color: #6b7280; font-size: 11px; display: block; margin-left: 20px;">
                  Isolate code execution for security
                </small>
              </div>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; color: #9ca3af; font-size: 13px; margin-bottom: 5px;">Timeout (seconds)</label>
                <input type="number" id="env-timeout" value="30" min="5" max="300" style="width: 100%; padding: 8px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;" />
              </div>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; color: #9ca3af; font-size: 13px; margin-bottom: 5px;">Memory Limit</label>
                <select id="env-memory" style="width: 100%; padding: 8px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px;">
                  <option value="256MB">256 MB</option>
                  <option value="512MB" selected>512 MB</option>
                  <option value="1GB">1 GB</option>
                  <option value="2GB">2 GB</option>
                </select>
              </div>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; color: #9ca3af; font-size: 13px; margin-bottom: 5px;">Environment Variables</label>
                <div id="env-vars-list"></div>
                <button id="add-env-var-btn" style="padding: 6px 12px; background: #374151; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px;">+ Add Variable</button>
              </div>
            </div>
            
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
    
    // Instructions
    document.getElementById('add-instruction-btn')?.addEventListener('click', () => {
      this.addInstruction();
    });
    
    // Environment
    document.getElementById('env-runtime')?.addEventListener('change', (e) => {
      this.config.environment.runtime = e.target.value;
      this.updateDependenciesPlaceholder();
    });
    
    document.getElementById('env-dependencies')?.addEventListener('input', (e) => {
      this.config.environment.dependencies = e.target.value
        .split('\\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    });
    
    document.getElementById('env-sandboxed')?.addEventListener('change', (e) => {
      this.config.environment.sandboxed = e.target.checked;
    });
    
    document.getElementById('env-timeout')?.addEventListener('input', (e) => {
      this.config.environment.timeout = parseInt(e.target.value) * 1000; // Convert to ms
    });
    
    document.getElementById('env-memory')?.addEventListener('change', (e) => {
      this.config.environment.memoryLimit = e.target.value;
    });
    
    document.getElementById('add-env-var-btn')?.addEventListener('click', () => {
      this.addEnvironmentVariable();
    });
    
    document.getElementById('auto-configure-env-btn')?.addEventListener('click', () => {
      this.autoConfigureEnvironment();
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
    const instructionsUI = document.getElementById('instructions-ui');
    const environmentUI = document.getElementById('environment-ui');
    
    // Hide all
    monacoContainer.style.display = 'none';
    testOutput.style.display = 'none';
    if (instructionsUI) instructionsUI.style.display = 'none';
    if (environmentUI) environmentUI.style.display = 'none';
    
    if (tab === 'output') {
      testOutput.style.display = 'block';
    } else if (tab === 'instructions') {
      instructionsUI.style.display = 'block';
      this.renderInstructions();
    } else if (tab === 'environment') {
      environmentUI.style.display = 'block';
      this.renderEnvironment();
    } else {
      monacoContainer.style.display = 'block';
      
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
    this.updateTokenEstimate();
    
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
  
  // Instructions Management
  renderInstructions() {
    const listContainer = document.getElementById('instructions-list');
    if (!listContainer) return;
    
    if (this.config.instructions.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #6b7280;">
          <p>No instructions added yet.</p>
          <p style="font-size: 12px;">Click "+ Add Step" to create your first instruction.</p>
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = this.config.instructions.map((instruction, index) => `
      <div class="instruction-item" style="background: #2d2d2d; border: 1px solid #404040; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #0e7490; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">Step ${index + 1}</span>
            <input type="text" class="instruction-name" data-index="${index}" value="${instruction.name || ''}" placeholder="Step name..." style="background: transparent; border: none; color: #e0e0e0; font-weight: 500; font-size: 14px; outline: none; flex: 1;" />
          </div>
          <button class="remove-instruction" data-index="${index}" style="background: #7f1d1d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">✖</button>
        </div>
        <textarea class="instruction-prompt" data-index="${index}" placeholder="Enter instruction prompt..." style="width: 100%; min-height: 80px; padding: 8px; background: #1e1e1e; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 12px; resize: vertical;">${instruction.prompt || ''}</textarea>
        <div style="display: flex; gap: 10px; margin-top: 8px; font-size: 12px;">
          <label style="color: #9ca3af;">
            <input type="checkbox" class="instruction-conditional" data-index="${index}" ${instruction.conditional ? 'checked' : ''}> 
            Conditional
          </label>
          <label style="color: #9ca3af;">
            <input type="checkbox" class="instruction-loop" data-index="${index}" ${instruction.loop ? 'checked' : ''}> 
            Loop until complete
          </label>
        </div>
      </div>
    `).join('');
    
    // Attach event listeners
    listContainer.querySelectorAll('.instruction-name').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.config.instructions[index].name = e.target.value;
      });
    });
    
    listContainer.querySelectorAll('.instruction-prompt').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.config.instructions[index].prompt = e.target.value;
      });
    });
    
    listContainer.querySelectorAll('.instruction-conditional').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.config.instructions[index].conditional = e.target.checked;
      });
    });
    
    listContainer.querySelectorAll('.instruction-loop').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.config.instructions[index].loop = e.target.checked;
      });
    });
    
    listContainer.querySelectorAll('.remove-instruction').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (confirm(`Remove step ${index + 1}?`)) {
          this.config.instructions.splice(index, 1);
          this.renderInstructions();
        }
      });
    });
  }
  
  addInstruction() {
    this.config.instructions.push({
      name: '',
      prompt: '',
      conditional: false,
      loop: false
    });
    this.renderInstructions();
  }
  
  // Environment Management
  renderEnvironment() {
    const runtimeSelect = document.getElementById('env-runtime');
    const dependenciesTextarea = document.getElementById('env-dependencies');
    const sandboxedCheckbox = document.getElementById('env-sandboxed');
    const timeoutInput = document.getElementById('env-timeout');
    const memorySelect = document.getElementById('env-memory');
    
    if (runtimeSelect) runtimeSelect.value = this.config.environment.runtime;
    if (dependenciesTextarea) dependenciesTextarea.value = this.config.environment.dependencies.join('\\n');
    if (sandboxedCheckbox) sandboxedCheckbox.checked = this.config.environment.sandboxed;
    if (timeoutInput) timeoutInput.value = this.config.environment.timeout / 1000;
    if (memorySelect) memorySelect.value = this.config.environment.memoryLimit;
    
    this.renderEnvironmentVariables();
  }
  
  renderEnvironmentVariables() {
    const listContainer = document.getElementById('env-vars-list');
    if (!listContainer) return;
    
    const envVars = this.config.environment.environmentVars || {};
    const entries = Object.entries(envVars);
    
    if (entries.length === 0) {
      listContainer.innerHTML = '<p style="color: #6b7280; font-size: 12px; margin: 8px 0;">No environment variables</p>';
      return;
    }
    
    listContainer.innerHTML = entries.map(([key, value]) => `
      <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
        <input type="text" class="env-var-key" value="${key}" placeholder="KEY" style="flex: 1; padding: 6px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px; font-size: 12px;" />
        <span style="color: #6b7280;">=</span>
        <input type="text" class="env-var-value" data-key="${key}" value="${value}" placeholder="value" style="flex: 2; padding: 6px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040; border-radius: 4px; font-size: 12px;" />
        <button class="remove-env-var" data-key="${key}" style="padding: 4px 8px; background: #374151; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">✖</button>
      </div>
    `).join('');
    
    // Attach event listeners
    listContainer.querySelectorAll('.env-var-key').forEach((input, index) => {
      const oldKey = entries[index][0];
      input.addEventListener('change', (e) => {
        const newKey = e.target.value.trim();
        if (newKey && newKey !== oldKey) {
          const value = this.config.environment.environmentVars[oldKey];
          delete this.config.environment.environmentVars[oldKey];
          this.config.environment.environmentVars[newKey] = value;
          this.renderEnvironmentVariables();
        }
      });
    });
    
    listContainer.querySelectorAll('.env-var-value').forEach(input => {
      input.addEventListener('input', (e) => {
        const key = e.target.dataset.key;
        this.config.environment.environmentVars[key] = e.target.value;
      });
    });
    
    listContainer.querySelectorAll('.remove-env-var').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        delete this.config.environment.environmentVars[key];
        this.renderEnvironmentVariables();
      });
    });
  }
  
  addEnvironmentVariable() {
    const key = prompt('Environment variable name:');
    if (key && key.trim()) {
      this.config.environment.environmentVars[key.trim()] = '';
      this.renderEnvironmentVariables();
    }
  }
  
  updateDependenciesPlaceholder() {
    const textarea = document.getElementById('env-dependencies');
    if (!textarea) return;
    
    const placeholders = {
      'nodejs': 'axios@1.6.0\\nlodash@4.17.21\\ncheerio@1.0.0',
      'python': 'requests==2.31.0\\nbeautifulsoup4==4.12.0\\npandas==2.0.0',
      'deno': 'https://deno.land/x/oak@v12.6.1/mod.ts\\nhttps://esm.sh/cheerio@1.0.0',
      'browser': 'puppeteer@21.0.0\\ncheerio@1.0.0'
    };
    
    textarea.placeholder = placeholders[this.config.environment.runtime] || '';
  }
  
  async autoConfigureEnvironment() {
    const btn = document.getElementById('auto-configure-env-btn');
    if (!btn) return;
    
    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing...';
    
    try {
      // Gather context from agent configuration
      const context = {
        systemPrompt: this.config.systemPrompt,
        instructions: this.config.instructions,
        mode: this.config.mode,
        tools: this.config.tools
      };
      
      // Create analysis prompt
      const analysisPrompt = `Analyze this AI agent configuration and suggest the optimal coding environment:

**Agent Mode:** ${context.mode}

**System Prompt:**
${context.systemPrompt}

**Instructions:**
${context.instructions.map((inst, i) => `${i + 1}. ${inst.name}: ${inst.prompt}`).join('\\n')}

**Available Tools:** ${context.tools.join(', ') || 'None'}

Based on this, determine:
1. Best runtime (nodejs/python/deno/browser)
2. Required dependencies with exact versions
3. Recommended timeout (5-300 seconds)
4. Recommended memory limit (256MB/512MB/1GB/2GB)
5. Whether sandboxing should be enabled

Respond ONLY with valid JSON in this format:
{
  "runtime": "nodejs",
  "dependencies": ["axios@1.6.0", "cheerio@1.0.0"],
  "timeout": 30,
  "memoryLimit": "512MB",
  "sandboxed": true,
  "reasoning": "Short explanation of choices"
}`;

      // Call Ollama API
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: analysisPrompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI recommendation');
      }
      
      const data = await response.json();
      const responseText = data.response;
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }
      
      const suggestion = JSON.parse(jsonMatch[0]);
      
      // Apply suggestions with confirmation
      const confirmMsg = `AI suggests:\\n\\n` +
        `Runtime: ${suggestion.runtime}\\n` +
        `Dependencies: ${suggestion.dependencies.join(', ')}\\n` +
        `Timeout: ${suggestion.timeout}s\\n` +
        `Memory: ${suggestion.memoryLimit}\\n` +
        `Sandboxed: ${suggestion.sandboxed}\\n\\n` +
        `Reasoning: ${suggestion.reasoning}\\n\\n` +
        `Apply these settings?`;
      
      if (confirm(confirmMsg)) {
        // Apply configuration
        this.config.environment.runtime = suggestion.runtime;
        this.config.environment.dependencies = suggestion.dependencies;
        this.config.environment.timeout = suggestion.timeout * 1000;
        this.config.environment.memoryLimit = suggestion.memoryLimit;
        this.config.environment.sandboxed = suggestion.sandboxed;
        
        // Re-render environment UI
        this.renderEnvironment();
        
        alert('✅ Environment auto-configured successfully!');
      }
      
    } catch (error) {
      console.error('Auto-configure error:', error);
      alert(`Failed to auto-configure: ${error.message}\\n\\nPlease configure manually or check that Ollama is running.`);
    } finally {
      // Re-enable button
      btn.disabled = false;
      btn.innerHTML = '✨ Auto-Configure';
    }
  }
}


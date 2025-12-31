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
        this.editor.setValue('# Context Files\n\n(File manager coming soon)');
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
    prompt: `${this.config.systemPrompt}\n\nUser: ${testPrompt}\n\nAssistant:`,
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
      
      if (result.success) {
        output.innerHTML = `
          <div class="test-success">
            <h4>✅ Test Successful</h4>
            <div class="test-response">${result.output}</div>
          </div>
        `;
      } else {
        output.innerHTML = `
          <div class="test-error">
            <h4>❌ Test Failed</h4>
            <pre>${result.error}</pre>
          </div>
        `;
      }
    } catch (error) {
      output.innerHTML = `
        <div class="test-error">
          <h4>❌ Connection Error</h4>
          <pre>${error.message}</pre>
        </div>
      `;
    }
  }

  getConfig() {
    return this.config;
  }
}

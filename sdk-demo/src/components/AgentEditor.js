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
            <button id="ai-optimize-all-btn" class="btn" style="background: #7c3aed; color: white; font-weight: 500;">
              ✨ AI Optimize All
            </button>
            <button id="template-btn" class="btn btn-secondary">
              📋 Templates
            </button>
            <button id="save-agent" class="btn btn-primary">
              💾 Save
            </button>
            <button id="load-agent" class="btn">
              📂 Load
            </button>
            <button id="import-agent" class="btn">
              📥 Import
            </button>
            <button id="export-agent" class="btn">
              📤 Export
            </button>
            <input type="file" id="import-agent-file" accept=".json" style="display: none;" />
            <button id="test-agent" class="btn btn-success">
              🧪 Test Agent
            </button>
          </div>
        </div>
        
        <!-- AI Optimization Panel (Global, shown as modal) -->
        <div id="ai-optimize-panel" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2d2d2d; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; z-index: 1000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); min-width: 500px; max-width: 600px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 id="optimize-panel-title" style="margin: 0; color: #e0e0e0; font-size: 18px;">🤖 AI Optimization</h3>
            <button id="close-optimize-panel" style="background: transparent; border: none; color: #9ca3af; cursor: pointer; font-size: 20px; padding: 0; width: 30px; height: 30px;">✖</button>
          </div>
          
          <!-- Generation Mode (shown when agent is empty) -->
          <div id="generation-mode" style="display: none;">
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 15px;">
              🎨 <strong style="color: #e0e0e0;">Generation Mode:</strong> Your agent is empty. Describe what you want it to do and AI will create everything for you!
            </p>
            
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="display: block; color: #e0e0e0; font-size: 14px; font-weight: 500;">
                  What should your agent do?
                </label>
                <button id="ai-generate-idea-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  💡 AI Generate Idea
                </button>
              </div>
              <textarea id="agent-purpose-input" 
                        placeholder="Example: scrape e-commerce sites for product prices&#10;Example: analyze CSV files and generate reports&#10;Example: monitor RSS feeds and send alerts&#10;&#10;Or click 'AI Generate Idea' to get inspiration!"
                        style="width: 100%; min-height: 100px; background: #1e1e1e; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; padding: 12px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
            </div>
          </div>
          
          <!-- Optimization Mode Description (shown when agent has content) -->
          <div id="optimization-mode-description" style="display: none;">
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 15px;">
              ⚡ <strong style="color: #e0e0e0;">Optimization Mode:</strong> Select which aspects of your existing agent to improve.
            </p>
          </div>
          
          <!-- Checkboxes (always shown) -->
          <div id="optimization-checkboxes">
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 10px;">
              Select what to <span id="mode-action">optimize</span>:
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
              <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; font-size: 14px; cursor: pointer; padding: 8px; background: #1e1e1e; border-radius: 4px;">
                <input type="checkbox" id="opt-system-prompt" checked style="cursor: pointer; width: 16px; height: 16px;">
                📝 System Prompt
              </label>
              <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; font-size: 14px; cursor: pointer; padding: 8px; background: #1e1e1e; border-radius: 4px;">
                <input type="checkbox" id="opt-instructions" checked style="cursor: pointer; width: 16px; height: 16px;">
                📋 Instructions
              </label>
              <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; font-size: 14px; cursor: pointer; padding: 8px; background: #1e1e1e; border-radius: 4px;">
                <input type="checkbox" id="opt-environment" checked style="cursor: pointer; width: 16px; height: 16px;">
                ⚙️ Environment
              </label>
              <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; font-size: 14px; cursor: pointer; padding: 8px; background: #1e1e1e; border-radius: 4px;">
                <input type="checkbox" id="opt-context-files" style="cursor: pointer; width: 16px; height: 16px;">
                📁 Context Files
              </label>
              <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; font-size: 14px; cursor: pointer; padding: 8px; background: #1e1e1e; border-radius: 4px;">
                <input type="checkbox" id="opt-tools" checked style="cursor: pointer; width: 16px; height: 16px;">
                🛠️ Tools
              </label>
              <label style="display: flex; align-items: center; gap: 8px; color: #e0e0e0; font-size: 14px; cursor: pointer; padding: 8px; background: #1e1e1e; border-radius: 4px;">
                <input type="checkbox" id="opt-settings" checked style="cursor: pointer; width: 16px; height: 16px;">
                ⚡ Settings
              </label>
            </div>
          </div>
          
          <!-- Token Impact (only for optimization mode) -->
          <div id="token-impact-section" style="background: #1e1e1e; border-radius: 6px; padding: 12px; margin-bottom: 15px; display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #9ca3af; font-size: 13px;">Token Impact:</span>
              <span id="token-impact" style="color: #10b981; font-size: 14px; font-weight: 600;">Calculating...</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #9ca3af; font-size: 13px;">Current Tokens:</span>
              <span id="current-tokens-display" style="color: #e0e0e0; font-size: 13px; font-weight: 500;">0</span>
            </div>
          </div>
          
          <button id="run-ai-optimize" style="width: 100%; padding: 12px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
            🚀 Run AI Optimization
          </button>
          
          <!-- AI Progress/Thinking Stream -->
          <div id="ai-progress-stream" style="display: none; margin-top: 15px; background: #1e1e1e; border-radius: 6px; padding: 15px; max-height: 300px; overflow-y: auto;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <div style="width: 16px; height: 16px; border: 2px solid #7c3aed; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="color: #e0e0e0; font-weight: 500; font-size: 13px;">🤖 AI is thinking...</span>
            </div>
            <div id="ai-progress-content" style="color: #9ca3af; font-size: 12px; font-family: 'Consolas', 'Monaco', monospace; line-height: 1.6; white-space: pre-wrap;"></div>
          </div>
          
          <style>
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            #ai-progress-stream::-webkit-scrollbar {
              width: 8px;
            }
            #ai-progress-stream::-webkit-scrollbar-track {
              background: #2d2d2d;
              border-radius: 4px;
            }
            #ai-progress-stream::-webkit-scrollbar-thumb {
              background: #7c3aed;
              border-radius: 4px;
            }
          </style>
        </div>
        
        <!-- Modal backdrop -->
        <div id="ai-optimize-backdrop" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 999;"></div>

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
              <h3 style="color: #e0e0e0; margin-bottom: 15px;">⚙️ Coding Environment</h3>
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 15px;">
                Configure the runtime environment for code execution
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
    
    // AI Optimization
    document.getElementById('ai-optimize-all-btn')?.addEventListener('click', () => {
      this.showOptimizationPanel();
    });
    
    document.getElementById('close-optimize-panel')?.addEventListener('click', () => {
      this.hideOptimizationPanel();
    });
    
    document.getElementById('ai-optimize-backdrop')?.addEventListener('click', () => {
      this.hideOptimizationPanel();
    });
    
    document.getElementById('run-ai-optimize')?.addEventListener('click', () => {
      this.runAIOptimization();
    });
    
    document.getElementById('ai-generate-idea-btn')?.addEventListener('click', () => {
      this.generateAgentIdea();
    });
    
    // Update token impact when checkboxes change
    ['opt-system-prompt', 'opt-instructions', 'opt-environment', 'opt-context-files', 'opt-tools', 'opt-settings'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        this.updateTokenImpact();
      });
    });

    // Actions
    document.getElementById('save-agent').addEventListener('click', () => this.saveAgent());
    document.getElementById('load-agent').addEventListener('click', () => this.loadAgent());
    document.getElementById('import-agent').addEventListener('click', () => {
      document.getElementById('import-agent-file').click();
    });
    document.getElementById('import-agent-file')?.addEventListener('change', (e) => this.importAgent(e));
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
    // Ensure all current UI values are synced to config
    this.config.name = document.getElementById('agent-name')?.value || this.config.name;
    this.config.systemPrompt = this.editor?.getValue() || this.config.systemPrompt;
    
    const agents = JSON.parse(localStorage.getItem('saved_agents') || '[]');
    const existingIndex = agents.findIndex(a => a.name === this.config.name);
    
    if (existingIndex >= 0) {
      if (!confirm(`Agent "${this.config.name}" already exists. Overwrite?`)) {
        return;
      }
      agents[existingIndex] = this.config;
    } else {
      agents.push(this.config);
    }
    
    localStorage.setItem('saved_agents', JSON.stringify(agents));
    
    // Show detailed save confirmation
    const configSize = JSON.stringify(this.config).length;
    const details = `
✅ Agent "${this.config.name}" saved to browser storage!

📊 Configuration Details:
• System Prompt: ${this.config.systemPrompt.length} chars
• Instructions: ${this.config.instructions.length} steps
• Environment: ${this.config.environment.runtime}
• Dependencies: ${this.config.environment.dependencies.length}
• Context Files: ${this.config.contextFiles.length}
• Tools: ${this.config.tools.length}
• Total Size: ${(configSize / 1024).toFixed(2)} KB

💡 Tip: Use "📤 Export" to save as a file for backup or sharing.`;
    
    alert(details);
  }

  loadAgent() {
    const agents = JSON.parse(localStorage.getItem('saved_agents') || '[]');
    if (agents.length === 0) {
      alert('❌ No saved agents found.\n\nTip: Save an agent first with the "💾 Save" button, or use "📥 Import" to load from a file.');
      return;
    }
    
    // Create a better selection UI
    const agentList = agents.map((a, i) => `${i + 1}. ${a.name} (${a.instructions.length} steps, ${a.tools.length} tools)`).join('\n');
    const agentName = prompt(`📂 Available Agents (${agents.length} saved):\n\n${agentList}\n\nEnter the agent name to load:`);
    
    if (!agentName) return;
    
    const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
    
    if (agent) {
      this.config = JSON.parse(JSON.stringify(agent)); // Deep clone
      this.init();
      alert(`✅ Agent "${agentName}" loaded successfully!\n\n📊 Loaded:\n• ${agent.instructions.length} instructions\n• ${agent.environment.dependencies.length} dependencies\n• ${agent.contextFiles.length} context files\n• ${agent.tools.length} tools`);
    } else {
      alert(`❌ Agent "${agentName}" not found.\n\nAvailable agents:\n${agents.map(a => '• ' + a.name).join('\n')}`);
    }
  }

  importAgent(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        // Validate that it's an agent config
        if (!imported.name || !imported.systemPrompt) {
          throw new Error('Invalid agent configuration file');
        }
        
        // Ask for confirmation with details
        const details = `
📥 Import Agent Configuration

📛 Name: ${imported.name}
📝 System Prompt: ${imported.systemPrompt.substring(0, 100)}...
📋 Instructions: ${imported.instructions?.length || 0} steps
⚙️ Environment: ${imported.environment?.runtime || 'nodejs'}
📦 Dependencies: ${imported.environment?.dependencies?.length || 0}
📁 Context Files: ${imported.contextFiles?.length || 0}
🛠️ Tools: ${imported.tools?.length || 0}

Import this configuration?`;
        
        if (confirm(details)) {
          this.config = imported;
          this.init();
          alert(`✅ Agent "${imported.name}" imported successfully!`);
        }
      } catch (error) {
        alert(`❌ Failed to import agent:\n\n${error.message}\n\nMake sure the file is a valid agent configuration JSON.`);
      }
    };
    reader.readAsText(file);
    
    // Reset file input so same file can be imported again
    event.target.value = '';
  }

  exportAgent() {
    // Ensure all current UI values are synced to config
    this.config.name = document.getElementById('agent-name')?.value || this.config.name;
    this.config.systemPrompt = this.editor?.getValue() || this.config.systemPrompt;
    
    const dataStr = JSON.stringify(this.config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.config.name.replace(/\s+/g, '_')}_agent.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    const configSize = JSON.stringify(this.config).length;
    alert(`✅ Agent "${this.config.name}" exported!\n\n💾 File: ${this.config.name.replace(/\s+/g, '_')}_agent.json\n📊 Size: ${(configSize / 1024).toFixed(2)} KB\n\n✨ Complete configuration saved including:\n• System prompt\n• ${this.config.instructions.length} instruction steps\n• Environment & dependencies\n• ${this.config.contextFiles.length} context files\n• ${this.config.tools.length} tools\n• All settings`);
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
  
  showOptimizationPanel() {
    const panel = document.getElementById('ai-optimize-panel');
    const backdrop = document.getElementById('ai-optimize-backdrop');
    if (!panel || !backdrop) return;
    
    // Detect if agent is empty (generation mode) or has content (optimization mode)
    const isEmpty = !this.config.systemPrompt || 
                    this.config.systemPrompt.trim() === 'You are a helpful AI assistant.' ||
                    this.config.systemPrompt.trim().length < 50;
    
    const hasNoInstructions = !this.config.instructions || this.config.instructions.length === 0;
    
    const isGenerationMode = isEmpty && hasNoInstructions;
    
    // Update UI based on mode
    const title = document.getElementById('optimize-panel-title');
    const generationMode = document.getElementById('generation-mode');
    const optimizationModeDesc = document.getElementById('optimization-mode-description');
    const tokenImpactSection = document.getElementById('token-impact-section');
    const modeAction = document.getElementById('mode-action');
    const runButton = document.getElementById('run-ai-optimize');
    
    if (isGenerationMode) {
      // Show generation mode
      if (title) title.textContent = '🎨 AI Agent Generator';
      if (generationMode) generationMode.style.display = 'block';
      if (optimizationModeDesc) optimizationModeDesc.style.display = 'none';
      if (tokenImpactSection) tokenImpactSection.style.display = 'none';
      if (modeAction) modeAction.textContent = 'generate';
      if (runButton) runButton.innerHTML = '✨ Generate Agent';
    } else {
      // Show optimization mode
      if (title) title.textContent = '🤖 AI Optimization';
      if (generationMode) generationMode.style.display = 'none';
      if (optimizationModeDesc) optimizationModeDesc.style.display = 'block';
      if (tokenImpactSection) tokenImpactSection.style.display = 'block';
      if (modeAction) modeAction.textContent = 'optimize';
      if (runButton) runButton.innerHTML = '🚀 Run AI Optimization';
      this.updateTokenImpact();
    }
    
    panel.style.display = 'block';
    backdrop.style.display = 'block';
  }
  
  hideOptimizationPanel() {
    const panel = document.getElementById('ai-optimize-panel');
    const backdrop = document.getElementById('ai-optimize-backdrop');
    if (panel) panel.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
    this.hideProgressStream();
  }
  
  updateTokenImpact() {
    const currentTokens = this.estimateCurrentTokens();
    document.getElementById('current-tokens-display').textContent = currentTokens.toLocaleString();
    
    // Calculate what will change based on selected options
    const optimizing = {
      systemPrompt: document.getElementById('opt-system-prompt')?.checked,
      instructions: document.getElementById('opt-instructions')?.checked,
      environment: document.getElementById('opt-environment')?.checked,
      contextFiles: document.getElementById('opt-context-files')?.checked,
      tools: document.getElementById('opt-tools')?.checked,
      settings: document.getElementById('opt-settings')?.checked
    };
    
    let impact = '~';
    const optimizingCount = Object.values(optimizing).filter(Boolean).length;
    
    if (optimizingCount === 0) {
      impact = 'No changes selected';
      document.getElementById('token-impact').style.color = '#9ca3af';
    } else {
      // Rough estimate: optimizing usually reduces tokens
      const estimatedReduction = Math.floor(currentTokens * 0.1 * (optimizingCount / 6));
      impact = `-${estimatedReduction.toLocaleString()} tokens (estimated)`;
      document.getElementById('token-impact').style.color = '#10b981';
    }
    
    document.getElementById('token-impact').textContent = impact;
  }
  
  estimateCurrentTokens() {
    let total = 0;
    
    // System prompt (rough: 4 chars per token)
    total += Math.ceil(this.config.systemPrompt.length / 4);
    
    // Instructions
    this.config.instructions.forEach(inst => {
      total += Math.ceil((inst.name?.length || 0) / 4);
      total += Math.ceil((inst.prompt?.length || 0) / 4);
    });
    
    // Context files
    this.config.contextFiles.forEach(file => {
      total += Math.ceil(file.content.length / 4);
    });
    
    return total;
  }
  
  async runAIOptimization() {
    const btn = document.getElementById('run-ai-optimize');
    if (!btn) return;
    
    // Get selected optimization options (always available)
    const optimizing = {
      systemPrompt: document.getElementById('opt-system-prompt')?.checked,
      instructions: document.getElementById('opt-instructions')?.checked,
      environment: document.getElementById('opt-environment')?.checked,
      contextFiles: document.getElementById('opt-context-files')?.checked,
      tools: document.getElementById('opt-tools')?.checked,
      settings: document.getElementById('opt-settings')?.checked
    };
    
    if (!Object.values(optimizing).some(Boolean)) {
      alert('⚠️ Please select at least one aspect to generate/optimize');
      return;
    }
    
    // Detect mode
    const generationMode = document.getElementById('generation-mode');
    const isGenerationMode = generationMode && generationMode.style.display !== 'none';
    
    if (isGenerationMode) {
      // Generation mode: get user intent from textarea
      const purposeInput = document.getElementById('agent-purpose-input');
      const userIntent = purposeInput?.value?.trim();
      
      if (!userIntent || userIntent.length === 0) {
        alert('⚠️ Please describe what you want your agent to do');
        purposeInput?.focus();
        return;
      }
      
      await this.generateAgentFromScratch(userIntent, optimizing);
      return;
    }
    
    // Optimization mode
    this.optimizeExistingAgent(optimizing, btn);
  }
  
  async generateAgentFromScratch(userIntent, optimizing) {
    const btn = document.getElementById('run-ai-optimize');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '⏳ AI is generating agent...';
    
    // Show progress stream
    this.showProgressStream();
    this.addProgressMessage('🎯 Analyzing user intent: "' + userIntent + '"');
    this.addProgressMessage('📊 Selected components: ' + Object.entries(optimizing).filter(([k,v]) => v).map(([k]) => k).join(', '));
    
    try {
      this.addProgressMessage('🤖 Sending request to AI (qwen2.5-coder:14b)...');
      
      // Get current token limits from config
      const currentMaxTokens = this.config.maxTokens || 2048;
      const currentContextWindow = this.config.contextWindow || 8192;
      
      const generationPrompt = `You are an AI agent architect. Create a complete, production-ready agent configuration.

**User Intent:** ${userIntent}

**Current Token Budget:**
- Max Output Tokens: ${currentMaxTokens}
- Context Window: ${currentContextWindow}
- Your configuration MUST fit within these limits

**Required Components:**
${optimizing.systemPrompt ? '- System Prompt: Concise, focused (200-500 tokens). Define role, capabilities, constraints.' : ''}
${optimizing.instructions ? '- Instructions: 3-5 actionable steps. Each step: clear name + specific prompt (50-100 tokens each).' : ''}
${optimizing.environment ? '- Environment: Choose runtime (nodejs/python/deno/browser). List ONLY essential dependencies with versions.' : ''}
${optimizing.tools ? '- Tools: Select from [execute_code, fetch_url, search_web, read_file]. Only what agent truly needs.' : ''}
${optimizing.settings ? '- Settings: Optimize temperature (0.1-1.0), topP (0.1-1.0), maxTokens, contextWindow for this use case.' : ''}

**Quality Guidelines:**
1. System prompt: Be specific about agent's expertise and limitations
2. Instructions: Each step should be atomic and testable
3. Dependencies: Use stable versions, avoid bloat
4. Tools: Minimal set - only what's needed for the task
5. Settings: Lower temperature (0.3-0.5) for factual tasks, higher (0.7-0.9) for creative ones

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.

JSON format:
{
  ${optimizing.systemPrompt ? '"systemPrompt": "Concise, focused system prompt defining role and capabilities",' : ''}
  ${optimizing.instructions ? '"instructions": [{"name":"Clear step name", "prompt":"Specific action to take", "conditional":false, "loop":false}],' : ''}
  ${optimizing.environment ? '"environment": {"runtime":"nodejs", "dependencies":["axios@1.6.0"], "timeout":30000, "memoryLimit":"512MB", "sandboxed":true},' : ''}
  ${optimizing.tools ? '"tools": ["execute_code", "fetch_url"],' : ''}
  ${optimizing.settings ? '"settings": {"temperature":0.7, "topP":0.9, "maxTokens":2048, "contextWindow":8192},' : ''}
  "reasoning": "Brief explanation of design decisions",
  "suggestedName": "AgentName"
}`;

      const startTime = Date.now();
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: generationPrompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate agent');
      }
      
      this.addProgressMessage('⏱️ AI responded in ' + ((Date.now() - startTime) / 1000).toFixed(1) + 's');
      this.addProgressMessage('📝 Parsing AI response...');
      
      const data = await response.json();
      const responseText = data.response;
      
      // Try multiple JSON extraction methods
      let generated = null;
      
      // Method 1: Find first complete JSON object
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          generated = JSON.parse(jsonMatch[0]);
          this.addProgressMessage('✅ Successfully parsed JSON response (method 1)');
        } catch (e) {
          this.addProgressMessage('⚠️ Method 1 failed, trying method 2...');
        }
      }
      
      // Method 2: Find JSON between code blocks
      if (!generated) {
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          try {
            generated = JSON.parse(codeBlockMatch[1]);
            this.addProgressMessage('✅ Successfully parsed JSON response (method 2 - code block)');
          } catch (e) {
            this.addProgressMessage('⚠️ Method 2 failed, trying method 3...');
          }
        }
      }
      
      // Method 3: Extract everything between first { and last }
      if (!generated) {
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            const jsonStr = responseText.substring(firstBrace, lastBrace + 1);
            generated = JSON.parse(jsonStr);
            this.addProgressMessage('✅ Successfully parsed JSON response (method 3 - braces)');
          } catch (e) {
            this.addProgressMessage('⚠️ Method 3 failed');
          }
        }
      }
      
      if (!generated) {
        this.addProgressMessage('');
        this.addProgressMessage('❌ Could not parse AI response. Raw response:');
        this.addProgressMessage(responseText.substring(0, 500));
        throw new Error('Could not parse AI response. The AI may not have returned valid JSON.');
      }
      
      this.addProgressMessage('✅ Successfully parsed JSON response');
      this.addProgressMessage('');
      this.addProgressMessage('📦 Generated Configuration:');
      
      if (generated.suggestedName) {
        this.addProgressMessage('  📛 Name: ' + generated.suggestedName);
      }
      if (generated.systemPrompt) {
        this.addProgressMessage('  📝 System Prompt: ' + generated.systemPrompt.substring(0, 80) + '...');
      }
      if (generated.instructions) {
        this.addProgressMessage('  📋 Instructions: ' + generated.instructions.length + ' steps');
        generated.instructions.forEach((inst, i) => {
          this.addProgressMessage('     ' + (i + 1) + '. ' + inst.name);
        });
      }
      if (generated.environment) {
        this.addProgressMessage('  ⚙️ Runtime: ' + generated.environment.runtime);
        if (generated.environment.dependencies && generated.environment.dependencies.length > 0) {
          this.addProgressMessage('  📦 Dependencies: ' + generated.environment.dependencies.join(', '));
        }
      }
      if (generated.tools) {
        this.addProgressMessage('  🛠️ Tools: ' + generated.tools.join(', '));
      }
      if (generated.settings) {
        this.addProgressMessage('  ⚡ Settings: temp=' + generated.settings.temperature + ', tokens=' + generated.settings.maxTokens);
      }
      this.addProgressMessage('');
      this.addProgressMessage('💡 AI Reasoning: ' + generated.reasoning);
      
      // Show preview
      let previewMsg = `🤖 AI Generated Agent: "${generated.suggestedName || 'New Agent'}"\\n\\n`;
      
      if (generated.systemPrompt) {
        previewMsg += `📝 System Prompt: ${generated.systemPrompt.substring(0, 100)}...\\n\\n`;
      }
      if (generated.instructions) {
        previewMsg += `📋 Instructions: ${generated.instructions.length} steps\\n`;
        generated.instructions.forEach((inst, i) => {
          previewMsg += `   ${i + 1}. ${inst.name}\\n`;
        });
        previewMsg += '\\n';
      }
      if (generated.environment) {
        previewMsg += `⚙️ Environment: ${generated.environment.runtime}\\n`;
        previewMsg += `   Dependencies: ${generated.environment.dependencies.slice(0, 3).join(', ')}\\n\\n`;
      }
      if (generated.tools) {
        previewMsg += `🛠️ Tools: ${generated.tools.join(', ')}\\n\\n`;
      }
      if (generated.settings) {
        previewMsg += `⚡ Settings: temp=${generated.settings.temperature}, tokens=${generated.settings.maxTokens}\\n\\n`;
      }
      
      previewMsg += `💡 Reasoning: ${generated.reasoning}\\n\\n`;
      previewMsg += `Create this agent?`;
      
      this.addProgressMessage('');
      this.addProgressMessage('⏸️ Waiting for user confirmation...');
      
      if (confirm(previewMsg)) {
        this.addProgressMessage('✅ User confirmed - applying configuration...');
        
        // Apply generated configuration
        if (generated.suggestedName) {
          this.addProgressMessage('  📛 Setting agent name...');
          this.config.name = generated.suggestedName;
          document.getElementById('agent-name').value = generated.suggestedName;
        }
        
        if (generated.systemPrompt && optimizing.systemPrompt) {
          this.addProgressMessage('  📝 Applying system prompt...');
          this.config.systemPrompt = generated.systemPrompt;
          if (this.editor) {
            this.editor.setValue(generated.systemPrompt);
          } else {
            // If editor not initialized yet, set it when tab loads
            setTimeout(() => {
              if (this.editor) this.editor.setValue(generated.systemPrompt);
            }, 100);
          }
        }
        
        if (generated.instructions && optimizing.instructions) {
          this.addProgressMessage('  📋 Creating ' + generated.instructions.length + ' instruction steps...');
          this.config.instructions = generated.instructions;
          // Re-render instructions tab to show new steps
          this.renderInstructions();
        }
        
        if (generated.environment && optimizing.environment) {
          this.addProgressMessage('  ⚙️ Configuring environment (' + generated.environment.runtime + ')...');
          this.config.environment = generated.environment;
          this.renderEnvironment();
        }
        
        if (generated.tools && optimizing.tools) {
          this.addProgressMessage('  🛠️ Enabling tools: ' + generated.tools.join(', '));
          this.config.tools = generated.tools;
          ['execute-code', 'fetch-url', 'search-web', 'read-file'].forEach(tool => {
            const toolName = tool.replace('-', '_');
            const checkbox = document.getElementById(`tool-${tool}`);
            if (checkbox) checkbox.checked = generated.tools.includes(toolName);
          });
        }
        
        if (generated.settings && optimizing.settings) {
          this.addProgressMessage('  ⚡ Applying optimal settings...');
          
          // Apply to config
          if (generated.settings.temperature !== undefined) {
            this.config.temperature = generated.settings.temperature;
            const tempSlider = document.getElementById('temperature');
            const tempValue = document.getElementById('temp-value');
            if (tempSlider) tempSlider.value = generated.settings.temperature;
            if (tempValue) tempValue.textContent = generated.settings.temperature;
          }
          
          if (generated.settings.topP !== undefined) {
            this.config.topP = generated.settings.topP;
            const topPSlider = document.getElementById('top-p');
            const topPValue = document.getElementById('topp-value');
            if (topPSlider) topPSlider.value = generated.settings.topP;
            if (topPValue) topPValue.textContent = generated.settings.topP;
          }
          
          if (generated.settings.maxTokens !== undefined) {
            this.config.maxTokens = generated.settings.maxTokens;
            const maxTokenSlider = document.getElementById('max-tokens');
            const maxTokenValue = document.getElementById('maxtoken-value');
            if (maxTokenSlider) maxTokenSlider.value = generated.settings.maxTokens;
            if (maxTokenValue) maxTokenValue.textContent = generated.settings.maxTokens;
          }
          
          if (generated.settings.contextWindow !== undefined) {
            this.config.contextWindow = generated.settings.contextWindow;
            const contextSlider = document.getElementById('context-window');
            const contextValue = document.getElementById('context-value');
            if (contextSlider) contextSlider.value = generated.settings.contextWindow;
            if (contextValue) contextValue.textContent = generated.settings.contextWindow;
          }
        }
        
        this.updateTokenEstimate();
        this.addProgressMessage('');
        this.addProgressMessage('🎉 Agent generated successfully!');
        this.addProgressMessage('💾 Remember to save your agent configuration.');
        
        setTimeout(() => {
          alert('✅ Agent generated successfully! Review and save when ready.');
          this.hideOptimizationPanel();
        }, 500);
      } else {
        this.addProgressMessage('❌ User cancelled - generation aborted');
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      this.addProgressMessage('');
      this.addProgressMessage('❌ ERROR: ' + error.message);
      alert(`Failed to generate agent: ${error.message}\\n\\nPlease check that Ollama is running.`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🚀 Run AI Optimization';
    }
  }
  
  async optimizeExistingAgent(optimizing, btn) {
    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '⏳ AI is analyzing...';
    
    try {
      // Gather current configuration
      const context = {
        systemPrompt: this.config.systemPrompt,
        instructions: this.config.instructions,
        contextFiles: this.config.contextFiles,
        tools: this.config.tools,
        environment: this.config.environment,
        settings: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          maxTokens: this.config.maxTokens,
          contextWindow: this.config.contextWindow
        },
        mode: this.config.mode
      };
      
      // Build optimization prompt
      const optimizationPrompt = `You are an AI agent optimization expert. Analyze this agent configuration and suggest improvements.

**Current Configuration:**

System Prompt:
${context.systemPrompt}

Instructions (${context.instructions.length} steps):
${context.instructions.map((inst, i) => `${i + 1}. ${inst.name}: ${inst.prompt}`).join('\\n')}

Context Files (${context.contextFiles.length}):
${context.contextFiles.map(f => f.name).join(', ') || 'None'}

Tools: ${context.tools.join(', ') || 'None'}

Environment: ${context.environment.runtime}, Dependencies: ${context.environment.dependencies.join(', ') || 'None'}

Settings: temp=${context.settings.temperature}, topP=${context.settings.topP}, maxTokens=${context.settings.maxTokens}

**Optimize these aspects:** ${Object.entries(optimizing).filter(([k, v]) => v).map(([k]) => k).join(', ')}

Provide optimized configuration as JSON:
{
  ${optimizing.systemPrompt ? '"systemPrompt": "improved prompt",' : ''}
  ${optimizing.instructions ? '"instructions": [{name:"...", prompt:"...", conditional:false, loop:false}],' : ''}
  ${optimizing.environment ? '"environment": {runtime:"nodejs", dependencies:["pkg@1.0"], timeout:30000, memoryLimit:"512MB", sandboxed:true},' : ''}
  ${optimizing.contextFiles ? '"contextFileSuggestions": ["file1.md", "file2.txt"],' : ''}
  ${optimizing.tools ? '"tools": ["execute_code", "fetch_url"],' : ''}
  ${optimizing.settings ? '"settings": {temperature:0.7, topP:0.9, maxTokens:2048, contextWindow:8192},' : ''}
  "reasoning": "explanation of changes",
  "tokenReduction": 123
}`;

      // Call Ollama API
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: optimizationPrompt,
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI optimization');
      }
      
      const data = await response.json();
      const responseText = data.response;
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }
      
      const suggestions = JSON.parse(jsonMatch[0]);
      
      // Show confirmation dialog
      let changesMsg = 'AI suggests the following changes:\\n\\n';
      
      if (suggestions.systemPrompt && optimizing.systemPrompt) {
        changesMsg += `📝 System Prompt: Updated (${suggestions.systemPrompt.length} chars)\\n`;
      }
      if (suggestions.instructions && optimizing.instructions) {
        changesMsg += `📋 Instructions: ${suggestions.instructions.length} steps\\n`;
      }
      if (suggestions.environment && optimizing.environment) {
        changesMsg += `⚙️ Environment: ${suggestions.environment.runtime} with ${suggestions.environment.dependencies.length} dependencies\\n`;
      }
      if (suggestions.contextFileSuggestions && optimizing.contextFiles) {
        changesMsg += `📁 Context: Suggested ${suggestions.contextFileSuggestions.length} files\\n`;
      }
      if (suggestions.tools && optimizing.tools) {
        changesMsg += `🛠️ Tools: ${suggestions.tools.join(', ')}\\n`;
      }
      if (suggestions.settings && optimizing.settings) {
        changesMsg += `⚡ Settings: temp=${suggestions.settings.temperature}, tokens=${suggestions.settings.maxTokens}\\n`;
      }
      
      changesMsg += `\\n💡 Reasoning: ${suggestions.reasoning}`;
      changesMsg += `\\n📊 Token Reduction: ~${suggestions.tokenReduction || 0}`;
      changesMsg += `\\n\\nApply these optimizations?`;
      
      if (confirm(changesMsg)) {
        // Apply optimizations
        if (suggestions.systemPrompt && optimizing.systemPrompt) {
          this.config.systemPrompt = suggestions.systemPrompt;
          if (this.editor) this.editor.setValue(suggestions.systemPrompt);
        }
        
        if (suggestions.instructions && optimizing.instructions) {
          this.config.instructions = suggestions.instructions;
        }
        
        if (suggestions.environment && optimizing.environment) {
          this.config.environment = suggestions.environment;
          this.renderEnvironment();
        }
        
        if (suggestions.contextFileSuggestions && optimizing.contextFiles) {
          alert(`Context file suggestions:\\n${suggestions.contextFileSuggestions.join('\\n')}`);
        }
        
        if (suggestions.tools && optimizing.tools) {
          this.config.tools = suggestions.tools;
          // Update tool checkboxes
          ['execute-code', 'fetch-url', 'search-web', 'read-file'].forEach(tool => {
            const toolName = tool.replace('-', '_');
            const checkbox = document.getElementById(`tool-${tool}`);
            if (checkbox) checkbox.checked = suggestions.tools.includes(toolName);
          });
        }
        
        if (suggestions.settings && optimizing.settings) {
          this.config.temperature = suggestions.settings.temperature;
          this.config.topP = suggestions.settings.topP;
          this.config.maxTokens = suggestions.settings.maxTokens;
          this.config.contextWindow = suggestions.settings.contextWindow;
          
          // Update UI
          document.getElementById('temperature').value = suggestions.settings.temperature;
          document.getElementById('temp-value').textContent = suggestions.settings.temperature;
          document.getElementById('top-p').value = suggestions.settings.topP;
          document.getElementById('topp-value').textContent = suggestions.settings.topP;
          document.getElementById('max-tokens').value = suggestions.settings.maxTokens;
          document.getElementById('maxtoken-value').textContent = suggestions.settings.maxTokens;
          document.getElementById('context-window').value = suggestions.settings.contextWindow;
          document.getElementById('context-value').textContent = suggestions.settings.contextWindow;
        }
        
        this.updateTokenEstimate();
        alert('✅ Agent optimized successfully!');
        this.hideOptimizationPanel();
      }
      
    } catch (error) {
      console.error('AI optimization error:', error);
      alert(`Failed to optimize: ${error.message}\\n\\nPlease check that Ollama is running.`);
    } finally {
      // Re-enable button
      btn.disabled = false;
      btn.innerHTML = '🚀 Run AI Optimization';
    }
  }
  
  // Progress stream helpers
  showProgressStream() {
    const stream = document.getElementById('ai-progress-stream');
    const content = document.getElementById('ai-progress-content');
    if (stream) {
      stream.style.display = 'block';
      if (content) content.textContent = '';
    }
  }
  
  hideProgressStream() {
    const stream = document.getElementById('ai-progress-stream');
    if (stream) stream.style.display = 'none';
  }
  
  addProgressMessage(message) {
    const content = document.getElementById('ai-progress-content');
    if (content) {
      const timestamp = new Date().toLocaleTimeString();
      content.textContent += `[${timestamp}] ${message}\n`;
      // Auto-scroll to bottom
      const stream = document.getElementById('ai-progress-stream');
      if (stream) stream.scrollTop = stream.scrollHeight;
    }
  }
  
  async generateAgentIdea() {
    const btn = document.getElementById('ai-generate-idea-btn');
    const textarea = document.getElementById('agent-purpose-input');
    if (!btn || !textarea) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🎲 Generating...';
    
    try {
      // Create a prompt to generate agent ideas
      const ideaPrompt = `You are a creative AI assistant helping users brainstorm AI agent ideas.

Generate ONE specific, practical, and interesting AI agent idea. The idea should be:
- Actionable (something that can actually be built)
- Useful (solves a real problem)
- Specific (not vague like "help with tasks")
- Creative (not too obvious)

Consider these categories for inspiration:
- Data processing (web scraping, analysis, transformation)
- Automation (monitoring, alerts, scheduled tasks)
- Content creation (summarization, generation, translation)
- Research (information gathering, comparison, synthesis)
- Development tools (code analysis, testing, documentation)
- Business (reporting, tracking, integration)

Respond with ONLY the agent description in 1-2 sentences. No JSON, no extra formatting.
Examples:
"Monitor GitHub repositories for security vulnerabilities and send weekly digest emails with severity ratings and patch recommendations"
"Analyze customer support tickets using sentiment analysis, automatically categorize them, and route urgent issues to senior staff"
"Track competitor pricing across multiple e-commerce sites, detect price changes over 10%, and send alerts with historical comparison charts"

Generate a NEW creative idea now:`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: ideaPrompt,
          stream: false,
          options: {
            temperature: 0.9, // Higher temperature for more creativity
            top_p: 0.95
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate agent idea');
      }
      
      const data = await response.json();
      const idea = data.response.trim();
      
      // Clean up the response (remove any extra formatting)
      const cleanIdea = idea
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^Agent idea:\s*/i, '') // Remove "Agent idea:" prefix
        .replace(/^Idea:\s*/i, '') // Remove "Idea:" prefix
        .trim();
      
      // Insert into textarea
      textarea.value = cleanIdea;
      textarea.focus();
      
      // Show success feedback
      btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      btn.innerHTML = '✨ Idea Generated!';
      
      setTimeout(() => {
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.innerHTML = originalText;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to generate agent idea:', error);
      alert(`Failed to generate agent idea: ${error.message}\n\nMake sure Ollama is running.`);
      btn.innerHTML = originalText;
    } finally {
      btn.disabled = false;
    }
  }
}


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
import contextLibrary from '../context-library.js';

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
    // Load hardware config from localStorage if available
    const savedHardware = localStorage.getItem('agentEditor_hardware');
    const hardware = savedHardware ? JSON.parse(savedHardware) : { preset: 'consumer', gpuVRAM: 8, tokenLimit: 4096 };
    
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
      tools: ['execute_code', 'fetch_url', 'search_web'], // Enable tools by default for testing
      enabledGuides: ['basic-selectors', 'error-handling'],
      hardware: hardware,
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
      },
      // Hardware configuration
      hardware: {
        gpuVRAM: 8,  // GB of VRAM
        tokenLimit: 4096,  // Calculated safe token limit
        preset: 'consumer'  // consumer, midrange, highend, cpu
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
            
            <div style="background: #1e3a8a; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
              <div style="color: #93c5fd; font-size: 12px; font-weight: 600; margin-bottom: 6px;">ℹ️ What These Agents Can Do:</div>
              <div style="color: #bfdbfe; font-size: 11px; line-height: 1.5;">
                ✅ Scrape data from websites you visit<br>
                ✅ Extract and analyze web content<br>
                ✅ Search and fetch public URLs<br>
                ✅ Process and transform data<br>
                ❌ Cannot access databases or external APIs<br>
                ❌ Cannot send emails or store data permanently
              </div>
            </div>
            
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
                        placeholder="Example: scrape real estate listings and compare price per square foot&#10;Example: extract job postings and rank by skills match&#10;Example: track product prices and identify trends&#10;&#10;Or click 'AI Generate Idea' for inspiration!"
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
                Add pre-loaded guides or upload custom files
              </p>
              
              <!-- Pre-loaded Library -->
              <details style="margin-bottom: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
                <summary style="cursor: pointer; font-weight: 500; font-size: 13px; color: #111827; user-select: none;">
                  📚 Pre-loaded Guides
                </summary>
                <div id="library-guides" style="margin-top: 8px; display: grid; gap: 6px;">
                  ${this.renderLibraryGuides()}
                </div>
              </details>
              
              <!-- Custom Files -->
              <input type="file" id="context-file-input" multiple style="display: none;" />
              <button id="add-context-file" class="btn btn-secondary" style="width: 100%; margin-bottom: 8px;">
                + Upload Custom Files
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

            <!-- Hardware Configuration -->
            <div class="settings-section">
              <h4 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                <span>💻</span> Hardware Limits <span style="color: #6b7280; font-size: 12px; font-weight: normal;">(💾 Auto-saved)</span>
              </h4>
              
              <label style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; display: block;">GPU Preset:</label>
              <select id="gpu-preset" style="width: 100%; padding: 6px 8px; background: #2a2a2a; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; font-size: 13px; margin-bottom: 12px;">
                <option value="consumer" ${(this.config.hardware?.preset || 'consumer') === 'consumer' ? 'selected' : ''}>🎮 Consumer GPU (RTX 3060, M1/M2) - 8GB</option>
                <option value="midrange" ${(this.config.hardware?.preset || 'consumer') === 'midrange' ? 'selected' : ''}>🚀 Mid-Range GPU (RTX 4070, M3 Pro) - 12GB</option>
                <option value="highend" ${(this.config.hardware?.preset || 'consumer') === 'highend' ? 'selected' : ''}>⚡ High-End GPU (RTX 4090, M3 Max) - 24GB+</option>
                <option value="cpu" ${(this.config.hardware?.preset || 'consumer') === 'cpu' ? 'selected' : ''}>🐌 CPU Only - Unlimited (Slow)</option>
                <option value="custom" ${(this.config.hardware?.preset || 'consumer') === 'custom' ? 'selected' : ''}>⚙️ Custom</option>
              </select>

              <div id="custom-vram-section" style="display: ${(this.config.hardware?.preset || 'consumer') === 'custom' ? 'block' : 'none'};">
                <label style="font-size: 12px; color: #9ca3af; margin-bottom: 4px; display: block;">VRAM (GB):</label>
                <input type="number" id="gpu-vram" min="1" max="80" step="1" value="${this.config.hardware?.gpuVRAM || 8}" style="width: 100%; padding: 6px 8px; background: #2a2a2a; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; font-size: 13px; margin-bottom: 12px;">
              </div>

              <div style="background: #2a2a2a; padding: 10px; border-radius: 4px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #9ca3af;">Safe Token Limit:</span>
                  <strong style="color: #10b981;" id="hardware-token-limit">${this.config.hardware?.tokenLimit || 4096}</strong>
                </div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 6px; line-height: 1.4;">
                  Based on your GPU capacity. Stay below this for best performance.
                </div>
              </div>
            </div>

            <!-- Iteration Controls -->
            <div class="settings-section">
              <h4 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                <span>🔄</span> Iteration Limits <span style="color: #6b7280; font-size: 12px; font-weight: normal;">(💾 Auto-saved)</span>
              </h4>
              
              <label style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; display: block;">
                Max Iterations: <strong style="color: #10b981;" id="max-iterations-display">${this.config.maxIterations || 10}</strong>
              </label>
              <input type="range" id="max-iterations" min="1" max="50" step="1" value="${this.config.maxIterations || 10}" style="width: 100%; margin-bottom: 12px;">
              
              <div style="background: #2a2a2a; padding: 10px; border-radius: 4px; font-size: 11px; color: #9ca3af; line-height: 1.4;">
                <div style="margin-bottom: 6px;">⚡ <strong style="color: #e0e0e0;">Speed Advantage:</strong> Try multiple approaches</div>
                <div style="margin-bottom: 6px;">🎯 Higher iterations = more problem-solving attempts</div>
                <div>💡 Agent will iterate until success or limit reached</div>
              </div>
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
              <div id="token-warning" style="display: none; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #fbbf24;"></div>
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
      this.updateTokenEstimate();
    });
    
    // Hardware Configuration
    document.getElementById('gpu-preset')?.addEventListener('change', (e) => {
      const preset = e.target.value;
      this.config.hardware = this.config.hardware || {};
      this.config.hardware.preset = preset;
      
      // Show/hide custom VRAM input
      const customSection = document.getElementById('custom-vram-section');
      if (customSection) {
        customSection.style.display = preset === 'custom' ? 'block' : 'none';
      }
      
      // Set VRAM and token limits based on preset
      const presets = {
        consumer: { vram: 8, tokens: 4096 },
        midrange: { vram: 12, tokens: 6144 },
        highend: { vram: 24, tokens: 12288 },
        cpu: { vram: 0, tokens: 999999 },
        custom: { vram: this.config.hardware.gpuVRAM || 8, tokens: this.calculateTokenLimit(this.config.hardware.gpuVRAM || 8) }
      };
      
      const config = presets[preset];
      this.config.hardware.gpuVRAM = config.vram;
      this.config.hardware.tokenLimit = config.tokens;
      
      // Save to localStorage
      localStorage.setItem('agentEditor_hardware', JSON.stringify(this.config.hardware));
      
      // Show "Saved!" indicator
      this.showSavedIndicator('gpu-preset');
      
      // Update display
      const limitEl = document.getElementById('hardware-token-limit');
      if (limitEl) {
        limitEl.textContent = preset === 'cpu' ? '∞' : config.tokens;
      }
      
      this.updateTokenEstimate();
    });
    
    document.getElementById('gpu-vram')?.addEventListener('input', (e) => {
      const vram = parseInt(e.target.value);
      this.config.hardware = this.config.hardware || {};
      this.config.hardware.gpuVRAM = vram;
      this.config.hardware.tokenLimit = this.calculateTokenLimit(vram);
      
      // Save to localStorage
      localStorage.setItem('agentEditor_hardware', JSON.stringify(this.config.hardware));
      
      // Show "Saved!" indicator
      this.showSavedIndicator('gpu-vram');
      
      const limitEl = document.getElementById('hardware-token-limit');
      if (limitEl) {
        limitEl.textContent = this.config.hardware.tokenLimit;
      }
      
      this.updateTokenEstimate();
    });
    
    // Max Iterations
    document.getElementById('max-iterations')?.addEventListener('input', (e) => {
      const iterations = parseInt(e.target.value);
      this.config.maxIterations = iterations;
      
      // Save to localStorage
      localStorage.setItem('agentEditor_maxIterations', iterations);
      
      // Show "Saved!" indicator
      this.showSavedIndicator('max-iterations');
      
      const displayEl = document.getElementById('max-iterations-display');
      if (displayEl) {
        displayEl.textContent = iterations;
      }
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
      this.updateTokenEstimate(); // Update token count after adding files
    });
    
    // Library Guides
    this.attachLibraryGuideListeners();
    
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
  
  calculateTokenLimit(vramGB) {
    // Rough formula: VRAM (GB) * 512 tokens per GB
    // This accounts for model overhead, attention cache, etc.
    // Conservative estimate to ensure stability
    return Math.floor(vramGB * 512);
  }

  showSavedIndicator(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Remove existing indicator if present
    const existingIndicator = element.parentElement.querySelector('.saved-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('span');
    indicator.className = 'saved-indicator';
    indicator.innerHTML = '✓ Saved';
    indicator.style.cssText = `
      color: #10b981;
      font-size: 12px;
      margin-left: 8px;
      animation: fadeIn 0.3s ease-in;
    `;
    
    // Add after the element
    element.parentElement.insertBefore(indicator, element.nextSibling);
    
    // Fade out and remove after 2 seconds
    setTimeout(() => {
      indicator.style.transition = 'opacity 0.5s ease-out';
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 500);
    }, 2000);
  }

  updateTokenEstimate() {
    // Rough estimation: ~4 chars per token
    const promptTokens = Math.ceil(this.config.systemPrompt.length / 4);
    
    // Count instruction tokens
    const instructionTokens = this.config.instructions.reduce((total, inst) => {
      return total + Math.ceil(inst.prompt.length / 4);
    }, 0);
    
    // Count context file tokens
    const contextTokens = this.config.contextFiles.reduce((total, file) => {
      const content = file.content || '';
      return total + Math.ceil(content.length / 4);
    }, 0);
    
    const ragTokens = this.config.useRAG ? this.config.ragEpisodes * 500 : 0;
    const knowledgeTokens = this.config.useKnowledge ? 1000 : 0;
    const outputTokens = this.config.maxTokens;
    
    const total = promptTokens + instructionTokens + contextTokens + ragTokens + knowledgeTokens + outputTokens;
    const percentage = (total / this.config.contextWindow) * 100;
    
    // Use hardware config for limits
    const GPU_SAFE_LIMIT = this.config.hardware?.tokenLimit || 4096;
    const GPU_WARNING_LIMIT = GPU_SAFE_LIMIT * 2; // 2x safe limit = warning
    
    this.tokenEstimate.total = total;
    this.tokenEstimate.fitsGPU = total <= GPU_SAFE_LIMIT;
    this.tokenEstimate.cpuRisk = total <= GPU_SAFE_LIMIT ? 'low' : total <= GPU_WARNING_LIMIT ? 'medium' : 'high';
    
    // Update UI
    const tokenTotalEl = document.getElementById('token-total');
    const tokenBarEl = document.getElementById('token-bar');
    const tokenGpuEl = document.getElementById('token-gpu');
    const tokenRiskEl = document.getElementById('token-risk');
    
    if (tokenTotalEl) tokenTotalEl.textContent = total;
    
    if (tokenBarEl) {
      tokenBarEl.style.width = `${Math.min(percentage, 100)}%`;
      tokenBarEl.className = `token-bar-fill ${
        percentage < 50 ? 'success' : percentage < 80 ? 'warning' : 'danger'
      }`;
    }
    
    if (tokenGpuEl) {
      tokenGpuEl.textContent = this.tokenEstimate.fitsGPU ? '✅ GPU Safe' : '⚠️ CPU Fallback';
      tokenGpuEl.style.color = this.tokenEstimate.fitsGPU ? '#10b981' : '#f59e0b';
    }
    
    if (tokenRiskEl) {
      tokenRiskEl.textContent = this.tokenEstimate.cpuRisk.toUpperCase();
      tokenRiskEl.className = `badge badge-${this.tokenEstimate.cpuRisk}`;
    }
    
    // Show warning if exceeds GPU limits
    const warningEl = document.getElementById('token-warning');
    if (warningEl) {
      if (total > GPU_SAFE_LIMIT) {
        warningEl.style.display = 'block';
        warningEl.innerHTML = total > GPU_WARNING_LIMIT 
          ? `⚠️ <strong>CPU Processing Required:</strong> ${total} tokens exceeds GPU capacity (${GPU_WARNING_LIMIT}+). Expect slower performance.`
          : `💡 <strong>GPU Caution:</strong> ${total} tokens may require CPU fallback on some GPUs. Consider reducing context or max tokens.`;
      } else {
        warningEl.style.display = 'none';
      }
    }
  }
  
  renderContextFilesList() {
    if (!this.config.contextFiles || this.config.contextFiles.length === 0) {
      return '<p style="font-size: 12px; color: #9ca3af; text-align: center; padding: 12px;">No context files added</p>';
    }
    
    return this.config.contextFiles.map((file, index) => {
      // Calculate size from content if size property doesn't exist
      const sizeKB = file.size 
        ? (file.size / 1024).toFixed(1) 
        : ((file.content?.length || 0) / 1024).toFixed(1);
      
      return `
      <div class="context-file-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 500; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            📄 ${file.name}
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            ${sizeKB} KB • ~${Math.ceil((file.content?.length || 0) / 4)} tokens
          </div>
        </div>
        <button class="remove-context-file" data-index="${index}" style="padding: 4px 8px; background: #fee; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; cursor: pointer; font-size: 11px;">
          ✖
        </button>
      </div>
    `;
    }).join('');
  }
  
  renderLibraryGuides() {
    return Object.entries(contextLibrary).map(([key, guide]) => {
      const isSelected = this.config.contextFiles.some(f => f.name === guide.name);
      return `
        <label style="display: flex; align-items: start; gap: 8px; padding: 6px; background: white; border: 1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
          <input type="checkbox" class="library-guide-checkbox" data-guide-key="${key}" ${isSelected ? 'checked' : ''} style="margin-top: 2px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12px; font-weight: 500; color: #111827;">${guide.name}</div>
            <div style="font-size: 11px; color: #6b7280;">${guide.description}</div>
          </div>
        </label>
      `;
    }).join('');
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
    
    // Re-render library guides to update checked state
    const libraryContainer = document.getElementById('library-guides');
    if (libraryContainer) {
      libraryContainer.innerHTML = this.renderLibraryGuides();
      this.attachLibraryGuideListeners();
    }
  }
  
  attachLibraryGuideListeners() {
    document.querySelectorAll('.library-guide-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const guideKey = e.target.dataset.guideKey;
        const guide = contextLibrary[guideKey];
        
        if (e.target.checked) {
          // Add guide to context files
          this.config.contextFiles.push({
            name: guide.name,
            size: guide.content.length,
            content: guide.content,
            addedAt: new Date().toISOString(),
            isLibraryGuide: true
          });
          console.log(`✅ Added library guide: ${guide.name}`);
        } else {
          // Remove guide from context files
          const index = this.config.contextFiles.findIndex(f => f.name === guide.name);
          if (index !== -1) {
            this.config.contextFiles.splice(index, 1);
            console.log(`🗑️ Removed library guide: ${guide.name}`);
          }
        }
        
        this.renderContextFiles();
        this.updateTokenEstimate();
      });
    });
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
      this.updateTokenEstimate(); // Update token count after removing files
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
    
    // Show notification instead of alert
    const configSize = JSON.stringify(this.config).length;
    this.showNotification(
      `Agent "${this.config.name}" saved! ${this.config.instructions.length} steps, ${(configSize / 1024).toFixed(1)} KB`,
      'success'
    );
  }

  loadAgent() {
    const agents = JSON.parse(localStorage.getItem('saved_agents') || '[]');
    if (agents.length === 0) {
      this.showNotification('❌ No saved agents found. Save an agent first with the "💾 Save" button.', 'error');
      return;
    }
    
    // Show modal with agent list
    this.showLoadAgentModal(agents);
  }
  
  showLoadAgentModal(agents) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s;';
    
    modal.innerHTML = `
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 0; min-width: 600px; max-width: 800px; max-height: 80vh; box-shadow: 0 8px 32px rgba(0,0,0,0.8); display: flex; flex-direction: column; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: white; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
              📂 Load Agent
            </h3>
            <button id="close-load-modal" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              ✖
            </button>
          </div>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">${agents.length} saved agent${agents.length === 1 ? '' : 's'} • Click to load</p>
        </div>
        
        <!-- Agent List -->
        <div style="flex: 1; overflow-y: auto; padding: 16px;">
          <div id="agent-list" style="display: flex; flex-direction: column; gap: 10px;">
            ${agents.map((agent, index) => `
              <div class="agent-card" data-index="${index}" style="background: #1e293b; border: 2px solid #334155; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                  <div style="flex: 1;">
                    <h4 style="margin: 0 0 6px 0; color: #e0e0e0; font-size: 16px; font-weight: 600;">${this.escapeHtml(agent.name)}</h4>
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.4;">${this.escapeHtml(agent.systemPrompt?.substring(0, 120) || 'No description')}${agent.systemPrompt?.length > 120 ? '...' : ''}</p>
                  </div>
                  <button class="delete-agent-btn" data-index="${index}" style="background: #dc2626; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; margin-left: 12px;">
                    🗑️ Delete
                  </button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px;">
                  <div style="background: rgba(79, 70, 229, 0.15); padding: 8px; border-radius: 6px; border-left: 3px solid #4f46e5;">
                    <div style="color: #94a3b8; font-size: 11px; margin-bottom: 2px;">Instructions</div>
                    <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${agent.instructions?.length || 0}</div>
                  </div>
                  <div style="background: rgba(16, 185, 129, 0.15); padding: 8px; border-radius: 6px; border-left: 3px solid #10b981;">
                    <div style="color: #94a3b8; font-size: 11px; margin-bottom: 2px;">Tools</div>
                    <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${agent.tools?.length || 0}</div>
                  </div>
                  <div style="background: rgba(245, 158, 11, 0.15); padding: 8px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                    <div style="color: #94a3b8; font-size: 11px; margin-bottom: 2px;">Context Files</div>
                    <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${agent.contextFiles?.length || 0}</div>
                  </div>
                  <div style="background: rgba(124, 58, 237, 0.15); padding: 8px; border-radius: 6px; border-left: 3px solid #7c3aed;">
                    <div style="color: #94a3b8; font-size: 11px; margin-bottom: 2px;">Dependencies</div>
                    <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${agent.environment?.dependencies?.length || 0}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #0f172a; padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #94a3b8; font-size: 13px;">
            💡 Tip: Hover over a card to see the load button
          </div>
          <button id="cancel-load" style="padding: 10px 20px; background: #374151; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add hover effects and load functionality
    const agentCards = modal.querySelectorAll('.agent-card');
    agentCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#4f46e5';
        card.style.background = '#1e3a8a';
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#334155';
        card.style.background = '#1e293b';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
      
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-agent-btn') || e.target.closest('.delete-agent-btn')) {
          return; // Don't load if clicking delete button
        }
        
        const index = parseInt(card.dataset.index);
        const agent = agents[index];
        this.config = JSON.parse(JSON.stringify(agent)); // Deep clone
        this.init();
        modal.remove();
        this.showNotification(`✅ Agent "${agent.name}" loaded successfully!`, 'success');
      });
    });
    
    // Delete button handlers
    modal.querySelectorAll('.delete-agent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const agent = agents[index];
        
        if (confirm(`🗑️ Delete "${agent.name}"?\n\nThis action cannot be undone.`)) {
          agents.splice(index, 1);
          localStorage.setItem('saved_agents', JSON.stringify(agents));
          
          if (agents.length === 0) {
            modal.remove();
            this.showNotification('All agents deleted', 'info');
          } else {
            // Refresh the modal
            modal.remove();
            this.showLoadAgentModal(agents);
          }
        }
      });
    });
    
    // Close handlers
    modal.querySelector('#close-load-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-load').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  // Notification system for non-blocking messages
  showNotification(message, type = 'info') {
    const colors = {
      success: { bg: '#10b981', icon: '✅' },
      error: { bg: '#ef4444', icon: '❌' },
      warning: { bg: '#f59e0b', icon: '⚠️' },
      info: { bg: '#3b82f6', icon: 'ℹ️' }
    };
    
    const color = colors[type] || colors.info;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
    `;
    
    notification.innerHTML = `
      <span style="font-size: 18px;">${color.icon}</span>
      <span>${this.escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
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
        
        // Show import preview modal
        this.showImportPreviewModal(imported);
        
      } catch (error) {
        this.showNotification(`Failed to import: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset file input so same file can be imported again
    event.target.value = '';
  }
  
  showImportPreviewModal(imported) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    modal.innerHTML = `
      <div style="background: #1e293b; border-radius: 12px; padding: 24px; min-width: 500px; max-width: 600px; box-shadow: 0 8px 32px rgba(0,0,0,0.8);">
        <h3 style="margin: 0 0 16px 0; color: #e0e0e0; font-size: 20px; font-weight: 600;">📥 Import Agent</h3>
        
        <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">NAME</div>
            <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${this.escapeHtml(imported.name)}</div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">SYSTEM PROMPT</div>
            <div style="color: #e0e0e0; font-size: 14px; max-height: 80px; overflow-y: auto;">${this.escapeHtml(imported.systemPrompt.substring(0, 200))}${imported.systemPrompt.length > 200 ? '...' : ''}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">📋 INSTRUCTIONS</div>
              <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${imported.instructions?.length || 0} steps</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">🛠️ TOOLS</div>
              <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${imported.tools?.length || 0} enabled</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">⚙️ RUNTIME</div>
              <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${imported.environment?.runtime || 'nodejs'}</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">📦 DEPENDENCIES</div>
              <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${imported.environment?.dependencies?.length || 0}</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">📁 CONTEXT FILES</div>
              <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${imported.contextFiles?.length || 0}</div>
            </div>
            <div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">🎚️ TEMPERATURE</div>
              <div style="color: #e0e0e0; font-size: 16px; font-weight: 600;">${imported.temperature || 0.7}</div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-import" style="padding: 12px 24px; background: #374151; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Cancel
          </button>
          <button id="confirm-import" style="padding: 12px 24px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📥 Import Agent
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#confirm-import').addEventListener('click', () => {
      this.config = imported;
      this.init();
      modal.remove();
      this.showNotification(`✅ Agent "${imported.name}" imported successfully!`, 'success');
    });
    
    modal.querySelector('#cancel-import').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
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
    this.showNotification(
      `Exported ${this.config.name.replace(/\s+/g, '_')}_agent.json (${(configSize / 1024).toFixed(1)} KB)`,
      'success'
    );
  }

  async testAgent() {
    // Initialize conversation history if not exists
    if (!this.testConversation) {
      this.testConversation = [];
    }
    
    // Switch to output tab and show chat interface
    document.querySelector('[data-tab="output"]').click();
    const output = document.getElementById('test-result');
    
    // Render chat interface
    this.renderChatInterface(output);
  }
  
  renderChatInterface(container) {
    // Calculate iteration progress
    const iterationPercent = this.config.maxIterations > 0 
      ? Math.min(100, (this.config.currentIteration / this.config.maxIterations) * 100) 
      : 0;
    
    const isIterating = this.testConversation.some(msg => msg.loading);
    
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; background: #1e1e1e;">
        <!-- Chat Header -->
        <div style="padding: 16px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <h3 style="margin: 0; color: #e0e0e0; font-size: 16px; font-weight: 600;">🧪 Agent Test Chat</h3>
            <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">Test your agent interactively • Iteration ${this.config.currentIteration || 0}/${this.config.maxIterations || 10}</p>
            
            <!-- Iteration Progress Bar -->
            ${this.config.currentIteration > 0 ? `
              <div style="margin-top: 8px;">
                <div style="width: 100%; height: 4px; background: #2d2d2d; border-radius: 2px; overflow: hidden;">
                  <div style="width: ${iterationPercent}%; height: 100%; background: ${iterationPercent >= 100 ? '#ef4444' : '#0e7490'}; transition: width 0.3s ease;"></div>
                </div>
              </div>
            ` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="continue-iteration-btn" style="padding: 8px 16px; background: #0e7490; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; display: ${this.testConversation.length > 0 && !isIterating ? 'block' : 'none'};">🔄 Continue Iteration</button>
            <button id="clear-chat-btn" style="padding: 8px 16px; background: #374151; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">🗑️ Clear Chat</button>
          </div>
        </div>
        
        <!-- Iteration Status Banner -->
        ${isIterating ? `
          <div style="padding: 12px 16px; background: linear-gradient(90deg, #0e7490 0%, #0369a1 100%); border-bottom: 1px solid #0c5273; display: flex; align-items: center; gap: 12px;">
            <div style="width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="flex: 1;">
              <div style="color: white; font-weight: 600; font-size: 13px;">🔄 Agent Iterating...</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 11px; margin-top: 2px;">Trying different approaches • Iteration ${this.config.currentIteration}/${this.config.maxIterations}</div>
            </div>
            <div style="color: rgba(255,255,255,0.6); font-size: 11px;">⏱️ Working...</div>
          </div>
          <style>
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        ` : ''}
        
        <!-- Chat Messages -->
        <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          ${this.testConversation.length === 0 ? `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
              <p style="font-size: 18px; margin-bottom: 8px;">👋 Start a conversation</p>
              <p style="font-size: 14px;">Type a message below to test your agent</p>
            </div>
          ` : this.testConversation.map((msg, idx) => this.renderChatMessage(msg, idx)).join('')}
        </div>
        
        <!-- Input Area -->
        <div style="padding: 16px; border-top: 1px solid #333; background: #0f0f0f;">
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <button id="ai-gen-test-msg-btn" style="padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
              <span>✨</span>
              <span>AI Generate</span>
            </button>
            <div style="flex: 1; color: #6b7280; font-size: 11px; display: flex; align-items: center;">
              ${this.config.tools.length > 0 ? `🛠️ Tools enabled: ${this.config.tools.join(', ')}` : '⚠️ No tools enabled'}
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <textarea id="chat-input" placeholder="Type your message... (Shift+Enter for new line, Enter to send)" style="flex: 1; min-height: 60px; max-height: 200px; padding: 12px; background: #2d2d2d; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
            <button id="send-chat-btn" style="padding: 12px 24px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
              Send
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Attach event listeners
    const input = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#send-chat-btn');
    const clearBtn = container.querySelector('#clear-chat-btn');
    const aiGenBtn = container.querySelector('#ai-gen-test-msg-btn');
    
    const sendMessage = async () => {
      const message = input.value.trim();
      if (!message) return;
      
      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;
      
      await this.sendChatMessage(message, container);
      
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    };
    
    sendBtn.onclick = sendMessage;
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
    
    clearBtn.onclick = () => {
      this.testConversation = [];
      this.config.currentIteration = 0;
      this.renderChatInterface(container);
    };
    
    const continueBtn = container.querySelector('#continue-iteration-btn');
    if (continueBtn) {
      continueBtn.onclick = async () => {
        continueBtn.disabled = true;
        continueBtn.textContent = '⏳ Continuing...';
        await this.continueWithToolResults(container);
        this.renderChatInterface(container);
      };
    }
    
    aiGenBtn.onclick = async () => {
      aiGenBtn.disabled = true;
      aiGenBtn.innerHTML = '<span>⏳</span><span>Generating...</span>';
      
      try {
        const testPrompt = await this.generateTestPrompt();
        if (testPrompt) {
          input.value = testPrompt;
          input.focus();
        }
      } catch (error) {
        console.error('Failed to generate test prompt:', error);
      }
      
      aiGenBtn.disabled = false;
      aiGenBtn.innerHTML = '<span>✨</span><span>AI Generate</span>';
    };
    
    input.focus();
  }
  
  renderChatMessage(msg, idx) {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';
    const isError = msg.error;
    const isLoading = msg.loading;
    
    return `
      <div style="display: flex; ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
        <div style="max-width: 80%; padding: 12px 16px; border-radius: 12px; ${
          isUser 
            ? 'background: #7c3aed; color: white;' 
            : isSystem
              ? 'background: #1e3a8a; color: #93c5fd; border: 1px solid #1e40af;'
            : isError
              ? 'background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b;'
            : isLoading
              ? 'background: #0e7490; color: white; border: 1px solid #0c5273;'
              : 'background: #2d2d2d; color: #e0e0e0; border: 1px solid #404040;'
        }">
          <div style="font-size: 10px; margin-bottom: 4px; opacity: 0.7; text-transform: uppercase; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            ${isUser ? '👤 You' : isSystem ? '🔧 System' : isError ? '❌ Error' : isLoading ? '⏳ Agent Working' : '🤖 Agent'}
            ${isLoading ? '<div style="width: 8px; height: 8px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>' : ''}
          </div>
          <div style="white-space: pre-wrap; word-wrap: break-word; font-size: 14px; line-height: 1.5; font-family: ${isSystem ? "'Courier New', monospace" : 'inherit'};">
            ${this.escapeHtml(msg.content)}
          </div>
          ${msg.metadata ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${isUser ? 'rgba(255,255,255,0.2)' : isLoading ? 'rgba(255,255,255,0.2)' : '#404040'}; font-size: 11px; opacity: 0.7;">
              ${msg.metadata}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  async continueWithToolResults(container) {
    // Increment iteration counter
    this.config.currentIteration = (this.config.currentIteration || 0) + 1;
    
    // Check if we've exceeded max iterations
    if (this.config.currentIteration > this.config.maxIterations) {
      this.testConversation.push({
        role: 'system',
        content: `⚠️ Reached maximum iterations (${this.config.maxIterations}). Agent stopped.\n\nTo continue, increase Max Iterations in settings or reset the conversation.`,
        metadata: `🔄 Iteration ${this.config.currentIteration}/${this.config.maxIterations}`
      });
      this.renderChatInterface(container);
      const messagesDiv = container.querySelector('#chat-messages');
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return;
    }
    
    // Agent continues autonomously after receiving tool results
    const messagesDiv = container.querySelector('#chat-messages');
    
    // Add loading indicator with iteration count
    this.testConversation.push({
      role: 'assistant',
      content: `⏳ Processing results... (Iteration ${this.config.currentIteration}/${this.config.maxIterations})`,
      loading: true
    });
    this.renderChatInterface(container);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    const startTime = Date.now();
    
    try {
      // Build conversation with tool results
      const conversationContext = this.testConversation
        .filter(msg => !msg.loading && !msg.error)
        .map(msg => {
          if (msg.role === 'system') return `[Tool Result]\n${msg.content}`;
          if (msg.role === 'user') return `User: ${msg.content}`;
          return `Assistant: ${msg.content}`;
        })
        .join('\n\n');
      
      // Enhanced prompt - include FULL agent mode instructions
      let enhancedPrompt = this.config.systemPrompt;
      
      // Add the same agent execution mode instructions as initial message
      if (this.config.tools.length > 0) {
        enhancedPrompt += `\n\n=== CONTINUE AGENT EXECUTION ===\n`;
        enhancedPrompt += `You just received tool results. You MUST continue with another tool OR present final results.\n\n`;
        
        enhancedPrompt += `YOUR NEXT RESPONSE MUST BE:\n`;
        enhancedPrompt += `- JSON tool call if more work needed: {"tool": "...", "params": {...}}\n`;
        enhancedPrompt += `- Plain text summary if task complete\n\n`;
        
        enhancedPrompt += `AVAILABLE TOOLS:\n`;
        if (this.config.tools.includes('execute_code')) {
          enhancedPrompt += `- {"tool": "execute_code", "params": {"code": "..."}}\n`;
        }
        if (this.config.tools.includes('fetch_url')) {
          enhancedPrompt += `- {"tool": "fetch_url", "params": {"url": "..."}}\n`;
        }
        if (this.config.tools.includes('search_web')) {
          enhancedPrompt += `- {"tool": "search_web", "params": {"query": "..."}}\n`;
        }
        
        enhancedPrompt += `\nCRITICAL ERROR HANDLING:\n`;
        enhancedPrompt += `If you see CORS, 403, or 401 errors, DO NOT retry fetch_url!\n`;
        enhancedPrompt += `Instead, use execute_code with axios and custom headers:\n`;
        enhancedPrompt += `{"tool": "execute_code", "params": {"code": "const axios = require('axios'); axios.get('URL', {headers: {'User-Agent': 'Mozilla/5.0'}}).then(r => console.log(r.data));"}}\n\n`;
        
        enhancedPrompt += `DO NOT explain, DO NOT retry the same tool - switch to execute_code!\n`;
      }
      
      // Add environment info
      if (this.config.environment.runtime && this.config.environment.dependencies.length > 0) {
        enhancedPrompt += `\nAVAILABLE PACKAGES: ${this.config.environment.dependencies.join(', ')}\n`;
      }
      
      // Add context files (including library guides)
      if (this.config.contextFiles && this.config.contextFiles.length > 0) {
        enhancedPrompt += `\n=== REFERENCE GUIDES ===\n`;
        enhancedPrompt += `Consult these when tools fail:\n\n`;
        
        this.config.contextFiles.forEach(file => {
          enhancedPrompt += `--- ${file.name} ---\n`;
          enhancedPrompt += `${file.content.substring(0, 2000)}...\n\n`;
        });
      }
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: `${enhancedPrompt}\n\n${conversationContext}\n\nAssistant:`,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.topP,
            num_predict: this.config.maxTokens
          },
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Remove loading
      this.testConversation = this.testConversation.filter(msg => !msg.loading);
      
      if (result.response) {
        // Check for another tool call - improved extraction
        let toolCallMatch = null;
        let jsonStr = null;
        
        try {
          const response = result.response.trim();
          console.log('[Agent] Continue response:', response.substring(0, 200));
          
          // Try direct JSON first
          if (response.startsWith('{')) {
            jsonStr = response;
          }
          // Extract from markdown code blocks
          else if (response.includes('```json')) {
            const match = response.match(/```json\s*([\s\S]*?)```/);
            if (match) jsonStr = match[1].trim();
          }
          else if (response.includes('```')) {
            const match = response.match(/```\s*([\s\S]*?)```/);
            if (match) jsonStr = match[1].trim();
          }
          // Look for JSON object anywhere in response
          else {
            const match = response.match(/\{[\s\S]*?"tool"[\s\S]*?"params"[\s\S]*?\}/);
            if (match) jsonStr = match[0];
          }
          
          if (jsonStr) {
            console.log('[Agent] Extracted JSON from continuation:', jsonStr.substring(0, 200));
            toolCallMatch = JSON.parse(jsonStr);
            console.log('[Agent] Parsed tool call from continuation:', toolCallMatch);
          } else {
            console.log('[Agent] No JSON found in continuation response');
          }
        } catch (e) {
          console.log('[Agent] Failed to parse tool call in continuation:', e.message);
        }
        
        if (toolCallMatch && this.config.tools.includes(toolCallMatch.tool)) {
          // Execute next tool
          const toolResult = await this.executeTool(toolCallMatch.tool, toolCallMatch.params);
          
          this.testConversation.push({
            role: 'assistant',
            content: `🛠️ Executing: ${toolCallMatch.tool}(${JSON.stringify(toolCallMatch.params).substring(0, 100)}...)`,
            metadata: `⏱️ ${duration}ms`
          });
          
          this.testConversation.push({
            role: 'system',
            content: `Tool Result:\n${toolResult.success ? toolResult.output : 'Error: ' + toolResult.error}`,
            metadata: `⏱️ ${toolResult.duration}ms`
          });
          
          this.renderChatInterface(container);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          
          // Continue again
          await this.continueWithToolResults(container);
          return;
        }
        
        // Regular response (task complete)
        this.testConversation.push({
          role: 'assistant',
          content: result.response,
          metadata: `⏱️ ${duration}ms • 📊 ~${Math.ceil(result.response.length / 4)} tokens • ✅ Task Complete`
        });
        
        // Add completion message
        if (this.config.currentIteration > 1) {
          this.testConversation.push({
            role: 'system',
            content: `✅ Agent completed task after ${this.config.currentIteration} iterations`,
            metadata: `🔄 Total Iterations: ${this.config.currentIteration}/${this.config.maxIterations}`
          });
        }
        
        console.log('[Agent] Continue cycle complete, response:', result.response.substring(0, 100));
      } else {
        console.warn('[Agent] No response from Ollama in continue cycle');
      }
      
    } catch (error) {
      console.error('[Agent] Error in continue cycle:', error);
      this.testConversation = this.testConversation.filter(msg => !msg.loading);
      this.testConversation.push({
        role: 'error',
        content: `Continue Error: ${error.message}`,
        error: true
      });
    }
    
    this.renderChatInterface(container);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
  
  async executeTool(toolName, params) {
    const startTime = Date.now();
    
    try {
      if (toolName === 'execute_code') {
        // Execute code through the backend execute-server /run endpoint
        const code = params.code || params.script;
        const runtime = params.language || this.config.environment.runtime || 'nodejs';
        
        const response = await fetch('http://localhost:3002/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code,
            runtime: runtime
          })
        });
        
        // Get detailed error message from response
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          const errorDetails = result.error || `HTTP ${response.status}: ${response.statusText}`;
          const errorLogs = result.logs?.join('\n') || '';
          const fullError = errorLogs ? `${errorDetails}\n\nLogs:\n${errorLogs}` : errorDetails;
          
          return {
            success: false,
            output: '',
            error: fullError,
            duration: Date.now() - startTime
          };
        }
        
        return {
          success: true,
          output: result.data ? JSON.stringify(result.data, null, 2) : (result.logs?.join('\n') || 'Success'),
          duration: Date.now() - startTime
        };
      }
      
      if (toolName === 'fetch_url') {
        const url = params.url;
        try {
          const response = await fetch(url);
          
          if (!response.ok) {
            return {
              success: false,
              error: `HTTP ${response.status} ${response.statusText} from ${url}. This usually means authentication required or access denied. Try using execute_code with axios and custom headers instead.`,
              duration: Date.now() - startTime
            };
          }
          
          const content = await response.text();
          
          return {
            success: true,
            output: content.substring(0, 5000) + (content.length > 5000 ? '...\n(truncated)' : ''),
            duration: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: `CORS or network error accessing ${url}: ${error.message}. Browser blocked this request. Use execute_code with axios/puppeteer instead.`,
            duration: Date.now() - startTime
          };
        }
      }
      
      if (toolName === 'search_web') {
        // Mock search for now
        return {
          success: true,
          output: `Search results for: ${params.query}\n(Web search not fully implemented in test mode)`,
          duration: Date.now() - startTime
        };
      }
      
      throw new Error(`Unknown tool: ${toolName}`);
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async sendChatMessage(message, container) {
    console.log('[Agent] Starting chat message with tools:', this.config.tools);
    
    // Reset iteration counter for new user question
    this.config.currentIteration = 0;
    
    // Add user message to conversation
    this.testConversation.push({
      role: 'user',
      content: message
    });
    
    // Re-render to show user message
    this.renderChatInterface(container);
    
    // Scroll to bottom
    const messagesDiv = container.querySelector('#chat-messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Add loading indicator
    this.testConversation.push({
      role: 'assistant',
      content: '⏳ Thinking...',
      loading: true
    });
    this.renderChatInterface(container);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    const startTime = Date.now();
    
    try {
      // Build conversation history for context
      const conversationContext = this.testConversation
        .filter(msg => !msg.loading && !msg.error)
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      // Build enhanced system prompt with tools and environment info
      let enhancedPrompt = this.config.systemPrompt;
      
      // Add tool descriptions if tools are enabled
      if (this.config.tools.length > 0) {
        enhancedPrompt += `\n\n=== AGENT EXECUTION MODE ===\n`;
        enhancedPrompt += `You are an AUTONOMOUS AGENT. You MUST respond with ONLY valid JSON tool calls until the task is complete.\n\n`;
        
        enhancedPrompt += `CRITICAL RULES:\n`;
        enhancedPrompt += `1. Respond with JSON ONLY - no explanations, no text before or after\n`;
        enhancedPrompt += `2. Chain multiple tools together to complete tasks\n`;
        enhancedPrompt += `3. If a tool fails, try a different approach with another tool\n`;
        enhancedPrompt += `4. Keep using tools until you have a complete answer\n`;
        enhancedPrompt += `5. ONLY after getting final results, respond with plain text summary\n\n`;
        
        enhancedPrompt += `AVAILABLE TOOLS:\n`;
        
        if (this.config.tools.includes('execute_code')) {
          enhancedPrompt += `- execute_code: Run ${this.config.environment.runtime} code\n`;
          enhancedPrompt += `  Example: {"tool": "execute_code", "params": {"code": "console.log('hello');"}}\n`;
        }
        if (this.config.tools.includes('fetch_url')) {
          enhancedPrompt += `- fetch_url: Get webpage HTML\n`;
          enhancedPrompt += `  Example: {"tool": "fetch_url", "params": {"url": "https://example.com"}}\n`;
        }
        if (this.config.tools.includes('search_web')) {
          enhancedPrompt += `- search_web: Search for info\n`;
          enhancedPrompt += `  Example: {"tool": "search_web", "params": {"query": "latest news"}}\n`;
        }
        
        enhancedPrompt += `\nRESPONSE FORMAT:\n`;
        enhancedPrompt += `- During task: {"tool": "...", "params": {...}}\n`;
        enhancedPrompt += `- Task complete: Plain text with results\n\n`;
        
        enhancedPrompt += `WORKFLOW EXAMPLE:\n`;
        enhancedPrompt += `User: "Get top news headlines"\n`;
        enhancedPrompt += `You: {"tool": "fetch_url", "params": {"url": "https://news.ycombinator.com"}}\n`;
        enhancedPrompt += `[HTML returned]\n`;
        enhancedPrompt += `You: {"tool": "execute_code", "params": {"code": "const cheerio = require('cheerio'); const $ = cheerio.load(html); console.log($('.titleline').slice(0,5).text());"}}\n`;
        enhancedPrompt += `[Headlines returned]\n`;
        enhancedPrompt += `You: "Top 5 headlines: [actual list from results]"\n\n`;
        
        enhancedPrompt += `ERROR HANDLING:\n`;
        enhancedPrompt += `If fetch fails (401, 403, etc), try a different URL or use execute_code with axios and different headers.\n\n`;
      }
      
      // Add environment info
      if (this.config.environment.runtime) {
        enhancedPrompt += `\nRUNTIME ENVIRONMENT: ${this.config.environment.runtime}`;
        if (this.config.environment.dependencies.length > 0) {
          enhancedPrompt += `\nINSTALLED PACKAGES: ${this.config.environment.dependencies.join(', ')}`;
          enhancedPrompt += `\nYou can use these packages directly in execute_code!`;
        }
      }
      
      // Add context files (including library guides)
      if (this.config.contextFiles && this.config.contextFiles.length > 0) {
        enhancedPrompt += `\n\n=== REFERENCE DOCUMENTATION ===\n`;
        enhancedPrompt += `You have access to these guides and references. Use them when encountering errors:\n\n`;
        
        this.config.contextFiles.forEach(file => {
          enhancedPrompt += `--- ${file.name} ---\n`;
          enhancedPrompt += `${file.content}\n\n`;
        });
      }
      
      // Call Ollama with full conversation context
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: `${enhancedPrompt}\n\n${conversationContext}`,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.topP,
            num_predict: this.config.maxTokens
          },
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Remove loading message
      this.testConversation = this.testConversation.filter(msg => !msg.loading);
      
      if (result.response) {
        console.log('[Agent] Full response from Ollama:', result.response);
        
        // Check if the response contains a tool call
        let toolCallMatch = null;
        try {
          // Try to parse JSON tool call - use better regex to capture complete JSON
          // Match from first { to last } that contains "tool"
          let jsonStr = null;
          
          // Try to extract clean JSON - look for {"tool": ... }
          const toolIndex = result.response.indexOf('"tool"');
          if (toolIndex !== -1) {
            // Find the opening { before "tool"
            let start = result.response.lastIndexOf('{', toolIndex);
            if (start !== -1) {
              // Find matching closing }
              let braceCount = 0;
              let end = -1;
              for (let i = start; i < result.response.length; i++) {
                if (result.response[i] === '{') braceCount++;
                if (result.response[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    end = i + 1;
                    break;
                  }
                }
              }
              if (end !== -1) {
                jsonStr = result.response.substring(start, end);
              }
            }
          }
          
          if (jsonStr) {
            console.log('[Agent] Extracted JSON string:', jsonStr);
            toolCallMatch = JSON.parse(jsonStr);
            console.log('[Agent] Parsed tool call:', toolCallMatch);
          }
        } catch (e) {
          console.log('[Agent] Failed to parse tool call:', e.message);
          console.log('[Agent] Attempted to parse:', jsonStr);
        }
        
        console.log('[Agent] Available tools:', this.config.tools);
        console.log('[Agent] Tool call match:', toolCallMatch);
        console.log('[Agent] Tool enabled?', toolCallMatch ? this.config.tools.includes(toolCallMatch.tool) : 'N/A');
        
        if (toolCallMatch && this.config.tools.includes(toolCallMatch.tool)) {
          console.log('[Agent] Tool call detected:', toolCallMatch.tool, toolCallMatch.params);
          
          // Execute the tool
          const toolResult = await this.executeTool(toolCallMatch.tool, toolCallMatch.params);
          
          console.log('[Agent] Tool result:', toolResult.success ? 'SUCCESS' : 'FAILED', `(${toolResult.duration}ms)`);
          
          // Add tool execution to conversation
          this.testConversation.push({
            role: 'assistant',
            content: `🛠️ Executing: ${toolCallMatch.tool}(${JSON.stringify(toolCallMatch.params).substring(0, 100)}...)`,
            metadata: `⏱️ ${duration}ms • 🔄 Iteration ${this.config.currentIteration || 1}/${this.config.maxIterations}`
          });
          
          this.testConversation.push({
            role: 'system',
            content: `Tool Result:\n${toolResult.success ? toolResult.output : 'Error: ' + toolResult.error}`,
            metadata: `⏱️ ${toolResult.duration}ms • 🔄 Iteration ${this.config.currentIteration || 1}/${this.config.maxIterations}`
          });
          
          // Re-render to show tool execution
          this.renderChatInterface(container);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          
          // Automatically continue with tool results (agent continues autonomously)
          console.log('[Agent] Continuing autonomously with tool results...');
          await this.continueWithToolResults(container);
          return;
        }
        
        // Check for tool mentions but tools not enabled
        const toolMentions = [];
        if (/execute_code|run code|execute.*code/i.test(result.response) && !this.config.tools.includes('execute_code')) {
          toolMentions.push('execute_code');
        }
        if (/fetch|http|url|website/i.test(result.response) && !this.config.tools.includes('fetch_url')) {
          toolMentions.push('fetch_url');
        }
        if (/search|google|query/i.test(result.response) && !this.config.tools.includes('search_web')) {
          toolMentions.push('search_web');
        }
        
        const metadata = [
          `⏱️ ${duration}ms`,
          `📊 ~${Math.ceil(result.response.length / 4)} tokens`
        ];
        
        if (toolMentions.length > 0) {
          metadata.push(`💡 Wants: ${toolMentions.join(', ')}`);
        }
        
        // Add assistant message
        this.testConversation.push({
          role: 'assistant',
          content: result.response,
          metadata: metadata.join(' • ')
        });
        
        // Track successful execution
        MetricsService.trackAgentExecution(
          this.config.name || 'Unnamed Agent',
          true,
          duration
        );
      } else {
        throw new Error('No response from Ollama');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || String(error);
      const isOllamaDown = errorMsg.includes('Failed to fetch') || errorMsg.includes('ECONNREFUSED');
      
      // Remove loading message
      this.testConversation = this.testConversation.filter(msg => !msg.loading);
      
      // Add error message
      this.testConversation.push({
        role: 'error',
        content: isOllamaDown 
          ? 'Ollama is not running. Start it with: ollama serve'
          : errorMsg,
        error: true,
        metadata: `⏱️ ${duration}ms`
      });
      
      // Track failed execution
      MetricsService.trackAgentExecution(
        this.config.name || 'Unnamed Agent',
        false,
        duration,
        error
      );
    }
    
    // Re-render with response
    this.renderChatInterface(container);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
  
  // Helper to show non-blocking test prompt modal (DEPRECATED - now using chat interface)
  showTestPromptModal() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
      
      modal.innerHTML = `
        <div style="background: #1e1e1e; border-radius: 8px; padding: 24px; min-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <h3 style="margin: 0 0 16px 0; color: #e0e0e0; font-size: 18px;">🧪 Test Agent</h3>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 12px;">Enter a message to test your agent's response:</p>
          <textarea id="test-prompt-input" 
                    placeholder="Example: Hello, introduce yourself!&#10;Example: What can you help me with?&#10;Example: Analyze this webpage"
                    style="width: 100%; min-height: 100px; background: #2d2d2d; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; padding: 12px; font-size: 14px; font-family: inherit; resize: vertical; margin-bottom: 12px;">Hello, introduce yourself!</textarea>
          <div style="margin-bottom: 16px;">
            <button id="ai-generate-test-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>✨</span>
              <span>AI Generate Test Prompt</span>
            </button>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="test-cancel-btn" style="padding: 10px 20px; background: #374151; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
            <button id="test-run-btn" style="padding: 10px 20px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🚀 Test Agent</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const input = modal.querySelector('#test-prompt-input');
      const runBtn = modal.querySelector('#test-run-btn');
      const cancelBtn = modal.querySelector('#test-cancel-btn');
      const aiGenBtn = modal.querySelector('#ai-generate-test-btn');
      
      input.focus();
      input.select();
      
      // AI Generate Test Prompt
      aiGenBtn.onclick = async () => {
        aiGenBtn.disabled = true;
        aiGenBtn.innerHTML = '<span>⏳</span><span>Generating...</span>';
        
        try {
          const testPrompt = await this.generateTestPrompt();
          if (testPrompt) {
            input.value = testPrompt;
          }
        } catch (error) {
          console.error('Failed to generate test prompt:', error);
        }
        
        aiGenBtn.disabled = false;
        aiGenBtn.innerHTML = '<span>✨</span><span>AI Generate Test Prompt</span>';
        input.focus();
      };
      
      const cleanup = () => {
        modal.remove();
      };
      
      runBtn.onclick = () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      };
      
      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      };
      
      input.onkeydown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          runBtn.click();
        }
      };
    });
  }
  
  // Helper to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    
    // Load max iterations from localStorage
    const savedIterations = localStorage.getItem('agentEditor_maxIterations');
    if (savedIterations) {
      this.config.maxIterations = parseInt(savedIterations);
    } else {
      this.config.maxIterations = 10; // Default
    }
    
    // Initialize iteration counter
    this.config.currentIteration = 0;
    
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
${optimizing.environment ? `- Environment: Choose runtime (nodejs/python/deno/browser). List essential dependencies with versions.
  * Optimize timeout based on complexity: Simple tasks (30s), Moderate (60s), Complex/Web (120s), API-heavy (180s)
  * Optimize memoryLimit: Simple (512MB), Moderate (1GB), Complex (2GB), Large context (≥8192 tokens → 2GB)` : ''}
${optimizing.contextFiles ? `- Context Files: Generate 2-4 relevant guide/reference documents based on agent purpose.
  * For web scrapers: "Web Scraping Best Practices.md", "CSS Selectors Guide.md", "Error Handling Patterns.md"
  * For data analysts: "Data Analysis Patterns.md", "Statistics Reference.md", "Visualization Guide.md"
  * For code assistants: "Code Review Checklist.md", "Refactoring Patterns.md", "Best Practices.md"
  * For API integrators: "API Design Patterns.md", "Authentication Methods.md", "Error Codes Reference.md"
  * Each file: {name: "filename.md", content: "relevant guide content (500-1000 words)", type: "text/markdown"}` : ''}
${optimizing.tools ? '- Tools: Select from [execute_code, fetch_url, search_web, read_file]. Only what agent truly needs.' : ''}
${optimizing.settings ? `- Settings: Optimize for use case.
  * temperature: Factual (0.3-0.5), Balanced (0.5-0.7), Creative (0.7-0.9)
  * topP: Keep 0.9-0.95 for most cases
  * maxTokens: Match output needs (Code: 4096+, Chat: 2048, Simple: 1024)
  * contextWindow: Match input needs (Complex context: 16384, Moderate: 8192, Simple: 4096)
  * ragEpisodes: Optimize based on context window (Large ≥8192 → 2-3, Medium 4096-8191 → 3-5, Small <4096 → 5-7)` : ''}

**Quality Guidelines:**
1. System prompt: Be specific about agent's expertise and limitations
2. Instructions: Each step should be atomic and testable
3. Environment resources: Match timeout/memory to agent complexity and token budget
4. Context files: Create actual useful guides, not generic placeholders
5. Dependencies: Use stable versions, avoid bloat
6. Tools: Minimal set - only what's needed for the task
7. Settings: Balance performance vs quality based on use case
8. Holistic optimization: If maxTokens > 4096 → memoryLimit ≥ 1GB; if tools include fetch_url → timeout ≥ 60s

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.

JSON format:
{
  ${optimizing.systemPrompt ? '"systemPrompt": "Concise, focused system prompt defining role and capabilities",' : ''}
  ${optimizing.instructions ? '"instructions": [{"name":"Clear step name", "prompt":"Specific action to take", "conditional":false, "loop":false}],' : ''}
  ${optimizing.environment ? '"environment": {"runtime":"nodejs", "dependencies":["axios@1.6.0"], "timeout":60000, "memoryLimit":"1GB", "sandboxed":true, "environmentVars":{}},' : ''}
  ${optimizing.contextFiles ? '"contextFiles": [{"name":"Guide.md", "content":"Comprehensive guide content", "type":"text/markdown"}],' : ''}
  ${optimizing.tools ? '"tools": ["execute_code", "fetch_url"],' : ''}
  ${optimizing.settings ? '"settings": {"temperature":0.7, "topP":0.9, "maxTokens":2048, "contextWindow":8192, "ragEpisodes":3},' : ''}
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
      if (generated.contextFiles && generated.contextFiles.length > 0) {
        this.addProgressMessage('  📚 Context Files: ' + generated.contextFiles.map(f => f.name).join(', '));
      }
      if (generated.settings) {
        let settingsMsg = '  ⚡ Settings: temp=' + generated.settings.temperature + ', tokens=' + generated.settings.maxTokens;
        if (generated.settings.ragEpisodes) {
          settingsMsg += ', RAG=' + generated.settings.ragEpisodes;
        }
        this.addProgressMessage(settingsMsg);
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
        previewMsg += `   Dependencies: ${generated.environment.dependencies.slice(0, 3).join(', ')}\\n`;
        if (generated.environment.timeout) {
          previewMsg += `   Timeout: ${generated.environment.timeout}ms\\n`;
        }
        if (generated.environment.memoryLimit) {
          previewMsg += `   Memory: ${generated.environment.memoryLimit}\\n`;
        }
        previewMsg += '\\n';
      }
      if (generated.contextFiles && generated.contextFiles.length > 0) {
        previewMsg += `📚 Context Files: ${generated.contextFiles.length} guides\\n`;
        generated.contextFiles.forEach((file, i) => {
          previewMsg += `   ${i + 1}. ${file.name}\\n`;
        });
        previewMsg += '\\n';
      }
      if (generated.tools) {
        previewMsg += `🛠️ Tools: ${generated.tools.join(', ')}\\n\\n`;
      }
      if (generated.settings) {
        previewMsg += `⚡ Settings: temp=${generated.settings.temperature}, tokens=${generated.settings.maxTokens}`;
        if (generated.settings.ragEpisodes) {
          previewMsg += `, RAG episodes=${generated.settings.ragEpisodes}`;
        }
        previewMsg += '\\n\\n';
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
        
        if (generated.contextFiles && optimizing.contextFiles && generated.contextFiles.length > 0) {
          this.addProgressMessage('  📚 Adding ' + generated.contextFiles.length + ' context files...');
          this.config.contextFiles = generated.contextFiles;
          // Re-render context files tab
          this.renderContextFiles();
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
          
          if (generated.settings.ragEpisodes !== undefined) {
            this.config.ragEpisodes = generated.settings.ragEpisodes;
            const ragInput = document.getElementById('rag-episodes');
            if (ragInput) ragInput.value = generated.settings.ragEpisodes;
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
      const ideaPrompt = `You are a creative AI assistant helping users brainstorm AI agent ideas for a Chrome extension.

IMPORTANT CONTEXT: These agents run in a Chrome extension and can:
✅ Scrape and analyze the current webpage
✅ Extract data from web pages (text, tables, links, images)
✅ Search the web and fetch public URLs
✅ Execute JavaScript code for processing
✅ Analyze and transform text/data
❌ Cannot access databases or persistent storage
❌ Cannot integrate with most external APIs (CORS restrictions)
❌ Cannot send emails or notifications outside the browser

Generate ONE specific, practical, and realistic agent idea. The idea should be:
- Actually buildable in a Chrome extension
- Focused on web scraping, data extraction, or content analysis
- Solves a real problem for someone browsing the web
- Specific about what data it extracts and how it processes it

Consider these realistic categories:
- Price tracking (scrape product pages, compare prices across sites)
- Content extraction (pull specific data from news sites, forums, marketplaces)
- Research automation (gather info from multiple sources, summarize findings)
- Data validation (check links, verify information, detect changes)
- Content analysis (readability scores, SEO checks, accessibility audits)
- Comparison tools (side-by-side product/service comparisons from multiple pages)

Respond with ONLY the agent description in 1-2 sentences. No JSON, no extra formatting.
Examples:
"Scrape real estate listings from Zillow and Redfin, extract price/sqft/features, calculate price per square foot, and identify undervalued properties based on neighborhood averages"
"Extract job postings from LinkedIn/Indeed, analyze required skills vs your resume, and rank opportunities by match percentage and salary range"
"Monitor e-commerce product pages for price drops, track historical pricing, and calculate the best time to buy based on 30-day trends"
"Scrape restaurant menus from delivery sites, extract nutritional info when available, and highlight high-protein low-calorie options based on your dietary goals"

Generate a NEW creative but REALISTIC idea now:`;

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

  async generateTestPrompt() {
    // Analyze the agent's configuration to generate a relevant test prompt
    const agentPurpose = this.config.systemPrompt.substring(0, 300);
    const hasInstructions = this.config.instructions.length > 0;
    const instructionSummary = hasInstructions 
      ? this.config.instructions.map(i => i.name || i.prompt.substring(0, 50)).join(', ')
      : 'None';
    const enabledTools = this.config.tools.length > 0 
      ? this.config.tools.join(', ') 
      : 'None';
    const hasContext = this.config.contextFiles.length > 0;
    const contextTypes = hasContext 
      ? this.config.contextFiles.map(f => f.name).join(', ')
      : 'None';
    
    const testPromptGeneration = `You are helping a developer test their AI agent. Generate a SINGLE test message that would effectively demonstrate the agent's capabilities.

AGENT INFORMATION:
System Prompt: ${agentPurpose}
Instructions: ${instructionSummary}
Enabled Tools: ${enabledTools}
Context Files: ${contextTypes}
Agent Mode: ${this.config.mode}

Generate ONE test message (1-2 sentences) that:
- Tests the agent's core functionality
- Is specific and actionable
- Would produce a clear, measurable response
- Matches the agent's purpose and capabilities

If tools are enabled, create a test that would trigger tool use.
If instructions exist, test one of the instruction flows.
If it's a web scraper, ask to scrape specific data.
If it's a code generator, ask for a specific code example.

Respond ONLY with the test message itself. No explanations, no formatting, no quotes.

Example outputs:
"Scrape the current webpage and extract all product prices, then calculate the average price"
"Write a Python function that validates email addresses using regex and handles edge cases"
"Analyze the sentiment of this text: 'The product quality is excellent but shipping was delayed'"
"Extract all JavaScript functions from the current page and list their names and parameters"

Generate the test message now:`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: testPromptGeneration,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 100 // Keep it concise
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate test prompt');
      }
      
      const data = await response.json();
      const testPrompt = data.response.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^Test message:\s*/i, '') // Remove prefix
        .replace(/^Test:\s*/i, '')
        .trim();
      
      return testPrompt;
      
    } catch (error) {
      console.error('Failed to generate test prompt:', error);
      throw error;
    }
  }
}


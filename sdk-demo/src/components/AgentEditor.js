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
    
    // Intelligence features activity tracking
    this.intelligenceActivity = {
      basicReflection: { count: 0, lastRun: null, active: false },
      basicPlanning: { count: 0, lastRun: null, active: false },
      explicitPlanning: { count: 0, lastRun: null, active: false },
      explicitReflection: { count: 0, lastRun: null, active: false },
      chainOfThought: { count: 0, lastRun: null, active: false },
      toolAnalysis: { count: 0, lastRun: null, active: false },
      persistentMemory: { count: 0, lastRun: null, active: false },
      llmValidation: { count: 0, lastRun: null, active: false },
      strategyPivot: { count: 0, lastRun: null, active: false },
      smartContext: { count: 0, lastRun: null, active: false },
      parallelTools: { count: 0, lastRun: null, active: false }
    };
    
    this.init();
  }

  getDefaultConfig() {
    // Load hardware config from localStorage if available
    const savedHardware = localStorage.getItem('agentEditor_hardware');
    const defaultHardware = { preset: 'consumer', gpuVRAM: 8, tokenLimit: 0 };
    const hardware = savedHardware ? JSON.parse(savedHardware) : defaultHardware;
    
    // Recalculate token limit based on current model and VRAM
    // (will be properly calculated in init after model is set)
    const tempConfig = {
      model: 'qwen2.5-coder:14b',
      hardware: hardware
    };
    
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
      // Hardware configuration (duplicate removed below)
      maxIterations: parseInt(localStorage.getItem('agentEditor_maxIterations')) || 10,
      // Learning systems
      failureLog: [],
      successPatterns: [],
      enableReflection: true,
      enablePlanning: true,
      enableSmartContext: true,
      parallelToolExecution: true,
      currentIteration: 0,
      // Advanced intelligence features
      enableExplicitPlanning: true,      // Dedicated planning phase with LLM
      enableExplicitReflection: true,    // Dedicated reflection after tools
      enableChainOfThought: true,        // Show reasoning steps
      enableToolAnalysis: true,          // Analyze tool results
      enablePersistentMemory: true,      // Remember across sessions
      enableLLMValidation: false,        // LLM-powered validation (slower but accurate)
      conversationHistory: [],           // Full history for learning
      // Runtime tracking
      currentPlan: null,                 // Active plan
      planProgress: [],                  // Plan execution tracking
      toolEffectiveness: {},             // Success rate per tool
      lastReflection: null,              // Last reflection for context continuity
      // Context management
      totalTokensUsed: 0,                // Track token usage
      contextSummaries: [],              // Summarized old context
      maxContextTokens: 20000,           // Summarize when exceeded
      // Strategy adjustment
      recentFailures: 0,                 // Count consecutive failures
      enableStrategyPivot: true,         // Allow alternative approaches
      stuckThreshold: 3,                 // Trigger pivot after N failures
      // Learning optimization
      learningMetrics: {                 // Track what agent learns from
        successLearningRate: 0.8,        // Weight for success patterns
        failureLearningRate: 1.0,        // Weight for failures (learn more from mistakes)
        recentSuccessCount: 0,
        recentFailureCount: 0,
        adaptiveLearning: true           // Adjust learning rates based on performance
      }
    };
  }

  async init() {
    // Load persistent memory from localStorage
    if (this.config.enablePersistentMemory) {
      const savedMemory = localStorage.getItem('agentMemory');
      if (savedMemory) {
        try {
          const memory = JSON.parse(savedMemory);
          this.config.failureLog = memory.failureLog || [];
          this.config.successPatterns = memory.successPatterns || [];
          this.config.conversationHistory = memory.conversationHistory || [];
          console.log('📚 Loaded persistent memory:', {
            failures: this.config.failureLog.length,
            successes: this.config.successPatterns.length,
            conversations: this.config.conversationHistory.length
          });
        } catch (e) {
          console.warn('Failed to load persistent memory:', e);
        }
      }
    }
    
    // Recalculate token limit based on current hardware and model
    this.config.hardware.tokenLimit = this.calculateTokenLimit(this.config.hardware.gpuVRAM);
    
    // Save the updated hardware config
    localStorage.setItem('agentEditor_hardware', JSON.stringify(this.config.hardware));
    
    this.render();
    await this.initMonaco();
    await this.loadAvailableModels();
    this.attachEventListeners();
    this.updateTokenEstimate();
    
    // Update UI to show correct token limit
    const limitEl = document.getElementById('hardware-token-limit');
    if (limitEl) {
      const preset = this.config.hardware.preset;
      limitEl.textContent = preset === 'cpu' ? '32k' : this.config.hardware.tokenLimit.toLocaleString();
    }
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
          
          <!-- Optimization Strategy Selector -->
          <div id="optimization-strategy" style="margin-bottom: 15px;">
            <label style="display: block; color: #e0e0e0; font-size: 14px; font-weight: 500; margin-bottom: 8px;">
              🎯 Optimization Strategy
            </label>
            <select id="opt-strategy" style="width: 100%; padding: 10px; background: #1e1e1e; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; font-size: 14px; cursor: pointer;">
              <option value="balanced">⚖️ Balanced - General improvements</option>
              <option value="maximize">💪 Maximize Power - Use full token budget for capabilities</option>
              <option value="efficiency">⚡ Efficiency - Reduce tokens, maintain quality</option>
              <option value="specialized">🎯 Specialized - Optimize for specific task</option>
            </select>
            <p id="strategy-description" style="color: #9ca3af; font-size: 12px; margin-top: 6px; line-height: 1.4;">
              General improvements to your agent's capabilities
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
                <option value="consumer" ${(this.config.hardware?.preset || 'consumer') === 'consumer' ? 'selected' : ''}>🎮 Consumer (RTX 3060, M1/M2) - 8GB (need 9GB min)</option>
                <option value="midrange" ${(this.config.hardware?.preset || 'consumer') === 'midrange' ? 'selected' : ''}>🚀 Mid-Range (RTX 4070, M3 Pro) - 12GB (~12k tokens)</option>
                <option value="highend" ${(this.config.hardware?.preset || 'consumer') === 'highend' ? 'selected' : ''}>⚡ High-End (RTX 4090, M3 Max) - 24GB (~32k full)</option>
                <option value="cpu" ${(this.config.hardware?.preset || 'consumer') === 'cpu' ? 'selected' : ''}>🐌 CPU Only - 32k tokens (Slow)</option>
                <option value="custom" ${(this.config.hardware?.preset || 'consumer') === 'custom' ? 'selected' : ''}>⚙️ Custom</option>
              </select>

              <div id="custom-vram-section" style="display: ${(this.config.hardware?.preset || 'consumer') === 'custom' ? 'block' : 'none'};">
                <label style="font-size: 12px; color: #9ca3af; margin-bottom: 4px; display: block;">VRAM (GB):</label>
                <input type="number" id="gpu-vram" min="1" max="80" step="1" value="${this.config.hardware?.gpuVRAM || 8}" style="width: 100%; padding: 6px 8px; background: #2a2a2a; border: 1px solid #404040; border-radius: 4px; color: #e0e0e0; font-size: 13px; margin-bottom: 12px;">
              </div>

              <div style="background: #2a2a2a; padding: 10px; border-radius: 4px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #9ca3af;">VRAM Token Limit:</span>
                  <strong style="color: #10b981;" id="hardware-token-limit">${this.config.hardware?.tokenLimit || 0}</strong>
                </div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 6px; line-height: 1.4;">
                  Varies by model. Current model (<strong id="current-model-name">${(this.config.model || 'qwen2.5-coder:14b').split(':')[0]}</strong>): 
                  <strong id="model-context-window">32k</strong> max context.
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
      
      // Update token limit display based on new model
      this.config.hardware.tokenLimit = this.calculateTokenLimit(this.config.hardware.gpuVRAM);
      const limitEl = document.getElementById('hardware-token-limit');
      if (limitEl) {
        limitEl.textContent = this.config.hardware.tokenLimit.toLocaleString();
      }
      
      // Update model name display
      const modelNameEl = document.getElementById('current-model-name');
      if (modelNameEl) {
        modelNameEl.textContent = e.target.value.split(':')[0];
      }
      
      // Update context window display
      const modelSpecs = {
        'qwen2.5-coder:14b': 32768,
        'qwen2.5-coder:7b': 32768,
        'qwen2.5-coder:32b': 32768,
        'deepseek-coder:6.7b': 16384,
        'codellama:7b': 16384,
        'codellama:13b': 16384,
        'codellama:34b': 16384,
        'llama3.1:8b': 131072,
        'llama3.1:70b': 131072,
        'mistral:7b': 32768,
        'mixtral:8x7b': 32768,
      };
      const contextWindow = modelSpecs[e.target.value] || 32768;
      const contextEl = document.getElementById('model-context-window');
      if (contextEl) {
        contextEl.textContent = contextWindow >= 100000 ? '128k' : contextWindow >= 32000 ? '32k' : '16k';
      }
      
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
      
      // Set VRAM and token limits based on preset (dynamically calculated per model)
      const presets = {
        consumer: { vram: 8, tokens: this.calculateTokenLimit(8) },      // Model-dependent (may be 0 for large models)
        midrange: { vram: 12, tokens: this.calculateTokenLimit(12) },    // ~12k for qwen2.5-coder:14b
        highend: { vram: 24, tokens: this.calculateTokenLimit(24) },     // ~32k+ for most models
        cpu: { vram: 0, tokens: 32000 },                                  // Full context via CPU (slow)
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
        limitEl.textContent = preset === 'cpu' ? '32k' : config.tokens.toLocaleString();
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
        limitEl.textContent = this.config.hardware.tokenLimit.toLocaleString();
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
    
    // Optimization strategy selector
    document.getElementById('opt-strategy')?.addEventListener('change', (e) => {
      this.updateStrategyDescription(e.target.value);
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
    // Dynamic calculation based on selected model
    const model = this.config.model || 'qwen2.5-coder:14b';
    
    // Model database: {baseVRAM in GB, kvCacheGB per 1k tokens, maxContext}
    const modelSpecs = {
      'qwen2.5-coder:14b': { base: 9, kvCache: 0.25, maxContext: 32768 },     // Q4_K_M: ~8-9GB base
      'qwen2.5-coder:7b': { base: 5, kvCache: 0.15, maxContext: 32768 },      // Q4_K_M: ~4-5GB base
      'qwen2.5-coder:32b': { base: 20, kvCache: 0.4, maxContext: 32768 },     // Q4_K_M: ~18-20GB base
      'deepseek-coder:6.7b': { base: 4.5, kvCache: 0.15, maxContext: 16384 }, // Q4_K_M: ~4GB base
      'codellama:7b': { base: 5, kvCache: 0.15, maxContext: 16384 },          // Q4_K_M: ~4-5GB base
      'codellama:13b': { base: 8.5, kvCache: 0.25, maxContext: 16384 },       // Q4_K_M: ~8GB base
      'codellama:34b': { base: 20, kvCache: 0.4, maxContext: 16384 },         // Q4_K_M: ~18-20GB base
      'llama3.1:8b': { base: 5.5, kvCache: 0.15, maxContext: 131072 },        // Q4_K_M: ~5GB base
      'llama3.1:70b': { base: 40, kvCache: 0.8, maxContext: 131072 },         // Q4_K_M: ~38-40GB base
      'mistral:7b': { base: 5, kvCache: 0.15, maxContext: 32768 },            // Q4_K_M: ~4-5GB base
      'mixtral:8x7b': { base: 26, kvCache: 0.5, maxContext: 32768 },          // Q4_K_M: ~24-26GB base
    };
    
    // Default to qwen2.5-coder:14b if model not found
    const specs = modelSpecs[model] || modelSpecs['qwen2.5-coder:14b'];
    
    // Calculate available VRAM for KV cache
    const availableVRAM = Math.max(0, vramGB - specs.base);
    
    // Calculate tokens that fit in available VRAM
    const tokens = Math.floor((availableVRAM / specs.kvCache) * 1000);
    
    // Cap at model's actual context window
    return Math.min(tokens, specs.maxContext);
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
    
    // Use hardware config for limits
    const gpuTokenLimit = this.config.hardware?.tokenLimit || 0;
    
    // Get model's actual max context from specs
    const model = this.config.model || 'qwen2.5-coder:14b';
    const modelSpecs = {
      'qwen2.5-coder:14b': { base: 9, kvCache: 0.25, maxContext: 32768 },
      'qwen2.5-coder:7b': { base: 5, kvCache: 0.15, maxContext: 32768 },
      'qwen2.5-coder:32b': { base: 20, kvCache: 0.4, maxContext: 32768 },
      'qwen2.5-coder:3b': { base: 2, kvCache: 0.1, maxContext: 32768 },
      'llama3.1:8b': { base: 6, kvCache: 0.2, maxContext: 131072 },
      'llama3.1:70b': { base: 40, kvCache: 0.5, maxContext: 131072 },
      'deepseek-coder-v2:16b': { base: 10, kvCache: 0.3, maxContext: 163840 },
      'codellama:13b': { base: 8, kvCache: 0.25, maxContext: 16384 },
      'mistral:7b': { base: 5, kvCache: 0.15, maxContext: 32768 },
      'mixtral:8x7b': { base: 26, kvCache: 0.35, maxContext: 32768 },
      'phi3:14b': { base: 9, kvCache: 0.25, maxContext: 131072 }
    };
    const specs = modelSpecs[model] || modelSpecs['qwen2.5-coder:14b'];
    const modelMaxContext = specs.maxContext;
    
    const percentage = (total / modelMaxContext) * 100;
    
    this.tokenEstimate.total = total;
    this.tokenEstimate.fitsGPU = total <= gpuTokenLimit;
    this.tokenEstimate.cpuRisk = total <= gpuTokenLimit ? 'low' : total <= modelMaxContext ? 'medium' : 'high';
    
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
      const vramGB = this.config.hardware?.gpuVRAM || 8;
      const modelName = (this.config.model || 'qwen2.5-coder:14b').split(':')[0];
      
      if (total > modelMaxContext) {
        // Exceeds model's max context
        warningEl.style.display = 'block';
        warningEl.innerHTML = `⚠️ <strong>Model Limit Exceeded:</strong> ${total.toLocaleString()} tokens exceeds ${modelName}'s max context (${modelMaxContext.toLocaleString()}). Reduce context.`;
      } else if (total > gpuTokenLimit) {
        // Fits in model context but exceeds VRAM
        warningEl.style.display = 'block';
        warningEl.innerHTML = `💡 <strong>VRAM Exceeded:</strong> ${total.toLocaleString()} tokens exceeds your ${vramGB}GB VRAM limit (${gpuTokenLimit.toLocaleString()} tokens). Model will use slower CPU processing for overflow.`;
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
  
  selectRelevantContext(userMessage) {
    if (!this.config.enableSmartContext || !this.config.contextFiles || this.config.contextFiles.length === 0) {
      return this.config.contextFiles || [];
    }
    
    // Extract keywords from user message
    const keywords = userMessage.toLowerCase().split(/\s+/);
    
    // Score each context file based on relevance
    const scored = this.config.contextFiles.map(file => {
      let score = 0;
      const fileContent = (file.name + ' ' + file.content).toLowerCase();
      
      // Check for keyword matches
      keywords.forEach(keyword => {
        if (keyword.length > 3 && fileContent.includes(keyword)) {
          score += 1;
        }
      });
      
      // Boost scores for common libraries mentioned
      if (userMessage.includes('axios') && file.name.includes('axios')) score += 5;
      if (userMessage.includes('cheerio') && file.name.includes('cheerio')) score += 5;
      if (userMessage.includes('puppeteer') && file.name.includes('puppeteer')) score += 5;
      if (userMessage.includes('error') && file.name.includes('error')) score += 3;
      if (userMessage.includes('fetch') && file.name.includes('api')) score += 3;
      
      return { file, score };
    });
    
    // Return top 3 most relevant files, or all if less than 5 total
    if (this.config.contextFiles.length <= 5) {
      return this.config.contextFiles;
    }
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.file);
  }
  
  selectRelevantContext(userMessage) {
    if (!this.config.enableSmartContext || !this.config.contextFiles || this.config.contextFiles.length === 0) {
      return this.config.contextFiles || [];
    }
    
    // Extract keywords from user message
    const keywords = userMessage.toLowerCase().split(/\s+/);
    
    // Score each context file based on relevance
    const scored = this.config.contextFiles.map(file => {
      let score = 0;
      const fileContent = (file.name + ' ' + file.content).toLowerCase();
      
      // Check for keyword matches
      keywords.forEach(keyword => {
        if (keyword.length > 3 && fileContent.includes(keyword)) {
          score += 1;
        }
      });
      
      // Boost scores for common libraries mentioned
      if (userMessage.includes('axios') && file.name.includes('axios')) score += 5;
      if (userMessage.includes('cheerio') && file.name.includes('cheerio')) score += 5;
      if (userMessage.includes('puppeteer') && file.name.includes('puppeteer')) score += 5;
      if (userMessage.includes('error') && file.name.includes('error')) score += 3;
      if (userMessage.includes('fetch') && file.name.includes('api')) score += 3;
      
      return { file, score };
    });
    
    // Return top 3 most relevant files, or all if less than 5 total
    if (this.config.contextFiles.length <= 5) {
      return this.config.contextFiles;
    }
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.file);
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
        const agent = JSON.parse(JSON.stringify(agents[index])); // Deep clone
        
        // CRITICAL FIX: Merge saved agent with default config to preserve new features
        const defaultConfig = this.getDefaultConfig();
        this.config = {
          ...defaultConfig,  // Start with full default config
          ...agent,          // Override with saved agent data
          // Ensure intelligence features are present (in case old save)
          enableExplicitPlanning: agent.enableExplicitPlanning !== undefined ? agent.enableExplicitPlanning : defaultConfig.enableExplicitPlanning,
          enableExplicitReflection: agent.enableExplicitReflection !== undefined ? agent.enableExplicitReflection : defaultConfig.enableExplicitReflection,
          enableChainOfThought: agent.enableChainOfThought !== undefined ? agent.enableChainOfThought : defaultConfig.enableChainOfThought,
          enableToolAnalysis: agent.enableToolAnalysis !== undefined ? agent.enableToolAnalysis : defaultConfig.enableToolAnalysis,
          enableStrategyPivot: agent.enableStrategyPivot !== undefined ? agent.enableStrategyPivot : defaultConfig.enableStrategyPivot
        };
        
        console.log('✅ [LOAD FIX] Loaded agent with intelligence features:', {
          name: agent.name,
          enableExplicitPlanning: this.config.enableExplicitPlanning,
          enableExplicitReflection: this.config.enableExplicitReflection
        });
        
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
      // CRITICAL FIX: Merge imported agent with default config to preserve new features
      const defaultConfig = this.getDefaultConfig();
      this.config = {
        ...defaultConfig,  // Start with full default config
        ...imported,       // Override with imported agent data
        // Ensure intelligence features are present (in case old export)
        enableExplicitPlanning: imported.enableExplicitPlanning !== undefined ? imported.enableExplicitPlanning : defaultConfig.enableExplicitPlanning,
        enableExplicitReflection: imported.enableExplicitReflection !== undefined ? imported.enableExplicitReflection : defaultConfig.enableExplicitReflection,
        enableChainOfThought: imported.enableChainOfThought !== undefined ? imported.enableChainOfThought : defaultConfig.enableChainOfThought,
        enableToolAnalysis: imported.enableToolAnalysis !== undefined ? imported.enableToolAnalysis : defaultConfig.enableToolAnalysis,
        enableStrategyPivot: imported.enableStrategyPivot !== undefined ? imported.enableStrategyPivot : defaultConfig.enableStrategyPivot
      };
      
      console.log('✅ [IMPORT FIX] Imported agent with intelligence features:', {
        name: imported.name,
        enableExplicitPlanning: this.config.enableExplicitPlanning,
        enableExplicitReflection: this.config.enableExplicitReflection
      });
      
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
  
  updateIntelStatusPanel() {
    // Re-render the chat interface to update status panel in real-time
    const chatContainer = document.getElementById('test-chat-container');
    if (chatContainer && document.getElementById('intel-status-panel')) {
      // Save scroll position
      const messagesContainer = chatContainer.querySelector('[style*="overflow-y: auto"]');
      const scrollPos = messagesContainer?.scrollTop || 0;
      
      // Re-render
      this.renderChatInterface(chatContainer);
      
      // Restore scroll position
      const newMessagesContainer = chatContainer.querySelector('[style*="overflow-y: auto"]');
      if (newMessagesContainer) {
        newMessagesContainer.scrollTop = scrollPos;
      }
    }
  }

  renderIntelFeatureStatus(name, enabled, activityKey) {
    const activity = this.intelligenceActivity[activityKey] || { count: 0, lastRun: null, active: false };
    const status = enabled ? 'ENABLED' : 'DISABLED';
    const color = enabled ? '#10b981' : '#6b7280';
    const icon = activity.active ? '🔄' : (enabled ? '✅' : '❌');
    
    const lastRunText = activity.lastRun 
      ? new Date(activity.lastRun).toLocaleTimeString()
      : 'Never';
    
    return `
      <div style="display: flex; align-items: center; gap: 6px; padding: 6px; background: #1e1e1e; border-radius: 4px;">
        <span style="font-size: 14px; ${activity.active ? 'animation: spin 1s linear infinite;' : ''}">${icon}</span>
        <div style="flex: 1;">
          <div style="color: #e0e0e0; font-weight: 500; font-size: 11px;">${name}</div>
          <div style="color: ${color}; font-size: 9px; font-weight: 600;">${status}</div>
          <div style="color: #6b7280; font-size: 9px; margin-top: 2px;">Runs: ${activity.count} | Last: ${lastRunText}</div>
        </div>
      </div>
    `;
  }

  renderChatInterface(container) {
    // Calculate iteration progress
    const iterationPercent = this.config.maxIterations > 0 
      ? Math.min(100, (this.config.currentIteration / this.config.maxIterations) * 100) 
      : 0;
    
    const isIterating = this.testConversation.some(msg => msg.loading);
    
    // Debug: Log config values when rendering UI
    console.log('🖥️ [RENDER DEBUG] Intelligence Features Config:', {
      enableExplicitPlanning: this.config.enableExplicitPlanning,
      enableExplicitReflection: this.config.enableExplicitReflection,
      enableChainOfThought: this.config.enableChainOfThought,
      enableToolAnalysis: this.config.enableToolAnalysis,
      enablePersistentMemory: this.config.enablePersistentMemory,
      enableLLMValidation: this.config.enableLLMValidation,
      enableStrategyPivot: this.config.enableStrategyPivot,
      enableSmartContext: this.config.enableSmartContext,
      parallelToolExecution: this.config.parallelToolExecution
    });
    
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
            <button id="toggle-intel-status-btn" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">🧠 Intelligence Status</button>
            <button id="continue-iteration-btn" style="padding: 8px 16px; background: #0e7490; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; display: ${this.testConversation.length > 0 && !isIterating ? 'block' : 'none'};">🔄 Continue Iteration</button>
            <button id="clear-chat-btn" style="padding: 8px 16px; background: #374151; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">🗑️ Clear Chat</button>
          </div>
        </div>
        
        <!-- Intelligence Features Status Panel -->
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
        <div id="intel-status-panel" style="display: none; padding: 16px; background: #2d2d2d; border-bottom: 1px solid #333;">
          <h4 style="margin: 0 0 12px 0; color: #e0e0e0; font-size: 14px; font-weight: 600;">🧠 Intelligence Features Status <span style="font-size: 11px; color: #6b7280; font-weight: normal;">(Live Activity - 11 Features)</span></h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
            ${this.renderIntelFeatureStatus('🧩 Basic Reflection', this.config.enableReflection, 'basicReflection')}
            ${this.renderIntelFeatureStatus('🗺️ Basic Planning', this.config.enablePlanning, 'basicPlanning')}
            ${this.renderIntelFeatureStatus('📋 Explicit Planning', this.config.enableExplicitPlanning, 'explicitPlanning')}
            ${this.renderIntelFeatureStatus('🤔 Explicit Reflection', this.config.enableExplicitReflection, 'explicitReflection')}
            ${this.renderIntelFeatureStatus('💭 Chain of Thought', this.config.enableChainOfThought, 'chainOfThought')}
            ${this.renderIntelFeatureStatus('🔍 Tool Analysis', this.config.enableToolAnalysis, 'toolAnalysis')}
            ${this.renderIntelFeatureStatus('💾 Persistent Memory', this.config.enablePersistentMemory, 'persistentMemory')}
            ${this.renderIntelFeatureStatus('✅ LLM Validation', this.config.enableLLMValidation, 'llmValidation')}
            ${this.renderIntelFeatureStatus('🎯 Strategy Pivot', this.config.enableStrategyPivot, 'strategyPivot')}
            ${this.renderIntelFeatureStatus('📊 Smart Context', this.config.enableSmartContext, 'smartContext')}
            ${this.renderIntelFeatureStatus('⚡ Parallel Tools', this.config.parallelToolExecution, 'parallelTools')}
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #444; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px;">
            <div><span style="color: #94a3b8;">Failures:</span> <span style="color: #ef4444; font-weight: 600;">${this.config.failureLog?.length || 0}</span></div>
            <div><span style="color: #94a3b8;">Successes:</span> <span style="color: #10b981; font-weight: 600;">${this.config.successPatterns?.length || 0}</span></div>
            <div><span style="color: #94a3b8;">Tokens:</span> <span style="color: #f59e0b; font-weight: 600;">${this.config.totalTokensUsed || 0}</span></div>
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
    
    const toggleIntelBtn = container.querySelector('#toggle-intel-status-btn');
    const intelPanel = container.querySelector('#intel-status-panel');
    if (toggleIntelBtn && intelPanel) {
      let firstToggle = true;
      toggleIntelBtn.onclick = () => {
        const isVisible = intelPanel.style.display !== 'none';
        intelPanel.style.display = isVisible ? 'none' : 'block';
        toggleIntelBtn.textContent = isVisible ? '🧠 Intelligence Status' : '✖️ Hide Status';
        
        // Show helpful message on first toggle
        if (firstToggle && !isVisible) {
          firstToggle = false;
          console.log('💡 Intelligence Status Panel: Shows all 19 intelligence features and their current state');
          console.log('✅ = ENABLED | ❌ = DISABLED');
          console.log('If features show as DISABLED, reload the page or re-apply a template');
        }
      };
    }
    
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
        content: `⚠️ **Reached maximum iterations (${this.config.maxIterations})**\n\nThe agent has performed ${this.config.maxIterations} iterations.\n\n**Options:**\n• Send another message to continue\n• Increase Max Iterations in settings\n• Reset conversation to start fresh`,
        metadata: `🔄 Iteration ${this.config.currentIteration}/${this.config.maxIterations}`
      });
      
      // Reset iteration counter so user can continue if they want
      this.config.currentIteration = 0;
      
      this.renderChatInterface(container);
      const messagesDiv = container.querySelector('#chat-messages');
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return;
    }
    
    // Track recent tool calls to detect loops (compare full signatures)
    this.recentToolCalls = this.recentToolCalls || [];
    const lastToolCall = this.testConversation
      .slice(-5)
      .reverse()
      .find(msg => msg.role === 'assistant' && msg.content.includes('🛠️ Executing:'));
    
    if (lastToolCall) {
      // Extract full tool signature (tool name + params) for accurate comparison
      const toolSignature = lastToolCall.content;
      this.recentToolCalls.push(toolSignature);
      if (this.recentToolCalls.length > 5) this.recentToolCalls.shift();
      
      // Check for repeated IDENTICAL actions (exact same tool call 3+ times in a row)
      const lastThree = this.recentToolCalls.slice(-3);
      if (lastThree.length === 3 && 
          lastThree[0] === lastThree[1] && 
          lastThree[1] === lastThree[2]) {
        this.testConversation.push({
          role: 'system',
          content: `⚠️ **Loop Detected!** Agent is repeating the exact same action 3 times:\n\n${lastThree[0].substring(0, 200)}...\n\n**Possible reasons:**\n• Tool is not returning expected output\n• Code has errors but returns "Success"\n• Agent needs different approach\n\n**Stopping to prevent infinite loop.**`,
          metadata: `🔄 Iteration ${this.config.currentIteration}/${this.config.maxIterations}`
        });
        this.renderChatInterface(container);
        const messagesDiv = container.querySelector('#chat-messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return;
      }
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
      
      // Extract original user query for task reminder
      const originalQuery = this.testConversation.find(msg => msg.role === 'user')?.content || '';
      
      // Check if last error was empty output
      const lastSystemMsg = this.testConversation
        .filter(msg => msg.role === 'system' && msg.content.includes('Tool Result'))
        .slice(-1)[0];
      const hadEmptyOutput = lastSystemMsg && lastSystemMsg.content.includes('NO OUTPUT');
      
      // Enhanced prompt - include FULL agent mode instructions
      let enhancedPrompt = this.config.systemPrompt;
      
      // Add context files FIRST at the very beginning (including library guides)
      if (this.config.contextFiles && this.config.contextFiles.length > 0) {
        enhancedPrompt += `\n\n=== REFERENCE GUIDES ===\n`;
        enhancedPrompt += `Consult these when tools fail:\n\n`;
        
        this.config.contextFiles.forEach(file => {
          enhancedPrompt += `--- ${file.name} ---\n`;
          enhancedPrompt += `${file.content.substring(0, 2000)}...\n\n`;
        });
      }
      
      // Add environment info
      if (this.config.environment.runtime && this.config.environment.dependencies.length > 0) {
        enhancedPrompt += `\nAVAILABLE PACKAGES: ${this.config.environment.dependencies.join(', ')}\n`;
      }
      
      // Add the same agent execution mode instructions as initial message
      if (this.config.tools.length > 0) {
        enhancedPrompt += `\n\n=== ORIGINAL TASK (DO NOT FORGET) ===\n`;
        enhancedPrompt += `${originalQuery}\n\n`;
        enhancedPrompt += `=== CONTINUE AGENT EXECUTION ===\n`;
        enhancedPrompt += `You just received tool results. You MUST continue with another tool OR present final results.\n\n`;
        
        enhancedPrompt += `TASK COMPLETION CRITERIA:\n`;
        enhancedPrompt += `- Did you extract ALL data the user asked for?\n`;
        enhancedPrompt += `- If you got HTML, did you PARSE it to extract specific data?\n`;
        enhancedPrompt += `- If task asks for "extract X", have you actually extracted X?\n`;
        enhancedPrompt += `- NEVER just describe data - actually extract and present it!\n\n`;
        
        enhancedPrompt += `YOUR NEXT RESPONSE MUST BE:\n`;
        enhancedPrompt += `- JSON tool call if more work needed OR if last tool failed: {"tool": "...", "params": {...}}\n`;
        enhancedPrompt += `- Plain text summary ONLY if task is successfully complete\n`;
        enhancedPrompt += `- IF LAST TOOL HAD ERROR: You MUST retry with JSON tool call, NOT plain text!\n\n`;
        
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
        enhancedPrompt += `Instead, use execute_code with axios and AWAIT:\n`;
        enhancedPrompt += `{"tool": "execute_code", "params": {"code": "const axios = require('axios'); const res = await axios.get('URL', {headers: {'User-Agent': 'Mozilla/5.0'}}); console.log(res.data);"}}\n\n`;
        enhancedPrompt += `⛔ WRONG (double-wrapped):\n`;
        enhancedPrompt += `{"tool": "execute_code", "params": {"code": "(async () => { const res = await axios.get(...); })()"}}\n\n`;
        enhancedPrompt += `✅ RIGHT (server wraps it):\n`;
        enhancedPrompt += `{"tool": "execute_code", "params": {"code": "const res = await axios.get(...); console.log(res.data);"}}\n\n`;
        
        // SUPER STRONG MESSAGE if last tool had empty output
        if (hadEmptyOutput) {
          // Get the failed code from the stored location
          const failedCode = this.config.lastFailedCode || '';
          
          enhancedPrompt += `\n🚨🚨🚨 CRITICAL ERROR: YOUR LAST CODE HAD NO OUTPUT! 🚨🚨🚨\n`;
          enhancedPrompt += `The code returned NOTHING - missing console.log() OR forgot AWAIT!\n\n`;
          
          enhancedPrompt += `⛔ NEVER WRAP CODE IN (async () => {...})() ⛔\n`;
          enhancedPrompt += `The execute server ALREADY wraps your code in async IIFE!\n`;
          enhancedPrompt += `Writing bare await statements WITHOUT wrapping!\n\n`;
          
          if (failedCode) {
            enhancedPrompt += `YOUR BROKEN CODE:\n${failedCode}\n\n`;
            enhancedPrompt += `REQUIRED FIXES:\n`;
            enhancedPrompt += `1. REMOVE (async () => {...})() wrapper - server adds it!\n`;
            enhancedPrompt += `2. USE AWAIT: const res = await axios.get(...); console.log(res.data);\n`;
            enhancedPrompt += `3. ALWAYS add console.log() to see output!\n\n`;
          }
          
          enhancedPrompt += `YOU MUST IMMEDIATELY RETRY WITH A NEW TOOL CALL!\n`;
          enhancedPrompt += `DO NOT respond with text - respond with JSON tool call!\n`;
          enhancedPrompt += `GENERATE: {"tool": "execute_code", "params": {"code": "...FIXED CODE WITH await AND console.log()..."}}\n\n`;
          
          console.log('🚨 [DEBUG] Empty output detected! Alert injected into prompt.');
          console.log('🚨 [DEBUG] Failed code:', failedCode.substring(0, 150));
        }
        
        enhancedPrompt += `EMPTY OUTPUT = FAILURE:\n`;
        enhancedPrompt += `If execute_code returns "NO OUTPUT", fix it with await + console.log()!\n`;
        enhancedPrompt += `NEVER repeat broken code - REWRITE IT!\n`;
        enhancedPrompt += `WRONG: axios.get(...).then(r => console.log(r)) // NOT AWAITED!\n`;
        enhancedPrompt += `RIGHT: const res = await axios.get(...); console.log(res.data);\n\n`;
        
        enhancedPrompt += `DO NOT explain, DO NOT retry the same broken code - FIX and retry!\n`;
      }
      
      console.log('[DEBUG] Continuation prompt preview:', enhancedPrompt.substring(enhancedPrompt.length - 500));
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: `${enhancedPrompt}\n\n${conversationContext}\n\nAssistant:`,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.topP,
            num_predict: 1024  // Increased from maxTokens to allow longer code
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
          console.log('🔍 [DEBUG] Full response length:', response.length);
          console.log('🔍 [DEBUG] Response ending:', response.substring(response.length - 100));
          
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
          // Look for JSON object anywhere in response - use brace counting to handle nested objects
          else {
            const startIdx = response.indexOf('{');
            if (startIdx !== -1) {
              let braceCount = 1;  // Start at 1 because we already found the opening brace
              let inString = false;
              let escapeNext = false;
              
              // Start from the character AFTER the opening brace
              for (let i = startIdx + 1; i < response.length; i++) {
                const char = response[i];
                
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                
                if (char === '"' && !inString) {
                  inString = true;
                } else if (char === '"' && inString) {
                  inString = false;
                } else if (!inString) {
                  if (char === '{') braceCount++;
                  if (char === '}') braceCount--;
                  
                  if (braceCount === 0) {
                    jsonStr = response.substring(startIdx, i + 1);
                    break;
                  }
                }
              }
            }
          }
          
          if (jsonStr) {
            console.log('[Agent] Extracted JSON from continuation:', jsonStr.substring(0, 200));
            console.log('🔍 [DEBUG] Extracted JSON length:', jsonStr.length);
            console.log('🔍 [DEBUG] Full extracted JSON:', jsonStr);
            toolCallMatch = JSON.parse(jsonStr);
            console.log('[Agent] Parsed tool call from continuation:', toolCallMatch);
          } else {
            console.log('[Agent] No JSON found in continuation response');
            
            // Detect if agent is providing tutorial/explanation instead of tool call
            if (result.response.includes('Here is') || 
                result.response.includes('You can') || 
                result.response.includes('I can guide') ||
                result.response.includes("I'm unable") ||
                result.response.includes('step-by-step') ||
                result.response.length > 1000) {
              console.warn('⚠️ Agent is providing explanation instead of tool call!');
              this.testConversation.push({
                role: 'system',
                content: `⚠️ ERROR: You provided an explanation/tutorial instead of a JSON tool call. You MUST respond with ONLY JSON tool calls. If you don't know a URL, use search_web first!`,
                error: true
              });
              this.renderChatInterface(container);
              return;
            }
          }
        } catch (e) {
          console.log('[Agent] Failed to parse tool call in continuation:', e.message);
          console.log('🔍 [DEBUG] Failed JSON string:', jsonStr?.substring(0, 500));
        }
        
        if (toolCallMatch && this.config.tools.includes(toolCallMatch.tool)) {
          // Check if this is an array of tool calls (parallel execution)
          const toolCalls = Array.isArray(toolCallMatch) ? toolCallMatch : [toolCallMatch];
          
          if (toolCalls.length > 1) {
            // Execute tools in parallel
            console.log(`⚡ Executing ${toolCalls.length} tools in parallel`);
            const results = await this.executeToolsInParallel(toolCalls);
            
            results.forEach(({ tool, result }) => {
              this.testConversation.push({
                role: 'assistant',
                content: `🛠️ Executed: ${tool}`,
                metadata: `⏱️ ${result.duration}ms`
              });
              
              this.testConversation.push({
                role: 'system',
                content: `Tool Result:\n${result.success ? result.output : 'Error: ' + result.error}`,
                metadata: `⏱️ ${result.duration}ms`
              });
            });
          } else {
            // Execute single tool
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
            
            // Track plan progress
            if (this.config.currentPlan && this.config.planProgress) {
              const step = this.config.planProgress.find(s => 
                s.action === toolCallMatch.tool && !s.completed
              );
              if (step) {
                step.completed = true;
                step.result = toolResult.success ? 'success' : 'failed';
                console.log(`📋 Plan progress: Step ${step.step} (${step.action}) - ${step.result}`);
              }
            }
            
            // Track tool effectiveness
            if (this.config.enableToolAnalysis) {
              if (!this.config.toolEffectiveness[toolCallMatch.tool]) {
                this.config.toolEffectiveness[toolCallMatch.tool] = { attempts: 0, successes: 0 };
              }
              this.config.toolEffectiveness[toolCallMatch.tool].attempts++;
              if (toolResult.success) {
                this.config.toolEffectiveness[toolCallMatch.tool].successes++;
              }
            }
            
            // EXPLICIT REFLECTION (if enabled)
            if (this.config.enableExplicitReflection) {
              this.renderChatInterface(container);
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
              
              const userQuery = this.testConversation.find(m => m.role === 'user')?.content || '';
              const reflection = await this.reflectOnToolResult(toolCallMatch.tool, toolResult, userQuery);
              
              if (reflection) {
                this.testConversation.push({
                  role: 'assistant',
                  content: `🤔 **Reflection:**\n${reflection.learning}\n\n**Next:** ${reflection.nextAction}`,
                  metadata: '💭 Reflection Phase'
                });
              }
            }
          }
          
          this.renderChatInterface(container);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          
          // Continue again
          await this.continueWithToolResults(container);
          return;
        }
        
        // Regular response (task complete or asking for help)
        // Check if agent is asking for user input/help
        const askingForHelp = result.response.match(/please provide|please select|provide a valid|i need|can you provide|give me|which one|pick one|help me|let me know|if you need help|you choose|select a specific/i);
        
        // If asking for help, force continuation with instruction to be autonomous
        if (askingForHelp) {
          console.warn('⚠️ Agent is asking for user input - forcing autonomous behavior');
          
          this.testConversation.push({
            role: 'system',
            content: `⚠️ ERROR: You asked the user for input. You are an AUTONOMOUS agent - you must make decisions yourself!\n\nREMINDER:\n- NEVER ask "please provide" or "please select"\n- When you have search results with URLs, PICK ONE and use it immediately\n- Make educated guesses when needed\n- Be self-sufficient and decisive\n\nNow proceed with the task autonomously. If you just got search results, use the FIRST URL from those results.`,
            error: true
          });
          
          this.renderChatInterface(container);
          await this.continueWithToolResults(container);
          return;
        }
        
        // Validate if response actually answers the question
        // Skip validation for tool calls (JSON responses) or if asking for help
        const isToolCall = result.response.includes('"tool"') && result.response.includes('"params"');
        const isValidResponse = (isToolCall || askingForHelp) ? true : await this.validateResponse(result.response, this.testConversation);
        
        this.testConversation.push({
          role: 'assistant',
          content: result.response,
          metadata: `⏱️ ${duration}ms • 📊 ~${Math.ceil(result.response.length / 4)} tokens • ${askingForHelp ? '❓ Needs Input' : isValidResponse ? '✅ Task Complete' : '⚠️ May Need Improvement'}`
        });
        
        // Extract tools used (for both success tracking and conversation history)
        const toolsUsed = this.testConversation
          .filter(msg => msg.role === 'system' && msg.content.includes('Tool:'))
          .map(msg => {
            const match = msg.content.match(/Tool: (\w+)/);
            return match ? match[1] : 'unknown';
          });
        
        // Track successful completion
        if (this.config.successPatterns && this.config.currentIteration > 0) {
          
          if (toolsUsed.length > 0) {
            this.config.successPatterns.push({
              task: this.testConversation.find(m => m.role === 'user')?.content || 'unknown',
              approach: toolsUsed,
              iterations: this.config.currentIteration,
              timestamp: Date.now()
            });
            
            // Adaptive learning: adjust retention based on performance
            if (this.config.learningMetrics?.adaptiveLearning) {
              this.config.learningMetrics.recentSuccessCount++;
              
              // If succeeding frequently, keep more successes (up to 15)
              const successRate = this.config.learningMetrics.recentSuccessCount / 
                (this.config.learningMetrics.recentSuccessCount + this.config.learningMetrics.recentFailureCount || 1);
              
              const maxSuccesses = successRate > 0.7 ? 15 : 10;
              
              if (this.config.successPatterns.length > maxSuccesses) {
                this.config.successPatterns = this.config.successPatterns.slice(-maxSuccesses);
              }
            } else {
              // Keep only last 10 successes (default)
              if (this.config.successPatterns.length > 10) {
                this.config.successPatterns = this.config.successPatterns.slice(-10);
              }
            }
            
            console.log(`📚 Learned successful pattern: ${toolsUsed.join(' → ')}`);
          }
        }
        
        // Store conversation in history for learning
        if (this.config.conversationHistory) {
          this.config.conversationHistory.push({
            userQuery: this.testConversation.find(m => m.role === 'user')?.content || '',
            toolsUsed: toolsUsed,
            success: true,
            iterations: this.config.currentIteration,
            timestamp: Date.now()
          });
          
          // Keep only last 50 conversations
          if (this.config.conversationHistory.length > 50) {
            this.config.conversationHistory = this.config.conversationHistory.slice(-50);
          }
        }
        
        // Save to persistent storage
        this.savePersistentMemory();
        
        // Add completion message only if not asking for help
        if (this.config.currentIteration > 1 && !askingForHelp) {
          this.testConversation.push({
            role: 'system',
            content: `✅ Agent completed task after ${this.config.currentIteration} iterations`,
            metadata: `🔄 Total Iterations: ${this.config.currentIteration}/${this.config.maxIterations}`
          });
        } else if (askingForHelp) {
          this.testConversation.push({
            role: 'system',
            content: `❓ Agent needs additional information to continue`,
            metadata: `🔄 Iterations: ${this.config.currentIteration}/${this.config.maxIterations}`
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
  
  parseToolCalls(response) {
    // Try to parse multiple tool calls from response (for parallel execution)
    const toolCalls = [];
    
    // Try parsing as JSON array first
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.tool) {
        return [parsed];
      }
    } catch (e) {
      // Not JSON array, try finding individual tool calls
    }
    
    // Find all JSON objects in response
    const jsonMatches = response.matchAll(/\{[^{}]*"tool"[^{}]*\}/g);
    for (const match of jsonMatches) {
      try {
        const toolCall = JSON.parse(match[0]);
        if (toolCall.tool) {
          toolCalls.push(toolCall);
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    return toolCalls.length > 0 ? toolCalls : null;
  }
  
  async executeToolsInParallel(toolCalls) {
    if (!this.config.parallelToolExecution || toolCalls.length === 1) {
      // Execute sequentially
      const results = [];
      for (const call of toolCalls) {
        const result = await this.executeTool(call.tool, call.params);
        results.push({ tool: call.tool, result });
      }
      return results;
    }
    
    // Execute in parallel - mark activity
    this.intelligenceActivity.parallelTools.active = true;
    this.intelligenceActivity.parallelTools.count++;
    this.intelligenceActivity.parallelTools.lastRun = Date.now();
    console.log(`⚡ [INTELLIGENCE] Parallel Tools STARTED (Run #${this.intelligenceActivity.parallelTools.count}) - ${toolCalls.length} tools`);
    this.updateIntelStatusPanel();
    
    console.log(`⚡ Executing ${toolCalls.length} tools in parallel`);
    const promises = toolCalls.map(call => 
      this.executeTool(call.tool, call.params)
        .then(result => ({ tool: call.tool, result }))
    );
    
    const results = await Promise.all(promises);
    
    this.intelligenceActivity.parallelTools.active = false;
    console.log('⚡ [INTELLIGENCE] Parallel Tools COMPLETED');
    this.updateIntelStatusPanel();
    
    return results;
  }
  
  savePersistentMemory() {
    if (this.config.enablePersistentMemory) {
      this.intelligenceActivity.persistentMemory.count++;
      this.intelligenceActivity.persistentMemory.lastRun = Date.now();
      console.log(`💾 [INTELLIGENCE] Persistent Memory SAVE (Run #${this.intelligenceActivity.persistentMemory.count})`);
      
      const memory = {
        failureLog: this.config.failureLog,
        successPatterns: this.config.successPatterns,
        conversationHistory: this.config.conversationHistory.slice(-50), // Keep last 50
        lastUpdated: Date.now()
      };
      localStorage.setItem('agentMemory', JSON.stringify(memory));
      console.log('💾 Saved persistent memory');
    }
  }
  
  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Summarize old context to free up tokens
  async summarizeContext(contextToSummarize) {
    try {
      const prompt = `Summarize this conversation context in 200 words or less. Keep critical details like errors, successful approaches, and important findings:\n\n${contextToSummarize}`;
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 300
          }
        })
      });

      const data = await response.json();
      return data.response || contextToSummarize;
    } catch (error) {
      console.error('Failed to summarize context:', error);
      return contextToSummarize.substring(0, 500) + '...'; // Fallback truncation
    }
  }

  // Advanced error recovery strategies
  async suggestErrorRecovery(toolName, error, attemptedParams) {
    const strategies = [];
    
    // Strategy 1: Tool substitution
    if (toolName === 'fetch_url' && error.includes('CORS')) {
      strategies.push({ type: 'substitute', suggestion: 'Use execute_code with axios instead', tool: 'execute_code' });
    } else if (toolName === 'execute_code' && error.includes('timeout')) {
      strategies.push({ type: 'simplify', suggestion: 'Break into smaller code chunks', tool: toolName });
    }
    
    // Strategy 2: Parameter adjustment
    if (error.includes('Invalid') || error.includes('parse')) {
      strategies.push({ type: 'adjust_params', suggestion: 'Simplify parameters or fix syntax', tool: toolName });
    }
    
    // Strategy 3: Approach simplification
    if (this.config.recentFailures >= 2) {
      strategies.push({ type: 'simplify', suggestion: 'Start with simpler goal, build up gradually', tool: null });
    }
    
    // Strategy 4: Ask for help (provide more context to LLM)
    if (this.config.recentFailures >= this.config.stuckThreshold) {
      strategies.push({ type: 'context', suggestion: 'Review available tools and documentation again', tool: null });
    }
    
    return strategies;
  }

  // Check if agent is stuck and suggest alternative strategy
  async suggestStrategyPivot(currentApproach, failureHistory) {
    try {
      // Get heuristic recovery strategies first
      const lastFailure = failureHistory[failureHistory.length - 1];
      const recoveryStrategies = await this.suggestErrorRecovery(
        lastFailure?.tool,
        lastFailure?.error || '',
        lastFailure?.params
      );
      
      if (recoveryStrategies.length > 0) {
        const strategy = recoveryStrategies[0];
        console.log(`🔧 Recovery strategy: ${strategy.type} - ${strategy.suggestion}`);
        return strategy.suggestion;
      }
      
      // Fallback to LLM suggestion
      const failureSummary = failureHistory.slice(-3).map(f => 
        `Tool: ${f.tool}, Error: ${f.error}`
      ).join('\n');
      
      const prompt = `The agent is stuck after ${failureHistory.length} failures. Current approach:\n${currentApproach}\n\nRecent failures:\n${failureSummary}\n\nSuggest ONE alternative strategy (different tool or approach) in 50 words max:`;
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 100
          }
        })
      });

      const data = await response.json();
      return data.response || 'Try a different tool or break the problem into smaller steps.';
    } catch (error) {
      console.error('Failed to suggest pivot:', error);
      return 'Try a different approach or tool.';
    }
  }
  
  // Multi-layer validation system
  async validateResponse(response, conversation) {
    const userQuery = conversation.find(m => m.role === 'user')?.content || '';
    
    // Don't validate tool calls - only final answers
    if (response.includes('"tool"') && response.includes('"params"')) {
      console.log('⏩ Skipping validation - this is a tool call, not a final answer');
      return true;
    }
    
    // Layer 1: Syntax and format checks
    if (response.length < 20) {
      console.log('⚠️ Validation Layer 1: Response too short');
      return false;
    }
    
    if (response.toLowerCase().includes('error:') || response.toLowerCase().includes('failed to')) {
      console.log('⚠️ Validation Layer 1: Response contains error');
      return false;
    }
    
    // Layer 2: Semantic coherence (does response relate to query?)
    const queryVector = this.getSemanticVector(userQuery);
    const responseVector = this.getSemanticVector(response);
    const relevance = this.cosineSimilarity(queryVector, responseVector);
    
    if (relevance < 0.15) {
      console.log(`⚠️ Validation Layer 2: Low semantic relevance (${Math.round(relevance * 100)}%)`);
      return false;
    }
    
    // Layer 3: Completeness score (does it feel complete?)
    const completenessSignals = [
      response.includes('successfully'),
      response.includes('result'),
      response.includes('found'),
      response.includes('shows'),
      response.includes('data'),
      response.match(/\d+/), // Contains numbers/data
      response.length > 100,
      !response.includes('unable to'),
      !response.includes('could not')
    ];
    const completenessScore = completenessSignals.filter(Boolean).length / completenessSignals.length;
    
    if (completenessScore < 0.4) {
      console.log(`⚠️ Validation Layer 3: Low completeness (${Math.round(completenessScore * 100)}%)`);
      return false;
    }
    
    console.log(`✅ Multi-layer validation passed: relevance=${Math.round(relevance * 100)}%, completeness=${Math.round(completenessScore * 100)}%`);
    
    // Check 3: Response contains some keywords from query (relevance check)
    const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const hasRelevance = queryWords.some(word => response.toLowerCase().includes(word));
    
    if (!hasRelevance && queryWords.length > 0) {
      console.log('⚠️ Validation: Response may not be relevant to query');
    }
    
    // Check 4: If query asks for data/list, check response has it
    if ((userQuery.includes('get') || userQuery.includes('find') || userQuery.includes('list')) &&
        response.length < 50) {
      console.log('⚠️ Validation: Query asks for data but response is minimal');
      return false;
    }
    
    // LLM-powered validation for quality (optional, slower)
    if (this.config.enableLLMValidation && this.config.currentIteration > 2) {
      console.log('🔍 Running LLM validation...');
      try {
        const validationPrompt = `Validate if this response properly answers the user's question.

User Question: ${userQuery}
Agent Response: ${response}

Respond with JSON: {"valid": true/false, "reason": "why"}\n\nONLY JSON.`;
        
        const validationResult = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model || 'qwen2.5-coder:14b',
            prompt: validationPrompt,
            options: { temperature: 0.2, num_predict: 128 },
            stream: false
          })
        });
        
        const result = await validationResult.json();
        const match = result.response.match(/\{[\s\S]*"valid"[\s\S]*\}/);
        
        if (match) {
          const validation = JSON.parse(match[0]);
          console.log(`🔍 LLM Validation: ${validation.valid ? '✅' : '❌'} - ${validation.reason}`);
          return validation.valid;
        }
      } catch (e) {
        console.warn('⚠️ LLM validation failed:', e.message);
      }
    }
    
    console.log('✅ Validation: Response appears complete');
    return true;
  }
  
  // Simple word embedding using character n-grams (semantic approximation)
  getSemanticVector(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const vector = new Map();
    
    words.forEach(word => {
      // Add word itself
      vector.set(word, (vector.get(word) || 0) + 1);
      
      // Add character trigrams for semantic similarity
      for (let i = 0; i < word.length - 2; i++) {
        const trigram = word.substring(i, i + 3);
        vector.set(trigram, (vector.get(trigram) || 0) + 0.5);
      }
    });
    
    return vector;
  }
  
  // Cosine similarity between two semantic vectors
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    const allKeys = new Set([...vec1.keys(), ...vec2.keys()]);
    
    allKeys.forEach(key => {
      const v1 = vec1.get(key) || 0;
      const v2 = vec2.get(key) || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });
    
    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  findSimilarSuccessPattern(userQuery) {
    if (!this.config.successPatterns || this.config.successPatterns.length === 0) {
      return null;
    }
    
    // Semantic similarity using vector embeddings
    const queryVector = this.getSemanticVector(userQuery);
    
    let bestMatch = null;
    let bestScore = 0;
    
    this.config.successPatterns.forEach(pattern => {
      const patternVector = this.getSemanticVector(pattern.task);
      const semanticScore = this.cosineSimilarity(queryVector, patternVector);
      
      // Fallback to keyword matching for additional boost
      const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const patternWords = pattern.task.toLowerCase().split(/\s+/);
      const keywordMatches = queryWords.filter(w => patternWords.some(pw => pw.includes(w) || w.includes(pw)));
      const keywordScore = keywordMatches.length / queryWords.length;
      
      // Combined score (70% semantic, 30% keyword)
      const score = (semanticScore * 0.7) + (keywordScore * 0.3);
      
      if (score > bestScore && score > 0.25) {
        bestScore = score;
        bestMatch = pattern;
      }
    });
    
    if (bestMatch) {
      console.log(`💡 Found semantically similar past success: "${bestMatch.task}" (${Math.round(bestScore * 100)}% similarity)`);
      console.log(`   Approach used: ${bestMatch.approach.join(' → ')}`);
    }
    
    return bestMatch;
  }
  
  async createExplicitPlan(userQuery) {
    if (!this.config.enableExplicitPlanning) return null;
    
    // Mark as active and log
    this.intelligenceActivity.explicitPlanning.active = true;
    this.intelligenceActivity.explicitPlanning.count++;
    this.intelligenceActivity.explicitPlanning.lastRun = Date.now();
    console.log('📋 [INTELLIGENCE] Explicit Planning STARTED (Run #' + this.intelligenceActivity.explicitPlanning.count + ')');
    this.updateIntelStatusPanel();
    
    // Check if we've solved similar before
    const similarPattern = this.findSimilarSuccessPattern(userQuery);
    
    console.log('📋 Creating explicit plan...');
    
    let planningPrompt = `You are a strategic planner. Analyze this user request and create a step-by-step plan.

User Request: ${userQuery}

Available Tools: ${this.config.tools.join(', ')}`;
    
    // Include similar successful approach if found
    if (similarPattern) {
      planningPrompt += `\n\nPREVIOUS SUCCESS: For similar query "${similarPattern.task}", this approach worked:\n${similarPattern.approach.join(' → ')} (${similarPattern.iterations} iterations)\nConsider using a similar strategy.`;
    }
    
    planningPrompt += `\n\nCreate a JSON plan with this format:\n{"steps": [{"step": 1, "action": "tool_name", "reason": "why this step"}]}\n\nRespond with ONLY the JSON.`;
    
    try {
      console.log('📋 [DEBUG] Fetching from Ollama for planning...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: planningPrompt,
          options: { temperature: 0.3, num_predict: 512 },
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      console.log('📋 [DEBUG] Got response from Ollama');
      
      const result = await response.json();
      console.log('📋 [DEBUG] Response text length:', result.response?.length);
      
      const planMatch = result.response.match(/\{[\s\S]*"steps"[\s\S]*\}/);
      
      if (planMatch) {
        const plan = JSON.parse(planMatch[0]);
        console.log('📋 Plan created:', plan);
        
        // Store plan for tracking execution
        this.config.currentPlan = plan;
        this.config.planProgress = plan.steps.map(s => ({
          step: s.step,
          action: s.action,
          completed: false,
          result: null
        }));
        
        return plan;
      }
    } catch (e) {
      console.warn('⚠️ Planning failed:', e.message);
      this.intelligenceActivity.explicitPlanning.active = false;
      console.log('📋 [INTELLIGENCE] Explicit Planning FAILED:', e.message);
      this.updateIntelStatusPanel();
    }
    
    this.intelligenceActivity.explicitPlanning.active = false;
    console.log('📋 [INTELLIGENCE] Explicit Planning COMPLETED');
    this.updateIntelStatusPanel();
    return null;
  }
  
  async reflectOnToolResult(toolName, toolResult, userQuery) {
    if (!this.config.enableExplicitReflection) return null;
    
    // Mark as active and log
    this.intelligenceActivity.explicitReflection.active = true;
    this.intelligenceActivity.explicitReflection.count++;
    this.intelligenceActivity.explicitReflection.lastRun = Date.now();
    console.log('🤔 [INTELLIGENCE] Explicit Reflection STARTED (Run #' + this.intelligenceActivity.explicitReflection.count + ')');
    this.updateIntelStatusPanel();
    
    console.log('🤔 Reflecting on tool result...');
    
    const reflectionPrompt = `You are analyzing a tool execution result. Reflect on what happened and decide next action.

User Query: ${userQuery}
Tool Used: ${toolName}
Result: ${toolResult.success ? toolResult.output.substring(0, 500) : 'Error: ' + toolResult.error}

Reflect:
1. Did this give me what I needed?
2. What did I learn?
3. What should I do next?

Respond with JSON: {"satisfied": true/false, "learning": "what I learned", "nextAction": "what to do next"}`;
    
    try {
      console.log('🤔 [DEBUG] Fetching from Ollama for reflection...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5-coder:14b',
          prompt: reflectionPrompt,
          options: { temperature: 0.3, num_predict: 256 },
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      console.log('🤔 [DEBUG] Got response from Ollama');
      
      const result = await response.json();
      console.log('🤔 [DEBUG] Response text length:', result.response?.length);
      
      const reflectionMatch = result.response.match(/\{[\s\S]*"satisfied"[\s\S]*\}/);
      
      if (reflectionMatch) {
        const reflection = JSON.parse(reflectionMatch[0]);
        console.log('🤔 Reflection:', reflection);
        
        // Store reflection for use in next iteration
        this.config.lastReflection = {
          tool: toolName,
          learning: reflection.learning,
          nextAction: reflection.nextAction,
          satisfied: reflection.satisfied,
          timestamp: Date.now()
        };
        
        // Mark as complete
        this.intelligenceActivity.explicitReflection.active = false;
        console.log('🤔 [INTELLIGENCE] Explicit Reflection COMPLETED');
        this.updateIntelStatusPanel();
        
        return reflection;
      }
    } catch (e) {
      console.warn('⚠️ Reflection failed:', e.message);
      this.intelligenceActivity.explicitReflection.active = false;
      console.log('🤔 [INTELLIGENCE] Explicit Reflection FAILED:', e.message);
      this.updateIntelStatusPanel();
    }
    
    this.intelligenceActivity.explicitReflection.active = false;
    console.log('🤔 [INTELLIGENCE] Explicit Reflection COMPLETED (no match)');
    this.updateIntelStatusPanel();
    return null;
  }
  
  async executeTool(toolName, params) {
    const startTime = Date.now();
    
    try {
      if (toolName === 'execute_code') {
        // Execute code through the backend execute-server /run endpoint
        let code = params.code || params.script;
        const runtime = params.language || this.config.environment.runtime || 'nodejs';
        
        // 🔧 AUTOMATIC FIX: Strip async IIFE wrapper if LLM added it
        // Matches: (async () => { ... })() or (async function() { ... })()
        const asyncIIFEPattern = /^\s*\(async\s*(?:\(\)\s*=>|function\s*\(\))\s*\{([\s\S]*)\}\)\s*\(\)\s*;?\s*$/;
        const asyncIIFEMatch = code.match(asyncIIFEPattern);
        
        if (asyncIIFEMatch) {
          code = asyncIIFEMatch[1].trim(); // Extract inner code
          console.log('🔧 [AUTO-FIX] Stripped async IIFE wrapper from LLM code');
          console.log('📝 [UNWRAPPED CODE]:', code.substring(0, 200));
        }
        
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
          
          // Note: require() is now supported - this should rarely trigger
          if (errorDetails.includes('already been declared')) {
            const fixedError = `❌ ERROR: Variable naming conflict detected.\n\n` +
              `This usually means you're trying to redeclare a variable.\n` +
              `Both patterns are supported:\n` +
              `  const axios = require('axios');  // ✅ Works\n` +
              `  const response = await axios.get(url);  // ✅ Also works\n\n` +
              `Check your code for duplicate variable declarations.`;
            
            return {
              success: false,
              output: '',
              error: fixedError,
              duration: Date.now() - startTime
            };
          }
          
          const fullError = errorLogs ? `${errorDetails}\n\nLogs:\n${errorLogs}` : errorDetails;
          
          // Track failure
          if (this.config.failureLog) {
            this.config.failureLog.push({
              tool: toolName,
              params: params,
              error: errorDetails,
              timestamp: Date.now()
            });
            
            // Keep only last 20 failures
            if (this.config.failureLog.length > 20) {
              this.config.failureLog = this.config.failureLog.slice(-20);
            }
            
            // Track consecutive failures for stuck detection
            this.config.recentFailures++;
            
            // Adaptive learning: track failures
            if (this.config.learningMetrics?.adaptiveLearning) {
              this.config.learningMetrics.recentFailureCount++;
              
              // If failing frequently, keep more failures (up to 30 for better learning)
              const failureRate = this.config.learningMetrics.recentFailureCount / 
                (this.config.learningMetrics.recentSuccessCount + this.config.learningMetrics.recentFailureCount || 1);
              
              const maxFailures = failureRate > 0.4 ? 30 : 20;
              
              if (this.config.failureLog.length > maxFailures) {
                this.config.failureLog = this.config.failureLog.slice(-maxFailures);
              }
            }
          }
          
          return {
            success: false,
            output: '',
            error: fullError,
            duration: Date.now() - startTime
          };
        }
        
        // Return the actual output
        let output = '';
        if (result.data) {
          output = JSON.stringify(result.data, null, 2);
        } else if (result.logs && result.logs.length > 0) {
          output = result.logs.join('\n');
        } else {
          output = 'Code executed successfully (no output)';
        }
        
        // Detect empty output - treat as FAILURE to force retry with console.log()
        if (output === 'Code executed successfully (no output)') {
          console.warn('⚠️ Code executed but produced no output - likely missing console.log()');
          
          // Store the failed code for the alert
          this.config.lastFailedCode = code;
          
          // Track as failure to trigger recovery strategies
          if (this.config.failureLog) {
            this.config.failureLog.push({
              tool: 'execute_code',
              params: params,
              code: code,  // Store the actual code
              error: 'Empty output - missing console.log()',
              timestamp: Date.now()
            });
            this.config.recentFailures++;
          }
          
          return {
            success: false,
            output: '',
            error: 'Code executed but produced NO OUTPUT. You must add console.log() to see results!\n\nExample fixes:\n• await page.content() → const html = await page.content(); console.log(html);\n• scrapeData() → const data = await scrapeData(); console.log(JSON.stringify(data));',
            duration: Date.now() - startTime
          };
        }
        
        // Reset failure counter on success
        this.config.recentFailures = 0;
        
        return {
          success: true,
          output: output,
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
        // Use DuckDuckGo search via execute_code backend
        const query = params.query;
        const searchCode = `
try {
  const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(${JSON.stringify(query)});
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const html = response.data;
  
  // Extract search results
  const results = [];
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\\/a>/g;
  
  let match;
  let count = 0;
  while ((match = resultRegex.exec(html)) && count < 5) {
    let rawUrl = match[1];
    const title = match[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    
    // Extract actual URL from DuckDuckGo redirect
    if (rawUrl.includes('uddg=')) {
      const urlMatch = rawUrl.match(/uddg=([^&]+)/);
      if (urlMatch) {
        rawUrl = decodeURIComponent(urlMatch[1]);
      }
    }
    
    // Clean up URL (add https if missing)
    if (rawUrl.startsWith('//')) {
      rawUrl = 'https:' + rawUrl;
    }
    
    results.push({ url: rawUrl, title });
    count++;
  }
  
  if (results.length === 0) {
    console.log('No results found for: ' + ${JSON.stringify(query)});
  } else {
    console.log('Found ' + results.length + ' results:\\n');
    results.forEach((r, i) => {
      console.log((i+1) + '. ' + r.title);
      console.log('   URL: ' + r.url + '\\n');
    });
  }
} catch (error) {
  console.log('Search error: ' + error.message);
}
`;

        try {
          const response = await fetch('http://localhost:3002/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: searchCode })
          });
          
          const result = await response.json();
          
          if (result.error) {
            return {
              success: false,
              error: `Search failed: ${result.error}`,
              duration: Date.now() - startTime
            };
          }
          
          let output = '';
          if (result.data) {
            output = JSON.stringify(result.data, null, 2);
          } else if (result.logs && result.logs.length > 0) {
            output = result.logs.join('\n');
          } else {
            output = 'Search completed (no results)';
          }
          
          return {
            success: true,
            output: output,
            duration: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: `Search execution failed: ${error.message}. Make sure execute server is running on port 3002.`,
            duration: Date.now() - startTime
          };
        }
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
    console.log('[Agent] Starting chat message with LangChain agent');
    
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
      content: '⏳ LangChain agent processing...',
      loading: true
    });
    this.renderChatInterface(container);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    const startTime = Date.now();
    
    try {
      // Call LangChain agent API
      const response = await fetch('http://localhost:3003/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: message,
          config: {
            model: this.config.model || 'qwen2.5-coder:14b',
            temperature: this.config.temperature,
            tools: this.config.tools,
            systemPrompt: this.config.systemPrompt
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`LangChain agent returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Remove loading message
      this.testConversation = this.testConversation.filter(msg => !msg.loading);
      
      if (result.success) {
        console.log('[Agent] LangChain result:', result.result);
        
        // Add assistant message with result
        this.testConversation.push({
          role: 'assistant',
          content: result.result,
          metadata: `\u23f1\ufe0f ${duration}ms \u2022 \ud83e\udd16 LangChain ReAct Agent`
        });
        
        // Track successful execution
        MetricsService.trackAgentExecution(
          this.config.name || 'Unnamed Agent',
          true,
          duration
        );
      } else {
        throw new Error(result.error || 'Unknown error from LangChain agent');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || String(error);
      const isAgentDown = errorMsg.includes('Failed to fetch') || errorMsg.includes('ECONNREFUSED');
      
      // Remove loading message
      this.testConversation = this.testConversation.filter(msg => !msg.loading);
      
      // Add error message
      this.testConversation.push({
        role: 'error',
        content: isAgentDown 
          ? '🚨 LangChain agent server is not running.\n\nStart it with:\ncd scraper-backend\nnpm run agent'
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
  
  // Deprecated - LangChain handles iteration internally
  async continueWithToolResults(container) {
    console.warn('continueWithToolResults is deprecated - LangChain handles autonomous iteration');
    return;
  }
}

/**
 * SDK Demo - Main Entry Point
 * 
 * Integrates all components into a unified AI Agent Control Center
 */

// Configure Monaco Editor environment BEFORE any imports
window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './monaco-editor/esm/vs/language/json/json.worker.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return './monaco-editor/esm/vs/language/css/css.worker.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return './monaco-editor/esm/vs/language/html/html.worker.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return './monaco-editor/esm/vs/language/typescript/ts.worker.js';
    }
    return './monaco-editor/esm/vs/editor/editor.worker.js';
  }
};

import { UniversalAgent, SystemCapabilityDetector } from 'universal-agent-sdk';
import { AgentEditor } from './src/components/AgentEditor.js';
import { ChatInterface } from './src/components/ChatInterface.js';
import { FileManager } from './src/components/FileManager.js';
import { ScraperBuilder } from './src/components/ScraperBuilder.js';
import { MetricsDashboard } from './src/components/MetricsDashboard.js';

// Global instances
let agentEditor = null;
let chatInterface = null;
let fileManager = null;
let scraperBuilder = null;
let metricsDashboard = null;
let currentAgentConfig = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  initializeComponents();
});

function initializeNavigation() {
  // Tab switching
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Update nav
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      const targetTab = document.getElementById(tab);
      if (targetTab) {
        targetTab.classList.add('active');
        
        // Initialize component if needed
        switch(tab) {
          case 'agent-editor':
            if (!agentEditor) initAgentEditor();
            break;
          case 'chat':
            if (!chatInterface) initChatInterface();
            break;
          case 'files':
            if (!fileManager) initFileManager();
            break;
          case 'scraper':
            if (!scraperBuilder) initScraperBuilder();
            break;
          case 'metrics':
            if (!metricsDashboard) initMetricsDashboard();
            break;
        }
      }
    });
  });
}

function initializeComponents() {
  // Initialize components lazily when tabs are clicked
  console.log('🚀 SDK Demo initialized - navigate through tabs to explore features');
}

function initAgentEditor() {
  console.log('Initializing Agent Editor...');
  agentEditor = new AgentEditor('agent-editor-container');
  
  // Update chat interface when agent config changes
  window.addEventListener('agent-config-updated', (e) => {
    currentAgentConfig = e.detail;
    if (chatInterface) {
      chatInterface.agentConfig = currentAgentConfig;
    }
  });
}

function initChatInterface() {
  console.log('Initializing Chat Interface...');
  
  // Use current agent config or default
  const config = currentAgentConfig || agentEditor?.getConfig() || {
    systemPrompt: 'You are a helpful AI assistant.',
    model: 'qwen2.5-coder:14b',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048
  };
  
  chatInterface = new ChatInterface('chat-container', config);
  window.chatInterface = chatInterface; // Expose for onclick handlers
}

function initFileManager() {
  console.log('Initializing File Manager...');
  fileManager = new FileManager('file-manager-container');
  window.fileManager = fileManager; // Expose for onclick handlers
}

function initMetricsDashboard() {
  console.log('Initializing Metrics Dashboard...');
  metricsDashboard = new MetricsDashboard('metrics-dashboard-container');
  metricsDashboard.render();
  window.metricsDashboard = metricsDashboard; // Expose globally
}

function initScraperBuilder() {
  console.log('Initializing Scraper Builder...');
  scraperBuilder = new ScraperBuilder('scraper-builder-container');
  window.scraperBuilder = scraperBuilder; // Expose for onclick handlers
}

// Existing hardware detection functionality
const detectHardwareBtn = document.getElementById('detect-hardware-btn');
if (detectHardwareBtn) {
  detectHardwareBtn.addEventListener('click', async () => {
    const btn = detectHardwareBtn;
    const loading = document.getElementById('hardware-loading');
    const results = document.getElementById('hardware-results');
    
    btn.disabled = true;
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    
    try {
      const detector = new SystemCapabilityDetector();
      const capabilities = await detector.detectAll();
      
      // Build results HTML
      let html = '<div class="result-section">';
      
      // Ollama
      html += '<h3>🦙 Ollama</h3>';
      html += '<div class="result-grid">';
      html += `<div class="result-card">
        <h4>Status</h4>
        <div class="result-value ${capabilities.ollama.available ? 'success' : 'danger'}">
          ${capabilities.ollama.available ? '✅ Available' : '❌ Not Available'}
        </div>
      </div>`;
      
      if (capabilities.ollama.available) {
        html += `<div class="result-card">
          <h4>Models</h4>
          <div class="result-value">${capabilities.ollama.models.length}</div>
        </div>`;
      }
      html += '</div>';
      
      if (capabilities.ollama.models.length > 0) {
        html += '<h4>Installed Models:</h4><ul>';
        capabilities.ollama.models.forEach(model => {
          html += `<li><strong>${model.name}</strong></li>`;
        });
        html += '</ul>';
      }
      html += '</div>';
      
      results.innerHTML = html;
      results.classList.remove('hidden');
    } catch (error) {
      results.innerHTML = `<div class="error">Error: ${error.message}</div>`;
      results.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  });
}

// Configuration preset testing
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const preset = btn.dataset.preset;
    const output = document.getElementById(`${preset}-output`);
    
    output.innerHTML = '<div class="loading">Testing preset...</div>';
    
    try {
      const agent = new UniversalAgent({
        mode: 'web-scraper',
        preset: preset
      });
      
      await agent.initialize();
      const estimates = await agent.getTokenEstimates();
      
      output.innerHTML = `
        <div class="preset-results">
          <div>Total Tokens: <strong>${estimates.total}</strong></div>
          <div>GPU Fit: ${estimates.fitsGPU ? '✅' : '❌'}</div>
          <div>CPU Risk: <span class="badge">${estimates.cpuRisk}</span></div>
        </div>
      `;
    } catch (error) {
      output.innerHTML = `<div class="error">${error.message}</div>`;
    }
  });
});

console.log('✅ SDK Demo Main Loaded');

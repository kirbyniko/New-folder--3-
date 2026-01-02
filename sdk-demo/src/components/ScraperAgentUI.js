/**
 * ScraperAgentUI - Quick-access agent for building web scrapers
 * Optimized for: Model selection, VRAM constraints, scraper context
 */

import { ContextSelector } from './ContextSelector.js';

export class ScraperAgentUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    
    // VRAM-based model presets
    this.vramPresets = {
      '8GB': { model: 'qwen2.5-coder:14b', temperature: 0.3, context: 8192 },
      '16GB': { model: 'mistral-nemo:12b-instruct-2407-q8_0', temperature: 0.3, context: 16384 },
      '24GB+': { model: 'qwen2.5-coder:70b', temperature: 0.3, context: 32768 }
    };
    
    // Default config
    this.config = {
      model: 'mistral-nemo:12b-instruct-2407-q8_0',
      temperature: 0.3,
      contextWindow: 8192,
      systemPrompt: this.getScraperSystemPrompt(),
      tools: ['execute_code', 'fetch_url', 'search_web'],
      context: 'general',
      contextKnowledge: ['scraper-guide'], // Default to scraper guide
      sessionId: null
    };
    
    this.conversation = [];
    this.availableModels = [];
    this.availableContexts = [];
    this.serverOnline = false;
    this.contextSelector = null;
    
    this.init();
  }
  
  getScraperSystemPrompt() {
    return `You are an expert web scraper. Use your tools to extract data from websites.

**Your Tools:**
- execute_code: Run Node.js with axios, cheerio, puppeteer pre-loaded
- fetch_url: Get raw HTML from URLs
- search_web: Find websites via DuckDuckGo

**Your Mission:**
When asked to scrape data, use execute_code to write and run the scraper immediately.

**Pattern:**
1. User: "Get top 5 Hacker News headlines"
2. You: Use execute_code with this code:
   const axios = require('axios');
   const cheerio = require('cheerio');
   const html = (await axios.get('https://news.ycombinator.com')).data;
   const $ = cheerio.load(html);
   const headlines = $('.titleline').slice(0, 5).map((i, el) => $(el).text()).get();
   console.log(headlines);

**CRITICAL:**
- ALWAYS use tools, never just describe code
- ALWAYS end execute_code with console.log() for output
- Extract data autonomously - never ask user for selectors
- If one approach fails, try another tool
- Keep trying until you succeed!`;
  }
  
  async init() {
    this.render();
    await this.checkServerStatus();
    await this.loadModels();
    
    // Initialize ContextSelector in header area
    const contextContainer = document.createElement('div');
    contextContainer.id = 'contextSelectorContainer';
    const header = this.container.querySelector('.scraper-header');
    header.after(contextContainer);
    
    this.contextSelector = new ContextSelector(contextContainer);
    
    // Listen for config changes
    this.contextSelector.onModelChange = (model) => {
      this.config.model = model;
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) modelSelect.value = model;
    };
    
    this.contextSelector.onContextChange = (context) => {
      this.config.context = context;
    };
    
    // Auto-check server every 10s
    setInterval(() => this.checkServerStatus(), 10000);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="scraper-agent-ui">
        <!-- Header -->
        <div class="scraper-header">
          <h1>🚀 Scraper Agent</h1>
          <div class="server-status" id="server-status">
            <span class="status-dot"></span>
            <span class="status-text">Checking...</span>
          </div>
        </div>
        <!-- Quick Config Panel -->
        <div class="quick-config">
          <div class="vram-presets">
            <label>🎯 Quick Setup (VRAM):</label>
            <div class="preset-buttons">
              <button class="preset-btn" data-vram="8GB">8GB</button>
              <button class="preset-btn" data-vram="16GB">16GB</button>
              <button class="preset-btn" data-vram="24GB+">24GB+</button>
            </div>
          </div>
          
          <div class="context-selector-compact">
            <label>🧠 Agent Knowledge:</label>
            <button id="context-popup-btn" class="popup-btn">Configure Context</button>
            <button id="new-session-btn" class="action-btn">New Session</button>
          </div>
          
          <div class="model-config-compact">
            <label>Model:</label>
            <select id="model-select"></select>
            <label style="margin-left: 16px;">Temp:</label>
            <input type="range" id="temperature-slider" 
                   min="0" max="1" step="0.1" value="0.3" style="width: 80px;">
            <span id="temp-value" style="margin-left: 8px;">0.3</span>
          </div>
        </div>
        
        <!-- Chat Interface -->
        <div class="chat-container">
          <div class="messages" id="messages">
            <div class="message system">
              <strong>🤖 Scraper Agent Ready</strong>
              <p>I'll help you build web scrapers. Try:</p>
              <ul>
                <li>"Get top 10 Hacker News headlines"</li>
                <li>"Scrape product prices from amazon.com"</li>
                <li>"Extract all article titles from techcrunch.com"</li>
              </ul>
            </div>
          </div>
          
          <div class="input-area">
            <textarea id="user-input" 
                      placeholder="Describe the scraper you need..."
                      rows="2"></textarea>
            <button id="send-btn" class="send-btn">
              🚀 Generate Scraper
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    // VRAM preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vram = btn.dataset.vram;
        this.applyVRAMPreset(vram);
        
        // Visual feedback
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // Context popup
    const contextPopupBtn = document.getElementById('context-popup-btn');
    if (contextPopupBtn) {
      contextPopupBtn.addEventListener('click', () => {
        this.showContextPopup();
      });
    }
    
    // New session button
    const newSessionBtn = document.getElementById('new-session-btn');
    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', async () => {
        await this.createNewSession();
      });
    }
    
    // Model selection
    const modelSelect = document.getElementById('model-select');
    modelSelect.addEventListener('change', (e) => {
      this.config.model = e.target.value;
    });
    
    // Temperature slider
    const tempSlider = document.getElementById('temperature-slider');
    const tempValue = document.getElementById('temp-value');
    tempSlider.addEventListener('input', (e) => {
      this.config.temperature = parseFloat(e.target.value);
      tempValue.textContent = e.target.value;
    });
    
    // Send button
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    
    sendBtn.addEventListener('click', () => this.sendMessage());
    userInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }
  
  applyVRAMPreset(vram) {
    const preset = this.vramPresets[vram];
    if (!preset) return;
    
    this.config.model = preset.model;
    this.config.temperature = preset.temperature;
    this.config.contextWindow = preset.context;
    
    // Update UI
    document.getElementById('model-select').value = preset.model;
    document.getElementById('temperature-slider').value = preset.temperature;
    document.getElementById('temp-value').textContent = preset.temperature;
  }
  
  async loadModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      this.availableModels = data.models || [];
      
      const modelSelect = document.getElementById('model-select');
      modelSelect.innerHTML = this.availableModels
        .map(model => `<option value="${model.name}">${model.name}</option>`)
        .join('');
      
      // Set current model
      modelSelect.value = this.config.model;
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }
  
  async createNewSession() {
    try {
      const response = await fetch('http://localhost:3003/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: this.config.context })
      });
      
      const data = await response.json();
      this.config.sessionId = data.sessionId;
      
      this.addMessage('system', `✅ New session created: ${data.sessionId}<br>Context: ${data.context}<br>Conversation history enabled.`);
    } catch (error) {
      this.addMessage('error', `Failed to create session: ${error.message}`);
    }
  }
  
  async clearSession() {
    if (!this.config.sessionId) return;
    
    try {
      await fetch(`http://localhost:3003/session/${this.config.sessionId}`, {
        method: 'DELETE'
      });
      
      this.config.sessionId = null;
      this.addMessage('system', '🗑️ Session cleared. Starting fresh.');
    } catch (error) {
      this.addMessage('error', `Failed to clear session: ${error.message}`);
    }
  }
  
  async checkServerStatus() {
    try {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      this.serverOnline = data.status === 'ok';
      this.updateServerStatus(true);
    } catch (error) {
      this.serverOnline = false;
      this.updateServerStatus(false);
    }
  }
  
  updateServerStatus(online) {
    const statusEl = document.getElementById('server-status');
    if (online) {
      statusEl.className = 'server-status online';
      statusEl.innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
    } else {
      statusEl.className = 'server-status offline';
      statusEl.innerHTML = '<span class="status-dot"></span><span class="status-text">Offline</span>';
    }
  }
  
  async loadModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      this.availableModels = data.models || [];
      
      const modelSelect = document.getElementById('model-select');
      modelSelect.innerHTML = this.availableModels
        .map(model => `<option value="${model.name}">${model.name}</option>`)
        .join('');
      
      // Set current model
      modelSelect.value = this.config.model;
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }
  
  async sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message) return;
    if (!this.serverOnline) {
      this.addMessage('error', '❌ Server offline. Start LangChain server first.');
      return;
    }
    
    // Clear input
    userInput.value = '';
    
    // Add user message
    this.addMessage('user', message);
    
    // Show loading with real progress (use 'progress' class for visibility)
    const loadingId = this.addMessage('progress', '⏳ Initializing agent...');
    
    try {
      const response = await fetch('http://localhost:3003/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: message,
          config: this.config
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            const loadingEl = document.getElementById(loadingId);
            
            if (data.type === 'gpu_status') {
              // Show GPU status prominently
              if (loadingEl) {
                const statusColor = data.usingGpu ? '#00ff00' : '#ff4444';
                const statusMsg = data.usingGpu 
                  ? `<span style="color: ${statusColor};">✓ GPU ACTIVE (${data.gpuLayers}/${data.totalLayers} layers)</span>`
                  : `<span style="color: ${statusColor};">⚠ WARNING: CPU FALLBACK - SLOW!</span>`;
                loadingEl.innerHTML = statusMsg;
              }
              // Also log to console for debugging
              console.log(data.usingGpu ? '✓ GPU ACTIVE' : '⚠ CPU FALLBACK DETECTED', data);
            } else if (data.type === 'step') {
              if (loadingEl) {
                loadingEl.innerHTML = `⏳ ${data.message} ${data.elapsed ? `[${data.elapsed}]` : ''}`;
              }
            } else if (data.type === 'tool_start') {
              if (loadingEl) {
                loadingEl.innerHTML = `🛠️ ${data.message} ${data.step ? `(Step ${data.step})` : ''} ${data.elapsed ? `[${data.elapsed}]` : ''}`;
              }
            } else if (data.type === 'tool_end') {
              if (loadingEl) {
                loadingEl.innerHTML = `✅ ${data.message} ${data.elapsed ? `[${data.elapsed}]` : ''}`;
              }
            } else if (data.type === 'llm_start') {
              if (loadingEl) {
                loadingEl.innerHTML = `🧠 ${data.message} ${data.elapsed ? `[${data.elapsed}]` : ''}`;
              }
            } else if (data.type === 'llm_token') {
              if (loadingEl) {
                loadingEl.innerHTML = `🧠 ${data.message} ${data.elapsed ? `[${data.elapsed}]` : ''}`;
              }
            } else if (data.type === 'llm_end') {
              if (loadingEl) {
                loadingEl.innerHTML = `✓ ${data.message} ${data.elapsed ? `[${data.elapsed}]` : ''}`;
              }
            } else if (data.type === 'complete') {
              this.removeMessage(loadingId);
              
              const result = data.result;
              this.addMessage('assistant', result.output || result.text || 'No response');
              
              if (result.steps || result.executionTime) {
                const metadata = `
                  <div class="metadata">
                    ${result.steps ? `Steps: ${result.steps}` : ''}
                    ${result.executionTime ? `Time: ${result.executionTime}ms` : ''}
                  </div>
                `;
                this.addMessage('system', metadata);
              }
            } else if (data.type === 'error') {
              this.removeMessage(loadingId);
              this.addMessage('error', `❌ Error: ${data.error}`);
            }
          }
        }
      }
      
    } catch (error) {
      this.removeMessage(loadingId);
      this.addMessage('error', `❌ Error: ${error.message}`);
    }
  }
  
  addMessage(type, content) {
    const messagesContainer = document.getElementById('messages');
    const messageId = `msg-${Date.now()}`;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.id = messageId;
    messageEl.innerHTML = typeof content === 'string' 
      ? content.replace(/\n/g, '<br>')
      : content;
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
  }
  
  removeMessage(messageId) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      messageEl.remove();
    }
  }
  
  showContextPopup() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'context-modal-overlay';
    modal.innerHTML = `
      <div class="context-modal">
        <div class="context-modal-header">
          <h3>🧠 Configure Agent Knowledge</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="context-modal-body">
          <p class="context-help">Select the knowledge areas your agent needs. Token estimates shown in parentheses.</p>
          
          <div class="context-checkboxes">
            <label class="context-checkbox">
              <input type="checkbox" value="scraper-builder" ${this.config.contextKnowledge?.includes('scraper-builder') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>🛠️ Scraper Builder (~800 tokens)</strong>
                <span>Build scrapers using Static HTML, JSON API, or Puppeteer patterns</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="puppeteer-expert" ${this.config.contextKnowledge?.includes('puppeteer-expert') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>🎭 Puppeteer Expert (~600 tokens)</strong>
                <span>Advanced browser automation for JavaScript-heavy sites</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="scraper-guide" ${this.config.contextKnowledge?.includes('scraper-guide') ? 'checked' : 'checked'}>
              <div class="checkbox-label">
                <strong>📚 SCRAPER_GUIDE_SHORT (~4,000 tokens)</strong>
                <span>State legislature scraping patterns and best practices</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="pdf-parser" ${this.config.contextKnowledge?.includes('pdf-parser') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>📄 PDF Agenda Parser (~1,200 tokens)</strong>
                <span>Extract bills, tags, and topics from legislative PDF agendas</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="agenda-summarizer" ${this.config.contextKnowledge?.includes('agenda-summarizer') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>✍️ Agenda Summarizer (~850 tokens)</strong>
                <span>Generate AI summaries of meeting agendas using Ollama</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="data-analyzer" ${this.config.contextKnowledge?.includes('data-analyzer') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>📊 Data Analyzer (~400 tokens)</strong>
                <span>Validate and analyze scraped data for quality</span>
              </div>
            </label>
            
            <label class="context-checkbox">
              <input type="checkbox" value="general-assistant" ${this.config.contextKnowledge?.includes('general-assistant') ? 'checked' : ''}>
              <div class="checkbox-label">
                <strong>🌐 General Assistant (~300 tokens)</strong>
                <span>Web research and information gathering</span>
              </div>
            </label>
          </div>
          
          <div class="token-warning" style="display: none; margin: 16px 0; padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; border-radius: 8px;">
            <strong style="color: #ffc107;">⚠️ Context Warning</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #ddd;"></p>
          </div>
          
          <div class="context-modal-footer">
            <button class="cancel-btn">Cancel</button>
            <button class="apply-btn">Apply</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Token estimation
    const tokenEstimates = {
      'scraper-builder': 800,
      'puppeteer-expert': 600,
      'scraper-guide': 4000,
      'pdf-parser': 1200,
      'agenda-summarizer': 850,
      'data-analyzer': 400,
      'general-assistant': 300
    };
    
    const updateTokenWarning = () => {
      const selected = Array.from(modal.querySelectorAll('.context-checkboxes input:checked'))
        .map(input => input.value);
      
      const totalTokens = 500 + selected.reduce((sum, area) => sum + (tokenEstimates[area] || 500), 0);
      const modelName = this.config.model || 'mistral-nemo:12b-instruct-2407-q8_0';
      
      // Get context window size
      const contextWindows = {
        'qwen2.5-coder:1.5b': 32768,
        'qwen2.5-coder:3b': 32768,
        'qwen2.5-coder:7b': 32768,
        'qwen2.5-coder:14b': 32768,
        'mistral-nemo:12b-instruct-2407-q8_0': 4096,
        'llama3.2:3b': 8192,
        'deepseek-coder-v2:16b': 16384
      };
      
      const maxTokens = contextWindows[modelName] || 4096;
      const usableTokens = Math.floor(maxTokens * 0.7); // Reserve 30% for response
      
      const warningDiv = modal.querySelector('.token-warning');
      const warningText = warningDiv.querySelector('p');
      
      if (totalTokens > usableTokens) {
        warningDiv.style.display = 'block';
        warningText.textContent = `${totalTokens} tokens exceeds ${usableTokens} usable (${modelName} has ${maxTokens} window). Switch to qwen2.5-coder:7b or reduce knowledge areas.`;
      } else {
        warningDiv.style.display = 'none';
      }
    };
    
    // Update warning on checkbox change
    modal.querySelectorAll('.context-checkboxes input').forEach(checkbox => {
      checkbox.addEventListener('change', updateTokenWarning);
    });
    
    // Initial warning check
    updateTokenWarning();
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('.apply-btn').addEventListener('click', () => {
      const selected = Array.from(modal.querySelectorAll('.context-checkboxes input:checked'))
        .map(input => input.value);
      
      this.config.contextKnowledge = selected;
      
      // Update button text
      const btn = document.getElementById('context-popup-btn');
      if (btn) {
        btn.textContent = selected.length > 0 
          ? `✓ ${selected.length} Knowledge Areas`
          : 'Configure Context';
      }
      
      // Show confirmation
      const totalTokens = 500 + selected.reduce((sum, area) => sum + (tokenEstimates[area] || 500), 0);
      this.addMessage('system', `
        <strong>Knowledge Updated</strong>
        <p>Enabled: ${selected.map(s => s.replace(/-/g, ' ')).join(', ')}</p>
        <p style="margin-top: 8px; font-size: 13px; opacity: 0.8;">Total estimated tokens: ${totalTokens}</p>
      `);
      
      modal.remove();
    });
    
    // Click overlay to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

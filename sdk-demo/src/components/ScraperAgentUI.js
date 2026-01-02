/**
 * ScraperAgentUI - Quick-access agent for building web scrapers
 * Optimized for: Model selection, VRAM constraints, scraper context
 */

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
      tools: ['execute_code', 'fetch_url', 'search_web']
    };
    
    this.conversation = [];
    this.availableModels = [];
    this.serverOnline = false;
    
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
          
          <div class="model-config">
            <div class="config-row">
              <label>Model:</label>
              <select id="model-select"></select>
            </div>
            
            <div class="config-row">
              <label>Temperature: <span id="temp-value">0.3</span></label>
              <input type="range" id="temperature-slider" 
                     min="0" max="1" step="0.1" value="0.3">
            </div>
            
            <div class="config-row">
              <label>Context Window:</label>
              <input type="number" id="context-window" 
                     value="8192" min="2048" max="32768" step="1024">
            </div>
          </div>
          
          <div class="tools-config">
            <label>Tools:</label>
            <div class="tool-checkboxes">
              <label><input type="checkbox" value="execute_code" checked> execute_code</label>
              <label><input type="checkbox" value="fetch_url" checked> fetch_url</label>
              <label><input type="checkbox" value="search_web" checked> search_web</label>
            </div>
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
    
    // Context window
    const contextInput = document.getElementById('context-window');
    contextInput.addEventListener('change', (e) => {
      this.config.contextWindow = parseInt(e.target.value);
    });
    
    // Tool checkboxes
    document.querySelectorAll('.tool-checkboxes input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.config.tools = Array.from(
          document.querySelectorAll('.tool-checkboxes input:checked')
        ).map(cb => cb.value);
      });
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
    document.getElementById('context-window').value = preset.context;
    
    this.addMessage('system', `✅ Applied ${vram} preset: ${preset.model} (temp ${preset.temperature}, context ${preset.context})`);
  }
  
  async checkServerStatus() {
    try {
      const response = await fetch('http://localhost:3003/health');
      if (response.ok) {
        this.serverOnline = true;
        this.updateServerStatus(true);
      } else {
        throw new Error('Server returned non-OK status');
      }
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
    
    // Show loading with progress updates
    const loadingId = this.addMessage('assistant', '⏳ Initializing agent...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout
      
      // Update loading message every 3 seconds
      const progressInterval = setInterval(() => {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
          const messages = [
            '⏳ Analyzing task...',
            '🔍 Planning scraper...',
            '🛠️ Generating code...',
            '⚙️ Selecting tools...',
            '🚀 Building scraper...'
          ];
          const randomMsg = messages[Math.floor(Math.random() * messages.length)];
          loadingEl.innerHTML = randomMsg;
        }
      }, 3000);
      
      const response = await fetch('http://localhost:3003/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: message,
          config: this.config
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Add agent response
      this.addMessage('assistant', result.output || result.text || 'No response');
      
      // Show metadata
      if (result.steps || result.executionTime) {
        const metadata = `
          <div class="metadata">
            ${result.steps ? `Steps: ${result.steps}` : ''}
            ${result.executionTime ? `Time: ${result.executionTime}ms` : ''}
          </div>
        `;
        this.addMessage('system', metadata);
      }
      
    } catch (error) {
      this.removeMessage(loadingId);
      if (error.name === 'AbortError') {
        this.addMessage('error', `❌ Request timeout after 5 minutes`);
      } else {
        this.addMessage('error', `❌ Error: ${error.message}`);
      }
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
}

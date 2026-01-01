/**
 * LangChain Agent UI
 * Clean, minimal interface for LangChain-powered agents
 * 
 * Features:
 * - Simple chat interface
 * - Model selection
 * - Tool configuration
 * - Temperature control
 * - System prompt editing
 */

export class LangChainAgentUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.config = {
      model: 'qwen2.5-coder:14b',
      temperature: 0.7,
      systemPrompt: `You are a helpful AI assistant with access to tools for web scraping, code execution, and web search.

When given a task:
1. Break it down into steps
2. Use the appropriate tools
3. Combine results to answer the question

Available tools:
- execute_code: Run Node.js code (axios, cheerio, puppeteer pre-loaded)
- fetch_url: Fetch and parse web pages
- search_web: Search using DuckDuckGo`,
      tools: ['execute_code', 'fetch_url', 'search_web']
    };
    this.conversation = [];
    this.availableModels = [];
    
    this.init();
  }
  
  async init() {
    await this.loadModels();
    this.render();
    this.attachEventListeners();
  }
  
  async loadModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      this.availableModels = data.models || [];
      console.log(`📦 Loaded ${this.availableModels.length} Ollama models`);
    } catch (error) {
      console.warn('Could not load Ollama models:', error);
      this.availableModels = [
        { name: 'qwen2.5-coder:14b' },
        { name: 'qwen2.5-coder:32b' },
        { name: 'llama3.2' }
      ];
    }
  }
  
  render() {
    this.container.innerHTML = `
      <div class="langchain-agent-ui">
        <div class="agent-header">
          <h2>🦜 LangChain Agent</h2>
          <div class="server-status" id="server-status">
            <span class="status-dot"></span>
            <span class="status-text">Checking...</span>
          </div>
        </div>
        
        <div class="agent-layout">
          <!-- Configuration Panel -->
          <div class="config-panel">
            <h3>⚙️ Configuration</h3>
            
            <div class="config-group">
              <label>
                <span>🤖 Model</span>
                <select id="model-select">
                  ${this.availableModels.map(model => `
                    <option value="${model.name}" ${model.name === this.config.model ? 'selected' : ''}>
                      ${model.name}
                    </option>
                  `).join('')}
                </select>
              </label>
            </div>
            
            <div class="config-group">
              <label>
                <span>🌡️ Temperature: <strong id="temp-value">${this.config.temperature}</strong></span>
                <input type="range" id="temperature-slider" 
                       min="0" max="1" step="0.1" 
                       value="${this.config.temperature}">
                <small>0 = deterministic, 1 = creative</small>
              </label>
            </div>
            
            <div class="config-group">
              <label>
                <span>🛠️ Tools</span>
                <div class="tools-checklist">
                  <label>
                    <input type="checkbox" value="execute_code" 
                           ${this.config.tools.includes('execute_code') ? 'checked' : ''}>
                    execute_code - Run Node.js
                  </label>
                  <label>
                    <input type="checkbox" value="fetch_url"
                           ${this.config.tools.includes('fetch_url') ? 'checked' : ''}>
                    fetch_url - Scrape web pages
                  </label>
                  <label>
                    <input type="checkbox" value="search_web"
                           ${this.config.tools.includes('search_web') ? 'checked' : ''}>
                    search_web - DuckDuckGo
                  </label>
                </div>
              </label>
            </div>
            
            <div class="config-group">
              <label>
                <span>📝 System Prompt</span>
                <textarea id="system-prompt" rows="8">${this.config.systemPrompt}</textarea>
              </label>
            </div>
            
            <button id="save-config-btn" class="btn-secondary">
              💾 Save Configuration
            </button>
          </div>
          
          <!-- Chat Panel -->
          <div class="chat-panel">
            <div class="chat-messages" id="chat-messages">
              ${this.renderMessages()}
            </div>
            
            <div class="chat-input-container">
              <textarea id="chat-input" 
                        placeholder="Ask anything... (e.g., 'Get top 5 Hacker News headlines')"
                        rows="3"></textarea>
              <button id="send-btn" class="btn-primary">
                🚀 Send
              </button>
              <button id="clear-btn" class="btn-secondary">
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderMessages() {
    if (this.conversation.length === 0) {
      return `
        <div class="welcome-message">
          <h3>👋 Welcome to LangChain Agent!</h3>
          <p>This agent can:</p>
          <ul>
            <li>🌐 Scrape websites and extract data</li>
            <li>💻 Execute Node.js code</li>
            <li>🔍 Search the web</li>
            <li>🔗 Chain multiple tools together</li>
          </ul>
          <p><strong>Try asking:</strong></p>
          <ul>
            <li>"Get the top 5 headlines from Hacker News"</li>
            <li>"Search for React documentation and extract the installation command"</li>
            <li>"Write code to calculate the first 10 Fibonacci numbers"</li>
          </ul>
        </div>
      `;
    }
    
    return this.conversation.map((msg, idx) => {
      const roleClass = msg.role === 'user' ? 'user-message' : 
                       msg.role === 'error' ? 'error-message' : 'assistant-message';
      const icon = msg.role === 'user' ? '👤' : 
                   msg.role === 'error' ? '🚨' : '🤖';
      const loading = msg.loading ? ' loading' : '';
      
      return `
        <div class="message ${roleClass}${loading}" data-index="${idx}">
          <div class="message-header">
            <span class="message-icon">${icon}</span>
            <span class="message-role">${msg.role}</span>
            ${msg.metadata ? `<span class="message-metadata">${msg.metadata}</span>` : ''}
          </div>
          <div class="message-content">${this.formatContent(msg.content)}</div>
        </div>
      `;
    }).join('');
  }
  
  formatContent(content) {
    // Escape HTML
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Convert markdown-style code blocks
    return escaped
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
  
  attachEventListeners() {
    // Model selection
    const modelSelect = this.container.querySelector('#model-select');
    modelSelect?.addEventListener('change', (e) => {
      this.config.model = e.target.value;
      console.log('Model changed to:', this.config.model);
    });
    
    // Temperature slider
    const tempSlider = this.container.querySelector('#temperature-slider');
    const tempValue = this.container.querySelector('#temp-value');
    tempSlider?.addEventListener('input', (e) => {
      this.config.temperature = parseFloat(e.target.value);
      if (tempValue) tempValue.textContent = this.config.temperature;
    });
    
    // Tools checkboxes
    const toolsCheckboxes = this.container.querySelectorAll('.tools-checklist input[type="checkbox"]');
    toolsCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const tool = e.target.value;
        if (e.target.checked) {
          if (!this.config.tools.includes(tool)) {
            this.config.tools.push(tool);
          }
        } else {
          this.config.tools = this.config.tools.filter(t => t !== tool);
        }
        console.log('Tools updated:', this.config.tools);
      });
    });
    
    // System prompt
    const systemPrompt = this.container.querySelector('#system-prompt');
    systemPrompt?.addEventListener('change', (e) => {
      this.config.systemPrompt = e.target.value;
    });
    
    // Save configuration
    const saveBtn = this.container.querySelector('#save-config-btn');
    saveBtn?.addEventListener('click', () => {
      localStorage.setItem('langchain-agent-config', JSON.stringify(this.config));
      this.showToast('✅ Configuration saved!');
    });
    
    // Send message
    const sendBtn = this.container.querySelector('#send-btn');
    const chatInput = this.container.querySelector('#chat-input');
    
    const sendMessage = async () => {
      const message = chatInput?.value.trim();
      if (!message) return;
      
      chatInput.value = '';
      await this.sendMessage(message);
    };
    
    sendBtn?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Clear conversation
    const clearBtn = this.container.querySelector('#clear-btn');
    clearBtn?.addEventListener('click', () => {
      if (confirm('Clear conversation?')) {
        this.conversation = [];
        this.updateMessages();
      }
    });
    
    // Check server status
    this.checkServerStatus();
    setInterval(() => this.checkServerStatus(), 5000);
  }
  
  async sendMessage(message) {
    console.log('[LangChain] Sending message:', message);
    
    // Add user message
    this.conversation.push({
      role: 'user',
      content: message
    });
    this.updateMessages();
    
    // Add loading indicator
    this.conversation.push({
      role: 'assistant',
      content: '⏳ LangChain agent processing...',
      loading: true
    });
    this.updateMessages();
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3003/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: message,
          config: {
            model: this.config.model,
            temperature: this.config.temperature,
            tools: this.config.tools,
            systemPrompt: this.config.systemPrompt
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Remove loading message
      this.conversation = this.conversation.filter(msg => !msg.loading);
      
      if (result.success) {
        this.conversation.push({
          role: 'assistant',
          content: result.output || result.result || 'No output',
          metadata: `⏱️ ${duration}ms`
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Remove loading message
      this.conversation = this.conversation.filter(msg => !msg.loading);
      
      const isServerDown = error.message.includes('Failed to fetch') || 
                          error.message.includes('ECONNREFUSED');
      
      this.conversation.push({
        role: 'error',
        content: isServerDown 
          ? `🚨 LangChain server not running!\n\nStart it with:\ncd scraper-backend\nnpm run agent`
          : `Error: ${error.message}`,
        metadata: `⏱️ ${duration}ms`
      });
    }
    
    this.updateMessages();
  }
  
  updateMessages() {
    const messagesContainer = this.container.querySelector('#chat-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = this.renderMessages();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  async checkServerStatus() {
    const statusElement = this.container.querySelector('#server-status');
    if (!statusElement) return;
    
    try {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      
      if (data.status === 'ok') {
        statusElement.className = 'server-status online';
        statusElement.innerHTML = `
          <span class="status-dot"></span>
          <span class="status-text">Online</span>
        `;
      } else {
        throw new Error('Unhealthy');
      }
    } catch (error) {
      statusElement.className = 'server-status offline';
      statusElement.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">Offline</span>
      `;
    }
  }
  
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

/**
 * Unified AI Agent Studio
 * 
 * Single-page interface inspired by the Chrome extension
 * - Context files integrated into sidebar
 * - Iterative conversation with pause/continue
 * - Agent modes switch seamlessly
 * - File uploads and code generation in one flow
 */

import { UniversalAgent } from 'universal-agent-sdk';
import MetricsService from './src/services/MetricsService.js';

class AgentStudio {
  constructor() {
    this.currentConversation = null;
    this.contextFiles = [];
    this.messages = [];
    this.isGenerating = false;
    this.currentStream = null;
    
    this.config = {
      model: 'qwen2.5-coder:32b',
      temperature: 0.7,
      maxTokens: 4096,
      mode: 'general',
      systemPrompt: this.getSystemPrompt('general'),
      iterativeMode: false,
      longMode: false,
      ragEnabled: true,
      maxIterations: 5
    };
    
    // Initialize UniversalAgent with proper config
    this.agent = new UniversalAgent({
      mode: 'chat',
      name: 'AgentStudio',
      preset: 'balanced',
      streaming: true,
      modelPreferences: {
        primary: 'ollama',
        fallback: 'webgpu'
      },
      modelConfig: {
        models: {
          primary: this.config.model
        }
      }
    });

    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadConversations();
    this.loadModels();
  }

  attachEventListeners() {
    // New chat
    document.getElementById('new-chat-btn').addEventListener('click', () => this.newChat());

    // Iterative mode toggle
    document.getElementById('iterative-mode')?.addEventListener('change', (e) => {
      this.config.iterativeMode = e.target.checked;
      // Show/hide iterations control
      const iterationsControl = document.getElementById('iterations-control');
      if (iterationsControl) {
        iterationsControl.style.display = e.target.checked ? 'block' : 'none';
      }
      this.updateTokenEstimate();
    });

    // Long mode toggle
    document.getElementById('long-mode')?.addEventListener('change', (e) => {
      this.config.longMode = e.target.checked;
      if (e.target.checked) {
        this.config.maxTokens = 8192;
        document.getElementById('max-tokens').value = 8192;
        document.getElementById('tokens-value').textContent = '8192';
      }
      this.updateTokenEstimate();
    });

    // RAG toggle
    document.getElementById('rag-enabled')?.addEventListener('change', (e) => {
      this.config.ragEnabled = e.target.checked;
      this.updateTokenEstimate();
    });

    // Max iterations
    document.getElementById('max-iterations')?.addEventListener('change', (e) => {
      this.config.maxIterations = parseInt(e.target.value);
      document.getElementById('iterations-value').textContent = e.target.value;
      this.updateTokenEstimate();
    });

    // Agent mode
    document.getElementById('agent-mode').addEventListener('change', (e) => {
      this.config.mode = e.target.value;
      this.config.systemPrompt = this.getSystemPrompt(e.target.value);
    });

    // Model selection
    document.getElementById('model-select').addEventListener('change', (e) => {
      this.config.model = e.target.value;
    });

    // Temperature
    document.getElementById('temperature').addEventListener('input', (e) => {
      this.config.temperature = parseFloat(e.target.value);
      document.getElementById('temp-value').textContent = e.target.value;
    });

    // Max tokens
    document.getElementById('max-tokens').addEventListener('input', (e) => {
      this.config.maxTokens = parseInt(e.target.value);
      document.getElementById('tokens-value').textContent = e.target.value;
    });

    // File upload
    document.getElementById('add-files-btn').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files);
    });

    // Toolbar buttons
    document.getElementById('attach-btn').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });

    document.getElementById('stop-btn').addEventListener('click', () => this.stopGeneration());
    document.getElementById('regenerate-btn').addEventListener('click', () => this.regenerateResponse());

    // Send message
    document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
    
    const input = document.getElementById('message-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Update token estimate on input
    input.addEventListener('input', () => {
      this.updateTokenEstimate();
    });

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prompt = e.target.dataset.prompt;
        document.getElementById('message-input').value = prompt;
        document.getElementById('message-input').focus();
      });
    });
  }

  async loadModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      
      const select = document.getElementById('model-select');
      select.innerHTML = '';
      
      data.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        select.appendChild(option);
      });

      if (data.models.length > 0) {
        this.config.model = data.models[0].name;
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  getSystemPrompt(mode) {
    const prompts = {
      'general': 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
      'code-generator': 'You are an expert software engineer. Write clean, efficient, well-documented code. Explain your implementation choices.',
      'web-scraper': 'You are a web scraping specialist. Generate production-ready scraper code using Puppeteer or Cheerio. Include error handling and data validation.',
      'data-analyst': 'You are a data analyst. Analyze data thoroughly, identify patterns, and provide actionable insights with visualizations when appropriate.',
      'content-writer': 'You are a professional content writer. Create engaging, well-structured content optimized for the target audience.'
    };
    return prompts[mode] || prompts['general'];
  }

  async handleFileUpload(files) {
    for (const file of files) {
      const content = await file.text();
      this.contextFiles.push({
        name: file.name,
        content: content,
        size: file.size,
        type: file.type
      });
    }
    this.renderContextFiles();
  }

  renderContextFiles() {
    const container = document.getElementById('context-files-list');
    
    if (this.contextFiles.length === 0) {
      container.innerHTML = '<div class="empty-state">No files added</div>';
      return;
    }

    container.innerHTML = this.contextFiles.map((file, index) => `
      <div class="context-file-item">
        <div class="file-icon">📄</div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
        </div>
        <button class="file-remove" data-index="${index}">✖</button>
      </div>
    `).join('');

    // Remove file handlers
    container.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.contextFiles.splice(index, 1);
        this.renderContextFiles();
      });
    });
  }

  async sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || this.isGenerating) return;

    // Clear welcome message
    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    // Add user message
    this.addMessage('user', message);
    this.messages.push({ role: 'user', content: message });
    
    input.value = '';
    this.isGenerating = true;
    this.updateStatus('Generating...', 'generating');

    // Show stop button
    document.getElementById('stop-btn').style.display = 'block';
    document.getElementById('send-btn').disabled = true;

    // Build context
    let contextPrompt = this.config.systemPrompt;
    
    if (this.contextFiles.length > 0) {
      contextPrompt += '\n\nContext Files:\n';
      this.contextFiles.forEach(file => {
        contextPrompt += `\n--- ${file.name} ---\n${file.content}\n`;
      });
    }

    // Build conversation history
    const conversationHistory = this.messages.slice(-10).map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    const fullPrompt = `${contextPrompt}\n\n${conversationHistory}\n\nAssistant:`;

    const startTime = Date.now();
    
    try {
      let fullResponse = '';
      
      // Check if iterative mode is enabled
      if (this.config.iterativeMode) {
        const assistantMessageEl = this.addMessage('assistant', '🔄 Starting iterative refinement...');
        fullResponse = await this.sendMessageIterative(message);
        
        // Update final response
        const contentEl = assistantMessageEl.querySelector('.message-content');
        contentEl.innerHTML = `
          <div style="margin-bottom: 12px; padding: 10px; background: #dbeafe; border-left: 3px solid #3b82f6; border-radius: 4px;">
            <strong>✨ Final Refined Result (${this.config.maxIterations} iterations)</strong>
          </div>
          ${this.formatMessage(fullResponse)}
        `;
        
      } else if (this.config.longMode) {
        // Long mode: extended context processing
        const assistantMessageEl = this.addMessage('assistant', '📚 Processing with extended context...');
        fullResponse = await this.sendMessageLongMode(message);
        
        const contentEl = assistantMessageEl.querySelector('.message-content');
        contentEl.innerHTML = `
          <div style="margin-bottom: 12px; padding: 10px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">
            <strong>📖 Long Mode Response (Extended Context)</strong>
          </div>
          ${this.formatMessage(fullResponse)}
        `;
        
      } else {
        // Standard streaming mode
      // Stream response
      const assistantMessageEl = this.addMessage('assistant', '');
      const contentEl = assistantMessageEl.querySelector('.message-content');
      const assistantMessageEl = this.addMessage('assistant', '');
      const contentEl = assistantMessageEl.querySelector('.message-content');
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: fullPrompt,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens
          },
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              contentEl.innerHTML = this.formatMessage(fullResponse);
              this.scrollToBottom();
            }
          } catch (e) {}
        }
      }
      }

      this.messages.push({ role: 'assistant', content: fullResponse });
      
      // Track metrics
      const duration = Date.now() - startTime;
      const tokens = Math.ceil(fullResponse.split(/\s+/).length * 1.3);
      MetricsService.trackTokens(tokens, this.config.model);
      MetricsService.trackResponseTime(duration, this.config.model);
      MetricsService.trackConversation('success');
      MetricsService.trackModelUsage(this.config.model);

      this.updateStats();
      this.saveConversation();
      this.updateStatus('Ready', 'ready');

    } catch (error) {
      console.error('Generation error:', error);
      this.updateStatus('Error', 'error');
      MetricsService.trackConversation('failed');
    } finally {
      this.isGenerating = false;
      document.getElementById('stop-btn').style.display = 'none';
      document.getElementById('regenerate-btn').style.display = 'block';
      document.getElementById('send-btn').disabled = false;
    }
  }

  stopGeneration() {
    this.isGenerating = false;
    if (this.currentStream) {
      this.currentStream.cancel();
    }
    this.updateStatus('Stopped', 'ready');
    document.getElementById('stop-btn').style.display = 'none';
    document.getElementById('send-btn').disabled = false;
  }

  regenerateResponse() {
    if (this.messages.length < 2) return;
    
    // Remove last assistant message
    this.messages.pop();
    const container = document.getElementById('messages-container');
    container.lastChild.remove();
    
    // Re-trigger with last user message
    const lastUserMessage = this.messages[this.messages.length - 1];
    document.getElementById('message-input').value = lastUserMessage.content;
    this.messages.pop(); // Remove the user message too since sendMessage will re-add it
    
    this.sendMessage();
    
    MetricsService.trackConversation('regenerated');
  }

  addMessage(role, content) {
    const container = document.getElementById('messages-container');
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${role}`;
    
    messageEl.innerHTML = `
      <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="message-bubble">
        <div class="message-content">${this.formatMessage(content)}</div>
        ${role === 'assistant' ? `
          <div class="message-actions">
            <button class="message-action" onclick="navigator.clipboard.writeText(this.closest('.message-bubble').querySelector('.message-content').textContent)">
              📋 Copy
            </button>
          </div>
        ` : ''}
      </div>
    `;
    
    container.appendChild(messageEl);
    this.scrollToBottom();
    
    return messageEl;
  }

  formatMessage(text) {
    return text
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => 
        `<pre><code class="language-${lang || 'plaintext'}">${this.escapeHtml(code)}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
  }

  updateStatus(text, state) {
    document.getElementById('status-text').textContent = text;
    const indicator = document.getElementById('status-indicator');
    indicator.className = `status-indicator status-${state}`;
  }

  updateStats() {
    const totalTokens = this.messages.reduce((sum, msg) => 
      sum + Math.ceil(msg.content.split(/\s+/).length * 1.3), 0);
    
    document.getElementById('tokens-used').textContent = totalTokens.toLocaleString();
    document.getElementById('messages-count').textContent = this.messages.length;
  }

  newChat() {
    if (this.messages.length > 0) {
      this.saveConversation();
    }
    
    this.messages = [];
    this.contextFiles = [];
    this.currentConversation = null;
    
    const container = document.getElementById('messages-container');
    container.innerHTML = `
      <div class="welcome-message">
        <h1>👋 Welcome to AI Agent Studio</h1>
        <p>Your local LLM control center with full context awareness</p>
        <div class="quick-actions">
          <button class="quick-action" data-prompt="Help me build a web scraper for [URL]">
            🕷️ Build Web Scraper
          </button>
          <button class="quick-action" data-prompt="Review and improve this code">
            💻 Code Review
          </button>
          <button class="quick-action" data-prompt="Analyze this data and create visualizations">
            📊 Data Analysis
          </button>
          <button class="quick-action" data-prompt="Write a technical article about">
            ✍️ Content Writing
          </button>
        </div>
      </div>
    `;

    // Re-attach quick action listeners
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prompt = e.target.dataset.prompt;
        document.getElementById('message-input').value = prompt;
        document.getElementById('message-input').focus();
      });
    });

    this.renderContextFiles();
    this.updateStats();
    document.getElementById('regenerate-btn').style.display = 'none';
  }

  saveConversation() {
    if (this.messages.length === 0) return;

    const conversation = {
      id: this.currentConversation || Date.now(),
      timestamp: Date.now(),
      messages: this.messages,
      config: this.config,
      contextFiles: this.contextFiles.map(f => ({ name: f.name, size: f.size }))
    };

    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    // Keep only last 50 conversations
    if (conversations.length > 50) {
      conversations.splice(50);
    }

    localStorage.setItem('conversations', JSON.stringify(conversations));
    this.loadConversations();
  }

  loadConversations() {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const container = document.getElementById('conversations-list');
    
    if (conversations.length === 0) {
      container.innerHTML = '<div class="empty-state">No conversations yet</div>';
      return;
    }

    container.innerHTML = conversations.slice(0, 10).map(conv => {
      const date = new Date(conv.timestamp);
      const preview = conv.messages[0]?.content.substring(0, 50) + '...';
      
      return `
        <div class="conversation-item" data-id="${conv.id}">
          <div class="conversation-preview">${preview}</div>
          <div class="conversation-date">${date.toLocaleDateString()}</div>
        </div>
      `;
    }).join('');

    // Load conversation handlers
    container.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        this.loadConversation(id);
      });
    });
  }

  loadConversation(id) {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const conversation = conversations.find(c => c.id === id);
    
    if (!conversation) return;

    this.currentConversation = id;
    this.messages = conversation.messages;
    this.config = { ...this.config, ...conversation.config };
    
    // Clear and render messages
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    this.messages.forEach(msg => {
      this.addMessage(msg.role, msg.content);
    });

    this.updateStats();
    document.getElementById('regenerate-btn').style.display = 'block';
  }

  updateTokenEstimate() {
    const input = document.getElementById('message-input');
    const message = input?.value || '';
    
    // Estimate tokens (rough: 1 word ≈ 1.3 tokens)
    let estimatedTokens = Math.ceil(message.split(/\s+/).length * 1.3);
    
    // Add context files
    this.contextFiles.forEach(file => {
      estimatedTokens += Math.ceil((file.content.length / 4) * 1.3);
    });
    
    // Add conversation history (last 10 messages)
    const historyTokens = this.messages.slice(-10).reduce((sum, m) => {
      return sum + Math.ceil(m.content.split(/\s+/).length * 1.3);
    }, 0);
    estimatedTokens += historyTokens;
    
    // Add system prompt
    estimatedTokens += Math.ceil(this.config.systemPrompt.split(/\s+/).length * 1.3);
    
    // Add RAG overhead if enabled
    if (this.config.ragEnabled) {
      estimatedTokens += 500; // RAG context overhead
    }
    
    // Output tokens (max tokens setting)
    const outputTokens = this.config.maxTokens;
    
    // Multiply by iterations if iterative mode
    let totalTokens = estimatedTokens + outputTokens;
    if (this.config.iterativeMode) {
      totalTokens *= this.config.maxIterations;
    }
    
    // Long mode adds extra context
    if (this.config.longMode) {
      totalTokens += 2000; // Long mode context overhead
    }
    
    // Update UI
    const estimateEl = document.getElementById('token-estimate');
    if (estimateEl) {
      estimateEl.innerHTML = `
        <strong>Estimated Cost:</strong><br>
        Input: ~${estimatedTokens.toLocaleString()} tokens<br>
        Output: ~${outputTokens.toLocaleString()} tokens<br>
        ${this.config.iterativeMode ? `Iterations: ${this.config.maxIterations}x<br>` : ''}
        ${this.config.longMode ? 'Long Mode: +2K tokens<br>' : ''}
        ${this.config.ragEnabled ? 'RAG: +500 tokens<br>' : ''}
        <span style="color: #6366f1; font-weight: 600;">Total: ~${totalTokens.toLocaleString()} tokens</span>
      `;
    }
  }

  async sendMessageIterative(message) {
    // Iterative mode: multiple refinement iterations
    const iterations = [];
    let currentPrompt = message;
    let previousResponse = '';
    
    for (let i = 0; i < this.config.maxIterations; i++) {
      this.updateStatus(`Iteration ${i + 1}/${this.config.maxIterations}...`, 'generating');
      
      // Build iterative prompt
      let iterativePrompt = this.config.systemPrompt + '\n\n';
      
      if (i === 0) {
        iterativePrompt += `Task: ${currentPrompt}\n\nProvide your initial solution.`;
      } else {
        iterativePrompt += `Task: ${message}\n\nPrevious attempt:\n${previousResponse}\n\nAnalyze the previous attempt and provide an improved solution. Focus on: accuracy, completeness, and quality.`;
      }
      
      // Add context files
      if (this.contextFiles.length > 0) {
        iterativePrompt += '\n\nContext Files:\n';
        this.contextFiles.forEach(file => {
          iterativePrompt += `\n--- ${file.name} ---\n${file.content}\n`;
        });
      }
      
      // Add RAG if enabled
      if (this.config.ragEnabled) {
        iterativePrompt += '\n\nRAG Context: [Relevant knowledge from previous conversations and context]\n';
      }
      
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            prompt: iterativePrompt,
            options: {
              temperature: Math.max(0.3, this.config.temperature - (i * 0.1)), // Reduce randomness each iteration
              num_predict: this.config.maxTokens
            },
            stream: false
          })
        });
        
        const data = await response.json();
        previousResponse = data.response;
        
        iterations.push({
          iteration: i + 1,
          response: previousResponse,
          timestamp: new Date().toISOString()
        });
        
        // Show iteration in UI
        const iterationEl = document.createElement('div');
        iterationEl.className = 'iteration-result';
        iterationEl.style.cssText = 'margin: 8px 0; padding: 12px; background: #f0fdf4; border-left: 3px solid #10b981; border-radius: 4px;';
        iterationEl.innerHTML = `
          <div style="font-weight: 600; color: #059669; margin-bottom: 8px;">🔄 Iteration ${i + 1}</div>
          <div style="font-size: 13px; color: #374151;">${this.formatMessage(previousResponse.substring(0, 200))}${previousResponse.length > 200 ? '...' : ''}</div>
        `;
        
        const container = document.getElementById('messages-container');
        const lastMessage = container.lastElementChild;
        if (lastMessage) {
          lastMessage.querySelector('.message-content').appendChild(iterationEl);
        }
        
        this.scrollToBottom();
        
      } catch (error) {
        console.error(`Iteration ${i + 1} failed:`, error);
        break;
      }
    }
    
    return previousResponse;
  }

  async sendMessageLongMode(message) {
    // Long mode: extended context with chunked processing
    this.updateStatus('Processing in Long Mode (extended context)...', 'generating');
    
    // Build comprehensive context
    let longPrompt = this.config.systemPrompt + '\n\n';
    longPrompt += `You have been given an extended context window. Take your time to provide a thorough, detailed response.\n\n`;
    longPrompt += `Task: ${message}\n\n`;
    
    // Add ALL context files (no truncation)
    if (this.contextFiles.length > 0) {
      longPrompt += 'Complete Context Files:\n';
      this.contextFiles.forEach(file => {
        longPrompt += `\n=== ${file.name} ===\n${file.content}\n\n`;
      });
    }
    
    // Add full conversation history (not just last 10)
    if (this.messages.length > 0) {
      longPrompt += 'Full Conversation History:\n';
      this.messages.forEach(m => {
        longPrompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`;
      });
    }
    
    // Add RAG if enabled
    if (this.config.ragEnabled) {
      longPrompt += 'RAG Knowledge Base:\n[Relevant information from knowledge base]\n\n';
    }
    
    longPrompt += 'Provide a comprehensive, detailed response:';
    
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: longPrompt,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
            num_ctx: 8192 // Extended context window
          },
          stream: false
        })
      });
      
      const data = await response.json();
      return data.response;
      
    } catch (error) {
      console.error('Long mode generation failed:', error);
      throw error;
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.agentStudio = new AgentStudio();
});

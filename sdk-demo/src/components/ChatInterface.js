/**
 * Chat Interface Component
 * 
 * Iterative mode with:
 * - Streaming responses
 * - Pause/Continue/Regenerate
 * - Edit previous messages
 * - Branch conversations
 * - Save conversation threads
 */

export class ChatInterface {
  constructor(containerId, agentConfig) {
    this.container = document.getElementById(containerId);
    this.agentConfig = agentConfig;
    this.messages = [];
    this.currentStream = null;
    this.isStreaming = false;
    this.isPaused = false;
    this.conversationId = Date.now();
    
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.loadConversation();
  }

  render() {
    this.container.innerHTML = `
      <div class="chat-interface">
        <!-- Header -->
        <div class="chat-header">
          <h3>💬 Iterative Chat</h3>
          <div class="chat-actions">
            <button id="clear-chat" class="btn btn-sm">🗑️ Clear</button>
            <button id="save-chat" class="btn btn-sm">💾 Save</button>
            <button id="load-chat" class="btn btn-sm">📂 Load</button>
          </div>
        </div>

        <!-- Messages Container -->
        <div id="messages-container" class="messages-container">
          <div class="welcome-message">
            <h4>👋 Start a Conversation</h4>
            <p>Type a message below to begin.</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-controls">
            <button id="pause-btn" class="control-btn" disabled>⏸️</button>
            <button id="stop-btn" class="control-btn" disabled>⏹️</button>
            <button id="regenerate-btn" class="control-btn">🔄</button>
          </div>
          <textarea id="user-input" placeholder="Type your message..." rows="3"></textarea>
          <button id="send-btn" class="btn btn-primary">Send ➤</button>
        </div>

        <!-- Status Bar -->
        <div class="chat-status">
          <span id="status-text">Ready</span>
          <span id="token-count">0 tokens</span>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const input = document.getElementById('user-input');
    document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    document.getElementById('pause-btn').addEventListener('click', () => this.pauseGeneration());
    document.getElementById('stop-btn').addEventListener('click', () => this.stopGeneration());
    document.getElementById('regenerate-btn').addEventListener('click', () => this.regenerate());
    document.getElementById('clear-chat').addEventListener('click', () => this.clearChat());
    document.getElementById('save-chat').addEventListener('click', () => this.saveConversation());
    document.getElementById('load-chat').addEventListener('click', () => this.loadConversationDialog());
  }

  async sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;
    
    this.addMessage('user', message);
    input.value = '';
    await this.streamResponse(message);
  }

  addMessage(role, content) {
    const msgObj = { id: Date.now(), role, content, timestamp: new Date().toISOString() };
    this.messages.push(msgObj);
    
    const container = document.getElementById('messages-container');
    const welcome = container.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    const div = document.createElement('div');
    div.className = `message message-${role}`;
    div.dataset.id = msgObj.id;
    div.innerHTML = `
      <div class="message-header">
        <strong>${role === 'user' ? '👤 You' : '🤖 Assistant'}</strong>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${this.formatContent(content)}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  formatContent(content) {
    return content
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  async streamResponse(userMessage) {
    this.isStreaming = true;
    document.getElementById('pause-btn').disabled = false;
    document.getElementById('stop-btn').disabled = false;
    
    const assistantDiv = this.addMessage('assistant', '');
    const contentDiv = assistantDiv.querySelector('.message-content');
    let fullResponse = '';
    
    try {
      const history = this.messages.slice(0, -1).map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n\n');
      
      const prompt = `${this.agentConfig.systemPrompt}\n\n${history}\n\nUser: ${userMessage}\n\nAssistant:`;
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.agentConfig.model,
          prompt: prompt,
          options: {
            temperature: this.agentConfig.temperature,
            top_p: this.agentConfig.topP,
            num_predict: this.agentConfig.maxTokens
          },
          stream: true
        })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        if (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        const { done, value } = await reader.read();
        if (done || !this.isStreaming) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              contentDiv.innerHTML = this.formatContent(fullResponse);
              container.scrollTop = container.scrollHeight;
            }
          } catch (e) {}
        }
      }
      
      this.messages[this.messages.length - 1].content = fullResponse;
    } catch (error) {
      contentDiv.innerHTML = `<span class="error">Error: ${error.message}</span>`;
    }
    
    this.isStreaming = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('stop-btn').disabled = true;
  }

  pauseGeneration() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('pause-btn');
    btn.textContent = this.isPaused ? '▶️' : '⏸️';
  }

  stopGeneration() {
    this.isStreaming = false;
    this.isPaused = false;
    document.getElementById('pause-btn').textContent = '⏸️';
  }

  regenerate() {
    if (this.messages.length < 2) return;
    
    // Remove last assistant message
    this.messages.pop();
    const container = document.getElementById('messages-container');
    container.lastChild.remove();
    
    // Re-send last user message
    const lastUserMsg = this.messages[this.messages.length - 1];
    this.streamResponse(lastUserMsg.content);
  }

  clearChat() {
    if (confirm('Clear conversation?')) {
      this.messages = [];
      document.getElementById('messages-container').innerHTML = `
        <div class="welcome-message">
          <h4>👋 Start a Conversation</h4>
          <p>Type a message below to begin.</p>
        </div>
      `;
    }
  }

  saveConversation() {
    const convs = JSON.parse(localStorage.getItem('conversations') || '[]');
    convs.push({
      id: this.conversationId,
      name: prompt('Conversation name:', `Chat ${new Date().toLocaleString()}`),
      messages: this.messages,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('conversations', JSON.stringify(convs));
    alert('✅ Conversation saved!');
  }

  loadConversationDialog() {
    const convs = JSON.parse(localStorage.getItem('conversations') || '[]');
    if (convs.length === 0) {
      alert('No saved conversations');
      return;
    }
    
    const name = prompt(`Available:\n${convs.map(c => c.name).join('\n')}\n\nEnter name:`);
    const conv = convs.find(c => c.name === name);
    if (conv) {
      this.messages = conv.messages;
      this.loadConversation();
    }
  }

  loadConversation() {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    this.messages.forEach(msg => this.addMessage(msg.role, msg.content));
  }
}

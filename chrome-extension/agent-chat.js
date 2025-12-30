// Interactive Agent Chat - Allows feedback during generation
class AgentChat {
  constructor() {
    this.chatHistory = [];
    this.currentContext = null;
    this.waitingForFeedback = false;
    this.feedbackCallback = null;
  }

  // Start a new chat session
  startSession(scraperConfig, initialContext) {
    this.chatHistory = [];
    this.currentContext = {
      scraperConfig,
      ...initialContext
    };
    
    this.addMessage('system', '🤖 Agent initialized. Starting generation process...');
  }

  // Add a message to history
  addMessage(role, content, metadata = {}) {
    this.chatHistory.push({
      role, // 'system', 'agent', 'user'
      content,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Agent asks for feedback
  async askForFeedback(question, options = null, timeout = 60000) {
    return new Promise((resolve, reject) => {
      this.waitingForFeedback = true;
      this.addMessage('agent', question, { options, expectingResponse: true });
      
      // Show feedback modal
      this.showFeedbackModal(question, options, (response) => {
        this.waitingForFeedback = false;
        this.addMessage('user', response);
        resolve(response);
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.waitingForFeedback) {
          this.waitingForFeedback = false;
          reject(new Error('Feedback timeout'));
        }
      }, timeout);
    });
  }

  // Show modal for user feedback
  showFeedbackModal(question, options, callback) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;

    content.innerHTML = `
      <h3 style="margin: 0 0 16px 0;">🤖 Agent needs your input</h3>
      <p style="margin: 0 0 20px 0; line-height: 1.5;">${question}</p>
      <div id="feedback-options"></div>
      <div style="margin-top: 16px;">
        <textarea 
          id="feedback-text" 
          placeholder="Type your response here..."
          style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; resize: vertical;"
        ></textarea>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;">
        <button id="feedback-skip" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">
          Skip
        </button>
        <button id="feedback-submit" style="padding: 8px 16px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer;">
          Send Feedback
        </button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Add option buttons if provided
    if (options && options.length > 0) {
      const optionsDiv = document.getElementById('feedback-options');
      optionsDiv.innerHTML = options.map((opt, i) => `
        <button 
          class="feedback-option" 
          data-value="${opt}"
          style="display: block; width: 100%; padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; text-align: left; transition: all 0.2s;"
        >
          ${opt}
        </button>
      `).join('');

      // Option button click
      optionsDiv.querySelectorAll('.feedback-option').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.remove();
          callback(btn.dataset.value);
        });
        
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#f3f4f6';
          btn.style.borderColor = '#3b82f6';
        });
        
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'white';
          btn.style.borderColor = '#ddd';
        });
      });
    }

    // Submit button
    document.getElementById('feedback-submit').addEventListener('click', () => {
      const text = document.getElementById('feedback-text').value.trim();
      if (text) {
        modal.remove();
        callback(text);
      }
    });

    // Skip button
    document.getElementById('feedback-skip').addEventListener('click', () => {
      modal.remove();
      callback('[skipped]');
    });

    // Focus textarea
    setTimeout(() => document.getElementById('feedback-text').focus(), 100);
  }

  // Get formatted chat history for AI context
  getFormattedHistory() {
    return this.chatHistory
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}`)
      .join('\n');
  }

  // Clear chat history
  clearHistory() {
    this.chatHistory = [];
  }

  // Export chat for debugging
  exportChat() {
    return JSON.stringify(this.chatHistory, null, 2);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AgentChat = AgentChat;
}

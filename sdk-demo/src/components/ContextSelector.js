/**
 * Context Selector Component
 * Allows users to choose agent personality, model, and get VRAM recommendations
 */

import '../styles/context-selector.css';

export class ContextSelector {
  constructor(container) {
    this.container = container;
    this.selectedContext = 'general-assistant';
    this.selectedModel = 'mistral-nemo:12b-instruct-2407-q8_0';
    this.vramInfo = null;
    this.contexts = [];
    this.models = [];
    
    this.init();
  }
  
  async init() {
    await this.loadContextsAndModels();
    this.render();
    await this.detectVRAM();
  }
  
  async loadContextsAndModels() {
    try {
      const response = await fetch('http://localhost:3003/contexts');
      const data = await response.json();
      this.contexts = data.contexts;
      this.models = data.models;
    } catch (error) {
      console.error('Failed to load contexts:', error);
      this.contexts = [{ id: 'general-assistant', name: 'General Assistant', description: 'Loading...' }];
    }
  }
  
  async detectVRAM() {
    try {
      const response = await fetch('http://localhost:3003/vram-info');
      const data = await response.json();
      this.vramInfo = data;
      this.updateRecommendations();
    } catch (error) {
      console.error('Failed to detect VRAM:', error);
    }
  }
  
  updateRecommendations() {
    if (!this.vramInfo) return;
    
    const recommendedSection = this.container.querySelector('.recommended-models');
    const tooLargeSection = this.container.querySelector('.too-large-models');
    
    if (!recommendedSection) return;
    
    const { recommended, tooLarge } = this.vramInfo;
    
    recommendedSection.innerHTML = `
      <h4>✅ Recommended Models (${this.vramInfo.totalGB}GB VRAM)</h4>
      ${recommended.map(model => `
        <div class="model-card ${model.name === this.selectedModel ? 'selected' : ''}" 
             data-model="${model.name}">
          <div class="model-header">
            <span class="model-name">${model.name}</span>
            <span class="model-speed">${model.speedTokSec} tok/s</span>
          </div>
          <div class="model-stats">
            <span>📊 ${model.vramRequired}GB</span>
            <span>📝 ${model.contextWindow} ctx</span>
          </div>
          <div class="model-description">${model.description}</div>
          <div class="model-tags">
            ${model.recommended.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    `;
    
    if (tooLarge.length > 0 && tooLargeSection) {
      tooLargeSection.innerHTML = `
        <h4>⚠️ Too Large for Your VRAM</h4>
        ${tooLarge.map(model => `
          <div class="model-card disabled">
            <div class="model-header">
              <span class="model-name">${model.name}</span>
              <span class="model-vram">Need ${model.vramRequired}GB</span>
            </div>
            <div class="model-description">${model.description}</div>
          </div>
        `).join('')}
      `;
    }
    
    // Add click handlers
    this.container.querySelectorAll('.model-card[data-model]').forEach(card => {
      card.addEventListener('click', () => {
        const model = card.dataset.model;
        this.selectModel(model);
      });
    });
  }
  
  selectModel(modelName) {
    this.selectedModel = modelName;
    
    // Update UI
    this.container.querySelectorAll('.model-card').forEach(card => {
      card.classList.remove('selected');
    });
    this.container.querySelector(`[data-model="${modelName}"]`)?.classList.add('selected');
    
    // Notify listeners
    this.onModelChange?.(modelName);
  }
  
  selectContext(contextId) {
    this.selectedContext = contextId;
    
    // Update UI
    this.container.querySelectorAll('.context-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    this.container.querySelector(`[data-context="${contextId}"]`)?.classList.add('selected');
    
    // Auto-select recommended model if available
    const context = this.contexts.find(c => c.id === contextId);
    if (context?.modelRecommendation) {
      const recommended = this.models.find(m => m.name === context.modelRecommendation);
      if (recommended && recommended.vramRequired <= (this.vramInfo?.totalGB || 8)) {
        this.selectModel(context.modelRecommendation);
        this.updateRecommendations();
      }
    }
    
    // Notify listeners
    this.onContextChange?.(contextId);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="context-selector">
        <div class="selector-header">
          <h3>🎯 Agent Context</h3>
          <button class="toggle-btn" id="toggleSelector">
            <span class="toggle-icon">▼</span>
          </button>
        </div>
        
        <div class="selector-content collapsed">
          <!-- Context Selection -->
          <div class="context-section">
            <h4>Choose Agent Personality</h4>
            <div class="context-grid">
              ${this.contexts.map(ctx => `
                <div class="context-option ${ctx.id === this.selectedContext ? 'selected' : ''}" 
                     data-context="${ctx.id}">
                  <div class="context-name">${ctx.name}</div>
                  <div class="context-description">${ctx.description}</div>
                  ${ctx.modelRecommendation ? `
                    <div class="context-model-hint">
                      💡 Best with: ${ctx.modelRecommendation.split(':')[0]}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Model Selection -->
          <div class="model-section">
            <div class="vram-info">
              <div class="vram-status">
                <span class="vram-icon">🎮</span>
                <span id="vramText">Detecting VRAM...</span>
              </div>
              <button class="refresh-btn" id="refreshVRAM">🔄</button>
            </div>
            
            <div class="recommended-models">
              <h4>Loading models...</h4>
            </div>
            
            <div class="too-large-models"></div>
          </div>
          
          <!-- Quick Actions -->
          <div class="quick-actions">
            <button class="action-btn" id="optimizeBtn">
              ⚡ Auto-Optimize for Speed
            </button>
            <button class="action-btn" id="qualityBtn">
              🎯 Auto-Optimize for Quality
            </button>
            <button class="action-btn" id="testModelBtn">
              🧪 Test Current Model
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    // Toggle selector visibility
    const toggleBtn = this.container.querySelector('#toggleSelector');
    const content = this.container.querySelector('.selector-content');
    const toggleIcon = this.container.querySelector('.toggle-icon');
    
    toggleBtn?.addEventListener('click', () => {
      content.classList.toggle('collapsed');
      toggleIcon.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
    });
    
    // Context selection
    this.container.querySelectorAll('.context-option').forEach(option => {
      option.addEventListener('click', () => {
        const contextId = option.dataset.context;
        this.selectContext(contextId);
      });
    });
    
    // VRAM refresh
    const refreshBtn = this.container.querySelector('#refreshVRAM');
    refreshBtn?.addEventListener('click', () => {
      this.detectVRAM();
    });
    
    // Quick actions
    this.container.querySelector('#optimizeBtn')?.addEventListener('click', () => {
      this.optimizeForSpeed();
    });
    
    this.container.querySelector('#qualityBtn')?.addEventListener('click', () => {
      this.optimizeForQuality();
    });
    
    this.container.querySelector('#testModelBtn')?.addEventListener('click', () => {
      this.testCurrentModel();
    });
  }
  
  optimizeForSpeed() {
    if (!this.vramInfo) return;
    
    // Pick fastest model that fits in VRAM
    const fastest = this.vramInfo.recommended.reduce((best, model) => {
      return model.speedTokSec > best.speedTokSec ? model : best;
    });
    
    this.selectModel(fastest.name);
    this.updateRecommendations();
    
    this.showNotification(`Optimized for speed: ${fastest.name} (~${fastest.speedTokSec} tok/s)`);
  }
  
  optimizeForQuality() {
    if (!this.vramInfo) return;
    
    // Pick largest model that fits in VRAM
    const largest = this.vramInfo.recommended.reduce((best, model) => {
      return model.vramRequired > best.vramRequired ? model : best;
    });
    
    this.selectModel(largest.name);
    this.updateRecommendations();
    
    this.showNotification(`Optimized for quality: ${largest.name} (${largest.vramRequired}GB)`);
  }
  
  async testCurrentModel() {
    const testBtn = this.container.querySelector('#testModelBtn');
    const originalText = testBtn.textContent;
    testBtn.textContent = '⏳ Testing...';
    testBtn.disabled = true;
    
    try {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3003/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.selectedModel,
          prompt: 'Respond with "OK" if you receive this message.'
        })
      });
      
      const data = await response.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (data.success) {
        const tokensPerSec = (data.tokens / (elapsed / 1)).toFixed(1);
        this.showNotification(`✅ Model working! ${tokensPerSec} tok/s (${elapsed}s total)`);
      } else {
        this.showNotification(`❌ Model test failed: ${data.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`❌ Test failed: ${error.message}`, 'error');
    } finally {
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `context-notification ${type}`;
    notification.textContent = message;
    
    this.container.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  getConfig() {
    return {
      context: this.selectedContext,
      model: this.selectedModel
    };
  }
  
  // External JSON template integration (from Chrome extension)
  async analyzeWithTemplate(jsonTemplate, htmlContent) {
    // Switch to scraper-builder context
    this.selectContext('scraper-builder');
    
    // Get enhanced prompt
    const response = await fetch('http://localhost:3003/scraper-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonTemplate })
    });
    
    const { enhancedPrompt, recommendedModel } = await response.json();
    
    // Auto-select recommended model if it fits
    if (recommendedModel && this.models.find(m => m.name === recommendedModel)) {
      this.selectModel(recommendedModel);
    }
    
    // Return the enhanced prompt for the agent
    return {
      prompt: `${enhancedPrompt}\n\n## HTML CONTENT\n\`\`\`html\n${htmlContent}\n\`\`\``,
      context: this.selectedContext,
      model: this.selectedModel
    };
  }
}

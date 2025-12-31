// Agent Configuration UI Controller
class AgentConfigUI {
  constructor() {
    this.configManager = new AgentConfigManager();
    this.initializeUI();
    this.attachEventListeners();
    this.updateDisplay();
  }

  initializeUI() {
    // Load current configuration into UI
    const config = this.configManager.config;
    
    // Set system toggles
    for (const [systemName, system] of Object.entries(config)) {
      const checkbox = document.getElementById(`system-${systemName}`);
      if (checkbox) {
        checkbox.checked = system.enabled;
      }
    }

    // Set RAG episode count
    const ragEpisodes = document.getElementById('rag-episodes');
    if (ragEpisodes) {
      ragEpisodes.value = config.enhancedMemory.maxEpisodes;
      document.getElementById('rag-episodes-value').textContent = config.enhancedMemory.maxEpisodes;
    }

    // Set HTML size
    const htmlSize = document.getElementById('html-size');
    if (htmlSize) {
      htmlSize.value = config.htmlContext.maxChars;
      document.getElementById('html-size-value').textContent = config.htmlContext.maxChars;
    }

    // Set context guide checkboxes
    for (const [guideName, guide] of Object.entries(config.contextGuides.guides)) {
      const checkbox = document.querySelector(`input[data-guide="${guideName}"]`);
      if (checkbox) {
        checkbox.checked = guide.enabled;
      }
    }
  }

  attachEventListeners() {
    // Close button
    document.getElementById('close-config-btn')?.addEventListener('click', () => {
      this.hide();
    });

    // System toggles
    document.querySelectorAll('input[id^="system-"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const systemName = e.target.id.replace('system-', '');
        this.configManager.setEnabled(systemName, e.target.checked);
        this.updateDisplay();
        this.toggleSystemControls(systemName, e.target.checked);
      });
    });

    // RAG episode count slider
    document.getElementById('rag-episodes')?.addEventListener('input', (e) => {
      const count = parseInt(e.target.value);
      document.getElementById('rag-episodes-value').textContent = count;
      this.configManager.setRAGEpisodeCount(count);
      this.updateDisplay();
    });

    // HTML size slider
    document.getElementById('html-size')?.addEventListener('input', (e) => {
      const chars = parseInt(e.target.value);
      document.getElementById('html-size-value').textContent = chars;
      this.configManager.setHtmlContextSize(chars);
      this.updateDisplay();
    });

    // Context guide checkboxes
    document.querySelectorAll('input[data-guide]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const guideName = e.target.dataset.guide;
        this.configManager.setContextGuideEnabled(guideName, e.target.checked);
        this.updateDisplay();
      });
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        this.applyPreset(preset);
      });
    });

    // Save button
    document.getElementById('save-config-btn')?.addEventListener('click', () => {
      this.save();
    });

    // Reset button
    document.getElementById('reset-config-btn')?.addEventListener('click', () => {
      this.reset();
    });

    // Export button
    document.getElementById('export-config-btn')?.addEventListener('click', () => {
      this.exportConfig();
    });

    // Import button
    document.getElementById('import-config-btn')?.addEventListener('click', () => {
      this.importConfig();
    });
  }

  toggleSystemControls(systemName, enabled) {
    const controls = document.getElementById(`controls-${systemName}`);
    if (controls) {
      controls.style.display = enabled ? 'block' : 'none';
    }
  }

  updateDisplay() {
    const estimates = this.configManager.tokenEstimates;
    const summary = this.configManager.getSummary();

    // Update token gauge
    const gaugeFill = document.getElementById('token-gauge-fill');
    const percentage = Math.min(100, (estimates.total / 32768) * 100);
    if (gaugeFill) {
      gaugeFill.style.width = `${percentage}%`;
    }

    // Update gauge label
    document.getElementById('gauge-current').textContent = estimates.total.toLocaleString();

    // Update token details
    document.getElementById('token-total').textContent = estimates.total.toLocaleString();
    
    const gpuStatus = document.getElementById('gpu-status');
    if (gpuStatus) {
      gpuStatus.textContent = estimates.fitsInGPU ? '✓ Yes' : '✗ No';
      gpuStatus.style.background = estimates.fitsInGPU ? '#4CAF50' : '#F44336';
    }

    const cpuRisk = document.getElementById('cpu-risk');
    if (cpuRisk) {
      const riskColors = {
        'none': '#4CAF50',
        'low': '#8BC34A',
        'medium': '#FFC107',
        'high': '#F44336'
      };
      cpuRisk.textContent = estimates.cpuRisk.toUpperCase();
      cpuRisk.style.background = riskColors[estimates.cpuRisk] || '#999';
    }

    // Update recommendation
    const recommendation = document.getElementById('recommendation');
    if (recommendation) {
      recommendation.textContent = summary.recommendation.message;
      recommendation.style.background = `rgba(255,255,255,0.${summary.recommendation.level === 'optimal' ? '3' : '2'})`;
    }

    // Update token estimates for each system
    for (const [systemName, system] of Object.entries(this.configManager.config)) {
      const tokenSpan = document.getElementById(`tokens-${systemName}`);
      if (tokenSpan && system.avgTokens !== undefined) {
        tokenSpan.textContent = Math.abs(system.avgTokens);
      }
    }

    // Console log for debugging
    console.log('🎛️ Config updated:', {
      totalTokens: estimates.total,
      fitsInGPU: estimates.fitsInGPU,
      cpuRisk: estimates.cpuRisk,
      enabledSystems: summary.totalEnabled
    });
  }

  applyPreset(presetName) {
    this.configManager.applyPreset(presetName);
    this.initializeUI(); // Reload all UI elements
    this.updateDisplay();

    // Highlight active preset
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetName);
    });

    // Show feedback
    this.showToast(`Applied preset: ${presetName}`);
  }

  save() {
    this.configManager.saveConfig();
    this.showToast('Configuration saved!');
  }

  reset() {
    if (confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('agentIntelligenceConfig');
      this.configManager = new AgentConfigManager();
      this.initializeUI();
      this.updateDisplay();
      this.showToast('Configuration reset to defaults');
    }
  }

  exportConfig() {
    const json = this.configManager.exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Configuration exported!');
  }

  importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const success = this.configManager.importConfig(event.target.result);
          if (success) {
            this.initializeUI();
            this.updateDisplay();
            this.showToast('Configuration imported!');
          } else {
            this.showToast('Failed to import configuration', 'error');
          }
        } catch (error) {
          this.showToast('Invalid configuration file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  show() {
    document.getElementById('agent-config-panel').style.display = 'flex';
    this.updateDisplay();
  }

  hide() {
    document.getElementById('agent-config-panel').style.display = 'none';
  }

  showToast(message, type = 'success') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#F44336'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.agentConfigUI = new AgentConfigUI();
  });
} else {
  window.agentConfigUI = new AgentConfigUI();
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

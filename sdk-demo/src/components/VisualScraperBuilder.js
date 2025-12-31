/**
 * Visual Scraper Builder - Use templates to build scrapers by clicking elements
 * 
 * Features:
 * - Load template and render wizard
 * - Click elements on page to capture selectors
 * - Add notes and extra steps per field
 * - Configure AI analysis per field with model selection
 * - Generate final scraper script
 */

export class VisualScraperBuilder {
  constructor() {
    this.currentTemplate = null;
    this.currentStep = 1;
    this.capturedData = {};
    this.fieldNotes = {};
    this.fieldAIConfig = {};
    this.isCapturing = false;
    this.currentField = null;
    
    this.init();
  }

  init() {
    // Listen for template loaded events
    window.addEventListener('template-loaded', (e) => {
      this.loadTemplate(e.detail);
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Global capture mode toggle
    document.getElementById('toggle-capture-global')?.addEventListener('click', () => {
      this.toggleCaptureMode();
    });
  }

  loadTemplate(template) {
    this.currentTemplate = template;
    this.currentStep = 1;
    this.capturedData = {};
    this.fieldNotes = {};
    this.fieldAIConfig = {};
    
    this.renderBuilder();
  }

  renderBuilder() {
    const container = document.getElementById('scraper-builder');
    if (!container || !this.currentTemplate) return;

    const step = this.currentTemplate.steps[this.currentStep - 1];
    if (!step) return;

    let html = `
      <div style="padding: 20px;">
        <!-- Progress -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 500; color: #6b7280;">Step ${this.currentStep} of ${this.currentTemplate.steps.length}</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7280;">${this.currentTemplate.name}</span>
          </div>
          <div style="height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); width: ${(this.currentStep / this.currentTemplate.steps.length) * 100}%; transition: width 0.3s;"></div>
          </div>
        </div>

        <!-- Step Header -->
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">${step.stepIcon}</span>
            <span>${step.stepName}</span>
          </h3>
          ${step.instruction ? `<p style="margin: 0; padding: 12px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 13px; color: #1e40af;">${step.instruction}</p>` : ''}
        </div>

        <!-- Capture Mode Toggle (if step has capture mode) -->
        ${step.captureMode ? `
          <div style="margin-bottom: 20px; padding: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px;">
            <label style="display: flex; align-items: center; cursor: pointer; color: white; font-weight: 500;">
              <input type="checkbox" id="capture-mode-toggle" ${this.isCapturing ? 'checked' : ''} style="width: 18px; height: 18px; margin-right: 10px; cursor: pointer;">
              <span>🎯 Capture Mode ${this.isCapturing ? '(Active - Click elements on page)' : '(Inactive)'}</span>
            </label>
          </div>
        ` : ''}

        <!-- Fields -->
        <div id="fields-container" style="display: grid; gap: 16px;">
          ${this.renderFields(step)}
        </div>

        <!-- Navigation -->
        <div style="display: flex; gap: 8px; margin-top: 24px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
          ${this.currentStep > 1 ? `
            <button id="prev-step" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">← Previous</button>
          ` : ''}
          ${this.currentStep < this.currentTemplate.steps.length ? `
            <button id="next-step" style="flex: 1; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">Next →</button>
          ` : `
            <button id="finish-build" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">✅ Finish & Generate Script</button>
          `}
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.attachBuilderListeners();
  }

  renderFields(step) {
    const fields = step.fields || [];
    const fieldGroups = step.fieldGroups || [];

    let html = '';

    // Render direct fields
    if (fields.length > 0) {
      fields.forEach(field => {
        html += this.renderField(field, step.captureMode);
      });
    }

    // Render field groups
    if (fieldGroups.length > 0) {
      fieldGroups.forEach(group => {
        html += `
          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #374151; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">${group.groupName}</h4>
            <div style="display: grid; gap: 12px;">
              ${(group.fields || []).map(field => this.renderField(field, step.captureMode)).join('')}
            </div>
          </div>
        `;
      });
    }

    return html || '<p style="text-align: center; color: #999;">No fields defined for this step</p>';
  }

  renderField(field, captureMode) {
    const fieldKey = field.name;
    const captured = this.capturedData[fieldKey] || null;
    const note = this.fieldNotes[fieldKey] || '';
    const aiConfig = this.fieldAIConfig[fieldKey] || { enabled: false, model: 'qwen2.5-coder:32b', instructions: '' };

    if (field.type === 'selector') {
      return `
        <div class="field-group" data-field="${fieldKey}" style="border: 2px solid ${captured ? '#10b981' : '#e5e7eb'}; padding: 16px; border-radius: 8px; background: ${captured ? '#f0fdf4' : '#fafafa'};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <label style="font-weight: 600; color: #1f2937;">${field.label || field.name}${field.required ? ' *' : ''}</label>
            ${captured ? '<span style="color: #10b981; font-weight: 600; font-size: 12px;">✓ Captured</span>' : ''}
          </div>
          
          ${field.hint ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 11px;">${field.hint}</p>` : ''}
          
          <!-- Selector Input -->
          <input type="text" class="selector-input" data-field="${fieldKey}" value="${captured?.selector || ''}" placeholder="CSS selector" readonly style="width: 100%; padding: 8px; margin-bottom: 8px; background: white; border: 1px solid #d1d5db; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 12px;">
          
          <!-- Capture Button -->
          <button class="capture-btn" data-field="${fieldKey}" style="width: 100%; padding: 10px; background: ${captured ? '#6366f1' : '#10b981'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; margin-bottom: 12px;">
            ${captured ? '🔄 Re-capture Element' : '🎯 Capture Element'}
          </button>
          
          <!-- Captured Steps Display -->
          ${captured?.steps ? `
            <div style="margin-bottom: 12px; padding: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 4px;">
              <div style="font-size: 11px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">Captured ${captured.steps.length} step(s):</div>
              ${captured.steps.map((s, i) => `
                <div style="font-size: 10px; font-family: monospace; color: #374151; padding: 4px; background: #f9fafb; border-radius: 2px; margin-bottom: 2px;">
                  ${i + 1}. ${s.selector}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- Field Note -->
          <textarea class="field-note" data-field="${fieldKey}" placeholder="Add a note about this field..." style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; resize: vertical; min-height: 60px; margin-bottom: 12px;">${note}</textarea>
          
          <!-- AI Analysis Toggle -->
          <div style="padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px;">
            <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px; font-weight: 500; margin-bottom: ${aiConfig.enabled ? '12px' : '0'};">
              <input type="checkbox" class="ai-toggle" data-field="${fieldKey}" ${aiConfig.enabled ? 'checked' : ''} style="width: 16px; height: 16px; margin-right: 8px; cursor: pointer;">
              <span>🤖 Use AI Analysis for this field</span>
            </label>
            
            ${aiConfig.enabled ? `
              <div class="ai-config" data-field="${fieldKey}" style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
                <label style="display: block; color: white; font-size: 12px; margin-bottom: 4px;">Model:</label>
                <select class="ai-model" data-field="${fieldKey}" style="width: 100%; padding: 6px; border: none; border-radius: 4px; margin-bottom: 8px; font-size: 11px;">
                  <option value="qwen2.5-coder:32b" ${aiConfig.model === 'qwen2.5-coder:32b' ? 'selected' : ''}>Qwen 2.5 Coder 32B (Recommended)</option>
                  <option value="qwen2.5-coder:14b" ${aiConfig.model === 'qwen2.5-coder:14b' ? 'selected' : ''}>Qwen 2.5 Coder 14B (Faster)</option>
                  <option value="llama3.2:3b" ${aiConfig.model === 'llama3.2:3b' ? 'selected' : ''}>Llama 3.2 3B (Fast)</option>
                  <option value="gemma2:9b" ${aiConfig.model === 'gemma2:9b' ? 'selected' : ''}>Gemma 2 9B (Balanced)</option>
                </select>
                
                <label style="display: block; color: white; font-size: 12px; margin-bottom: 4px;">Processing Instructions:</label>
                <textarea class="ai-instructions" data-field="${fieldKey}" placeholder="e.g., Extract bill number, Parse date format, Clean up text..." style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; resize: vertical; min-height: 50px;">${aiConfig.instructions}</textarea>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      // Regular form fields
      return this.renderRegularField(field);
    }
  }

  renderRegularField(field) {
    const fieldKey = field.name;
    const value = this.capturedData[fieldKey] || field.default || '';

    switch (field.type) {
      case 'text':
      case 'url':
        return `
          <div class="field-group">
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;">${field.label || field.name}${field.required ? ' *' : ''}</label>
            <input type="${field.type}" class="regular-input" data-field="${fieldKey}" value="${value}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
        `;
      
      case 'textarea':
        return `
          <div class="field-group">
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;">${field.label || field.name}${field.required ? ' *' : ''}</label>
            <textarea class="regular-input" data-field="${fieldKey}" rows="3" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;">${value}</textarea>
          </div>
        `;
      
      case 'select':
        let options = field.options || [];
        if (field.name === 'state_code') {
          options = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
        }
        return `
          <div class="field-group">
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;">${field.label || field.name}${field.required ? ' *' : ''}</label>
            <select class="regular-input" data-field="${fieldKey}" ${field.required ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
              <option value="">Select ${field.label}...</option>
              ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
        `;
      
      case 'radio':
        return `
          <div class="field-group">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 13px;">${field.label || field.name}${field.required ? ' *' : ''}</label>
            <div style="display: flex; gap: 12px;">
              ${(field.options || []).map(opt => `
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="radio" class="regular-input" name="${fieldKey}" data-field="${fieldKey}" value="${opt}" ${value === opt ? 'checked' : ''} style="margin-right: 6px;">
                  <span style="font-size: 13px;">${opt}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      
      case 'checkbox':
        return `
          <div class="field-group">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" class="regular-input" data-field="${fieldKey}" ${value ? 'checked' : ''} style="width: 16px; height: 16px; margin-right: 8px;">
              <span style="font-size: 13px; font-weight: 500;">${field.label || field.name}</span>
            </label>
          </div>
        `;
      
      default:
        return '';
    }
  }

  attachBuilderListeners() {
    // Navigation
    document.getElementById('prev-step')?.addEventListener('click', () => {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.renderBuilder();
      }
    });

    document.getElementById('next-step')?.addEventListener('click', () => {
      if (this.validateCurrentStep()) {
        this.currentStep++;
        this.renderBuilder();
      }
    });

    document.getElementById('finish-build')?.addEventListener('click', () => {
      this.finishAndGenerate();
    });

    // Capture mode toggle
    document.getElementById('capture-mode-toggle')?.addEventListener('change', (e) => {
      this.isCapturing = e.target.checked;
      if (this.isCapturing) {
        this.enableCaptureMode();
      } else {
        this.disableCaptureMode();
      }
    });

    // Capture buttons
    document.querySelectorAll('.capture-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        this.startFieldCapture(field);
      });
    });

    // Regular inputs
    document.querySelectorAll('.regular-input').forEach(input => {
      input.addEventListener('change', () => {
        const field = input.dataset.field;
        let value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else if (input.type === 'radio') {
          value = input.value;
        } else {
          value = input.value;
        }
        this.capturedData[field] = value;
      });
    });

    // Field notes
    document.querySelectorAll('.field-note').forEach(textarea => {
      textarea.addEventListener('change', () => {
        const field = textarea.dataset.field;
        this.fieldNotes[field] = textarea.value;
      });
    });

    // AI toggles
    document.querySelectorAll('.ai-toggle').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const field = checkbox.dataset.field;
        if (!this.fieldAIConfig[field]) {
          this.fieldAIConfig[field] = { enabled: false, model: 'qwen2.5-coder:32b', instructions: '' };
        }
        this.fieldAIConfig[field].enabled = checkbox.checked;
        this.renderBuilder(); // Re-render to show/hide AI config
      });
    });

    // AI model selection
    document.querySelectorAll('.ai-model').forEach(select => {
      select.addEventListener('change', () => {
        const field = select.dataset.field;
        this.fieldAIConfig[field].model = select.value;
      });
    });

    // AI instructions
    document.querySelectorAll('.ai-instructions').forEach(textarea => {
      textarea.addEventListener('change', () => {
        const field = textarea.dataset.field;
        this.fieldAIConfig[field].instructions = textarea.value;
      });
    });
  }

  startFieldCapture(field) {
    this.currentField = field;
    this.enableCaptureMode();
    
    // Send message to content script to start capturing
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'START_CAPTURE',
          field: field
        });
      }
    });
  }

  enableCaptureMode() {
    // Inject content script if not already injected
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content-capture.js']
        });
      }
    });
  }

  disableCaptureMode() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'STOP_CAPTURE'
        });
      }
    });
  }

  handleElementCaptured(data) {
    const { field, selector, xpath, value, steps } = data;
    
    this.capturedData[field] = {
      selector,
      xpath,
      value,
      steps: steps || [{ selector, xpath }]
    };
    
    this.renderBuilder();
  }

  validateCurrentStep() {
    const step = this.currentTemplate.steps[this.currentStep - 1];
    const fields = step.fields || [];
    const fieldGroups = step.fieldGroups || [];
    
    const allFields = [...fields];
    fieldGroups.forEach(group => {
      allFields.push(...(group.fields || []));
    });

    for (const field of allFields) {
      if (field.required && !this.capturedData[field.name]) {
        alert(`Please fill in the required field: ${field.label || field.name}`);
        return false;
      }
    }

    return true;
  }

  finishAndGenerate() {
    if (!this.validateCurrentStep()) return;

    const config = {
      template: this.currentTemplate,
      data: this.capturedData,
      notes: this.fieldNotes,
      aiConfig: this.fieldAIConfig,
      timestamp: new Date().toISOString()
    };

    // Save to library
    const saved = localStorage.getItem('scraperConfigs') || '[]';
    const configs = JSON.parse(saved);
    configs.push(config);
    localStorage.setItem('scraperConfigs', JSON.stringify(configs));

    // Trigger script generation
    window.dispatchEvent(new CustomEvent('generate-scraper', { detail: config }));
    
    alert('✅ Scraper configuration saved! Generating script...');
  }
}

export default VisualScraperBuilder;

/**
 * Template Manager - Create and edit scraper templates
 * 
 * Templates define the structure of data to scrape:
 * - Steps: Pages in the wizard (metadata, structure, fields)
 * - Fields: Data points to capture (with capture mode, AI analysis)
 * - Event Type: Classification for unified events table
 */

export class TemplateManager {
  constructor() {
    this.currentTemplate = null;
    this.templates = [];
    this.apiUrl = 'https://civitracker.pages.dev/api/scraper-templates'; // Cloudflare Pages
    this.init();
  }

  init() {
    this.loadTemplates();
    this.setupEventListeners();
  }

  async loadTemplates() {
    try {
      // Try to load from API first
      const response = await fetch(this.apiUrl);
      const data = await response.json();
      
      if (data.success && data.templates) {
        this.templates = data.templates;
        console.log(`✅ Loaded ${data.templates.length} templates from database`);
      } else {
        throw new Error('Failed to load from API');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from API, using defaults:', error);
      // Fallback to localStorage or defaults
      const saved = localStorage.getItem('scraperTemplates');
      this.templates = saved ? JSON.parse(saved) : this.getDefaultTemplates();
    }
    
    this.renderTemplatesList();
  }

  saveTemplates() {
    // Save to localStorage as backup
    localStorage.setItem('scraperTemplates', JSON.stringify(this.templates));
  }

  async saveTemplateToAPI(template) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category || 'Custom',
          url_pattern: template.urlPattern || '.*',
          selectors: template.fields || {},
          example_url: template.exampleUrl || '',
          requires_javascript: template.requiresJs ? 1 : 0,
          is_public: 1
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Template saved to database');
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('❌ Failed to save to API:', error);
      return false;
    }
  }

  setupEventListeners() {
    // Create new template
    document.getElementById('new-template-btn')?.addEventListener('click', () => {
      this.createNewTemplate();
    });

    // Save template
    document.getElementById('save-template-btn')?.addEventListener('click', () => {
      this.saveCurrentTemplate();
    });

    // Add step
    document.getElementById('add-step-btn')?.addEventListener('click', () => {
      this.addStep();
    });
  }

  async createNewTemplate() {
    // Show modal dialog for template creation
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    modal.innerHTML = `
      <div style="background: white; padding: 32px; border-radius: 12px; width: 90%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <h2 style="margin: 0 0 20px 0; color: #1f2937;">✨ Create New Template</h2>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Template Name</label>
          <input type="text" id="template-name" placeholder="e.g., News Article Scraper" 
                 style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Description</label>
          <textarea id="template-desc" placeholder="What does this template scrape?" rows="3"
                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Category</label>
          <select id="template-category" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
            <option value="News">📰 News</option>
            <option value="E-commerce">🛒 E-commerce</option>
            <option value="Jobs">💼 Jobs</option>
            <option value="Real Estate">🏠 Real Estate</option>
            <option value="Events">📅 Events</option>
            <option value="Government">🏛️ Government</option>
            <option value="Social Media">👥 Social Media</option>
            <option value="Food">🍽️ Food</option>
            <option value="Blog">✍️ Blog</option>
            <option value="Academic">🎓 Academic</option>
            <option value="Custom">⚙️ Custom</option>
          </select>
        </div>
        
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #374151;">Example URL</label>
          <input type="url" id="template-url" placeholder="https://example.com/page" 
                 style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-template" style="padding: 10px 24px; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Cancel
          </button>
          <button id="create-template" style="padding: 10px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Create Template
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus name input
    setTimeout(() => document.getElementById('template-name').focus(), 100);
    
    // Handle cancel
    document.getElementById('cancel-template').onclick = () => {
      modal.remove();
    };
    
    // Handle create
    document.getElementById('create-template').onclick = async () => {
      const name = document.getElementById('template-name').value.trim();
      const description = document.getElementById('template-desc').value.trim();
      const category = document.getElementById('template-category').value;
      const exampleUrl = document.getElementById('template-url').value.trim();
      
      if (!name) {
        alert('Please enter a template name');
        return;
      }
      
      const template = {
        id: `template-${Date.now()}`,
        name,
        description,
        category,
        url_pattern: exampleUrl ? new URL(exampleUrl).hostname : '.*',
        selectors: {},
        example_url: exampleUrl,
        requires_javascript: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Save to API
      const saved = await this.saveTemplateToAPI(template);
      
      if (saved) {
        this.templates.push(template);
        this.saveTemplates();
        this.renderTemplatesList();
        
        // Show success message
        alert(`✅ Template "${name}" created successfully!`);
        modal.remove();
      } else {
        // Still add locally even if API fails
        this.templates.push(template);
        this.saveTemplates();
        this.renderTemplatesList();
        alert(`⚠️ Template created locally. Cloud sync may be unavailable.`);
        modal.remove();
      }
    };
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  addStep() {
    if (!this.currentTemplate) return;

    const stepNumber = this.currentTemplate.steps.length + 1;
    const step = {
      stepNumber,
      stepName: `Step ${stepNumber}`,
      stepIcon: '📋',
      captureMode: false,
      instruction: '',
      fields: [],
      fieldGroups: []
    };

    this.currentTemplate.steps.push(step);
    this.renderTemplateEditor();
  }

  renderTemplatesList() {
    const container = document.getElementById('templates-list');
    if (!container) return;

    if (this.templates.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
          <p style="font-size: 16px; margin-bottom: 8px; color: #374151; font-weight: 500;">No templates yet</p>
          <p style="font-size: 14px;">Create your first template to get started!</p>
        </div>
      `;
      return;
    }

    // Group by category
    const byCategory = {};
    this.templates.forEach(template => {
      const cat = template.category || 'Custom';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(template);
    });

    let html = '';
    
    Object.keys(byCategory).sort().forEach(category => {
      html += `
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${category}</h4>
          <div style="display: grid; gap: 10px;">
      `;
      
      byCategory[category].forEach(template => {
        const selectorCount = Object.keys(template.selectors || {}).length;
        const usageCount = template.use_count || 0;
        const requiresJs = template.requires_javascript ? '⚡ JS' : '';
        
        html += `
          <div class="template-card" style="padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;" 
               data-id="${template.id}"
               onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#4f46e5';"
               onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb';">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <h4 style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${template.name}</h4>
                  ${requiresJs ? '<span style="font-size: 10px; padding: 2px 6px; background: #fef3c7; color: #92400e; border-radius: 3px;">' + requiresJs + '</span>' : ''}
                </div>
                <p style="margin: 4px 0; color: #6b7280; font-size: 12px; line-height: 1.4;">${template.description || 'No description'}</p>
                <div style="display: flex; gap: 6px; margin-top: 6px; font-size: 11px; color: #9ca3af;">
                  <span>📊 ${selectorCount} fields</span>
                  <span>•</span>
                  <span>👥 ${usageCount} uses</span>
                  ${template.example_url ? '<span>• <a href="' + template.example_url + '" target="_blank" style="color: #4f46e5;">Example</a></span>' : ''}
                </div>
              </div>
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button class="use-template-btn" data-id="${template.id}" 
                        style="padding: 6px 12px; background: #4f46e5; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: 500; white-space: nowrap;">
                  Use Template
                </button>
                <button class="delete-template-btn" data-id="${template.id}" 
                        style="padding: 6px 10px; background: #fee; color: #dc2626; border: 1px solid #fecaca; border-radius: 5px; cursor: pointer; font-size: 11px;">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      });
      
      html += '</div></div>';
    });

    container.innerHTML = html;

    // Attach event listeners for Use Template buttons
    container.querySelectorAll('.use-template-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const template = this.templates.find(t => t.id === id);
        if (template) {
          // Emit event for builder to use
          window.dispatchEvent(new CustomEvent('template-selected', { detail: template }));
          alert(`✅ Template "${template.name}" loaded! Switch to the Builder tab to configure your scraper.`);
        }
      });
    });

    // Attach event listeners for Delete buttons
    container.querySelectorAll('.delete-template-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const template = this.templates.find(t => t.id === id);
        
        if (confirm(`Delete template "${template.name}"?`)) {
          try {
            // Try to delete from API
            await fetch(`${this.apiUrl}?id=${id}`, { method: 'DELETE' });
          } catch (error) {
            console.warn('Failed to delete from API:', error);
          }
          
          // Remove from local array
          this.templates = this.templates.filter(t => t.id !== id);
          this.saveTemplates();
          this.renderTemplatesList();
        }
      });
    });
    
    // Old edit button handler (if still present)
    container.querySelectorAll('.edit-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.editTemplate(id);
      });
    });

    container.querySelectorAll('.delete-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this template?')) {
          this.deleteTemplate(id);
        }
      });
    });

    container.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.loadTemplateForBuilder(id);
      });
    });
  }

  editTemplate(id) {
    this.currentTemplate = this.templates.find(t => t.id === id);
    if (this.currentTemplate) {
      this.renderTemplateEditor();
    }
  }

  deleteTemplate(id) {
    this.templates = this.templates.filter(t => t.id !== id);
    this.saveTemplates();
    this.renderTemplatesList();
  }

  loadTemplateForBuilder(id) {
    const template = this.templates.find(t => t.id === id);
    if (template) {
      window.dispatchEvent(new CustomEvent('template-loaded', { detail: template }));
      // Switch to builder tab
      document.querySelector('[data-tab="builder"]')?.click();
    }
  }

  renderTemplateEditor() {
    const container = document.getElementById('template-editor');
    if (!container || !this.currentTemplate) return;

    let html = `
      <div style="padding: 20px;">
        <h3 style="margin: 0 0 16px 0;">Edit Template: ${this.currentTemplate.name}</h3>
        
        <div style="display: grid; gap: 16px;">
          <!-- Basic Info -->
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 12px;">Template Name *</label>
            <input type="text" id="template-name" value="${this.currentTemplate.name}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 12px;">Description</label>
            <textarea id="template-description" rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">${this.currentTemplate.description || ''}</textarea>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 12px;">Event Type *</label>
            <select id="template-event-type" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
              <option value="legislative_calendar" ${this.currentTemplate.eventType === 'legislative_calendar' ? 'selected' : ''}>Legislative Calendar</option>
              <option value="court_calendar" ${this.currentTemplate.eventType === 'court_calendar' ? 'selected' : ''}>Court Calendar</option>
              <option value="public_hearing" ${this.currentTemplate.eventType === 'public_hearing' ? 'selected' : ''}>Public Hearing</option>
              <option value="permit_review" ${this.currentTemplate.eventType === 'permit_review' ? 'selected' : ''}>Permit Review</option>
              <option value="zoning_meeting" ${this.currentTemplate.eventType === 'zoning_meeting' ? 'selected' : ''}>Zoning Meeting</option>
              <option value="commission_meeting" ${this.currentTemplate.eventType === 'commission_meeting' ? 'selected' : ''}>Commission Meeting</option>
              <option value="board_meeting" ${this.currentTemplate.eventType === 'board_meeting' ? 'selected' : ''}>Board Meeting</option>
              <option value="town_hall" ${this.currentTemplate.eventType === 'town_hall' ? 'selected' : ''}>Town Hall</option>
              <option value="other" ${this.currentTemplate.eventType === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 12px;">Scraper Source ID *</label>
            <input type="text" id="template-source-id" value="${this.currentTemplate.scraperSource}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" placeholder="e.g., ca_legislative">
          </div>
          
          <!-- Steps -->
          <div style="margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 14px;">Steps (${this.currentTemplate.steps.length})</h4>
              <button id="add-step-btn" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">➕ Add Step</button>
            </div>
            
            <div id="steps-container" style="display: grid; gap: 12px;">
              ${this.renderSteps()}
            </div>
          </div>
          
          <!-- Actions -->
          <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <button id="save-template-btn" style="flex: 1; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">💾 Save Template</button>
            <button id="cancel-template-btn" style="flex: 1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.attachEditorListeners();
  }

  renderSteps() {
    if (this.currentTemplate.steps.length === 0) {
      return '<p style="text-align: center; color: #999; padding: 20px;">No steps yet. Click "Add Step" to begin.</p>';
    }

    return this.currentTemplate.steps.map((step, index) => `
      <div class="step-card" style="padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <input type="text" value="${step.stepIcon}" class="step-icon" data-index="${index}" style="width: 40px; padding: 6px; text-align: center; border: 1px solid #d1d5db; border-radius: 4px;">
              <input type="text" value="${step.stepName}" class="step-name" data-index="${index}" style="flex: 1; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
            </div>
            
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" class="step-capture-mode" data-index="${index}" ${step.captureMode ? 'checked' : ''} style="width: 16px; height: 16px;">
              <span style="font-size: 12px; color: #6b7280;">Capture Mode (click elements on page)</span>
            </label>
            
            <textarea class="step-instruction" data-index="${index}" rows="2" placeholder="Instruction for users..." style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; margin-bottom: 12px;">${step.instruction || ''}</textarea>
            
            <details style="margin-top: 8px;">
              <summary style="cursor: pointer; font-size: 12px; font-weight: 500; color: #4f46e5;">Fields (${step.fields?.length || 0})</summary>
              <div style="margin-top: 8px; padding: 12px; background: white; border-radius: 4px;">
                <button class="add-field-btn" data-step-index="${index}" style="width: 100%; padding: 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; margin-bottom: 8px;">➕ Add Field</button>
                <div class="fields-list" data-step-index="${index}">
                  ${this.renderFields(step.fields || [], index)}
                </div>
              </div>
            </details>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px; margin-left: 12px;">
            ${index > 0 ? `<button class="move-step-up" data-index="${index}" style="padding: 4px 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">↑</button>` : ''}
            ${index < this.currentTemplate.steps.length - 1 ? `<button class="move-step-down" data-index="${index}" style="padding: 4px 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">↓</button>` : ''}
            <button class="delete-step" data-index="${index}" style="padding: 4px 8px; background: #fecaca; border: 1px solid #f87171; border-radius: 4px; cursor: pointer;">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderFields(fields, stepIndex) {
    if (fields.length === 0) {
      return '<p style="text-align: center; color: #999; font-size: 11px; padding: 8px;">No fields</p>';
    }

    return fields.map((field, fieldIndex) => `
      <div style="padding: 8px; margin-bottom: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <strong>${field.label || field.name}</strong>
            <div style="color: #6b7280; margin-top: 2px;">
              Type: ${field.type}${field.required ? ' *' : ''}
            </div>
          </div>
          <button class="delete-field" data-step-index="${stepIndex}" data-field-index="${fieldIndex}" style="padding: 2px 6px; background: #fecaca; border: 1px solid #f87171; border-radius: 4px; cursor: pointer; font-size: 10px;">×</button>
        </div>
      </div>
    `).join('');
  }

  attachEditorListeners() {
    // Save template
    document.getElementById('save-template-btn')?.addEventListener('click', () => {
      this.saveCurrentTemplate();
    });

    // Cancel
    document.getElementById('cancel-template-btn')?.addEventListener('click', () => {
      this.currentTemplate = null;
      document.getElementById('template-editor').innerHTML = '';
      this.renderTemplatesList();
    });

    // Add step
    document.getElementById('add-step-btn')?.addEventListener('click', () => {
      this.addStep();
    });

    // Step name changes
    document.querySelectorAll('.step-name').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.currentTemplate.steps[index].stepName = e.target.value;
      });
    });

    // Step icon changes
    document.querySelectorAll('.step-icon').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.currentTemplate.steps[index].stepIcon = e.target.value;
      });
    });

    // Capture mode toggle
    document.querySelectorAll('.step-capture-mode').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.currentTemplate.steps[index].captureMode = e.target.checked;
      });
    });

    // Step instruction changes
    document.querySelectorAll('.step-instruction').forEach(textarea => {
      textarea.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.currentTemplate.steps[index].instruction = e.target.value;
      });
    });

    // Move step up/down
    document.querySelectorAll('.move-step-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if (index > 0) {
          const temp = this.currentTemplate.steps[index];
          this.currentTemplate.steps[index] = this.currentTemplate.steps[index - 1];
          this.currentTemplate.steps[index - 1] = temp;
          this.renderTemplateEditor();
        }
      });
    });

    document.querySelectorAll('.move-step-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if (index < this.currentTemplate.steps.length - 1) {
          const temp = this.currentTemplate.steps[index];
          this.currentTemplate.steps[index] = this.currentTemplate.steps[index + 1];
          this.currentTemplate.steps[index + 1] = temp;
          this.renderTemplateEditor();
        }
      });
    });

    // Delete step
    document.querySelectorAll('.delete-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if (confirm('Delete this step?')) {
          this.currentTemplate.steps.splice(index, 1);
          // Renumber steps
          this.currentTemplate.steps.forEach((step, i) => {
            step.stepNumber = i + 1;
          });
          this.renderTemplateEditor();
        }
      });
    });

    // Add field
    document.querySelectorAll('.add-field-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stepIndex = parseInt(btn.dataset.stepIndex);
        this.addFieldToStep(stepIndex);
      });
    });

    // Delete field
    document.querySelectorAll('.delete-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const stepIndex = parseInt(btn.dataset.stepIndex);
        const fieldIndex = parseInt(btn.dataset.fieldIndex);
        if (confirm('Delete this field?')) {
          this.currentTemplate.steps[stepIndex].fields.splice(fieldIndex, 1);
          this.renderTemplateEditor();
        }
      });
    });
  }

  addFieldToStep(stepIndex) {
    const step = this.currentTemplate.steps[stepIndex];
    
    // Simple field creation dialog
    const name = prompt('Field name (snake_case):', 'field_name');
    if (!name) return;

    const type = prompt('Field type (text/textarea/select/selector/checkbox/radio/url):', 'text');
    if (!type) return;

    const label = prompt('Field label:', name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const required = confirm('Is this field required?');

    const field = {
      name,
      type,
      label,
      required,
      placeholder: `Enter ${label}...`
    };

    if (type === 'selector') {
      field.hint = 'Click element on page to capture selector';
    }

    if (!step.fields) step.fields = [];
    step.fields.push(field);
    
    this.renderTemplateEditor();
  }

  saveCurrentTemplate() {
    if (!this.currentTemplate) return;

    // Update from form
    this.currentTemplate.name = document.getElementById('template-name')?.value || this.currentTemplate.name;
    this.currentTemplate.description = document.getElementById('template-description')?.value || '';
    this.currentTemplate.eventType = document.getElementById('template-event-type')?.value || 'other';
    this.currentTemplate.scraperSource = document.getElementById('template-source-id')?.value || '';
    this.currentTemplate.modified = new Date().toISOString();

    // Add or update in list
    const existingIndex = this.templates.findIndex(t => t.id === this.currentTemplate.id);
    if (existingIndex >= 0) {
      this.templates[existingIndex] = this.currentTemplate;
    } else {
      this.templates.push(this.currentTemplate);
    }

    this.saveTemplates();
    alert('✅ Template saved!');
    
    this.currentTemplate = null;
    document.getElementById('template-editor').innerHTML = '';
    this.renderTemplatesList();
  }

  getDefaultTemplates() {
    return [
      {
        id: 'default-legislative',
        name: 'Legislative Calendar',
        description: 'Default template for legislative/government calendars',
        eventType: 'legislative_calendar',
        scraperSource: 'default_legislative',
        steps: [
          {
            stepNumber: 1,
            stepName: 'Metadata',
            stepIcon: '📋',
            captureMode: false,
            instruction: 'Fill in basic information about the calendar',
            fields: [
              { name: 'jurisdiction', type: 'text', required: true, label: 'Jurisdiction Name', placeholder: 'e.g., City of Boston' },
              { name: 'state_code', type: 'select', required: true, label: 'State Code' },
              { name: 'calendar_url', type: 'url', required: true, label: 'Calendar URL', autofill: 'currentUrl' },
              { name: 'requires_puppeteer', type: 'radio', required: true, label: 'Requires Puppeteer?', options: ['yes', 'no'], default: 'no' }
            ]
          },
          {
            stepNumber: 2,
            stepName: 'Calendar Structure',
            stepIcon: '📅',
            captureMode: true,
            instruction: 'Click elements on the page to capture the calendar structure',
            fields: [
              { name: 'event_container', type: 'selector', required: false, label: 'Event List Container', hint: 'Parent element containing all events' },
              { name: 'event_item', type: 'selector', required: false, label: 'Single Event Item', hint: 'One event in the list' }
            ]
          },
          {
            stepNumber: 3,
            stepName: 'Event Fields',
            stepIcon: '📝',
            captureMode: true,
            instruction: 'Click elements to capture event data fields',
            fields: [
              { name: 'name', type: 'selector', required: true, label: 'Event Name' },
              { name: 'date', type: 'selector', required: true, label: 'Date' },
              { name: 'time', type: 'selector', required: false, label: 'Time' },
              { name: 'location', type: 'selector', required: false, label: 'Location' }
            ]
          }
        ],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    ];
  }
}

export default TemplateManager;

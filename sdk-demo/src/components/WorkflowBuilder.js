/**
 * Agent Workflow Builder UI
 * Visual interface for creating multi-step workflows with iterative learning
 */

import { AgentWorkflow } from '../agents/AgentWorkflow.js';

export class WorkflowBuilder {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.workflow = new AgentWorkflow();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="workflow-builder">
        <!-- Workflow Header -->
        <div class="workflow-header">
          <input 
            type="text" 
            id="workflow-name" 
            placeholder="Workflow Name" 
            value="${this.workflow.name}"
            class="workflow-title-input"
          />
          <textarea 
            id="workflow-description" 
            placeholder="Describe what this workflow does..."
            class="workflow-description-input"
          >${this.workflow.description}</textarea>
        </div>

        <!-- Configuration Section -->
        <div class="workflow-config">
          <h3>⚙️ Configuration</h3>
          
          <div class="config-row">
            <label>Model:</label>
            <select id="workflow-model">
              <option value="qwen2.5-coder:14b">qwen2.5-coder:14b (Code)</option>
              <option value="qwen2.5:14b">qwen2.5:14b (General)</option>
              <option value="qwen2.5:7b">qwen2.5:7b (Fast)</option>
              <option value="llama3.2:latest">llama3.2 (Creative)</option>
            </select>
          </div>

          <div class="config-row">
            <label>
              <input type="checkbox" id="iterative-mode" />
              Enable Iterative Learning
            </label>
          </div>

          <div id="iterative-config" style="display: none; margin-left: 20px;">
            <div class="config-row">
              <label>Max Iterations:</label>
              <input type="number" id="max-iterations" value="5" min="2" max="20" />
            </div>
            <div class="config-row">
              <label>Learning Strategy:</label>
              <select id="learning-strategy">
                <option value="refine">Refine (improve incrementally)</option>
                <option value="explore">Explore (try variations)</option>
                <option value="exploit">Exploit (double down)</option>
              </select>
            </div>
            <div class="config-row">
              <label>Improvement Threshold:</label>
              <input type="number" id="improvement-threshold" value="0.1" min="0" max="1" step="0.05" />
              <span class="hint">Stop if improvement < threshold</span>
            </div>
          </div>
        </div>

        <!-- Context Files Section -->
        <div class="workflow-section">
          <h3>📁 Context Files</h3>
          <button id="add-context-file" class="btn-secondary">+ Add File</button>
          <input type="file" id="file-upload" multiple style="display: none;" />
          <div id="context-files-list" class="context-files-list"></div>
        </div>

        <!-- Steps Section -->
        <div class="workflow-section">
          <h3>📝 Workflow Steps</h3>
          <button id="add-step" class="btn-primary">+ Add Step</button>
          <div id="steps-list" class="steps-list"></div>
        </div>

        <!-- Actions -->
        <div class="workflow-actions">
          <button id="execute-workflow" class="btn-execute">▶ Execute Workflow</button>
          <button id="save-workflow" class="btn-secondary">💾 Save</button>
          <button id="load-workflow" class="btn-secondary">📂 Load</button>
          <button id="export-workflow" class="btn-secondary">📤 Export JSON</button>
        </div>

        <!-- Results Section -->
        <div id="workflow-results" class="workflow-results" style="display: none;"></div>
      </div>
    `;

    this.attachEventListeners();
    this.renderSteps();
    this.renderContextFiles();
  }

  attachEventListeners() {
    // Workflow config
    document.getElementById('workflow-name').addEventListener('input', (e) => {
      this.workflow.name = e.target.value;
    });

    document.getElementById('workflow-description').addEventListener('input', (e) => {
      this.workflow.description = e.target.value;
    });

    document.getElementById('workflow-model').addEventListener('change', (e) => {
      this.workflow.model = e.target.value;
    });

    document.getElementById('iterative-mode').addEventListener('change', (e) => {
      this.workflow.iterativeMode = e.target.checked;
      document.getElementById('iterative-config').style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('max-iterations').addEventListener('change', (e) => {
      this.workflow.maxIterations = parseInt(e.target.value);
    });

    document.getElementById('learning-strategy').addEventListener('change', (e) => {
      this.workflow.learningStrategy = e.target.value;
    });

    document.getElementById('improvement-threshold').addEventListener('change', (e) => {
      this.workflow.improvementThreshold = parseFloat(e.target.value);
    });

    // Context files
    document.getElementById('add-context-file').addEventListener('click', () => {
      document.getElementById('file-upload').click();
    });

    document.getElementById('file-upload').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const content = await file.text();
        this.workflow.addContextFile({ name: file.name, content });
      }
      this.renderContextFiles();
    });

    // Steps
    document.getElementById('add-step').addEventListener('click', () => {
      this.showStepEditor();
    });

    // Actions
    document.getElementById('execute-workflow').addEventListener('click', () => {
      this.executeWorkflow();
    });

    document.getElementById('save-workflow').addEventListener('click', () => {
      this.saveWorkflow();
    });

    document.getElementById('load-workflow').addEventListener('click', () => {
      this.loadWorkflow();
    });

    document.getElementById('export-workflow').addEventListener('click', () => {
      this.exportWorkflow();
    });
  }

  renderContextFiles() {
    const container = document.getElementById('context-files-list');
    
    if (this.workflow.contextFiles.length === 0) {
      container.innerHTML = '<div class="empty-state">No context files added</div>';
      return;
    }

    container.innerHTML = this.workflow.contextFiles.map((file, index) => `
      <div class="context-file-item">
        <span class="file-icon">📄</span>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
        </div>
        <button class="btn-remove" data-index="${index}">✖</button>
      </div>
    `).join('');

    // Attach remove handlers
    container.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.workflow.contextFiles.splice(index, 1);
        this.renderContextFiles();
      });
    });
  }

  renderSteps() {
    const container = document.getElementById('steps-list');
    
    if (this.workflow.steps.length === 0) {
      container.innerHTML = '<div class="empty-state">No steps added. Click "+ Add Step" to begin.</div>';
      return;
    }

    container.innerHTML = this.workflow.steps.map((step, index) => `
      <div class="step-item" data-step-id="${step.id}">
        <div class="step-header">
          <span class="step-number">${index + 1}</span>
          <span class="step-name">${step.name}</span>
          <div class="step-actions">
            <button class="btn-icon" data-action="edit" data-step-id="${step.id}">✏️</button>
            <button class="btn-icon" data-action="delete" data-step-id="${step.id}">🗑️</button>
          </div>
        </div>
        <div class="step-details">
          <div class="step-prompt">${step.prompt.substring(0, 100)}${step.prompt.length > 100 ? '...' : ''}</div>
          ${step.tools.length > 0 ? `<div class="step-tools">🔧 Tools: ${step.tools.join(', ')}</div>` : ''}
          ${step.dependencies.length > 0 ? `<div class="step-deps">🔗 Depends on: ${step.dependencies.map(d => `Step ${d + 1}`).join(', ')}</div>` : ''}
        </div>
      </div>
    `).join('');

    // Attach action handlers
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const stepId = parseInt(e.target.dataset.stepId);
        
        if (action === 'edit') {
          this.showStepEditor(stepId);
        } else if (action === 'delete') {
          this.workflow.steps = this.workflow.steps.filter(s => s.id !== stepId);
          this.renderSteps();
        }
      });
    });
  }

  showStepEditor(stepId = null) {
    const step = stepId !== null ? this.workflow.steps.find(s => s.id === stepId) : null;
    const isEdit = step !== null;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content step-editor-modal">
        <h2>${isEdit ? 'Edit Step' : 'Add New Step'}</h2>
        
        <div class="form-group">
          <label>Step Name:</label>
          <input type="text" id="step-name" value="${step?.name || ''}" placeholder="e.g., Fetch Data" />
        </div>

        <div class="form-group">
          <label>Prompt:</label>
          <textarea id="step-prompt" rows="6" placeholder="What should this step do?">${step?.prompt || ''}</textarea>
        </div>

        <div class="form-group">
          <label>System Prompt (optional):</label>
          <textarea id="step-system-prompt" rows="3" placeholder="Additional instructions for this step">${step?.systemPrompt || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Dependencies:</label>
          <select id="step-dependencies" multiple>
            ${this.workflow.steps.filter(s => !isEdit || s.id !== stepId).map(s => `
              <option value="${s.id}" ${step?.dependencies?.includes(s.id) ? 'selected' : ''}>
                Step ${s.id + 1}: ${s.name}
              </option>
            `).join('')}
          </select>
          <span class="hint">Hold Ctrl/Cmd to select multiple</span>
        </div>

        <div class="form-group">
          <label>Available Tools:</label>
          <div class="tool-checkboxes">
            ${Array.from(this.workflow.tools.keys()).map(tool => `
              <label>
                <input type="checkbox" value="${tool}" ${step?.tools?.includes(tool) ? 'checked' : ''} />
                ${tool}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="step-retry" ${step?.retryOnFail !== false ? 'checked' : ''} />
            Retry on failure
          </label>
          <input type="number" id="step-max-retries" value="${step?.maxRetries || 3}" min="1" max="10" style="width: 60px; margin-left: 10px;" />
          <span>max retries</span>
        </div>

        <div class="modal-actions">
          <button id="save-step" class="btn-primary">${isEdit ? 'Update' : 'Add'} Step</button>
          <button id="cancel-step" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Save handler
    document.getElementById('save-step').addEventListener('click', () => {
      const selectedTools = Array.from(modal.querySelectorAll('.tool-checkboxes input:checked')).map(cb => cb.value);
      const selectedDeps = Array.from(document.getElementById('step-dependencies').selectedOptions).map(opt => parseInt(opt.value));

      const stepData = {
        name: document.getElementById('step-name').value,
        prompt: document.getElementById('step-prompt').value,
        systemPrompt: document.getElementById('step-system-prompt').value,
        dependencies: selectedDeps,
        tools: selectedTools,
        retryOnFail: document.getElementById('step-retry').checked,
        maxRetries: parseInt(document.getElementById('step-max-retries').value)
      };

      if (isEdit) {
        // Update existing step
        const index = this.workflow.steps.findIndex(s => s.id === stepId);
        this.workflow.steps[index] = { ...this.workflow.steps[index], ...stepData };
      } else {
        // Add new step
        this.workflow.addStep(stepData);
      }

      modal.remove();
      this.renderSteps();
    });

    // Cancel handler
    document.getElementById('cancel-step').addEventListener('click', () => {
      modal.remove();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async executeWorkflow() {
    const resultsContainer = document.getElementById('workflow-results');
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div class="executing">⚙️ Executing workflow...</div>';

    try {
      const result = await this.workflow.execute({
        onProgress: (progress) => {
          if (progress.iteration) {
            resultsContainer.innerHTML = `
              <div class="progress">
                <h3>🔄 Iteration ${progress.iteration}/${progress.total}</h3>
                <p>Best Score: ${progress.bestScore.toFixed(2)}</p>
              </div>
            `;
          } else {
            resultsContainer.innerHTML = `
              <div class="progress">
                <h3>Step ${progress.step}/${progress.total}: ${progress.stepName}</h3>
                <p>Status: ${progress.status}</p>
              </div>
            `;
          }
        }
      });

      this.displayResults(result);

    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="error">
          <h3>❌ Execution Failed</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  displayResults(result) {
    const resultsContainer = document.getElementById('workflow-results');

    if (result.iterations) {
      // Iterative mode results
      resultsContainer.innerHTML = `
        <div class="results-success">
          <h3>✅ Iterative Execution Complete</h3>
          <div class="results-stats">
            <div class="stat">
              <span class="stat-label">Iterations:</span>
              <span class="stat-value">${result.iterations.length}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Best Score:</span>
              <span class="stat-value">${result.bestScore.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Duration:</span>
              <span class="stat-value">${(result.duration / 1000).toFixed(1)}s</span>
            </div>
          </div>
          
          <h4>Iteration Progress:</h4>
          <div class="iteration-chart">
            ${result.iterations.map(iter => `
              <div class="iteration-bar">
                <span class="iteration-label">Iter ${iter.iteration}</span>
                <div class="iteration-progress" style="width: ${(iter.score / result.bestScore) * 100}%"></div>
                <span class="iteration-score">${iter.score.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>

          <h4>Best Result:</h4>
          <div class="step-results">
            ${result.result.results.map((stepResult, i) => `
              <div class="step-result">
                <h5>Step ${i + 1}: ${stepResult.stepName}</h5>
                <pre>${stepResult.output}</pre>
                ${stepResult.toolResults.length > 0 ? `
                  <div class="tool-results">
                    <strong>Tool Calls:</strong>
                    ${stepResult.toolResults.map(tr => `
                      <div class="tool-result">${tr.tool}: ${tr.success ? '✓' : '✗'}</div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Sequential mode results
      resultsContainer.innerHTML = `
        <div class="results-success">
          <h3>✅ Workflow Complete</h3>
          <div class="results-stats">
            <div class="stat">
              <span class="stat-label">Steps:</span>
              <span class="stat-value">${result.executedSteps}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Duration:</span>
              <span class="stat-value">${(result.duration / 1000).toFixed(1)}s</span>
            </div>
          </div>

          <div class="step-results">
            ${result.results.map((stepResult, i) => `
              <div class="step-result">
                <h5>Step ${i + 1}: ${stepResult.stepName}</h5>
                <pre>${stepResult.output}</pre>
                ${stepResult.toolResults.length > 0 ? `
                  <div class="tool-results">
                    <strong>Tool Calls:</strong>
                    ${stepResult.toolResults.map(tr => `
                      <div class="tool-result">${tr.tool}: ${tr.success ? '✓' : '✗'}</div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  saveWorkflow() {
    const config = this.workflow.export();
    localStorage.setItem(`workflow_${this.workflow.name}`, JSON.stringify(config));
    alert(`✅ Workflow "${this.workflow.name}" saved!`);
  }

  loadWorkflow() {
    const name = prompt('Enter workflow name to load:');
    if (!name) return;

    const saved = localStorage.getItem(`workflow_${name}`);
    if (!saved) {
      alert('❌ Workflow not found');
      return;
    }

    this.workflow = AgentWorkflow.import(JSON.parse(saved));
    this.render();
    alert(`✅ Workflow "${name}" loaded!`);
  }

  exportWorkflow() {
    const config = this.workflow.export();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.workflow.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Tab Navigation
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    button.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'library') {
      loadScraperLibrary();
    } else if (tabName === 'test') {
      populateTestScrapers();
    }
  });
});

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadTemplates();
  loadScraperLibrary();
});

// ========================================
// SCRAPER LIBRARY (localStorage)
// ========================================

let scrapers = [];
let templates = [];

// Load templates from database API and examples
async function loadTemplates() {
  templates = [];
  
  // Load from database API
  try {
    const apiResponse = await fetch('http://localhost:3001/api/templates');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      if (apiData.templates && Array.isArray(apiData.templates)) {
        templates.push(...apiData.templates.map(t => ({
          ...t,
          source: 'database',
          id: t.id
        })));
        console.log(`✅ Loaded ${apiData.templates.length} templates from database`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not load templates from database:', error.message);
  }
  
  // Load example templates from files
  const exampleFiles = [
    'honolulu-calendar.json',
    'extension-test-export.json',
    'test-static.json',
    'court-calendar-example.json'
  ];
  
  for (const file of exampleFiles) {
    try {
      const response = await fetch(chrome.runtime.getURL(`examples/${file}`));
      if (response.ok) {
        const template = await response.json();
        templates.push({
          ...template,
          source: 'example',
          filename: file
        });
      }
    } catch (error) {
      console.error(`Failed to load example ${file}:`, error);
    }
  }
  
  console.log(`📚 Total templates loaded: ${templates.length}`);
}

function loadScraperLibrary() {
  const stored = localStorage.getItem('scrapers');
  scrapers = stored ? JSON.parse(stored) : [];
  displayTemplates();
}

function displayTemplates() {
  const list = document.getElementById('scraper-list');
  
  if (templates.length === 0 && scrapers.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Loading templates...</p>';
    return;
  }
  
  let html = '';
  
  // Show templates first
  if (templates.length > 0) {
    html += '<div style="margin-bottom: 20px;"><h4 style="font-size: 13px; color: #666; margin-bottom: 8px;">📝 Templates (Click to Use)</h4>';
    html += templates.map((template, index) => {
      const isDatabase = template.source === 'database';
      const badge = isDatabase ? '<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">💾 DATABASE</span>' : '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">📁 EXAMPLE</span>';
      const eventType = template.storage?.eventType || template.type || 'Unknown';
      const description = template.description || 'No description';
      
      return `
        <div class="scraper-item" style="border-color: ${isDatabase ? '#3b82f6' : '#10b981'}; background: ${isDatabase ? 'rgba(59, 130, 246, 0.05)' : 'rgba(16, 185, 129, 0.05)'};">
          <h4>${template.name || 'Unnamed Template'}${badge}</h4>
          <p style="font-size: 11px; color: #666; margin: 4px 0;">${description}</p>
          <p style="font-size: 11px; color: #888;">Type: ${eventType} • Steps: ${template.steps?.length || 0}</p>
          <div class="scraper-actions">
            <button class="btn-success use-template-btn" data-template-index="${index}" style="flex: 2;">✨ Use Template</button>
            <button class="btn-secondary view-template-btn" data-template-index="${index}">👁️ View</button>
          </div>
        </div>
      `;
    }).join('');
    html += '</div>';
  }
  
  // Show saved scrapers
  if (scrapers.length > 0) {
    html += '<div><h4 style="font-size: 13px; color: #666; margin-bottom: 8px;">💾 Your Scrapers</h4>';
    html += scrapers.map((scraper, index) => `
      <div class="scraper-item" data-index="${index}">
        <h4>${scraper.name || 'Unnamed Scraper'}</h4>
        <p>${scraper.jurisdiction || 'Unknown'} • ${scraper.level || 'local'} • ${scraper.stateCode || 'N/A'}</p>
        <div class="scraper-actions">
          <button class="btn-secondary view-scraper-btn" data-scraper-index="${index}">👁️ View</button>
          <button class="btn-primary test-scraper-btn" data-scraper-index="${index}">🧪 Test</button>
          <button class="btn-secondary export-scraper-btn" data-scraper-index="${index}">💾 Export</button>
          <button class="btn-danger delete-scraper-btn" data-scraper-index="${index}">🗑️</button>
        </div>
      </div>
    `).join('');
    html += '</div>';
  }
  
  if (html === '') {
    html = '<p style="text-align: center; color: #999; padding: 20px;">No templates or scrapers available</p>';
  }
  
  list.innerHTML = html;
  
  // Add event listeners using event delegation
  list.querySelectorAll('.use-template-btn').forEach(btn => {
    btn.addEventListener('click', () => useTemplate(parseInt(btn.dataset.templateIndex)));
  });
  
  list.querySelectorAll('.view-template-btn').forEach(btn => {
    btn.addEventListener('click', () => viewTemplate(parseInt(btn.dataset.templateIndex)));
  });
  
  list.querySelectorAll('.view-scraper-btn').forEach(btn => {
    btn.addEventListener('click', () => viewScraperDetails(parseInt(btn.dataset.scraperIndex)));
  });
  
  list.querySelectorAll('.test-scraper-btn').forEach(btn => {
    btn.addEventListener('click', () => testScraper(parseInt(btn.dataset.scraperIndex)));
  });
  
  list.querySelectorAll('.export-scraper-btn').forEach(btn => {
    btn.addEventListener('click', () => exportScraperJson(parseInt(btn.dataset.scraperIndex)));
  });
  
  list.querySelectorAll('.delete-scraper-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteScraper(parseInt(btn.dataset.scraperIndex)));
  });
}

function saveScrapers() {
  localStorage.setItem('scrapers', JSON.stringify(scrapers));
  displayTemplates();
}

function useTemplate(index) {
  const template = templates[index];
  const newScraper = JSON.parse(JSON.stringify(template)); // Deep clone
  scrapers.push(newScraper);
  saveScrapers();
  showStatus(`✅ Added "${newScraper.name}" to your scrapers!`, 'success');
}

function viewTemplate(index) {
  const template = templates[index];
  const formatted = JSON.stringify(template, null, 2);
  alert(`Template: ${template.name}\n\n${formatted.substring(0, 500)}...\n\nClick "Use Template" to add to your library.`);
}

// Import JSON
document.getElementById('import-json-btn').addEventListener('click', () => {
  const jsonText = document.getElementById('import-json').value.trim();
  
  if (!jsonText) {
    alert('Please paste scraper JSON');
    return;
  }
  
  try {
    const scraper = JSON.parse(jsonText);
    
    // Validate required fields
    if (!scraper.name || !scraper.startUrl) {
      alert('Invalid scraper: missing required fields (name, startUrl)');
      return;
    }
    
    // Add to library
    scrapers.push(scraper);
    saveScrapers();
    
    // Clear input
    document.getElementById('import-json').value = '';
    
    showStatus(`✅ Scraper "${scraper.name}" imported successfully!`, 'success');
  } catch (error) {
    showStatus(`❌ Invalid JSON: ${error.message}`, 'error');
  }
});

function viewScraperDetails(index) {
  const scraper = scrapers[index];
  alert(`Scraper Details:\n\n${JSON.stringify(scraper, null, 2)}`);
}

function exportScraperJson(index) {
  const scraper = scrapers[index];
  const json = JSON.stringify(scraper, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(json).then(() => {
    showStatus(`✅ "${scraper.name}" copied to clipboard!`, 'success');
  }).catch(() => {
    // Fallback: show in dialog
    prompt('Copy this JSON:', json);
  });
}

function testScraper(index) {
  // Switch to test tab and select this scraper
  document.querySelector('[data-tab="test"]').click();
  setTimeout(() => {
    const select = document.getElementById('test-scraper-select');
    select.value = index;
    select.dispatchEvent(new Event('change'));
  }, 100);
}

function deleteScraper(index) {
  if (!confirm(`Delete "${scrapers[index].name}"?`)) return;
  
  scrapers.splice(index, 1);
  saveScrapers();
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) {
    alert(message);
    return;
  }
  
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// ========================================
// TEMPLATE CREATOR TAB
// ========================================

let templateSteps = [];

function renderStepsList() {
  const container = document.getElementById('steps-list');
  if (!container) return;
  
  if (templateSteps.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No steps added yet. Click "Add Step" to begin.</p>';
    return;
  }
  
  container.innerHTML = templateSteps.map((step, index) => `
    <div style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="font-size: 13px;">Step ${index + 1}: ${step.stepName || 'Unnamed Step'}</strong>
            ${step.stepIcon ? `<span>${step.stepIcon}</span>` : ''}
          </div>
          <div style="font-size: 11px; color: #666;">
            ${step.fields.length} field(s) • ${step.captureMode ? '🎯 Capture Mode' : '📝 Form Mode'}
          </div>
        </div>
        <div style="display: flex; gap: 4px;">
          ${index > 0 ? `<button class="btn-secondary move-step-up-btn" data-step-index="${index}" style="padding: 4px 8px; font-size: 11px;">↑</button>` : ''}
          ${index < templateSteps.length - 1 ? `<button class="btn-secondary move-step-down-btn" data-step-index="${index}" style="padding: 4px 8px; font-size: 11px;">↓</button>` : ''}
          <button class="btn-secondary edit-step-btn" data-step-index="${index}" style="padding: 4px 8px; font-size: 11px;">✏️</button>
          <button class="btn-danger delete-step-btn" data-step-index="${index}" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
        </div>
      </div>
      <div style="font-size: 11px; color: #888; margin-top: 8px;">
        Fields: ${step.fields.map(f => f.label).join(', ') || 'None'}
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.move-step-up-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.stepIndex);
      if (index > 0) {
        [templateSteps[index], templateSteps[index - 1]] = [templateSteps[index - 1], templateSteps[index]];
        renderStepsList();
        updateTemplatePreview();
      }
    });
  });
  
  container.querySelectorAll('.move-step-down-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.stepIndex);
      if (index < templateSteps.length - 1) {
        [templateSteps[index], templateSteps[index + 1]] = [templateSteps[index + 1], templateSteps[index]];
        renderStepsList();
        updateTemplatePreview();
      }
    });
  });
  
  container.querySelectorAll('.edit-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.stepIndex);
      editStep(index);
    });
  });
  
  container.querySelectorAll('.delete-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.stepIndex);
      if (confirm(`Delete step "${templateSteps[index].stepName}"?`)) {
        templateSteps.splice(index, 1);
        renderStepsList();
        updateTemplatePreview();
      }
    });
  });
}

function editStep(index) {
  const step = templateSteps[index];
  const stepName = prompt('Step Name:', step.stepName) || step.stepName;
  const stepIcon = prompt('Step Icon (emoji):', step.stepIcon) || step.stepIcon;
  const captureMode = confirm('Enable Capture Mode? (Click elements on page)');
  
  templateSteps[index] = {
    ...step,
    stepName,
    stepIcon,
    captureMode
  };
  
  // Now edit fields
  const fieldsJson = JSON.stringify(step.fields, null, 2);
  const newFieldsJson = prompt('Edit fields JSON:', fieldsJson);
  
  if (newFieldsJson) {
    try {
      templateSteps[index].fields = JSON.parse(newFieldsJson);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  }
  
  renderStepsList();
  updateTemplatePreview();
}

document.getElementById('add-step-btn')?.addEventListener('click', () => {
  const stepName = prompt('Step Name:', `Step ${templateSteps.length + 1}`);
  if (!stepName) return;
  
  const stepIcon = prompt('Step Icon (emoji, optional):', '📋');
  const captureMode = confirm('Enable Capture Mode? (Users click elements to capture selectors)');
  
  const newStep = {
    stepNumber: templateSteps.length + 1,
    stepName: stepName,
    stepIcon: stepIcon || '📋',
    captureMode: captureMode,
    fields: []
  };
  
  // Add some example fields
  const addExampleFields = confirm('Add example fields to this step?');
  if (addExampleFields) {
    if (captureMode) {
      newStep.fields = [
        { name: 'selector_example', type: 'selector', required: true, label: 'Example Selector Field' }
      ];
    } else {
      newStep.fields = [
        { name: 'text_example', type: 'text', required: true, label: 'Example Text Field', placeholder: 'Enter value...' }
      ];
    }
  }
  
  templateSteps.push(newStep);
  renderStepsList();
  updateTemplatePreview();
});

function updateTemplatePreview() {
  const name = document.getElementById('template-name')?.value.trim();
  const description = document.getElementById('template-description')?.value.trim();
  const eventType = document.getElementById('template-event-type')?.value.trim();
  const scraperSource = document.getElementById('template-scraper-source')?.value.trim();
  
  if (!name && templateSteps.length === 0) {
    document.getElementById('template-preview').style.display = 'none';
    return;
  }
  
  const template = {
    name: name || 'Untitled Template',
    description: description || '',
    steps: templateSteps,
    storage: {
      table: 'events',  // Always use unified events table
      eventType: eventType || 'other',
      scraperSource: scraperSource || name.toLowerCase().replace(/\s+/g, '_'),
      useMetadata: true  // Store scraper-specific fields in JSONB metadata column
    },
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  document.getElementById('template-preview-json').textContent = JSON.stringify(template, null, 2);
  document.getElementById('template-preview').style.display = 'block';
}

// Update preview on input changes
['template-name', 'template-description', 'template-scraper-source'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateTemplatePreview);
});

document.getElementById('template-event-type')?.addEventListener('change', updateTemplatePreview);

document.getElementById('save-template')?.addEventListener('click', async () => {
  const name = document.getElementById('template-name').value.trim();
  const description = document.getElementById('template-description').value.trim();
  const eventType = document.getElementById('template-event-type').value.trim();
  const scraperSource = document.getElementById('template-scraper-source').value.trim();
  
  if (!name) {
    alert('❌ Please enter a template name');
    return;
  }
  
  if (!eventType) {
    alert('❌ Please select an event type');
    return;
  }
  
  if (!scraperSource) {
    alert('❌ Please enter a scraper source ID');
    return;
  }
  
  if (templateSteps.length === 0) {
    alert('❌ Please add at least one step');
    return;
  }
  
  const template = {
    name,
    description,
    steps: templateSteps,
    storage: {
      table: 'events',
      eventType,
      scraperSource,
      useMetadata: true
    }
  };
  
  // Save to backend API
  try {
    const response = await fetch('http://localhost:3001/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    
    const statusEl = document.getElementById('template-save-status');
    statusEl.innerHTML = `✅ Template "${name}" saved to database! <a href="#" id="view-in-library-link" style="color: #059669; text-decoration: underline;">View in Library</a>`;
    statusEl.style.background = '#d1fae5';
    statusEl.style.border = '1px solid #10b981';
    statusEl.style.color = '#065f46';
    statusEl.style.display = 'block';
    
    // Add click handler for library link
    setTimeout(() => {
      document.getElementById('view-in-library-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        // Switch to Library tab
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelector('[data-tab="library"]').classList.add('active');
        document.getElementById('tab-library').classList.add('active');
        // Refresh library
        loadTemplates().then(() => {
          loadScraperLibrary();
        });
      });
    }, 100);
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 10000);
    
  } catch (error) {
    const statusEl = document.getElementById('template-save-status');
    statusEl.textContent = `❌ Error saving template: ${error.message}`;
    statusEl.style.background = '#fee2e2';
    statusEl.style.border = '1px solid #ef4444';
    statusEl.style.color = '#991b1b';
    statusEl.style.display = 'block';
  }
});

document.getElementById('export-template-json')?.addEventListener('click', () => {
  const name = document.getElementById('template-name').value.trim();
  
  if (!name || templateSteps.length === 0) {
    alert('❌ Please fill in template name and add at least one step');
    return;
  }
  
  const template = {
    name,
    description: document.getElementById('template-description').value.trim(),
    steps: templateSteps,
    storage: {
      table: 'events',
      eventType: document.getElementById('template-event-type').value.trim() || 'other',
      scraperSource: document.getElementById('template-scraper-source').value.trim() || name.toLowerCase().replace(/\s+/g, '_'),
      useMetadata: true
    },
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  const json = JSON.stringify(template, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(json).then(() => {
    alert('✅ Template JSON copied to clipboard!');
  }).catch(() => {
    prompt('Copy this template JSON:', json);
  });
});

document.getElementById('import-template-json')?.addEventListener('click', () => {
  const choice = confirm('Import from file? (OK)\nOr paste JSON from clipboard? (Cancel)');
  
  if (choice) {
    // Import from file
    const fileInput = document.getElementById('import-template-file');
    fileInput.click();
  } else {
    // Import from clipboard/paste
    navigator.clipboard.readText().then(text => {
      importTemplateFromJSON(text);
    }).catch(() => {
      const json = prompt('Paste template JSON:');
      if (json) {
        importTemplateFromJSON(json);
      }
    });
  }
});

document.getElementById('import-template-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    importTemplateFromJSON(event.target.result);
  };
  reader.onerror = () => {
    alert('❌ Error reading file');
  };
  reader.readAsText(file);
  
  // Reset file input
  e.target.value = '';
});

function importTemplateFromJSON(jsonString) {
  try {
    const template = JSON.parse(jsonString);
    
    // Validate template structure
    if (!template.name) {
      alert('❌ Invalid template: missing "name" field');
      return;
    }
    
    if (!template.steps || !Array.isArray(template.steps)) {
      alert('❌ Invalid template: missing or invalid "steps" array');
      return;
    }
    
    // Load template data into form
    document.getElementById('template-name').value = template.name;
    document.getElementById('template-description').value = template.description || '';
    
    if (template.storage) {
      // Handle new format (eventType + scraperSource)
      if (template.storage.eventType) {
        document.getElementById('template-event-type').value = template.storage.eventType;
        document.getElementById('template-scraper-source').value = template.storage.scraperSource || '';
      }
      // Handle legacy format (tableName) - convert to new format
      else if (template.storage.tableName) {
        document.getElementById('template-event-type').value = 'other';
        document.getElementById('template-scraper-source').value = template.storage.tableName;
        console.warn('⚠️ Imported legacy template format - converted tableName to scraperSource');
      }
    }
    
    // Load steps
    templateSteps = template.steps.map((step, index) => ({
      stepNumber: step.stepNumber || index + 1,
      stepName: step.stepName || `Step ${index + 1}`,
      stepIcon: step.stepIcon || '📋',
      captureMode: step.captureMode || false,
      fields: step.fields || [],
      fieldGroups: step.fieldGroups || []
    }));
    
    renderStepsList();
    updateTemplatePreview();
    
    const message = `✅ Imported template "${template.name}" with ${templateSteps.length} step(s)! <a href="#" id="view-imported-link" style="color: #059669; text-decoration: underline;">View in Library</a>`;
    
    const confirmDiv = document.createElement('div');
    confirmDiv.style.cssText = 'padding: 12px; background: #d1fae5; border: 1px solid #10b981; border-radius: 4px; margin-top: 12px; font-size: 12px; color: #065f46;';
    confirmDiv.innerHTML = message;
    
    const form = document.getElementById('template-form');
    form.insertBefore(confirmDiv, form.firstChild);
    
    // Add click handler
    setTimeout(() => {
      document.getElementById('view-imported-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        confirmDiv.remove();
        // Switch to Library tab
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelector('[data-tab="library"]').classList.add('active');
        document.getElementById('tab-library').classList.add('active');
      });
    }, 100);
    
    setTimeout(() => {
      confirmDiv.remove();
    }, 10000);
    
  } catch (error) {
    alert(`❌ Error parsing JSON: ${error.message}\n\nPlease ensure the JSON is valid.`);
  }
}

document.getElementById('load-legislative-template')?.addEventListener('click', () => {
  // Load the default legislative calendar template structure
  templateSteps = [
    {
      stepNumber: 1,
      stepName: 'Metadata',
      stepIcon: '📋',
      captureMode: false,
      fields: [
        { name: 'jurisdiction', type: 'text', required: true, label: 'Jurisdiction Name' },
        { name: 'state_code', type: 'select', required: true, label: 'State Code' },
        { name: 'level', type: 'radio', required: true, label: 'Level' }
      ]
    },
    {
      stepNumber: 2,
      stepName: 'Calendar Structure',
      stepIcon: '📅',
      captureMode: true,
      fields: [
        { name: 'event_container', type: 'selector', required: true, label: 'Event List Container' },
        { name: 'event_item', type: 'selector', required: true, label: 'Single Event Item' }
      ]
    },
    {
      stepNumber: 3,
      stepName: 'Event Fields',
      stepIcon: '📝',
      captureMode: true,
      fields: [
        { name: 'name', type: 'selector', required: true, label: 'Event Name' },
        { name: 'date', type: 'selector', required: true, label: 'Date' },
        { name: 'time', type: 'selector', required: false, label: 'Time' }
      ]
    }
  ];
  
  renderStepsList();
  updateTemplatePreview();
  alert('✅ Loaded legislative calendar template example with 3 steps');
});

// Initialize
if (document.getElementById('steps-list')) {
  renderStepsList();
}

// ========================================
// TEST SCRAPER
// ========================================

function populateTestScrapers() {
  const select = document.getElementById('test-scraper-select');
  const stored = localStorage.getItem('scrapers');
  scrapers = stored ? JSON.parse(stored) : [];
  
  select.innerHTML = '<option value="">Choose a scraper to test...</option>';
  
  scrapers.forEach((scraper, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${scraper.name} (${scraper.jurisdiction})`;
    select.appendChild(option);
  });
}

let selectedScraperIndex = null;

document.getElementById('test-scraper-select').addEventListener('change', (e) => {
  const index = e.target.value;
  const runBtn = document.getElementById('run-test-btn');
  const infoDiv = document.getElementById('selected-scraper-info');
  
  if (index === '') {
    runBtn.disabled = true;
    infoDiv.style.display = 'none';
    selectedScraperIndex = null;
    return;
  }
  
  selectedScraperIndex = parseInt(index);
  const scraper = scrapers[selectedScraperIndex];
  
  // Show scraper info
  document.getElementById('test-scraper-name').textContent = scraper.name;
  document.getElementById('test-scraper-details').textContent = 
    `${scraper.jurisdiction} • ${scraper.level} • URL: ${scraper.startUrl}`;
  infoDiv.style.display = 'block';
  
  runBtn.disabled = false;
});

document.getElementById('run-test-btn').addEventListener('click', async () => {
  if (selectedScraperIndex === null) return;
  
  const scraper = scrapers[selectedScraperIndex];
  const runBtn = document.getElementById('run-test-btn');
  const outputDiv = document.getElementById('test-output');
  const resultsContent = document.getElementById('test-results-content');
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Running Test...';
  outputDiv.style.display = 'block';
  resultsContent.textContent = `Testing ${scraper.name} on ${tab.url}...\n\n`;
  
  try {
    // Inject content script and run test
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: testScraperOnPage,
      args: [scraper]
    });
    
    // Listen for results from content script
    chrome.runtime.onMessage.addListener(function handler(message) {
      if (message.type === 'testResults') {
        chrome.runtime.onMessage.removeListener(handler);
        
        resultsContent.textContent = `✅ Test Complete!\n\n`;
        resultsContent.textContent += `Items Found: ${message.results.length}\n\n`;
        resultsContent.textContent += JSON.stringify(message.results, null, 2);
        
        runBtn.disabled = false;
        runBtn.textContent = '▶️ Run Test on Current Page';
      } else if (message.type === 'testError') {
        chrome.runtime.onMessage.removeListener(handler);
        
        resultsContent.textContent = `❌ Test Failed\n\n`;
        resultsContent.textContent += `Error: ${message.error}\n\n`;
        resultsContent.textContent += message.stack || '';
        
        runBtn.disabled = false;
        runBtn.textContent = '▶️ Run Test on Current Page';
      }
    });
    
  } catch (error) {
    resultsContent.textContent = `❌ Injection Failed\n\n${error.message}`;
    runBtn.disabled = false;
    runBtn.textContent = '▶️ Run Test on Current Page';
  }
});

// This function runs in the context of the page
function testScraperOnPage(scraper) {
  try {
    const results = [];
    
    // Get page structure info
    const pageStructure = scraper.pageStructures && scraper.pageStructures[0];
    if (!pageStructure) {
      throw new Error('No page structure defined in scraper');
    }
    
    // Find container
    const container = document.querySelector(pageStructure.containerSelector);
    if (!container) {
      throw new Error(`Container not found: ${pageStructure.containerSelector}`);
    }
    
    // Find all items
    const items = container.querySelectorAll(pageStructure.itemSelector);
    
    if (items.length === 0) {
      chrome.runtime.sendMessage({
        type: 'testResults',
        results: []
      });
      return;
    }
    
    // Extract data from each item
    items.forEach((item, index) => {
      const data = { index: index + 1 };
      
      // Extract each field
      if (pageStructure.fields) {
        pageStructure.fields.forEach(field => {
          try {
            if (!field.selectorSteps || field.selectorSteps.length === 0) {
              return;
            }
            
            // Get the last selector step (the actual data selector)
            const lastStep = field.selectorSteps[field.selectorSteps.length - 1];
            const selector = lastStep.selector;
            
            if (!selector) return;
            
            const element = item.querySelector(selector);
            if (element) {
              if (field.fieldType === 'link') {
                data[field.fieldName] = element.href || element.getAttribute('href');
              } else if (field.fieldType === 'attribute') {
                const attr = lastStep.attribute || 'href';
                data[field.fieldName] = element.getAttribute(attr);
              } else {
                data[field.fieldName] = element.textContent.trim();
              }
            }
          } catch (err) {
            data[field.fieldName] = `Error: ${err.message}`;
          }
        });
      }
      
      results.push(data);
    });
    
    // Send results back to popup
    chrome.runtime.sendMessage({
      type: 'testResults',
      results: results
    });
    
  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'testError',
      error: error.message,
      stack: error.stack
    });
  }
}

document.getElementById('copy-results-btn').addEventListener('click', () => {
  const results = document.getElementById('test-results-content').textContent;
  navigator.clipboard.writeText(results).then(() => {
    const btn = document.getElementById('copy-results-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
});

// Refresh library button
document.getElementById('refresh-library-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('refresh-library-btn');
  const originalText = btn.textContent;
  btn.textContent = '🔄 Loading...';
  btn.disabled = true;
  
  await loadTemplates();
  loadScraperLibrary();
  
  btn.textContent = '✅ Refreshed!';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
  }, 2000);
});

// Load library on startup
loadTemplates().then(() => {
  loadScraperLibrary();
});

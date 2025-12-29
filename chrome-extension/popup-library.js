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

// Load example templates
async function loadTemplates() {
  const exampleFiles = [
    'honolulu-calendar.json',
    'extension-test-export.json',
    'test-static.json'
  ];
  
  for (const file of exampleFiles) {
    try {
      const response = await fetch(chrome.runtime.getURL(`examples/${file}`));
      if (response.ok) {
        const template = await response.json();
        templates.push(template);
      }
    } catch (error) {
      console.error(`Failed to load template ${file}:`, error);
    }
  }
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
    html += templates.map((template, index) => `
      <div class="scraper-item" style="border-color: #10b981; background: rgba(16, 185, 129, 0.05);">
        <h4>${template.name || 'Unnamed Template'}</h4>
        <p>${template.jurisdiction || 'Unknown'} • ${template.level || 'local'}</p>
        <div class="scraper-actions">
          <button class="btn-success use-template-btn" data-template-index="${index}" style="flex: 2;">✨ Use Template</button>
          <button class="btn-secondary view-template-btn" data-template-index="${index}">👁️ View</button>
        </div>
      </div>
    `).join('');
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

let templateRequiredFields = [];
let templateOptionalFields = [];

function renderFieldList(fields, containerId, isRequired) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (fields.length === 0) {
    container.innerHTML = '<p style="color: #999; font-size: 11px; margin: 0;">No fields added yet</p>';
    return;
  }
  
  container.innerHTML = fields.map((field, index) => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px; background: white; border: 1px solid #ddd; border-radius: 4px;">
      <span style="flex: 1; font-size: 12px;">${field}</span>
      <button class="btn-danger remove-field-btn" data-field-type="${isRequired ? 'required' : 'optional'}" data-field-index="${index}" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
    </div>
  `).join('');
  
  // Add event listeners to remove buttons
  container.querySelectorAll('.remove-field-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldType = btn.dataset.fieldType;
      const fieldIndex = parseInt(btn.dataset.fieldIndex);
      
      if (fieldType === 'required') {
        templateRequiredFields.splice(fieldIndex, 1);
        renderFieldList(templateRequiredFields, 'required-fields-list', true);
      } else {
        templateOptionalFields.splice(fieldIndex, 1);
        renderFieldList(templateOptionalFields, 'optional-fields-list', false);
      }
      
      updateTemplatePreview();
    });
  });
}

document.getElementById('add-required-field')?.addEventListener('click', () => {
  const input = document.getElementById('new-required-field');
  const fieldName = input.value.trim();
  
  if (!fieldName) return;
  
  if (templateRequiredFields.includes(fieldName)) {
    alert('Field already exists!');
    return;
  }
  
  templateRequiredFields.push(fieldName);
  renderFieldList(templateRequiredFields, 'required-fields-list', true);
  input.value = '';
  updateTemplatePreview();
});

document.getElementById('add-optional-field')?.addEventListener('click', () => {
  const input = document.getElementById('new-optional-field');
  const fieldName = input.value.trim();
  
  if (!fieldName) return;
  
  if (templateOptionalFields.includes(fieldName)) {
    alert('Field already exists!');
    return;
  }
  
  templateOptionalFields.push(fieldName);
  renderFieldList(templateOptionalFields, 'optional-fields-list', false);
  input.value = '';
  updateTemplatePreview();
});

// Allow Enter key to add fields
document.getElementById('new-required-field')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('add-required-field').click();
  }
});

document.getElementById('new-optional-field')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('add-optional-field').click();
  }
});

function updateTemplatePreview() {
  const name = document.getElementById('template-name')?.value.trim();
  const description = document.getElementById('template-description')?.value.trim();
  const category = document.getElementById('template-category')?.value;
  const tableName = document.getElementById('template-table')?.value.trim();
  const autoCreateTable = document.getElementById('template-auto-create-table')?.checked;
  
  if (!name && templateRequiredFields.length === 0 && templateOptionalFields.length === 0) {
    document.getElementById('template-preview').style.display = 'none';
    return;
  }
  
  const template = {
    name: name || 'Untitled Template',
    description: description || '',
    category: category || 'custom',
    requiredFields: templateRequiredFields,
    optionalFields: templateOptionalFields,
    storage: {
      tableName: tableName || name.toLowerCase().replace(/\s+/g, '_'),
      autoCreate: autoCreateTable
    },
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  document.getElementById('template-preview-json').textContent = JSON.stringify(template, null, 2);
  document.getElementById('template-preview').style.display = 'block';
}

// Update preview on input changes
['template-name', 'template-description', 'template-category', 'template-table'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateTemplatePreview);
});

document.getElementById('template-auto-create-table')?.addEventListener('change', updateTemplatePreview);

document.getElementById('save-template')?.addEventListener('click', async () => {
  const name = document.getElementById('template-name').value.trim();
  const description = document.getElementById('template-description').value.trim();
  const category = document.getElementById('template-category').value;
  const tableName = document.getElementById('template-table').value.trim();
  const autoCreateTable = document.getElementById('template-auto-create-table').checked;
  
  if (!name) {
    alert('❌ Please enter a template name');
    return;
  }
  
  if (templateRequiredFields.length === 0) {
    alert('❌ Please add at least one required field');
    return;
  }
  
  const template = {
    name,
    description,
    category: category || 'custom',
    requiredFields: templateRequiredFields,
    optionalFields: templateOptionalFields,
    storage: {
      tableName: tableName || name.toLowerCase().replace(/\s+/g, '_'),
      autoCreate: autoCreateTable
    },
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Save to localStorage for now (later can sync to DB)
  const existingTemplates = JSON.parse(localStorage.getItem('builderTemplates') || '[]');
  existingTemplates.push(template);
  localStorage.setItem('builderTemplates', JSON.stringify(existingTemplates));
  
  // Also save to examples directory format
  const filename = `${name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
  
  alert(`✅ Template "${name}" saved!\n\nFields: ${templateRequiredFields.length} required, ${templateOptionalFields.length} optional\n\nTemplate can now be used to create custom scrapers.`);
  
  // Clear form
  document.getElementById('template-name').value = '';
  document.getElementById('template-description').value = '';
  document.getElementById('template-category').value = '';
  document.getElementById('template-table').value = '';
  document.getElementById('template-auto-create-table').checked = false;
  templateRequiredFields = [];
  templateOptionalFields = [];
  renderFieldList(templateRequiredFields, 'required-fields-list', true);
  renderFieldList(templateOptionalFields, 'optional-fields-list', false);
  updateTemplatePreview();
});

document.getElementById('export-template-json')?.addEventListener('click', () => {
  const name = document.getElementById('template-name').value.trim();
  
  if (!name || templateRequiredFields.length === 0) {
    alert('❌ Please fill in template name and add at least one required field');
    return;
  }
  
  const template = {
    name,
    description: document.getElementById('template-description').value.trim(),
    category: document.getElementById('template-category').value || 'custom',
    requiredFields: templateRequiredFields,
    optionalFields: templateOptionalFields,
    storage: {
      tableName: document.getElementById('template-table').value.trim() || name.toLowerCase().replace(/\s+/g, '_'),
      autoCreate: document.getElementById('template-auto-create-table').checked
    },
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  const json = JSON.stringify(template, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(json).then(() => {
    alert('✅ Template JSON copied to clipboard!');
  }).catch(() => {
    // Fallback: show in dialog
    prompt('Copy this template JSON:', json);
  });
});

// Initialize field lists on load
if (document.getElementById('required-fields-list')) {
  renderFieldList(templateRequiredFields, 'required-fields-list', true);
  renderFieldList(templateOptionalFields, 'optional-fields-list', false);
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

// Load library on startup
loadScraperLibrary();

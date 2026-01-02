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

// Open detached window function
function openDetachedWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 450,
    height: 700,
    left: 100,
    top: 100
  }).then((window) => {
    console.log('✅ Detached window opened:', window.id);
  }).catch((error) => {
    console.error('Error opening detached window:', error);
    alert('Could not open detached window.');
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  // Hide "Open Window" button if we're already in a detached window
  chrome.windows.getCurrent((window) => {
    if (window.type === 'popup') {
      // We're in a detached window, hide the button
      const btnContainer = document.getElementById('detached-window-btn-container');
      if (btnContainer) {
        btnContainer.style.display = 'none';
      }
    } else {
      // We're in the extension popup, set up the button
      const detachedWindowBtn = document.getElementById('open-detached-window');
      if (detachedWindowBtn) {
        detachedWindowBtn.addEventListener('click', openDetachedWindow);
      }
    }
  });
  
  // Check if we should go straight to Build tab (template loaded or was capturing)
  chrome.storage.local.get(['templateLoaded', 'capturingField', 'activeBuilderTemplate'], (result) => {
    if (result.templateLoaded || result.capturingField || result.activeBuilderTemplate) {
      console.log('📍 Active template/capture detected, switching to Build tab');
      const buildButton = document.querySelector('[data-tab="build"]');
      if (buildButton) {
        buildButton.click();
      }
    }
  });
  
  // Set up change tab button
  const changeTabBtn = document.getElementById('change-tab-btn');
  if (changeTabBtn) {
    changeTabBtn.addEventListener('click', () => {
      clearSelectedTab();
      alert('✅ Tab cleared. Click any Capture button to select a new tab.');
    });
  }
  
  // Restore selected tab display
  chrome.storage.local.get(['selectedScrapingTab'], (result) => {
    if (result.selectedScrapingTab) {
      updateSelectedTabDisplay(result.selectedScrapingTab);
    }
  });
  
  // Initialize context guides checkboxes
  initializeContextGuides();
  
  // Initialize model selector
  await initializeModelSelector();
  
  await loadTemplates();
  loadScraperLibrary();
  restoreActiveTemplate();
});
// Initialize model selector
async function initializeModelSelector() {
  const selector = document.getElementById('agent-model-selector');
  const statusDiv = document.getElementById('model-status');
  
  if (!selector) return;
  
  try {
    // Load saved model preference
    const savedModel = localStorage.getItem('agentDefaultModel') || 'qwen2.5-coder:32b';
    selector.value = savedModel;
    
    // Check which models are actually available
    const agent = new window.ScraperAIAgent();
    const status = await agent.checkOllamaStatus();
    
    if (status.available && status.models.length > 0) {
      const availableNames = status.models.map(m => m.name);
      statusDiv.innerHTML = `✅ <strong>${status.models.length} models available</strong>`;
      statusDiv.style.color = '#10b981';
      
      // Disable options for models that aren't installed
      Array.from(selector.options).forEach(option => {
        if (option.value && !availableNames.includes(option.value)) {
          option.disabled = true;
          option.text += ' (not installed)';
          option.style.color = '#999';
        }
      });
      
      // If saved model isn't available, select first available
      if (!availableNames.includes(savedModel) && availableNames.length > 0) {
        selector.value = availableNames[0];
        localStorage.setItem('agentDefaultModel', availableNames[0]);
      }
    } else {
      statusDiv.innerHTML = '⚠️ Ollama not running - <a href="https://ollama.ai/download" target="_blank" style="color: #6366f1;">Install</a>';
      statusDiv.style.color = '#f59e0b';
    }
  } catch (error) {
    statusDiv.innerHTML = '❌ Error checking models';
    statusDiv.style.color = '#ef4444';
  }
  
  // Save model selection on change
  selector.addEventListener('change', () => {
    localStorage.setItem('agentDefaultModel', selector.value);
    console.log('🤖 Default model updated:', selector.value);
  });
}

// Initialize context guides checkboxes
function initializeContextGuides() {
  const container = document.getElementById('context-guides-container');
  if (!container || !window.SCRAPER_CONTEXTS) return;
  
  // Get saved selections from localStorage (default: scraper-guide + basic-selectors + error-handling)
  const savedSelections = JSON.parse(localStorage.getItem('agentContextGuides') || '["scraper-guide", "basic-selectors", "error-handling"]');
  
  // Get all available contexts
  const contexts = window.getContextInfo ? window.getContextInfo() : [];
  
  if (contexts.length === 0) {
    container.innerHTML = '<p style="color: #999; font-size: 11px; margin: 0;">No context guides available</p>';
    return;
  }
  
  // Create checkbox for each context
  container.innerHTML = contexts.map(ctx => `
    <label style="display: flex; align-items: start; gap: 6px; cursor: pointer;">
      <input type="checkbox" 
             data-context-key="${ctx.key}" 
             class="context-guide-checkbox"
             ${savedSelections.includes(ctx.key) ? 'checked' : ''}
             style="cursor: pointer; margin-top: 2px;">
      <span style="flex: 1;">
        <strong>${ctx.name}</strong><br>
        <span style="font-size: 10px; color: #666;">${ctx.size}</span>
      </span>
    </label>
  `).join('');
  
  // Add change listeners to save selections
  container.querySelectorAll('.context-guide-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selected = Array.from(container.querySelectorAll('.context-guide-checkbox:checked'))
        .map(cb => cb.dataset.contextKey);
      localStorage.setItem('agentContextGuides', JSON.stringify(selected));
      console.log('📚 Context guides updated:', selected);
      
      // Update agent's selected contexts if it exists
      if (window.ScraperAIAgent && window.agentInstance) {
        window.agentInstance.selectedContexts = selected;
        console.log('✅ Agent contexts updated');
      }
    });
  });
  
  console.log('📚 Initialized context guides:', savedSelections);
}

// Initialize context guides for a specific AI field
function initializeFieldContexts(fieldId) {
  const container = document.getElementById(`${fieldId}-ai-contexts`);
  if (!container || !window.SCRAPER_CONTEXTS) return;
  
  // Get field-specific contexts from AI settings
  chrome.storage.local.get(['builderAISettings'], (result) => {
    const aiSettings = result.builderAISettings || {};
    const fieldSettings = aiSettings[fieldId] || {};
    
    // Use field-specific contexts, or fall back to global defaults
    const defaultContexts = JSON.parse(localStorage.getItem('agentContextGuides') || '["scraper-guide", "basic-selectors", "error-handling"]');
    const fieldContexts = fieldSettings.contexts || defaultContexts;
    
    // Get all available contexts
    const contexts = window.getContextInfo ? window.getContextInfo() : [];
    
    if (contexts.length === 0) {
      container.innerHTML = '<small style="color: #999;">No guides available</small>';
      return;
    }
    
    // Create checkbox for each context
    const checkboxesHTML = contexts.map(ctx => `
      <label style="display: flex; align-items: start; gap: 4px; cursor: pointer; margin-bottom: 4px;">
        <input type="checkbox" 
               data-context-key="${ctx.key}" 
               class="field-context-checkbox"
               ${fieldContexts.includes(ctx.key) ? 'checked' : ''}
               style="cursor: pointer; margin-top: 2px;">
        <span style="flex: 1; font-size: 10px; color: #374151;">
          <strong>${ctx.name}</strong> <span style="color: #9ca3af;">(${ctx.size})</span>
        </span>
      </label>
    `).join('');
    
    container.innerHTML = checkboxesHTML;
    
    // Add change listeners
    container.querySelectorAll('.field-context-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const selected = Array.from(container.querySelectorAll('.field-context-checkbox:checked'))
          .map(cb => cb.dataset.contextKey);
        
        // Save to field settings
        chrome.storage.local.get(['builderAISettings'], (result) => {
          const aiSettings = result.builderAISettings || {};
          if (!aiSettings[fieldId]) aiSettings[fieldId] = {};
          aiSettings[fieldId].contexts = selected;
          
          chrome.storage.local.set({ builderAISettings: aiSettings }, () => {
            console.log(`📚 Field ${fieldId} contexts updated:`, selected);
          });
        });
      });
    });
  });
}

// SCRAPER LIBRARY (localStorage)
// ========================================

let scrapers = [];
let templates = [];

// Load templates from database API and examples
async function loadTemplates() {
  templates = [];
  const seenNames = new Set();
  
  // Load from database API
  try {
    const apiResponse = await fetch('http://localhost:3001/api/templates');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      if (apiData.templates && Array.isArray(apiData.templates)) {
        apiData.templates.forEach(t => {
          // Only add if it has steps array (builder template)
          if (t.steps && Array.isArray(t.steps)) {
            templates.push({
              ...t,
              source: 'database',
              id: t.id
            });
            seenNames.add(t.name?.toLowerCase());
          }
        });
        console.log(`✅ Loaded ${templates.length} templates from database`);
      }
    }
  } catch (error) {
    console.log('ℹ️  Backend server not running - using example templates only');
    console.log('   To enable database templates, run: npm run execute');
  }
  
  // Load example templates from files
  const exampleFiles = [
    'legislative-calendar-template.json',
    'court-calendar-example.json'
  ];
  
  for (const file of exampleFiles) {
    try {
      const response = await fetch(chrome.runtime.getURL(`examples/${file}`));
      if (response.ok) {
        const template = await response.json();
        // Only add if it has steps array and not already loaded
        if (template.steps && Array.isArray(template.steps)) {
          const nameLower = template.name?.toLowerCase();
          if (!seenNames.has(nameLower)) {
            templates.push({
              ...template,
              source: 'example',
              filename: file
            });
            seenNames.add(nameLower);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load example ${file}:`, error);
    }
  }
  
  console.log(`📚 Total templates loaded: ${templates.length}`);
  populateTemplateSelector();
  populateBuildTemplateSelector();
}

function populateTemplateSelector() {
  const selector = document.getElementById('template-selector');
  if (!selector) return;
  
  // Clear existing options except the first one
  selector.innerHTML = '<option value="">Start from scratch...</option>';
  
  // Add templates as options
  templates.forEach((template, index) => {
    const option = document.createElement('option');
    option.value = index;
    const badge = template.source === 'database' ? '💾' : '📁';
    const type = template.storage?.eventType || 'other';
    option.textContent = `${badge} ${template.name} (${type})`;
    selector.appendChild(option);
  });
}

function populateBuildTemplateSelector() {
  const selector = document.getElementById('build-template-selector');
  if (!selector) return;
  
  // Clear existing options except the first one
  selector.innerHTML = '<option value="">Select a template...</option>';
  
  // Add templates as options
  templates.forEach((template, index) => {
    const option = document.createElement('option');
    option.value = index;
    const badge = template.source === 'database' ? '💾' : '📁';
    const type = template.storage?.eventType || 'other';
    option.textContent = `${badge} ${template.name} (${type})`;
    selector.appendChild(option);
  });
}

async function loadScraperLibrary() {
  // Always try database first
  const dbScrapers = await loadScrapersFromDatabase();
  if (dbScrapers.length > 0) {
    scrapers = dbScrapers;
    localStorage.setItem('scrapers', JSON.stringify(scrapers)); // Backup to localStorage
    console.log(`✅ Loaded ${dbScrapers.length} scrapers from database`);
    displayTemplates();
    return;
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem('scrapers');
  scrapers = stored ? JSON.parse(stored) : [];
  if (scrapers.length > 0) {
    console.log(`✅ Loaded ${scrapers.length} scrapers from localStorage (database offline)`);
  }
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
    html += scrapers.map((scraper, index) => {
      const createdDate = scraper.createdAt ? new Date(scraper.createdAt).toLocaleDateString() : 'Unknown';
      const fieldCount = Object.keys(scraper.fields || {}).length;
      const stepCount = Object.keys(scraper.steps || {}).length;
      
      return `
        <div class="scraper-item" data-index="${index}" style="border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05);">
          <h4>${scraper.name || 'Unnamed Scraper'} <span style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">✅ SAVED</span></h4>
          <p style="font-size: 11px; color: #666; margin: 4px 0;">Created: ${createdDate} • Fields: ${fieldCount} • Steps: ${stepCount}</p>
          <div class="scraper-actions">
            <button class="btn-secondary view-scraper-btn" data-scraper-index="${index}">👁️ View</button>
            <button class="btn-primary test-scraper-btn" data-scraper-index="${index}">🧪 Test</button>
            <button class="btn-secondary export-scraper-btn" data-scraper-index="${index}">💾 Export</button>
            <button class="btn-danger delete-scraper-btn" data-scraper-index="${index}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
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

async function saveScrapers() {
  // Always save to localStorage as backup
  localStorage.setItem('scrapers', JSON.stringify(scrapers));
  displayTemplates();
  
  // Always try to sync to database
  await syncScrapersToDatabase();
}

// Sync scrapers to PostgreSQL database
async function syncScrapersToDatabase() {
  const apiUrl = 'http://localhost:3001';
  
  try {
    for (const scraper of scrapers) {
      if (scraper.id) {
        // Update existing
        await fetch(`${apiUrl}/api/scrapers/${scraper.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scraper)
        });
      } else {
        // Create new
        const response = await fetch(`${apiUrl}/api/scrapers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scraper)
        });
        const result = await response.json();
        if (result.success && result.config) {
          scraper.id = result.config.id; // Store DB ID
        }
      }
    }
    console.log('✅ Synced scrapers to database');
  } catch (error) {
    console.warn('⚠️ Database sync failed:', error);
  }
}

// Load scrapers from database
async function loadScrapersFromDatabase() {
  const apiUrl = 'http://localhost:3001';
  
  try {
    const response = await fetch(`${apiUrl}/api/scrapers/list`);
    if (!response.ok) throw new Error('API not available');
    const data = await response.json();
    
    if (data.scrapers && Array.isArray(data.scrapers)) {
      console.log(`✅ Loaded ${data.scrapers.length} scrapers from database`);
      return data.scrapers;
    }
  } catch (error) {
    console.log('ℹ️  Database not available - using localStorage');
  }
  
  return [];
}

// Export all scrapers to JSON file
function exportAllScrapers() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    scrapers: scrapers
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scrapers-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  alert(`✅ Exported ${scrapers.length} scraper(s) to file`);
}

// Import scrapers from JSON file
function importScrapersFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.scrapers || !Array.isArray(data.scrapers)) {
        throw new Error('Invalid scraper backup file');
      }
      
      // Merge with existing scrapers (avoid duplicates by name)
      const existingNames = new Set(scrapers.map(s => s.name));
      let imported = 0;
      let skipped = 0;
      
      for (const scraper of data.scrapers) {
        if (existingNames.has(scraper.name)) {
          skipped++;
        } else {
          scrapers.push(scraper);
          imported++;
        }
      }
      
      saveScrapers();
      alert(`✅ Imported ${imported} scraper(s)\n${skipped > 0 ? `⚠️ Skipped ${skipped} duplicate(s)` : ''}`);
    } catch (error) {
      alert(`❌ Failed to import: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function useTemplate(index) {
  const template = templates[index];
  
  // Load template into Template Creator
  document.getElementById('template-name').value = template.name || '';
  document.getElementById('template-description').value = template.description || '';
  
  if (template.storage) {
    document.getElementById('template-event-type').value = template.storage.eventType || '';
    document.getElementById('template-scraper-source').value = template.storage.scraperSource || '';
  }
  
  // Load steps
  if (template.steps && Array.isArray(template.steps)) {
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
  }
  
  // Switch to Template Creator tab
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelector('[data-tab="template"]').classList.add('active');
  document.getElementById('tab-template').classList.add('active');
  
  // Show success message
  setTimeout(() => {
    const badge = template.source === 'database' ? '💾 DATABASE' : '📁 EXAMPLE';
    alert(`✅ Loaded template: "${template.name}"\nSource: ${badge}\n\nYou can now customize this template in the Builder tab.`);
  }, 200);
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

// Database sync settings
document.getElementById('save-db-settings-btn').addEventListener('click', () => {
  const enabled = document.getElementById('db-sync-enabled').checked;
  const apiUrl = document.getElementById('api-url-input').value.trim();
  
  localStorage.setItem('dbSyncEnabled', enabled ? 'true' : 'false');
  if (apiUrl) {
    localStorage.setItem('apiUrl', apiUrl);
  }
  
  alert(`✅ Database sync ${enabled ? 'enabled' : 'disabled'}`);
  
  // Reload scrapers from DB if just enabled
  if (enabled) {
    loadScraperLibrary();
  }
});

// Load DB settings on page load
document.getElementById('db-sync-enabled').checked = localStorage.getItem('dbSyncEnabled') === 'true';
document.getElementById('api-url-input').value = localStorage.getItem('apiUrl') || 'https://civitracker.pages.dev';

// Export all scrapers button
document.getElementById('export-all-scrapers-btn').addEventListener('click', exportAllScrapers);

// Import from file button
document.getElementById('import-scrapers-file-btn').addEventListener('click', () => {
  document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importScrapersFromFile(file);
    e.target.value = ''; // Reset input
  }
});

function viewScraperDetails(index) {
  const scraper = scrapers[index];
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  // Create modal content
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  `;
  
  // Generate clean JSON (no documentation BS)
  let codeText;
  if (scraper.code) {
    codeText = scraper.code;
  } else {
    codeText = JSON.stringify({
      name: scraper.name,
      startUrl: scraper.startUrl,
      pageStructures: scraper.pageStructures
    }, null, 2);
  }
  
  content.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #e0e0e0;">
      <h2 style="margin: 0; font-size: 18px;">📄 ${scraper.name}</h2>
    </div>
    
    <div style="flex: 1; overflow: auto; padding: 20px;">
      <textarea id="scraper-code-view" readonly style="
        width: 100%;
        min-height: 400px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        line-height: 1.5;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #f8f9fa;
        resize: vertical;
      ">${codeText}</textarea>
    </div>
    
    <div style="padding: 20px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: space-between;">
      <button id="send-to-agent" class="btn-primary" style="padding: 12px 24px; font-size: 15px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
        🤖 Send to Agent
      </button>
      <div style="display: flex; gap: 10px;">
        <button id="copy-clean-json" class="btn-primary" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          📋 Copy Clean JSON
        </button>
        <button id="close-scraper-view" class="btn-secondary" style="padding: 10px 20px;">
          Close
        </button>
      </div>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Auto-select text for easy copying
  const textarea = document.getElementById('scraper-code-view');
  textarea.select();
  
  // Send to Agent button - builds clean prompt with flexibility instructions
  document.getElementById('send-to-agent').addEventListener('click', () => {
    // Build clean JSON without documentation comments
    const cleanJSON = JSON.stringify({
      name: scraper.name,
      startUrl: scraper.startUrl,
      pageStructures: scraper.pageStructures
    }, null, 2);
    
    const prompt = `Build a scraper using this template as a starting point. The selectors in selectorSteps are hints to help you - verify they work and discover any additional fields not listed here:

${cleanJSON}

Important:
- Use the provided selectors as hints, but verify they still work
- Inspect the HTML to find additional fields not in this template
- Build a complete scraper that captures ALL available data, not just these fields`;
    
    navigator.clipboard.writeText(prompt).then(() => {
      showStatus('✅ Agent prompt copied! Paste into chat and send.', 'success');
    }).catch(err => {
      showStatus('❌ Failed to copy', 'error');
    });
  });
  
  // Copy Clean JSON button
  document.getElementById('copy-clean-json').addEventListener('click', () => {
    const cleanJSON = JSON.stringify({
      name: scraper.name,
      startUrl: scraper.startUrl,
      pageStructures: scraper.pageStructures
    }, null, 2);
    
    navigator.clipboard.writeText(cleanJSON).then(() => {
      showStatus('✅ Clean JSON copied to clipboard!', 'success');
    }).catch(err => {
      showStatus('❌ Failed to copy', 'error');
    });
  });
  
  // Close button
  document.getElementById('close-scraper-view').addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
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

document.getElementById('load-selected-template-btn')?.addEventListener('click', () => {
  const selector = document.getElementById('template-selector');
  const selectedIndex = selector.value;
  
  if (selectedIndex === '') {
    alert('ℹ️ Please select a template from the dropdown first');
    return;
  }
  
  const template = templates[parseInt(selectedIndex)];
  if (!template) {
    alert('❌ Template not found');
    return;
  }
  
  // Load template into form
  document.getElementById('template-name').value = template.name || '';
  document.getElementById('template-description').value = template.description || '';
  
  if (template.storage) {
    document.getElementById('template-event-type').value = template.storage.eventType || '';
    document.getElementById('template-scraper-source').value = template.storage.scraperSource || '';
  }
  
  // Load steps
  if (template.steps && Array.isArray(template.steps)) {
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
  }
  
  // Show success message
  const badge = template.source === 'database' ? '💾 DATABASE' : '📁 EXAMPLE';
  alert(`✅ Loaded template: "${template.name}"\nSource: ${badge}\n\nYou can now customize this template or use it as-is.`);
  
  // Reset selector
  selector.value = '';
});

document.getElementById('import-template-json')?.addEventListener('click', () => {
  // Show the import modal
  document.getElementById('import-modal').style.display = 'flex';
  document.getElementById('paste-area').style.display = 'none';
  document.getElementById('import-json-paste').value = '';
});

document.getElementById('close-import-modal')?.addEventListener('click', () => {
  document.getElementById('import-modal').style.display = 'none';
});

// Close modal when clicking outside
document.getElementById('import-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'import-modal') {
    document.getElementById('import-modal').style.display = 'none';
  }
});

document.getElementById('import-from-file-btn')?.addEventListener('click', () => {
  document.getElementById('import-modal').style.display = 'none';
  document.getElementById('import-template-file').click();
});

document.getElementById('import-from-clipboard-btn')?.addEventListener('click', async () => {
  document.getElementById('paste-area').style.display = 'block';
  document.getElementById('import-from-file-btn').style.display = 'none';
  document.getElementById('import-from-clipboard-btn').style.display = 'none';
  
  // Try to read clipboard
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim().startsWith('{')) {
      document.getElementById('import-json-paste').value = text;
    }
  } catch (e) {
    // Permission denied or no clipboard access - user will paste manually
  }
  
  document.getElementById('import-json-paste').focus();
});

document.getElementById('confirm-paste-btn')?.addEventListener('click', () => {
  const json = document.getElementById('import-json-paste').value.trim();
  if (!json) {
    alert('❌ Please paste template JSON');
    return;
  }
  importTemplateFromJSON(json);
  document.getElementById('import-modal').style.display = 'none';
});

document.getElementById('cancel-paste-btn')?.addEventListener('click', () => {
  document.getElementById('import-modal').style.display = 'none';
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
    
    const message = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <span style="font-size: 32px;">✅</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">Template Imported Successfully!</div>
          <div style="font-size: 11px; opacity: 0.9;">"${template.name}" loaded with ${templateSteps.length} step(s)</div>
          <a href="#" id="view-imported-link" style="display: inline-block; margin-top: 8px; color: #059669; text-decoration: none; font-weight: 500; font-size: 12px;">→ View in Library</a>
        </div>
      </div>
    `;
    
    const confirmDiv = document.createElement('div');
    confirmDiv.style.cssText = 'padding: 16px; background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; margin-top: 12px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);';
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

// Build tab template loader
document.getElementById('load-build-template-btn')?.addEventListener('click', () => {
  const selector = document.getElementById('build-template-selector');
  const selectedIndex = selector.value;
  
  if (selectedIndex === '') {
    alert('ℹ️ Please select a template from the dropdown first');
    return;
  }
  
  const template = templates[parseInt(selectedIndex)];
  if (!template) {
    alert('❌ Template not found');
    return;
  }
  
  // Render the dynamic builder based on template structure
  renderDynamicBuilder(template);
  
  // Show success message with template info
  const badge = template.source === 'database' ? '💾 DATABASE' : '📁 EXAMPLE';
  const stepCount = template.steps?.length || 0;
  const eventType = template.storage?.eventType || 'other';
  
  // Store the template in state for the builder to use
  chrome.storage.local.set({ 
    activeBuilderTemplate: template,
    templateLoaded: true
  }, () => {
    console.log('✅ Template loaded into Build tab:', template.name);
    
    // Show success after rendering
    setTimeout(() => {
      alert(`✅ Loaded Template: "${template.name}"\n\nSource: ${badge}\nType: ${eventType}\nSteps: ${stepCount}\n\nThe builder is now ready. Follow the steps to capture your scraper configuration.`);
    }, 100);
  });
  
  // Reset selector
  selector.value = '';
});

// Clear template button
document.getElementById('clear-build-template-btn')?.addEventListener('click', () => {
  if (confirm('⚠️ Clear the current template and all saved field values?\n\nThis will reset the Build tab to its default state.')) {
    // Clear storage
    chrome.storage.local.remove(['activeBuilderTemplate', 'templateLoaded', 'builderFieldValues'], () => {
      console.log('🗑️ Cleared template and field values');
      
      // Reset UI
      const container = document.getElementById('dynamic-builder-container');
      if (container) {
        container.innerHTML = `
          <p style="text-align: center; color: #999; padding: 40px 20px;">
            ⬆️ Select a template above to start building your scraper.<br>
            <small style="font-size: 11px;">The builder will dynamically load based on your chosen template's structure.</small>
          </p>
        `;
      }
      
      alert('✅ Template cleared! Select a new template to continue.');
    });
  }
});

// Dynamic builder renderer
function renderDynamicBuilder(template) {
  const container = document.getElementById('dynamic-builder-container');
  if (!container) return;
  
  const steps = template.steps || [];
  
  // Create step navigation
  let html = '<div id="step-navigation" style="display: flex; gap: 8px; margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; overflow-x: auto;">';
  steps.forEach((step, index) => {
    const stepNum = step.stepNumber || index + 1;
    html += `
      <button class="step-nav-btn" data-step="${stepNum}" style="padding: 8px 16px; background: white; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; white-space: nowrap; transition: all 0.2s;">
        ${step.stepIcon || '📋'} ${stepNum}
      </button>
    `;
  });
  html += '</div>';
  
  // Create step containers (only show one at a time)
  html += '<div id="dynamic-app" style="min-height: 400px;">';
  
  steps.forEach((step, index) => {
    const stepNum = step.stepNumber || index + 1;
    const isFirst = index === 0;
    
    // Hide all steps except first
    html += `
      <div id="dynamic-step-${stepNum}" class="step-content" data-step="${stepNum}" style="display: ${isFirst ? 'block' : 'none'}; animation: fadeIn 0.3s;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">${step.stepIcon || '📋'} ${step.stepName || 'Untitled'}</h3>
    `;
    
    // Add instruction if present
    if (step.instruction) {
      html += `<p class="instruction" style="margin-bottom: 16px; padding: 12px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 12px;">${step.instruction}</p>`;
    }
    
    // Render fields or field groups
    if (step.fields && step.fields.length > 0) {
      html += renderFields(step.fields, stepNum);
    }
    
    if (step.fieldGroups && step.fieldGroups.length > 0) {
      step.fieldGroups.forEach(group => {
        html += `<div style="margin-bottom: 16px;">`;
        html += `<h4 style="margin: 0 0 8px 0; font-size: 13px; color: #374151; font-weight: 600;">${group.groupName || 'Fields'}</h4>`;
        html += renderFields(group.fields || [], stepNum, group.groupName);
        html += `</div>`;
      });
    }
    
    // Navigation buttons for each step
    html += `<div style="display: flex; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">`;
    if (index > 0) {
      html += `<button class="step-nav-btn" data-step="${stepNum - 1}" style="flex: 1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">← Previous</button>`;
    }
    if (index < steps.length - 1) {
      html += `<button class="step-nav-btn" data-step="${stepNum + 1}" style="flex: 1; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Next →</button>`;
    } else {
      html += `<button class="finalize-btn" style="flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">✅ Finish & Export</button>`;
    }
    html += `</div>`;
    
    html += '</div>';
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  // Restore saved field values
  restoreFieldValues();
  
  // Auto-save field values when they change
  setupAutoSave();
}

function renderFields(fields, stepNum, groupName = '') {
  let html = '';
  
  fields.forEach(field => {
    const fieldId = `step${stepNum}-${groupName ? groupName.toLowerCase().replace(/\s+/g, '-') + '-' : ''}${field.name}`;
    const required = field.required ? '*' : '';
    
    html += `<div class="form-group">`;
    html += `<label>${field.label || field.name}${required}</label>`;
    
    switch (field.type) {
      case 'text':
      case 'url':
        if (field.autofill) {
          html += `<div class="input-with-button">`;
          html += `<input type="${field.type}" id="${fieldId}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
          
          // Add autofill button based on type with data attributes instead of onclick
          if (field.autofill === 'currentUrl') {
            html += `<button type="button" class="btn-secondary autofill-btn" data-action="currentUrl" data-field-id="${fieldId}">🔗 Current URL</button>`;
          } else if (field.autofill === 'baseUrl') {
            html += `<button type="button" class="btn-secondary autofill-btn" data-action="baseUrl" data-field-id="${fieldId}">🔍 Base URL</button>`;
          }
          
          html += `</div>`;
        } else {
          html += `<input type="${field.type}" id="${fieldId}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
        }
        break;
      
      case 'textarea':
        html += `<textarea id="${fieldId}" rows="3" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
        break;
      
      case 'select':
        html += `<select id="${fieldId}" ${field.required ? 'required' : ''}>`;
        html += `<option value="">Select ${field.label || field.name}...</option>`;
        
        // Special handling for state_code field
        if (field.name === 'state_code') {
          const states = [
            'AL - Alabama', 'AK - Alaska', 'AZ - Arizona', 'AR - Arkansas', 'CA - California',
            'CO - Colorado', 'CT - Connecticut', 'DE - Delaware', 'FL - Florida', 'GA - Georgia',
            'HI - Hawaii', 'ID - Idaho', 'IL - Illinois', 'IN - Indiana', 'IA - Iowa',
            'KS - Kansas', 'KY - Kentucky', 'LA - Louisiana', 'ME - Maine', 'MD - Maryland',
            'MA - Massachusetts', 'MI - Michigan', 'MN - Minnesota', 'MS - Mississippi', 'MO - Missouri',
            'MT - Montana', 'NE - Nebraska', 'NV - Nevada', 'NH - New Hampshire', 'NJ - New Jersey',
            'NM - New Mexico', 'NY - New York', 'NC - North Carolina', 'ND - North Dakota', 'OH - Ohio',
            'OK - Oklahoma', 'OR - Oregon', 'PA - Pennsylvania', 'RI - Rhode Island', 'SC - South Carolina',
            'SD - South Dakota', 'TN - Tennessee', 'TX - Texas', 'UT - Utah', 'VT - Vermont',
            'VA - Virginia', 'WA - Washington', 'WV - West Virginia', 'WI - Wisconsin', 'WY - Wyoming',
            'DC - District of Columbia'
          ];
          states.forEach(state => {
            const code = state.split(' - ')[0];
            html += `<option value="${code}">${state}</option>`;
          });
        } else if (field.options) {
          field.options.forEach(opt => {
            html += `<option value="${opt}">${opt}</option>`;
          });
        }
        html += `</select>`;
        break;
      
      case 'radio':
        html += `<div class="radio-group">`;
        if (field.options) {
          field.options.forEach(opt => {
            const checked = field.default === opt ? 'checked' : '';
            html += `<label><input type="radio" name="${fieldId}" value="${opt}" ${checked}> ${opt}</label>`;
          });
        }
        html += `</div>`;
        break;
      
      case 'checkbox':
        const checked = field.default ? 'checked' : '';
        html += `<label><input type="checkbox" id="${fieldId}" ${checked}> ${field.label || field.name}</label>`;
        break;
      
      case 'selector':
        html += `
          <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; background: #fafafa; margin-bottom: 12px;">
            <label style="font-weight: 600; margin-bottom: 8px; display: block;">${field.label || field.name}${field.required ? ' *' : ''}</label>
            ${field.hint ? `<small style="color: #666; font-size: 11px; display: block; margin-bottom: 8px;">${field.hint}</small>` : ''}
            
            <!-- Simple Capture -->
            <input type="text" id="${fieldId}" placeholder="CSS selector" readonly ${field.required ? 'required' : ''} style="width: 100%; padding: 8px; margin-bottom: 8px; background: white; border: 1px solid #d1d5db; border-radius: 4px;">
            <button type="button" class="capture-btn" data-field-id="${fieldId}" style="width: 100%; padding: 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; margin-bottom: 8px;">
              🎯 Capture Element
            </button>
            
            <!-- Main field note -->
            <textarea id="${fieldId}-note" placeholder="Add a note about this field..." style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; resize: vertical; min-height: 50px; font-family: inherit; margin-bottom: 12px;"></textarea>
            
            <!-- AI Analysis Toggle -->
            <div style="margin-bottom: 12px; padding: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px;">
              <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 12px; font-weight: 500;">
                <input type="checkbox" id="${fieldId}-ai-enabled" class="ai-analysis-toggle" style="margin-right: 8px; width: 16px; height: 16px; cursor: pointer;">
                <span>🤖 Uses AI Analysis</span>
              </label>
              <div id="${fieldId}-ai-config" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
                <label style="display: block; color: white; font-size: 11px; margin-bottom: 4px;">AI Model:</label>
                <select id="${fieldId}-ai-model" class="ai-model-selector" style="width: 100%; padding: 6px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.95); margin-bottom: 8px;">
                  <option value="">Use Default Model</option>
                  <option value="qwen2.5-coder:32b">Qwen2.5-Coder 32B (32K)</option>
                  <option value="qwen2.5-coder:14b">Qwen2.5-Coder 14B (32K)</option>
                  <option value="qwen2.5-coder:7b">Qwen2.5-Coder 7B (32K)</option>
                  <option value="deepseek-coder-v2:16b">DeepSeek V2 16B (64K)</option>
                  <option value="qwen2.5-coder:72b">Qwen2.5-Coder 72B (128K)</option>
                  <option value="deepseek-coder:33b">DeepSeek 33B (16K)</option>
                  <option value="codellama:13b">CodeLlama 13B (16K)</option>
                </select>
                
                <label style="display: block; color: white; font-size: 11px; margin-bottom: 4px;">Context Guides:</label>
                <div id="${fieldId}-ai-contexts" style="background: rgba(255,255,255,0.95); padding: 8px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; margin-bottom: 8px; max-height: 120px; overflow-y: auto;">
                  <small style="color: #6b7280; font-size: 10px; display: block; margin-bottom: 6px;">Select guides for this field's AI analysis:</small>
                  <!-- Context checkboxes will be populated by initializeFieldContexts() -->
                </div>
                
                <label style="display: block; color: white; font-size: 11px; margin-bottom: 4px;">AI Prompt Template:</label>
                <textarea id="${fieldId}-ai-prompt" placeholder="e.g., Extract all dates from this PDF content in YYYY-MM-DD format" style="width: 100%; padding: 6px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; font-size: 11px; resize: vertical; min-height: 60px; font-family: inherit; background: rgba(255,255,255,0.95);"></textarea>
                <small style="color: rgba(255,255,255,0.9); font-size: 10px; display: block; margin-top: 4px;">💡 Tip: This prompt will be sent to AI with the scraped content at runtime</small>
              </div>
            </div>
            
            <!-- Expandable Steps Section -->
            <details style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
              <summary style="cursor: pointer; font-weight: 500; color: #6366f1; font-size: 12px; margin-bottom: 8px; user-select: none;">
                ⚙️ Advanced: Multi-Step Capture
              </summary>
              <div style="margin-top: 12px; padding: 12px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">
                <p style="font-size: 11px; color: #666; margin-bottom: 12px;">
                  Add steps to perform actions before capturing (e.g., click button to open modal, then capture element inside)
                </p>
                <div id="${fieldId}-steps" class="capture-steps">
                  <!-- Steps will be added here dynamically -->
                </div>
                <button type="button" class="add-step-btn" data-field-id="${fieldId}" style="width: 100%; padding: 6px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                  ➕ Add Step
                </button>
              </div>
            </details>
          </div>
        `;
        break;
      
      default:
        html += `<input type="text" id="${fieldId}" placeholder="${field.placeholder || ''}">`;
    }
    
    if (field.help) {
      html += `<small style="display: block; margin-top: 4px; color: #666; font-size: 11px;">${field.help}</small>`;
    }
    
    html += `</div>`;
  });
  
  return html;
}

// Restore active template when extension reopens
function restoreActiveTemplate() {
  chrome.storage.local.get(['activeBuilderTemplate', 'templateLoaded'], (result) => {
    if (result.templateLoaded && result.activeBuilderTemplate) {
      const template = result.activeBuilderTemplate;
      console.log('🔄 Restoring active template:', template.name);
      
      // Check for pending capture state
      chrome.storage.local.get(['capturingStep', 'capturingField'], (captureResult) => {
        if (captureResult.capturingStep) {
          console.log('🎯 Restoring capture state - step:', captureResult.capturingStep, 'field:', captureResult.capturingField);
          chrome.storage.local.set({ currentBuilderStep: captureResult.capturingStep });
        }
      
        // Check if we're on the Build tab
        const buildTab = document.getElementById('tab-build');
        
        // Always render immediately since we switched to Build tab in DOMContentLoaded
        renderDynamicBuilder(template);
        console.log('✅ Template restored on Build tab');
      });
    }
  });
}

// Restore saved field values
function restoreFieldValues() {
  chrome.storage.local.get(['builderFieldValues', 'builderStepValues', 'builderFieldNotes', 'builderAISettings'], (result) => {
    if (result.builderFieldValues) {
      const values = result.builderFieldValues;
      console.log('🔄 Restoring field values:', Object.keys(values).length, 'fields');
      
      Object.entries(values).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = value;
          } else if (element.type === 'radio') {
            if (element.value === value) {
              element.checked = true;
            }
          } else {
            element.value = value;
          }
        }
      });
    }
    
    // Restore field notes
    if (result.builderFieldNotes) {
      const notes = result.builderFieldNotes;
      console.log('🔄 Restoring field notes:', Object.keys(notes).length, 'notes');
      
      Object.entries(notes).forEach(([fieldId, note]) => {
        const noteElement = document.getElementById(`${fieldId}-note`);
        if (noteElement) {
          noteElement.value = note;
        }
      });
    }
    
    // Restore AI settings
    if (result.builderAISettings) {
      const aiSettings = result.builderAISettings;
      console.log('🔄 Restoring AI settings:', Object.keys(aiSettings).length, 'fields');
      
      Object.entries(aiSettings).forEach(([fieldId, settings]) => {
        const enabledCheckbox = document.getElementById(`${fieldId}-ai-enabled`);
        const promptTextarea = document.getElementById(`${fieldId}-ai-prompt`);
        const modelSelector = document.getElementById(`${fieldId}-ai-model`);
        const configDiv = document.getElementById(`${fieldId}-ai-config`);
        
        if (enabledCheckbox && settings.enabled) {
          enabledCheckbox.checked = true;
          if (configDiv) configDiv.style.display = 'block';
          
          // Initialize context guides for this field
          initializeFieldContexts(fieldId);
        }
        
        if (promptTextarea && settings.prompt) {
          promptTextarea.value = settings.prompt;
        }
        
        if (modelSelector && settings.model !== undefined) {
          modelSelector.value = settings.model; // Empty string = use default
        }
      });
    }
    
    // Restore step values
    if (result.builderStepValues) {
      const stepValues = result.builderStepValues;
      console.log('🔄 Restoring step values:', Object.keys(stepValues).length, 'steps');
      
      Object.entries(stepValues).forEach(([stepId, stepData]) => {
        // Recreate the step first
        const fieldId = stepId.split('-step-')[0];
        addCaptureStep(fieldId);
        
        // Then populate its values
        setTimeout(() => {
          const selectorInput = document.querySelector(`.step-selector[data-step-id="${stepId}"]`);
          const noteInput = document.querySelector(`.step-note[data-step-id="${stepId}"]`);
          const actionSelect = document.querySelector(`.step-action-type[data-step-id="${stepId}"]`);
          
          if (selectorInput && stepData.selector) selectorInput.value = stepData.selector;
          if (noteInput && stepData.note) noteInput.value = stepData.note;
          if (actionSelect && stepData.action) actionSelect.value = stepData.action;
        }, 100);
      });
    }
  });
}

function saveStepField(element) {
  const stepId = element.getAttribute('data-step-id');
  if (!stepId) return;
  
  chrome.storage.local.get(['builderStepValues'], (result) => {
    const stepValues = result.builderStepValues || {};
    
    if (!stepValues[stepId]) {
      stepValues[stepId] = {};
    }
    
    if (element.classList.contains('step-selector')) {
      stepValues[stepId].selector = element.value;
    } else if (element.classList.contains('step-note')) {
      stepValues[stepId].note = element.value;
    } else if (element.classList.contains('step-action-type')) {
      stepValues[stepId].action = element.value;
    }
    
    chrome.storage.local.set({ builderStepValues: stepValues });
    console.log('💾 Saved step field:', stepId, stepValues[stepId]);
  });
}

function saveFieldNote(element) {
  const fieldId = element.id.replace('-note', '');
  
  chrome.storage.local.get(['builderFieldNotes'], (result) => {
    const notes = result.builderFieldNotes || {};
    notes[fieldId] = element.value;
    
    chrome.storage.local.set({ builderFieldNotes: notes });
    console.log('💾 Saved field note:', fieldId);
  });
}

function saveAIPrompt(element) {
  const fieldId = element.id.replace('-ai-prompt', '').replace('-ai-model', '');
  
  chrome.storage.local.get(['builderAISettings'], (result) => {
    const aiSettings = result.builderAISettings || {};
    if (!aiSettings[fieldId]) aiSettings[fieldId] = {};
    
    if (element.id.endsWith('-ai-prompt')) {
      aiSettings[fieldId].prompt = element.value;
      console.log('💾 Saved AI prompt:', fieldId);
    } else if (element.id.endsWith('-ai-model')) {
      aiSettings[fieldId].model = element.value;
      console.log('💾 Saved AI model:', fieldId, element.value || 'default');
    }
    
    chrome.storage.local.set({ builderAISettings: aiSettings });
  });
}

function handleAIToggle(element) {
  const fieldId = element.id.replace('-ai-enabled', '');
  const configDiv = document.getElementById(`${fieldId}-ai-config`);
  
  if (configDiv) {
    configDiv.style.display = element.checked ? 'block' : 'none';
    
    // Initialize context guides when enabled
    if (element.checked) {
      initializeFieldContexts(fieldId);
    }
    
    chrome.storage.local.get(['builderAISettings'], (result) => {
      const aiSettings = result.builderAISettings || {};
      if (!aiSettings[fieldId]) aiSettings[fieldId] = {};
      aiSettings[fieldId].enabled = element.checked;
      
      chrome.storage.local.set({ builderAISettings: aiSettings });
      console.log('💾 Saved AI toggle:', fieldId, element.checked);
    });
  }
}

// Restore current step position
function restoreCurrentStep() {
  chrome.storage.local.get(['currentBuilderStep'], (result) => {
    if (result.currentBuilderStep) {
      const stepNum = result.currentBuilderStep;
      console.log('🔄 Restoring current step:', stepNum);
      
      // Navigate immediately - DOM is ready
      navigateToDynamicStep(stepNum);
    }
  });
}

// Auto-save field values as user types
function setupAutoSave() {
  const container = document.getElementById('dynamic-builder-container');
  if (!container) return;
  
  // Listen for changes on all inputs
  container.addEventListener('input', (e) => {
    const element = e.target;
    if (element.id && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
      saveFieldValue(element);
    }
  });
  
  // Also listen for change events (for radios, checkboxes, selects)
  container.addEventListener('change', (e) => {
    const element = e.target;
    if (element.id && (element.tagName === 'INPUT' || element.tagName === 'SELECT')) {
      saveFieldValue(element);
    }
  });
  
  // Auto-save step fields (selector, note, action type)
  container.addEventListener('input', (e) => {
    const element = e.target;
    if (element.classList.contains('step-selector') || element.classList.contains('step-note')) {
      saveStepField(element);
    }
    // Save main field notes
    if (element.id && element.id.endsWith('-note')) {
      saveFieldNote(element);
    }
    // Save AI prompts
    if (element.id && element.id.endsWith('-ai-prompt')) {
      saveAIPrompt(element);
    }
  });
  
  container.addEventListener('change', (e) => {
    const element = e.target;
    if (element.classList.contains('step-action-type')) {
      saveStepField(element);
    }
    // Handle AI analysis toggle
    if (element.classList.contains('ai-analysis-toggle')) {
      handleAIToggle(element);
    }
    // Handle AI model selector
    if (element.classList.contains('ai-model-selector')) {
      saveAIPrompt(element);
    }
  });
  
  // Handle textarea input for AI prompts
  container.addEventListener('input', (e) => {
    const element = e.target;
    if (element.id && element.id.endsWith('-ai-prompt')) {
      saveAIPrompt(element);
    }
  });
  
  // Handle all button clicks via event delegation
  container.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    e.preventDefault();
    
    console.log('🖱️ Button clicked:', button.className, button.getAttribute('data-step'));
    
    // Step navigation buttons
    if (button.classList.contains('step-nav-btn')) {
      const targetStep = parseInt(button.getAttribute('data-step'));
      console.log('📍 Step nav button clicked, target:', targetStep);
      navigateToDynamicStep(targetStep);
      return;
    }
    
    // Finalize button
    if (button.classList.contains('finalize-btn')) {
      finalizeDynamicBuilder();
      return;
    }
    
    // Autofill buttons
    if (button.classList.contains('autofill-btn')) {
      const action = button.getAttribute('data-action');
      const fieldId = button.getAttribute('data-field-id');
      
      if (action === 'currentUrl') {
        autofillCurrentUrl(fieldId);
      } else if (action === 'baseUrl') {
        autofillBaseUrl(fieldId);
      }
      return;
    }
    
    // Capture buttons
    if (button.classList.contains('capture-btn')) {
      const fieldId = button.getAttribute('data-field-id');
      captureElement(fieldId);
      return;
    }
    
    // Add step button
    if (button.classList.contains('add-step-btn')) {
      const fieldId = button.getAttribute('data-field-id');
      addCaptureStep(fieldId);
      return;
    }
    
    // Remove step button
    if (button.classList.contains('remove-step-btn')) {
      const stepId = button.getAttribute('data-step-id');
      
      // Remove from storage
      chrome.storage.local.get(['builderStepValues'], (result) => {
        const stepValues = result.builderStepValues || {};
        delete stepValues[stepId];
        chrome.storage.local.set({ builderStepValues: stepValues });
      });
      
      // Remove from DOM
      button.closest('.capture-step-item').remove();
      showToast('🗑️ Step removed');
      return;
    }
    
    // Capture step action button
    if (button.classList.contains('capture-step-action-btn')) {
      const stepId = button.getAttribute('data-step-id');
      captureStepAction(stepId);
      return;
    }
  });
}

function navigateToDynamicStep(stepNum) {
  console.log('🔄 Navigating to step:', stepNum);
  
  // Get current step
  const currentStepEl = document.querySelector('.step-content[style*="display: block"]');
  if (currentStepEl) {
    const currentStep = parseInt(currentStepEl.getAttribute('data-step'));
    
    // Only validate if moving forward
    if (stepNum > currentStep) {
      // Check required fields in current step
      const requiredFields = currentStepEl.querySelectorAll('[required]');
      const emptyFields = [];
      
      requiredFields.forEach(field => {
        if (!field.value || field.value.trim() === '') {
          emptyFields.push(field.id);
          field.style.border = '2px solid #ef4444';
        } else {
          field.style.border = '';
        }
      });
      
      if (emptyFields.length > 0) {
        alert(`❌ Please fill in all required fields before proceeding`);
        // Scroll to first empty field
        const firstEmpty = document.getElementById(emptyFields[0]);
        if (firstEmpty) {
          firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return; // Don't navigate
      }
    }
  }
  
  // Hide all steps
  const allSteps = document.querySelectorAll('.step-content');
  console.log('📊 Found step contents:', allSteps.length);
  allSteps.forEach(step => {
    step.style.display = 'none';
  });
  
  // Show target step
  const targetStep = document.querySelector(`.step-content[data-step="${stepNum}"]`);
  console.log('🎯 Target step element:', targetStep);
  
  if (targetStep) {
    targetStep.style.display = 'block';
    
    // Update navigation buttons active state
    const navButtons = document.querySelectorAll('.step-nav-btn');
    navButtons.forEach(btn => {
      const btnStep = btn.getAttribute('data-step');
      if (btnStep == stepNum) {
        btn.style.background = '#6366f1';
        btn.style.color = 'white';
        btn.style.borderColor = '#6366f1';
      } else {
        btn.style.background = 'white';
        btn.style.color = '#374151';
        btn.style.borderColor = '#e5e7eb';
      }
    });
    
    // Save current step
    chrome.storage.local.set({ currentBuilderStep: stepNum });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Navigation complete to step', stepNum);
  } else {
    console.error('❌ Could not find step content for step', stepNum);
  }
}

function autofillCurrentUrl(fieldId) {
  // Query all windows to find the active tab (needed for detached window)
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      alert('Could not access current tab. Make sure you have a regular webpage open.');
      return;
    }
    
    // If no active tab in last focused window, get all active tabs
    if (!tabs || tabs.length === 0) {
      chrome.tabs.query({ active: true }, (allTabs) => {
        // Find the first non-extension tab
        const webTab = allTabs.find(tab => 
          tab.url && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://')
        );
        
        if (webTab) {
          const input = document.getElementById(fieldId);
          if (input) {
            input.value = webTab.url;
            input.style.backgroundColor = '#d4edda';
            setTimeout(() => { input.style.backgroundColor = ''; }, 500);
            console.log('✅ URL filled:', webTab.url);
            saveFieldValue(input);
          }
        } else {
          alert('No web page found. Please open a webpage in another tab.');
        }
      });
      return;
    }
    
    if (tabs && tabs[0] && tabs[0].url) {
      const input = document.getElementById(fieldId);
      if (input) {
        input.value = tabs[0].url;
        
        // Visual feedback
        input.style.backgroundColor = '#d4edda';
        setTimeout(() => { input.style.backgroundColor = ''; }, 500);
        console.log('✅ URL filled:', tabs[0].url);
        
        // Save the value
        saveFieldValue(input);
      }
    } else {
      alert('Could not get current tab URL');
    }
  });
}

function autofillBaseUrl(fieldId) {
  // Query all windows to find the active tab (needed for detached window)
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      alert('Could not access current tab. Make sure you have a regular webpage open.');
      return;
    }
    
    // If no active tab in last focused window, get all active tabs
    if (!tabs || tabs.length === 0) {
      chrome.tabs.query({ active: true }, (allTabs) => {
        // Find the first non-extension tab
        const webTab = allTabs.find(tab => 
          tab.url && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://')
        );
        
        if (webTab) {
          fillBaseUrlField(fieldId, webTab.url);
        } else {
          alert('No web page found. Please open a webpage in another tab.');
        }
      });
      return;
    }
    
    if (tabs[0] && tabs[0].url) {
      fillBaseUrlField(fieldId, tabs[0].url);
    } else {
      alert('Could not get current tab URL');
    }
  });
}

function fillBaseUrlField(fieldId, url) {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const input = document.getElementById(fieldId);
    
    if (input) {
      input.value = baseUrl;
      
      // Visual feedback
      input.style.backgroundColor = '#d4edda';
      setTimeout(() => { input.style.backgroundColor = ''; }, 500);
      console.log('✅ Base URL filled:', baseUrl);
      
      // Save the value
      saveFieldValue(input);
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
    alert('Could not parse current URL');
  }
}

// Show tab selector modal
function showTabSelector(callback) {
  // Remove any existing tab selector modals first
  const existingModals = document.querySelectorAll('.tab-selector-modal');
  existingModals.forEach(m => m.remove());
  
  // Get all tabs
  chrome.tabs.query({}, (allTabs) => {
    // Filter out extension and chrome pages
    const webTabs = allTabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://')
    );
    
    if (webTabs.length === 0) {
      alert('No web pages found. Please open a webpage in another tab.');
      if (callback && typeof callback === 'function') {
        callback(null);
      }
      return;
    }
    
    // Create modal with ID for tracking
    const modal = document.createElement('div');
    modal.className = 'tab-selector-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 500px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    const title = document.createElement('h3');
    title.textContent = '🔗 Select Tab to Capture From';
    title.style.cssText = 'margin: 0 0 16px 0; font-size: 14px;';
    content.appendChild(title);
    
    // Create list of tabs
    webTabs.forEach(tab => {
      const tabItem = document.createElement('div');
      tabItem.style.cssText = `
        padding: 10px;
        margin: 4px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      tabItem.onmouseover = () => tabItem.style.background = '#f0f9ff';
      tabItem.onmouseout = () => tabItem.style.background = '';
      
      const tabTitle = document.createElement('div');
      tabTitle.textContent = tab.title || 'Untitled';
      tabTitle.style.cssText = 'font-weight: 500; font-size: 12px; margin-bottom: 4px;';
      
      const tabUrl = document.createElement('div');
      tabUrl.textContent = tab.url;
      tabUrl.style.cssText = 'font-size: 10px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      
      tabItem.appendChild(tabTitle);
      tabItem.appendChild(tabUrl);
      
      tabItem.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        console.log('✅ Tab selected:', tab.title);
        
        // Remove modal immediately
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        
        // Call callback with selected tab
        if (callback && typeof callback === 'function') {
          callback(tab);
        }
      };
      
      content.appendChild(tabItem);
    });
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.style.cssText = 'margin-top: 12px; width: 100%; padding: 8px; cursor: pointer;';
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      console.log('❌ Tab selection cancelled');
      
      // Remove modal
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      
      // Call callback with null
      if (callback && typeof callback === 'function') {
        callback(null);
      }
    };
    content.appendChild(cancelBtn);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        console.log('❌ Background clicked, closing modal');
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        if (callback && typeof callback === 'function') {
          callback(null);
        }
      }
    };
    
    // Prevent content clicks from closing modal
    content.onclick = (e) => {
      e.stopPropagation();
    };
  });
}

function autofillCurrentUrl(fieldId) {
  showTabSelector((selectedTab) => {
    if (selectedTab && selectedTab.url) {
      const input = document.getElementById(fieldId);
      if (input) {
        input.value = selectedTab.url;
        input.style.backgroundColor = '#d4edda';
        setTimeout(() => { input.style.backgroundColor = ''; }, 500);
        console.log('✅ URL filled from:', selectedTab.title);
        saveFieldValue(input);
      }
    }
  });
}

function autofillBaseUrl(fieldId) {
  showTabSelector((selectedTab) => {
    if (selectedTab && selectedTab.url) {
      try {
        const urlObj = new URL(selectedTab.url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        const input = document.getElementById(fieldId);
        
        if (input) {
          input.value = baseUrl;
          input.style.backgroundColor = '#d4edda';
          setTimeout(() => { input.style.backgroundColor = ''; }, 500);
          console.log('✅ Base URL filled from:', selectedTab.title);
          saveFieldValue(input);
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
        alert('Could not parse URL from selected tab');
      }
    }
  });
}

function saveFieldValue(element) {
  chrome.storage.local.get(['builderFieldValues'], (result) => {
    const values = result.builderFieldValues || {};
    
    if (element.type === 'checkbox') {
      values[element.id] = element.checked;
    } else if (element.type === 'radio') {
      values[element.name] = element.value;
    } else {
      values[element.id] = element.value;
    }
    
    chrome.storage.local.set({ builderFieldValues: values }, () => {
      console.log('💾 Saved field:', element.id);
    });
  });
}

function finalizeDynamicBuilder() {
  // Validate required fields
  const requiredFields = document.querySelectorAll('[required]');
  const emptyFields = [];
  
  requiredFields.forEach(field => {
    if (!field.value || field.value.trim() === '') {
      emptyFields.push(field.id);
      field.style.border = '2px solid #ef4444';
    } else {
      field.style.border = '';
    }
  });
  
  if (emptyFields.length > 0) {
    alert(`❌ Please fill in all required fields:\n\n${emptyFields.join('\n')}`);
    // Scroll to first empty field
    const firstEmpty = document.getElementById(emptyFields[0]);
    if (firstEmpty) {
      firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  
  // Collect all field values
  chrome.storage.local.get(['builderFieldValues', 'builderStepValues', 'builderFieldNotes', 'builderAISettings', 'activeBuilderTemplate'], (result) => {
    const fieldValues = result.builderFieldValues || {};
    const stepValues = result.builderStepValues || {};
    const fieldNotes = result.builderFieldNotes || {};
    const aiSettings = result.builderAISettings || {};
    const template = result.activeBuilderTemplate;
    
    if (!template) {
      alert('❌ No template found');
      return;
    }
    
    // Convert form fields to pageStructures format
    const pageStructures = [];
    const pageStructure = {
      fields: []
    };
    
    // Extract container and item selectors from field values
    if (fieldValues['step2-event-list-event_container']) {
      pageStructure.containerSelector = fieldValues['step2-event-list-event_container'];
    }
    if (fieldValues['step2-event-list-event_item']) {
      pageStructure.itemSelector = fieldValues['step2-event-list-event_item'];
    }
    
    // Convert field values to fields array
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      if (value && fieldId.includes('-fields-')) {
        const fieldName = fieldId.split('-fields-')[1];
        pageStructure.fields.push({
          fieldName: fieldName,
          selectorSteps: [{ selector: value }]
        });
      }
    });
    
    if (pageStructure.fields.length > 0) {
      pageStructures.push(pageStructure);
    }
    
    // Build the scraper configuration
    const scraperConfig = {
      name: template.name,
      startUrl: fieldValues['step1-calendar_url'] || template.startUrl,
      pageStructures: pageStructures.length > 0 ? pageStructures : (template.pageStructures || []),
      templateId: template.id,
      createdAt: new Date().toISOString(),
      fields: {},
      steps: {},
      notes: fieldNotes,
      aiFields: aiSettings
    };
    
    // Add all field values
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      scraperConfig.fields[fieldId] = value;
    });
    
    // Add all step values
    Object.entries(stepValues).forEach(([stepId, stepData]) => {
      scraperConfig.steps[stepId] = stepData;
    });
    
    // Save to library
    saveScraperToLibrary(scraperConfig);
    
    // Show success and export options
    showExportModal(scraperConfig);
  });
}

function saveScraperToLibrary(config) {
  const scrapers = JSON.parse(localStorage.getItem('scrapers') || '[]');
  
  // Check if scraper with this name already exists
  const existingIndex = scrapers.findIndex(s => s.name === config.name);
  
  if (existingIndex >= 0) {
    // Update existing
    scrapers[existingIndex] = config;
    showToast('♻️ Scraper updated in library');
  } else {
    // Add new
    scrapers.push(config);
    showToast('✅ Scraper saved to library');
  }
  
  localStorage.setItem('scrapers', JSON.stringify(scrapers));
  loadScraperLibrary(); // Refresh library view
}

function showExportModal(config) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h2 style="margin: 0 0 16px 0; color: #10b981;">✅ Scraper Complete!</h2>
    <p style="margin-bottom: 16px; color: #666;">Your scraper configuration has been saved.</p>
    
    <div id="ai-status" style="margin-bottom: 16px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px;">
      <div id="ollama-check">⏳ Checking for local AI...</div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
      <button id="generate-ai-script-btn" class="btn-primary" style="padding: 12px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; gap: 8px;" disabled>
        <span>🤖</span>
        <div style="text-align: left; line-height: 1.3;">
          <div>Generate AI Script</div>
          <div style="font-size: 10px; opacity: 0.9;">Local LLM Analysis</div>
        </div>
      </button>
      
      <button id="view-config-btn" style="padding: 12px; font-size: 13px; font-weight: 600; background: #6366f1; border: none; border-radius: 8px; cursor: pointer; color: white;">
        <div>📋 View Config</div>
        <div style="font-size: 10px; opacity: 0.9;">JSON Configuration</div>
      </button>
    </div>
    
    <div id="config-preview" style="display: none; margin-bottom: 16px;">
      <strong style="display: block; margin-bottom: 8px;">Configuration:</strong>
      <pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; max-height: 300px;">${JSON.stringify(config, null, 2)}</pre>
    </div>
    
    <div id="ai-output" style="display: none; margin-bottom: 16px;">
      <strong style="display: block; margin-bottom: 8px;">Generated Script:</strong>
      <pre id="generated-code" style="background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; max-height: 400px; font-family: 'Consolas', 'Monaco', monospace;"></pre>
      
      <div id="ai-analysis" style="margin-top: 12px; padding: 12px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 11px;">
        <strong>AI Analysis Summary:</strong>
        <div id="analysis-content" style="margin-top: 8px;"></div>
      </div>
    </div>
    
    <div style="display: flex; gap: 8px;">
      <button id="copy-json-btn" style="flex: 1; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
        📋 Copy JSON
      </button>
      <button id="download-json-btn" style="flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
        💾 Download
      </button>
      <button id="close-modal-btn" style="flex: 1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
        Close
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Check Ollama status
  checkOllamaAndEnableAI();
  
  // View config button
  document.getElementById('view-config-btn').addEventListener('click', () => {
    const preview = document.getElementById('config-preview');
    preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
  });
  
  // Generate AI script button
  document.getElementById('generate-ai-script-btn').addEventListener('click', async () => {
    const btn = document.getElementById('generate-ai-script-btn');
    btn.disabled = true;
    btn.innerHTML = '<span style="animation: spin 1s linear infinite;">⏳</span> Generating...';
    
    try {
      await generateAIScript(config);
      btn.innerHTML = '✅ Generated!';
    } catch (error) {
      alert(`❌ AI generation failed: ${error.message}`);
      btn.disabled = false;
      btn.innerHTML = '🤖 Generate AI Script';
    }
  });
  
  // Copy JSON button
  document.getElementById('copy-json-btn').addEventListener('click', () => {
    const aiOutput = document.getElementById('ai-output');
    const codeElement = document.getElementById('generated-code');
    
    let textToCopy;
    if (aiOutput.style.display !== 'none' && codeElement.textContent) {
      textToCopy = codeElement.textContent;
      showToast('📋 Generated script copied to clipboard!');
    } else {
      textToCopy = JSON.stringify(config, null, 2);
      showToast('📋 JSON copied to clipboard!');
    }
    
    navigator.clipboard.writeText(textToCopy);
  });
  
  // Download JSON button
  document.getElementById('download-json-btn').addEventListener('click', () => {
    const aiOutput = document.getElementById('ai-output');
    const codeElement = document.getElementById('generated-code');
    
    let content, filename, mimeType;
    if (aiOutput.style.display !== 'none' && codeElement.textContent) {
      content = codeElement.textContent;
      filename = `${config.name.replace(/\s+/g, '-').toLowerCase()}-scraper.js`;
      mimeType = 'application/javascript';
      showToast('💾 Script downloaded!');
    } else {
      content = JSON.stringify(config, null, 2);
      filename = `${config.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      mimeType = 'application/json';
      showToast('💾 JSON downloaded!');
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
  
  // Close button
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.remove();
    
    // Clear builder state and go to library
    chrome.storage.local.remove(['activeBuilderTemplate', 'builderFieldValues', 'builderStepValues', 'builderFieldNotes', 'currentBuilderStep', 'templateLoaded']);
    
    // Switch to library tab
    const libraryBtn = document.querySelector('[data-tab="library"]');
    if (libraryBtn) libraryBtn.click();
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function checkOllamaAndEnableAI() {
  const statusDiv = document.getElementById('ollama-check');
  const aiBtn = document.getElementById('generate-ai-script-btn');
  
  try {
    const agent = new window.ScraperAIAgent();
    const status = await agent.checkOllamaStatus();
    
    if (status.available) {
      statusDiv.innerHTML = `
        ✅ <strong>AI Ready!</strong> Using ${status.recommended || 'local model'}<br>
        <span style="color: #666; font-size: 11px;">Models available: ${status.models.map(m => m.name).join(', ')}</span>
      `;
      aiBtn.disabled = false;
    } else {
      statusDiv.innerHTML = `
        ⚠️ <strong>Local AI not found</strong><br>
        <span style="color: #666; font-size: 11px;">
          Install <a href="${status.installUrl}" target="_blank" style="color: #6366f1;">Ollama</a> to enable AI script generation<br>
          Recommended: <code>ollama pull deepseek-coder:6.7b</code>
        </span>
      `;
      aiBtn.disabled = true;
    }
  } catch (error) {
    statusDiv.innerHTML = `❌ Could not check AI status: ${error.message}`;
    aiBtn.disabled = true;
  }
}

async function generateAIScript(config) {
  const agent = new window.ScraperAIAgent();
  
  // Load selected context guides from localStorage
  const selectedContexts = JSON.parse(localStorage.getItem('agentContextGuides') || '["scraper-guide", "basic-selectors", "error-handling"]');
  agent.selectedContexts = selectedContexts;
  console.log('📚 Context guides:', selectedContexts);
  
  // Get the template
  chrome.storage.local.get(['activeBuilderTemplate'], async (result) => {
    const template = result.activeBuilderTemplate;
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    try {
      const result = await agent.generateScraperWithAI(config, template);
      
      // Display generated code
      const codeElement = document.getElementById('generated-code');
      codeElement.textContent = result.code;
      
      // Display analysis
      const analysisContent = document.getElementById('analysis-content');
      let analysisHTML = '<div style="font-size: 11px;">';
      
      analysisHTML += '<strong>📦 Required Tools:</strong><br>';
      analysisHTML += result.analysis.tools.map(t => `• ${t}`).join('<br>');
      
      analysisHTML += '<br><br><strong>📊 Field Analysis:</strong><br>';
      const fieldCount = Object.keys(result.analysis.fields).length;
      analysisHTML += `Analyzed ${fieldCount} fields with custom extraction logic`;
      
      if (Object.keys(result.analysis.steps).length > 0) {
        analysisHTML += '<br><br><strong>🔄 Multi-Step Interactions:</strong><br>';
        analysisHTML += `${Object.keys(result.analysis.steps).length} complex interaction sequences detected`;
      }
      
      analysisHTML += '</div>';
      analysisContent.innerHTML = analysisHTML;
      
      // Show output
      document.getElementById('ai-output').style.display = 'block';
      
      // Save script with config
      config.generatedScript = {
        code: result.code,
        analysis: result.analysis,
        metadata: result.metadata
      };
      
      // Update in storage
      const scrapers = JSON.parse(localStorage.getItem('scrapers') || '[]');
      const index = scrapers.findIndex(s => s.name === config.name);
      if (index >= 0) {
        scrapers[index] = config;
        localStorage.setItem('scrapers', JSON.stringify(scrapers));
      }
      
      showToast('✨ AI script generated successfully!');
    } catch (error) {
      throw error;
    }
  });
}

function captureElement(fieldId) {
  console.log('🎯 Starting capture for field:', fieldId);
  
  // Save current state
  chrome.storage.local.get(['currentBuilderStep'], (result) => {
    const currentStep = result.currentBuilderStep || 1;
    chrome.storage.local.set({ 
      capturingField: fieldId,
      capturingStep: currentStep 
    });
  });
  
  // Check if we already have a selected tab
  chrome.storage.local.get(['selectedScrapingTab'], (result) => {
    if (result.selectedScrapingTab) {
      // Validate the tab still exists
      chrome.tabs.get(result.selectedScrapingTab.id, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          // Tab no longer exists, clear it and show selector
          console.log('⚠️ Stored tab no longer exists, selecting new tab');
          clearSelectedTab();
          showTabSelector((selectedTab) => {
            if (!selectedTab) return;
            chrome.storage.local.set({ selectedScrapingTab: selectedTab });
            updateSelectedTabDisplay(selectedTab);
            startCapture(fieldId, selectedTab);
          });
        } else {
          // Tab still exists, use it
          startCapture(fieldId, result.selectedScrapingTab);
        }
      });
    } else {
      // Show tab selector to choose which tab to capture from
      showTabSelector((selectedTab) => {
        if (!selectedTab) return;
        
        // Save the selected tab
        chrome.storage.local.set({ selectedScrapingTab: selectedTab });
        updateSelectedTabDisplay(selectedTab);
        
        startCapture(fieldId, selectedTab);
      });
    }
  });
}

function startCapture(fieldId, selectedTab) {
  if (!selectedTab || !selectedTab.id) {
    console.error('❌ Invalid tab selected');
    alert('❌ Invalid tab. Please select a valid tab.');
    return;
  }
  
  const tabId = selectedTab.id;
  const tabUrl = selectedTab.url || '';
  
  // Check if it's a restricted page
  if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('edge://')) {
    alert('❌ Cannot capture elements on browser internal pages.\n\nPlease select a regular website.');
    clearSelectedTab();
    return;
  }
  
  // Show feedback that capture is starting
  const button = document.querySelector(`.capture-btn[data-field-id="${fieldId}"]`);
  let originalText = '🎯 Capture Element';
  
  if (button) {
    originalText = button.textContent;
    button.textContent = '👆 Click element on page';
    button.style.backgroundColor = '#3b82f6';
    button.style.color = 'white';
    button.disabled = true;
    
    // Store original for reset
    button.dataset.originalText = originalText;
  }
    
    
    // Inject the content script if not already injected
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      console.log('✅ Content script injected');
      
      // Small delay to ensure script is ready
      setTimeout(() => {
        // Send message to content script to start capture mode
        chrome.tabs.sendMessage(tabId, {
          action: 'startCapture',
          fieldId: fieldId
        }).then((response) => {
          console.log('✅ Capture mode started on page:', response);
        }).catch((error) => {
          console.error('Error sending message:', error);
          // Don't show alert here - the capture might still work
        });
      }, 100);
      
    }).catch((error) => {
      console.error('Error injecting content script:', error);
      
      // Reset button
      const resetButton = document.querySelector(`.capture-btn[data-field-id="${fieldId}"]`);
      if (resetButton) {
        resetButton.textContent = resetButton.dataset.originalText || '🎯 Capture Element';
        resetButton.style.backgroundColor = '';
        resetButton.style.color = '';
        resetButton.disabled = false;
      }
      
      if (error.message && error.message.includes('Cannot access')) {
        alert('❌ Cannot access this page.\n\nThis might be a restricted page like chrome:// or a browser internal page.\n\nClearing tab selection - click "Change Tab" to select a different tab.');
        clearSelectedTab();
      } else if (error.message && error.message.includes('No tab with id')) {
        alert('❌ Tab no longer exists.\n\nClearing tab selection - click any Capture button to select a new tab.');
        clearSelectedTab();
      } else {
        alert('❌ Could not inject content script.\n\nTry refreshing the target page and trying again, or select a different tab.');
      }
    });
}

// Update selected tab display
function updateSelectedTabDisplay(tab) {
  const display = document.getElementById('selected-tab-display');
  const title = document.getElementById('selected-tab-title');
  const url = document.getElementById('selected-tab-url');
  
  if (display && title && url && tab) {
    display.style.display = 'block';
    title.textContent = tab.title || 'Untitled';
    url.textContent = tab.url;
  }
}

// Clear selected tab
function clearSelectedTab() {
  chrome.storage.local.remove('selectedScrapingTab', () => {
    console.log('✅ Selected tab cleared');
  });
  
  const display = document.getElementById('selected-tab-display');
  if (display) {
    display.style.display = 'none';
  }
  
  // Reset any capture buttons that might be stuck
  const captureButtons = document.querySelectorAll('.capture-btn');
  captureButtons.forEach(button => {
    if (button.disabled) {
      button.textContent = button.dataset.originalText || '🎯 Capture Element';
      button.style.backgroundColor = '';
      button.style.color = '';
      button.disabled = false;
    }
  });
}

// Listen for captured selector GLOBALLY
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'selectorCaptured') {
    const targetId = message.fieldId;
    const selector = message.selector;
    
    console.log('✅ Received selector for', targetId, ':', selector);
    
    // Check if this is for a step (contains '-step-')
    if (targetId.includes('-step-')) {
      const stepInput = document.querySelector(`.step-selector[data-step-id="${targetId}"]`);
      const button = document.querySelector(`.capture-step-action-btn[data-step-id="${targetId}"]`);
      
      if (stepInput) {
        stepInput.value = selector;
        stepInput.style.backgroundColor = '#d4edda';
        stepInput.style.border = '2px solid #10b981';
        setTimeout(() => { 
          stepInput.style.backgroundColor = ''; 
          stepInput.style.border = '';
        }, 2000);
        showToast(`✅ Step captured: ${selector.substring(0, 40)}...`);
      }
      
      if (button) {
        button.textContent = '✅ Captured!';
        button.disabled = false;
        setTimeout(() => {
          button.textContent = '🎯 Capture Selector';
        }, 2000);
      }
      
      sendResponse({ received: true });
      return true;
    }
    
    // Otherwise, handle as regular field capture
    const fieldId = targetId;
    
    console.log('📍 Current step container:', document.querySelector('.step.active'));
    
    // Save to storage
    chrome.storage.local.get(['builderFieldValues'], (result) => {
      const values = result.builderFieldValues || {};
      values[fieldId] = selector;
      chrome.storage.local.set({ 
        builderFieldValues: values,
        capturingField: null
      });
      console.log('💾 Saved to storage. All values:', values);
    });
    
    // Fill the input field
    const input = document.getElementById(fieldId);
    console.log('📝 Looking for input field:', fieldId, 'Found:', input);
    
    if (input) {
      input.value = selector;
      
      // Visual feedback - longer duration
      input.style.backgroundColor = '#d4edda';
      input.style.border = '2px solid #10b981';
      setTimeout(() => { 
        input.style.backgroundColor = ''; 
        input.style.border = '';
      }, 3000);
      
      // Save the value
      saveFieldValue(input);
      
      // Scroll to the field
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      console.log('✅ Field updated and saved! Value:', input.value);
      
      // Show toast notification
      showToast(`✅ Captured: ${selector.substring(0, 50)}...`);
    } else {
      console.error('❌ Could not find input field:', fieldId);
      showToast(`❌ Error: Field ${fieldId} not found`);
    }
    
    // Reset capture button
    const button = document.querySelector(`.capture-btn[data-field-id="${fieldId}"]`);
    if (button) {
      button.textContent = '✅ Captured!';
      button.style.backgroundColor = '#10b981';
      setTimeout(() => {
        button.textContent = button.dataset.originalText || '🎯 Capture';
        button.style.backgroundColor = '';
        button.style.color = '';
        button.disabled = false;
      }, 3000);
    }
    
    sendResponse({ received: true });
  }
  return true;
});

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add a capture step to a field
function addCaptureStep(fieldId) {
  const stepsContainer = document.getElementById(`${fieldId}-steps`);
  if (!stepsContainer) return;
  
  const stepCount = stepsContainer.children.length + 1;
  const stepId = `${fieldId}-step-${stepCount}`;
  
  const stepHtml = `
    <div class="capture-step-item" data-step-id="${stepId}" style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong style="font-size: 12px; color: #374151;">Step ${stepCount}</strong>
        <button type="button" class="remove-step-btn" data-step-id="${stepId}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 500;">
          🗑️ Remove
        </button>
      </div>
      
      <div style="margin-bottom: 8px;">
        <label style="font-size: 11px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 500;">Action Type</label>
        <select class="step-action-type" data-step-id="${stepId}" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
          <option value="click">Click element</option>
          <option value="hover">Hover over element</option>
          <option value="wait">Wait (seconds)</option>
          <option value="scroll">Scroll to element</option>
        </select>
      </div>
      
      <div style="margin-bottom: 8px;">
        <label style="font-size: 11px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 500;">Selector / Value</label>
        <input type="text" class="step-selector" data-step-id="${stepId}" placeholder="e.g., #button or 2 (for wait)" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
      </div>
      
      <button type="button" class="capture-step-action-btn" data-step-id="${stepId}" style="width: 100%; padding: 8px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; margin-bottom: 8px;">
        🎯 Capture Selector
      </button>
      
      <div>
        <label style="font-size: 11px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 500;">Note (optional)</label>
        <textarea class="step-note" data-step-id="${stepId}" placeholder="Describe what this step does..." style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; resize: vertical; min-height: 50px; font-family: inherit;"></textarea>
      </div>
    </div>
  `;
  
  stepsContainer.insertAdjacentHTML('beforeend', stepHtml);
  showToast(`✅ Step ${stepCount} added`);
}

// Capture element for a specific step
function captureStepAction(stepId) {
  // Check if we have a saved tab
  chrome.storage.local.get(['selectedScrapingTab'], (result) => {
    const savedTab = result.selectedScrapingTab;
    
    if (savedTab) {
      // Use saved tab
      startCaptureForStep(stepId, savedTab);
    } else {
      // Show tab selector
      showTabSelector((selectedTab) => {
        if (!selectedTab) return;
        startCaptureForStep(stepId, selectedTab);
      });
    }
  });
}

function startCaptureForStep(stepId, selectedTab) {
  const tabId = selectedTab.id;
  const tabUrl = selectedTab.url;
  
  if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('edge://')) {
    alert('❌ Cannot capture on browser internal pages.');
    return;
  }
  
  // Update button feedback
  const button = document.querySelector(`.capture-step-action-btn[data-step-id="${stepId}"]`);
  if (button) {
    button.textContent = '⏳ Click element on page...';
    button.disabled = true;
  }
  
  // Inject and start capture
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }).then(() => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'startCapture',
        fieldId: stepId  // Use stepId instead of fieldId
      }).then(() => {
        console.log('✅ Capture started for step:', stepId);
      }).catch((error) => {
        console.error('Error:', error);
        if (button) {
          button.textContent = '🎯 Capture for this step';
          button.disabled = false;
        }
      });
    }, 100);
  }).catch((error) => {
    console.error('Error injecting script:', error);
    alert('❌ Could not inject content script.');
    if (button) {
      button.textContent = '🎯 Capture for this step';
      button.disabled = false;
    }
  });
}

// Add a capture step to a field
function addCaptureStep(fieldId) {
  const stepsContainer = document.getElementById(`${fieldId}-steps`);
  if (!stepsContainer) return;
  
  const stepCount = stepsContainer.children.length + 1;
  const stepId = `${fieldId}-step-${stepCount}`;
  
  const stepHtml = `
    <div class="capture-step-item" data-step-id="${stepId}" style="background: white; border: 1px solid #d1d5db; border-radius: 4px; padding: 10px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px;">Step ${stepCount}</div>
          <select class="step-action-type" data-step-id="${stepId}" style="font-size: 11px; padding: 4px; border: 1px solid #d1d5db; border-radius: 3px; width: 100%; margin-bottom: 6px;">
            <option value="click">Click element</option>
            <option value="hover">Hover over element</option>
            <option value="wait">Wait (seconds)</option>
            <option value="scroll">Scroll to element</option>
          </select>
          <input type="text" class="step-selector" data-step-id="${stepId}" placeholder="Selector or value" style="font-size: 11px; padding: 4px; border: 1px solid #d1d5db; border-radius: 3px; width: 100%; margin-bottom: 6px;">
          <textarea class="step-note" data-step-id="${stepId}" placeholder="Note (optional)" style="font-size: 10px; padding: 4px; border: 1px solid #d1d5db; border-radius: 3px; width: 100%; resize: vertical; min-height: 40px;"></textarea>
        </div>
        <button type="button" class="remove-step-btn" data-step-id="${stepId}" style="margin-left: 8px; background: #ef4444; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 10px; cursor: pointer;">❌</button>
      </div>
      <button type="button" class="capture-step-action-btn" data-step-id="${stepId}" style="font-size: 10px; padding: 4px 8px; background: #8b5cf6; color: white; border: none; border-radius: 3px; cursor: pointer; width: 100%;">
        🎯 Capture for this step
      </button>
    </div>
  `;
  
  stepsContainer.insertAdjacentHTML('beforeend', stepHtml);
}

// Capture element for a specific step
function captureStepAction(stepId) {
  showTabSelector((selectedTab) => {
    if (!selectedTab) return;
    
    startCaptureForStep(stepId, selectedTab);
  });
}

function startCaptureForStep(stepId, selectedTab) {
  const tabId = selectedTab.id;
  const tabUrl = selectedTab.url;
  
  if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('edge://')) {
    alert('❌ Cannot capture on browser internal pages.');
    return;
  }
  
  // Inject and start capture
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }).then(() => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'startCapture',
        fieldId: stepId  // Use stepId instead of fieldId
      }).then(() => {
        console.log('✅ Capture started for step:', stepId);
      }).catch((error) => {
        console.error('Error:', error);
      });
    }, 100);
  }).catch((error) => {
    console.error('Error injecting script:', error);
    alert('❌ Could not inject content script.');
  });
}

// Update global listener to handle step captures
let originalGlobalListener = chrome.runtime.onMessage.addListener;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'selectorCaptured') {
    const targetId = message.fieldId;
    
    // Check if this is for a step (contains '-step-')
    if (targetId.includes('-step-')) {
      const stepInput = document.querySelector(`.step-selector[data-step-id="${targetId}"]`);
      if (stepInput) {
        stepInput.value = message.selector;
        stepInput.style.backgroundColor = '#d4edda';
        setTimeout(() => { stepInput.style.backgroundColor = ''; }, 2000);
        showToast(`✅ Step captured: ${message.selector.substring(0, 40)}...`);
      }
      sendResponse({ received: true });
      return true;
    }
  }
})

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
  loadScriptsList();
  populateScriptSelector();
});

// ========================================
// Script Management System
// ========================================

function getGeneratedScripts() {
  return JSON.parse(localStorage.getItem('generatedScripts') || '[]');
}

function saveGeneratedScript(scriptData) {
  const scripts = getGeneratedScripts();
  const existingIndex = scripts.findIndex(s => s.scraperId === scriptData.scraperId);
  
  if (existingIndex >= 0) {
    scripts[existingIndex] = scriptData;
  } else {
    scripts.push(scriptData);
  }
  
  localStorage.setItem('generatedScripts', JSON.stringify(scripts));
  loadScriptsList();
  populateScriptSelector();
}

function deleteGeneratedScript(scraperId) {
  const scripts = getGeneratedScripts();
  const filtered = scripts.filter(s => s.scraperId !== scraperId);
  localStorage.setItem('generatedScripts', JSON.stringify(filtered));
  loadScriptsList();
  populateScriptSelector();
}

function populateScriptSelector() {
  const selector = document.getElementById('script-selector');
  if (!selector) return;
  
  const scrapers = JSON.parse(localStorage.getItem('scrapers') || '[]');
  selector.innerHTML = '<option value="">Select a scraper to generate script...</option>';
  
  scrapers.forEach((scraper, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${scraper.name}`;
    selector.appendChild(option);
  });
}

function loadScriptsList() {
  const container = document.getElementById('script-list');
  if (!container) return;
  
  const scripts = getGeneratedScripts();
  
  if (scripts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No scripts generated yet. Select a scraper and click Generate.</p>';
    return;
  }
  
  container.innerHTML = scripts.map(script => `
    <div class="script-card" data-scraper-id="${script.scraperId}" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f9fafb;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 15px;">${script.scraperName}</h4>
          <p style="margin: 0; font-size: 11px; color: #666;">
            Generated ${new Date(script.generatedAt).toLocaleString()}
            ${script.aiFieldsCount > 0 ? ` • ${script.aiFieldsCount} AI fields` : ''}
          </p>
        </div>
        <button class="btn-danger delete-script-btn" data-scraper-id="${script.scraperId}" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
      </div>
      
      <pre style="background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 11px; max-height: 150px; overflow: auto; margin: 8px 0;">${script.code.substring(0, 300)}${script.code.length > 300 ? '...' : ''}</pre>
      
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
        <button class="btn-secondary view-script-btn" data-scraper-id="${script.scraperId}" style="flex: 1; min-width: 80px; padding: 6px; font-size: 11px;">👁️ View</button>
        <button class="btn-secondary edit-script-btn" data-scraper-id="${script.scraperId}" style="flex: 1; min-width: 80px; padding: 6px; font-size: 11px;">✏️ Edit</button>
        <button class="btn-secondary debug-script-btn" data-scraper-id="${script.scraperId}" style="flex: 1; min-width: 80px; padding: 6px; font-size: 11px;">🔧 Debug</button>
        <button class="btn-secondary regenerate-script-btn" data-scraper-id="${script.scraperId}" style="flex: 1; min-width: 80px; padding: 6px; font-size: 11px;">🔄 Regen</button>
        <button class="btn-primary test-script-btn" data-scraper-id="${script.scraperId}" style="flex: 1; min-width: 80px; padding: 6px; font-size: 11px;">▶️ Test</button>
      </div>
    </div>
  `).join('');
  
  // Attach event listeners
  container.querySelectorAll('.delete-script-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scraperId = e.target.dataset.scraperId;
      if (confirm('Delete this generated script?')) {
        deleteGeneratedScript(scraperId);
      }
    });
  });
  
  container.querySelectorAll('.debug-script-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const scraperId = e.target.dataset.scraperId;
      const script = getGeneratedScripts().find(s => s.scraperId === scraperId);
      if (script) {
        await debugScriptWithAgent(script);
      }
    });
  });
  
  container.querySelectorAll('.view-script-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scraperId = e.target.dataset.scraperId;
      const script = getGeneratedScripts().find(s => s.scraperId === scraperId);
      if (script) showScriptModal(script, false);
    });
  });
  
  container.querySelectorAll('.edit-script-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scraperId = e.target.dataset.scraperId;
      const script = getGeneratedScripts().find(s => s.scraperId === scraperId);
      if (script) showScriptModal(script, true);
    });
  });
  
  container.querySelectorAll('.regenerate-script-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const button = e.target;
      const scraperId = button.dataset.scraperId;
      const scrapers = JSON.parse(localStorage.getItem('scrapers') || '[]');
      const scraper = scrapers.find(s => (s.name + '-' + Date.now()) === scraperId || s.name === scraperId.split('-')[0]);
      
      if (scraper && confirm('Regenerate script for ' + scraper.name + '?')) {
        await generateScriptForScraper(scraper, scraperId);
      }
    });
  });
  
  container.querySelectorAll('.test-script-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const scraperId = e.target.dataset.scraperId;
      const script = getGeneratedScripts().find(s => s.scraperId === scraperId);
      if (script) await runScriptTest(script);
    });
  });
}

function showScriptModal(script, editable) {
  console.log('📄 Opening script modal for:', script.scraperName);
  console.log('📄 Script code length:', script.code?.length);
  console.log('📄 Script code preview:', script.code?.substring(0, 200));
  
  const modal = document.createElement('div');
  modal.className = 'script-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h2 style="margin-top: 0;">${editable ? '✏️ Edit' : '👁️ View'} Script: ${script.scraperName}</h2>
    <textarea id="script-code-editor" style="width: 100%; min-height: 400px; font-family: 'Courier New', monospace; font-size: 12px; padding: 12px; border: 1px solid #ccc; border-radius: 6px; background: #1e1e1e; color: #d4d4d4;" ${editable ? '' : 'readonly'}>${script.code}</textarea>
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button id="copy-script-modal" class="btn-secondary">📋 Copy</button>
      ${editable ? '<button id="save-script-modal" class="btn-primary">💾 Save Changes</button>' : ''}
      <button id="close-script-modal" class="btn-secondary" style="margin-left: auto;">Close</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('copy-script-modal').addEventListener('click', () => {
    const code = document.getElementById('script-code-editor').value;
    navigator.clipboard.writeText(code);
    showToast('✅ Script copied to clipboard');
  });
  
  if (editable) {
    document.getElementById('save-script-modal').addEventListener('click', () => {
      script.code = document.getElementById('script-code-editor').value;
      script.generatedAt = new Date().toISOString();
      saveGeneratedScript(script);
      showToast('✅ Script updated');
      modal.remove();
    });
  }
  
  document.getElementById('close-script-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function generateScriptForScraper(scraper, existingScraperId = null, options = {}) {
  // Prevent multiple simultaneous generations
  if (window.generationInProgress) {
    console.warn('⚠️ Generation already in progress, ignoring click');
    return;
  }
  
  window.generationInProgress = true;
  let progressLog = null;
  
  try {
    // Create progress display
    progressLog = document.createElement('div');
    progressLog.id = 'generation-progress-log';
    progressLog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 400px;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      font-family: monospace;
      font-size: 12px;
    `;
    
    const title = options.usePuppeteer ? '🎭 Regenerating with Puppeteer...' : '🤖 AI Agent Working...';
    progressLog.innerHTML = `
      <h3 style="margin: 0 0 12px 0; font-family: sans-serif;">${title}</h3>
      <div id="progress-messages" style="line-height: 1.6;"></div>
    `;
    document.body.appendChild(progressLog);
    
    const messagesDiv = document.getElementById('progress-messages');
    const addMessage = (msg) => {
      const line = document.createElement('div');
      line.textContent = msg;
      line.style.marginBottom = '4px';
      messagesDiv.appendChild(line);
      progressLog.scrollTop = progressLog.scrollHeight;
    };
    
    if (options.usePuppeteer) {
      addMessage('🎭 Using Puppeteer mode for JavaScript rendering');
      addMessage('Reason: ' + (options.reason || 'Page requires JavaScript'));
    }
    
    addMessage('⏳ Initializing AI agent...');
    
    // Use singleton pattern with mutex to prevent race conditions
    if (window.agentInitializing) {
      addMessage('⏳ Agent already initializing, waiting...');
      // Wait for existing initialization to complete
      while (window.agentInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      addMessage('✅ Using existing agent instance');
    }
    
    let agent = window.agentInstance;
    if (!agent) {
      window.agentInitializing = true;
      try {
        agent = new window.ScraperAIAgent();
        window.agentInstance = agent;
        addMessage('✅ New agent instance created');
      } finally {
        window.agentInitializing = false;
      }
    } else {
      addMessage('♻️ Reusing existing agent instance');
    }
    
    // Load selected context guides from localStorage
    const selectedContexts = JSON.parse(localStorage.getItem('agentContextGuides') || '["scraper-guide", "basic-selectors", "error-handling"]');
    agent.selectedContexts = selectedContexts;
    addMessage(`📚 Loaded ${selectedContexts.length} context guide(s)`);
    
    const status = await agent.checkOllamaStatus();
    
    if (!status.available) {
      alert('❌ Ollama is not running. Please start Ollama first.\\n\\nInstall from: ' + status.installUrl);
      progressLog.remove();
      return;
    }
    
    addMessage('✅ Ollama connected');
    
    // Set interactive mode based on user preference
    const interactiveMode = localStorage.getItem('agentInteractiveMode') === 'true';
    agent.interactiveMode = interactiveMode;
    if (interactiveMode) {
      addMessage('💬 Interactive mode: Agent will ask for feedback');
    }
    
    // Get template for context
    const template = templates.find(t => t.name === scraper.templateName);
    
    // Use the new agentic generation system with progress callback
    const agenticResult = await agent.generateScraperWithAI(scraper, template, (msg) => {
      addMessage(msg);
    }, options); // Pass options (including usePuppeteer)
    
    console.log('🎯 Agentic generation complete:', {
      iterations: agenticResult.iterations,
      success: agenticResult.success,
      fieldsExtracted: agenticResult.finalTestResult?.fieldsExtracted
    });
    
    const cleanCode = agenticResult.script;
    
    if (!cleanCode || cleanCode.length < 10) {
      throw new Error('Generated code is empty or too short. AI may have failed to generate code.');
    }
    
    // Count AI fields
    const aiFieldsCount = scraper.aiFields ? Object.values(scraper.aiFields).filter(f => f.enabled).length : 0;
    
    // Save script with test results
    const scriptData = {
      scraperId: existingScraperId || (scraper.name + '-' + Date.now()),
      scraperName: scraper.name,
      scraperConfig: scraper,
      code: cleanCode,
      generatedAt: new Date().toISOString(),
      aiFieldsCount: aiFieldsCount,
      requiresPuppeteer: options.usePuppeteer || false,
      agenticResult: {
        iterations: agenticResult.iterations,
        success: agenticResult.success,
        fieldsExtracted: agenticResult.finalTestResult?.fieldsExtracted,
        testError: agenticResult.finalTestResult?.error
      }
    };
    
    saveGeneratedScript(scriptData);
    
    const successMsg = agenticResult.success 
      ? `✅ Script generated and tested successfully! (${agenticResult.iterations} iterations, ${agenticResult.finalTestResult.fieldsExtracted} fields extracted)`
      : `⚠️ Script generated but may need refinement (${agenticResult.iterations} iterations, ${agenticResult.finalTestResult?.fieldsExtracted || 0} fields extracted)`;
    
    addMessage('\n' + successMsg);
    
    // Close progress after delay
    setTimeout(() => {
      progressLog.remove();
      showToast(successMsg);
      // Switch to Scripts tab
      document.querySelector('.tab-button[data-tab="scripts"]').click();
      
      // Release generation lock
      window.generationInProgress = false;
    }, 2000);
    
  } catch (error) {
    console.error('Script generation error:', error);
    
    // Try to save partial script if available
    let partialScript = null;
    if (error.partialScript) {
      partialScript = error.partialScript;
    } else if (window.lastGeneratedScript) {
      partialScript = window.lastGeneratedScript;
    }
    
    if (progressLog) {
      const messagesDiv = progressLog.querySelector('#progress-messages');
      if (messagesDiv) {
        const errorLine = document.createElement('div');
        errorLine.textContent = '❌ ERROR: ' + error.message;
        errorLine.style.color = '#dc2626';
        errorLine.style.fontWeight = 'bold';
        messagesDiv.appendChild(errorLine);
        
        // If we have a partial script, offer to save it
        if (partialScript) {
          const partialLine = document.createElement('div');
          partialLine.textContent = '💾 Partial script generated - saving for manual editing';
          partialLine.style.color = '#f59e0b';
          partialLine.style.marginTop = '8px';
          messagesDiv.appendChild(partialLine);
        }
        
        // Add retry button
        const retryBtn = document.createElement('button');
        retryBtn.textContent = '🔄 Retry Generation';
        retryBtn.style.cssText = 'margin-top: 12px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;';
        retryBtn.onclick = () => {
          progressLog.remove();
          document.querySelector('#generate-script-btn').click();
        };
        messagesDiv.appendChild(retryBtn);
      }
      
      // Don't auto-close on error - let user read and retry
      // setTimeout(() => progressLog.remove(), 5000);
    }
    
    // Save partial script if available
    if (partialScript) {
      const scriptName = `${category.toLowerCase()}_${state.toLowerCase()}_${source.toLowerCase()}_partial`.replace(/[^a-z0-9_]/g, '_');
      window.savedScripts = window.savedScripts || {};
      window.savedScripts[scriptName] = {
        code: partialScript,
        config: scraperConfig,
        timestamp: Date.now(),
        partial: true
      };
      localStorage.setItem('scraperScripts', JSON.stringify(window.savedScripts));
      refreshScriptsList();
      
      // Switch to Scripts tab to show the partial script
      setTimeout(() => {
        document.querySelector('.tab-button[data-tab="scripts"]').click();
      }, 1000);
    }
    
    let errorMessage = error.message;
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMessage = `Ollama is blocking the request due to CORS policy.

To fix this, restart Ollama with CORS enabled:

Windows PowerShell:
$env:OLLAMA_ORIGINS="*"; ollama serve

Or set it permanently:
1. Close Ollama completely
2. Open System Environment Variables
3. Add: OLLAMA_ORIGINS=*
4. Restart Ollama

Then try generating the script again.`;
    }
    
    alert('❌ Error generating script:\\n\\n' + errorMessage);
    showToast('❌ Generation failed');
  } finally {
    // Always clear the lock
    window.generationInProgress = false;
  }
}

// Interactive mode toggle
document.getElementById('interactive-mode-toggle')?.addEventListener('change', (e) => {
  localStorage.setItem('agentInteractiveMode', e.target.checked);
  showToast(e.target.checked ? '🤖 Interactive mode enabled' : '🤖 Interactive mode disabled');
});

// Load interactive mode state
const savedInteractiveMode = localStorage.getItem('agentInteractiveMode') === 'true';
if (document.getElementById('interactive-mode-toggle')) {
  document.getElementById('interactive-mode-toggle').checked = savedInteractiveMode;
}

// View knowledge base
document.getElementById('view-knowledge-btn')?.addEventListener('click', () => {
  const knowledge = new window.AgentKnowledge();
  const summary = knowledge.getSummary();
  
  showKnowledgeModal(knowledge, summary);
});

// Clear knowledge base
document.getElementById('clear-knowledge-btn')?.addEventListener('click', () => {
  if (confirm('⚠️ This will delete all learned patterns and knowledge. Are you sure?')) {
    const knowledge = new window.AgentKnowledge();
    knowledge.clearKnowledge();
    showToast('🗑️ Knowledge base cleared');
  }
});

function showKnowledgeModal(knowledge, summary) {
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
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  `;
  
  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0;">📚 Agent Knowledge Base</h3>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div style="padding: 12px; background: #f0f9ff; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #0ea5e9;">${summary.totalSuccesses}</div>
        <div style="font-size: 12px; color: #666;">Successes</div>
      </div>
      <div style="padding: 12px; background: #fef2f2; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${summary.totalFailures}</div>
        <div style="font-size: 12px; color: #666;">Failures</div>
      </div>
      <div style="padding: 12px; background: #f0fdf4; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${summary.successRate}%</div>
        <div style="font-size: 12px; color: #666;">Success Rate</div>
      </div>
      <div style="padding: 12px; background: #faf5ff; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #a855f7;">${summary.domainsKnown}</div>
        <div style="font-size: 12px; color: #666;">Domains Known</div>
      </div>
    </div>
    
    ${summary.topDomains.length > 0 ? `
      <h4 style="margin: 16px 0 8px 0; font-size: 14px;">🏆 Top Domains</h4>
      <div style="font-size: 12px;">
        ${summary.topDomains.map(d => `
          <div style="padding: 6px 0; border-bottom: 1px solid #eee;">
            <strong>${d.domain}</strong>: ${d.successCount} successes
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${summary.commonIssues.length > 0 ? `
      <h4 style="margin: 16px 0 8px 0; font-size: 14px;">⚠️ Common Issues</h4>
      <div style="font-size: 12px;">
        ${summary.commonIssues.map(issue => `
          <div style="padding: 6px 0; border-bottom: 1px solid #eee;">• ${issue}</div>
        `).join('')}
      </div>
    ` : ''}
    
    <h4 style="margin: 16px 0 8px 0; font-size: 14px;">📖 Context Library</h4>
    <div style="font-size: 12px;">
      ${Object.keys(knowledge.knowledge.contextLibrary).map(key => `
        <div style="padding: 8px; margin-bottom: 8px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #3b82f6;">
          <strong>${key}</strong>: ${knowledge.knowledge.contextLibrary[key].description}
        </div>
      `).join('')}
    </div>
    
    <button id="close-knowledge-modal" style="margin-top: 16px; width: 100%; padding: 10px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer;">
      Close
    </button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.getElementById('close-knowledge-modal').addEventListener('click', () => {
    modal.remove();
  });
}

document.getElementById('generate-new-script-btn')?.addEventListener('click', async () => {
  const selector = document.getElementById('script-selector');
  const selectedIndex = selector.value;
  
  if (selectedIndex === '') {
    alert('ℹ️ Please select a scraper first');
    return;
  }
  
  const scrapers = JSON.parse(localStorage.getItem('scrapers') || '[]');
  const scraper = scrapers[parseInt(selectedIndex)];
  
  if (!scraper) {
    alert('❌ Scraper not found');
    return;
  }
  
  await generateScriptForScraper(scraper);
});

// Debug existing script with agent
async function debugScriptWithAgent(scriptData) {
  let progressLog = null;
  
  try {
    // Create progress display
    progressLog = document.createElement('div');
    progressLog.id = 'debug-progress-log';
    progressLog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #ef4444;
      border-radius: 12px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 400px;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      font-family: monospace;
      font-size: 12px;
    `;
    progressLog.innerHTML = `
      <h3 style="margin: 0 0 12px 0; font-family: sans-serif;">🔧 Agent Debugging...</h3>
      <div id="debug-messages" style="line-height: 1.6;"></div>
    `;
    document.body.appendChild(progressLog);
    
    const messagesDiv = document.getElementById('debug-messages');
    const addMessage = (msg) => {
      const line = document.createElement('div');
      line.textContent = msg;
      line.style.marginBottom = '4px';
      messagesDiv.appendChild(line);
      progressLog.scrollTop = progressLog.scrollHeight;
    };
    
    addMessage('🔍 Testing current script...');
    
    // Initialize agent
    const agent = new window.ScraperAIAgent();
    agent.interactiveMode = true; // Always use interactive mode for debugging
    agent.chat.startSession(scriptData.scraperConfig, {});
    
    // Check Ollama
    const status = await agent.checkOllamaStatus();
    if (!status.available) {
      alert('❌ Ollama is not running. Please start Ollama first.');
      progressLog.remove();
      return;
    }
    
    addMessage('✅ Ollama connected');
    
    // Test the current script
    addMessage('🌐 Fetching target page...');
    const testResult = await agent.testScriptAgentically(
      scriptData.code, 
      scriptData.scraperConfig,
      (msg) => addMessage(msg)
    );
    
    // Check if this is a sandbox limitation
    const isSandboxLimitation = 
      (testResult.hint && testResult.hint.includes('real tab')) ||
      (testResult.error && testResult.error.includes('requires real tab testing')) ||
      (testResult.error && testResult.error.includes('security restrictions'));
    
    if (isSandboxLimitation) {
      addMessage('⚠️ Sandbox limitation detected');
      addMessage('💡 Extension security prevents running scripts in sandbox');
      
      const useRealTest = await agent.chat.askForFeedback(
        'This script cannot be tested in the extension sandbox due to Chrome security policies.\n\n' +
        'Would you like to run a full test in a real browser tab instead?\n\n' +
        '(This will open the target website and execute the script there)',
        ['Yes, run full test', 'No, regenerate from scratch', 'Cancel']
      );
      
      if (useRealTest.includes('full test')) {
        addMessage('🚀 Running full test in new tab...');
        progressLog.remove();
        await runScriptTest(scriptData);
        return;
      } else if (useRealTest.includes('scratch')) {
        progressLog.remove();
        await generateScriptForScraper(scriptData.scraperConfig, scriptData.scraperId);
        return;
      } else {
        progressLog.remove();
        return;
      }
    }
    
    if (testResult.success && testResult.fieldsExtracted > 0) {
      addMessage(`✅ Script works! Extracted ${testResult.fieldsExtracted} fields`);
      addMessage('💡 No debugging needed - script is functional');
      
      setTimeout(() => {
        progressLog.remove();
        showToast('✅ Script is working correctly!');
      }, 2000);
      return;
    }
    
    // Script failed - start interactive debugging
    addMessage(`❌ Script failed: ${testResult.error || 'No fields extracted'}`);
    addMessage('🔍 Starting interactive debugging...');
    
    // Diagnose with knowledge base context
    const relevantContext = agent.knowledge.getRelevantContext(scriptData.scraperConfig);
    addMessage('🧠 Checking knowledge base...');
    
    const diagnosis = await agent.diagnoseScriptFailure(
      scriptData.code,
      testResult,
      scriptData.scraperConfig,
      relevantContext
    );
    
    addMessage(`💡 Diagnosis: ${diagnosis.rootCause}`);
    
    // Ask user for feedback
    addMessage('💬 Requesting your input...');
    
    try {
      const errorDetails = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Error Message:
${testResult.error || 'No fields extracted'}

🔍 AI Diagnosis:
${diagnosis.rootCause}

⚠️ Problems Identified:
${diagnosis.problems.map((p, i) => `  ${i+1}. ${p}`).join('\n')}

💡 Recommendation:
${diagnosis.recommendation}

📊 Test Results:
  • Success: ${testResult.success}
  • Fields Extracted: ${testResult.fieldsExtracted}
  • Execution Success: ${testResult.executionSuccess || 'N/A'}

${testResult.error?.includes('CSP') || 
  testResult.error?.includes('unsafe-eval') || 
  testResult.error?.includes('Content Security Policy') ||
  testResult.error?.includes('cross-origin') ||
  testResult.error?.includes('Blocked a frame') ? `
⚠️ CHROME EXTENSION SECURITY RESTRICTION:
This error is caused by Chrome's security policies that prevent
extensions from executing dynamic code.

💡 RECOMMENDED ACTION:
Instead of debugging in the sandbox, use one of these options:
  1. Click ▶️ TEST button - Runs script in a real browser tab (full testing)
  2. Click 🔄 REGENERATE - Generate a new script from scratch
  3. Click ✏️ EDIT - Manually fix the script code

The 🔧 Debug feature is limited by browser security and works best
for simple validation. For accurate testing, always use ▶️ Test.
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim();
      
      const feedback = await agent.chat.askForFeedback(
        `Your script "${scriptData.scraperName}" is failing.\n\n${errorDetails}\n\nWhat should I do?`,
        [
          'Fix it automatically',
          'Let me provide specific feedback',
          'Show me the diagnosis details',
          'Regenerate from scratch'
        ]
      );
      
      addMessage(`📝 Your choice: ${feedback}`);
      
      if (feedback.includes('scratch')) {
        // Regenerate completely
        addMessage('🔄 Regenerating script from scratch...');
        progressLog.remove();
        await generateScriptForScraper(scriptData.scraperConfig, scriptData.scraperId);
        return;
      }
      
      if (feedback.includes('details')) {
        // Show full diagnosis
        const diagnosisText = `
PROBLEMS:
${diagnosis.problems.map((p, i) => `${i+1}. ${p}`).join('\n')}

ROOT CAUSE:
${diagnosis.rootCause}

RECOMMENDATION:
${diagnosis.recommendation}

TEST RESULT:
- Success: ${testResult.success}
- Fields extracted: ${testResult.fieldsExtracted}
- Error: ${testResult.error || 'None'}
        `.trim();
        
        alert(diagnosisText);
        
        // Ask again what to do
        const nextAction = await agent.chat.askForFeedback(
          'Now that you\'ve seen the details, what should I do?',
          ['Fix it automatically', 'Let me provide feedback', 'Cancel']
        );
        
        if (nextAction.includes('Cancel')) {
          progressLog.remove();
          return;
        }
        
        addMessage(`📝 Your choice: ${nextAction}`);
      }
      
      // Get additional feedback if requested
      let additionalFeedback = null;
      if (feedback.includes('specific feedback') || feedback.includes('provide feedback')) {
        additionalFeedback = await agent.chat.askForFeedback(
          'Please describe what you know about the page structure or what might be wrong:',
          []
        );
        
        if (additionalFeedback !== '[skipped]') {
          addMessage(`💬 Your feedback: ${additionalFeedback}`);
          diagnosis.userFeedback = additionalFeedback;
        }
      }
      
      // Attempt to fix
      addMessage('🔧 Fixing script with AI...');
      const fixedScript = await agent.fixScript(
        scriptData.code,
        diagnosis,
        testResult,
        scriptData.scraperConfig,
        relevantContext
      );
      
      const cleanedScript = agent.cleanGeneratedCode(fixedScript);
      addMessage('✅ Fixed script generated');
      
      // Test the fixed script
      addMessage('🧪 Testing fixed script...');
      const fixedTestResult = await agent.testScriptAgentically(
        cleanedScript,
        scriptData.scraperConfig,
        (msg) => addMessage(msg)
      );
      
      if (fixedTestResult.success && fixedTestResult.fieldsExtracted > 0) {
        addMessage(`✅ Success! Fixed script extracted ${fixedTestResult.fieldsExtracted} fields`);
        
        // Update the script
        scriptData.code = cleanedScript;
        scriptData.generatedAt = new Date().toISOString();
        scriptData.agenticResult = {
          iterations: 1,
          success: true,
          fieldsExtracted: fixedTestResult.fieldsExtracted,
          debugSession: true
        };
        
        saveGeneratedScript(scriptData);
        agent.knowledge.recordSuccess(scriptData.scraperConfig, cleanedScript, fixedTestResult, diagnosis);
        
        addMessage('💾 Script updated and saved');
        addMessage('\n🎉 Debugging complete!');
        
        setTimeout(() => {
          progressLog.remove();
          showToast('✅ Script fixed and saved!');
          loadScriptsList();
        }, 2000);
      } else {
        addMessage(`❌ Fixed script still failing: ${fixedTestResult.error || 'No fields'}`);
        
        // Record failure
        agent.knowledge.recordFailure(scriptData.scraperConfig, cleanedScript, fixedTestResult, diagnosis);
        
        // Ask if they want to continue with detailed error info
        const secondErrorDetails = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FIXED SCRIPT STILL FAILING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 New Error:
${fixedTestResult.error || 'No fields extracted'}

📊 New Test Results:
  • Success: ${fixedTestResult.success}
  • Fields Extracted: ${fixedTestResult.fieldsExtracted}
  • Execution Success: ${fixedTestResult.executionSuccess || 'N/A'}

📝 Original Diagnosis:
${diagnosis.rootCause}

💭 This suggests the fix may have:
  • Not addressed the root cause
  • Introduced a new issue
  • Or the page structure is more complex

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
        
        const continueDebug = await agent.chat.askForFeedback(
          secondErrorDetails + '\n\nWould you like to try again or regenerate from scratch?',
          ['Try fixing again', 'Regenerate from scratch', 'Show me the fixed code', 'Cancel']
        );
        
        if (continueDebug.includes('fixed code')) {
          // Show the fixed code in a modal
          const codeModal = document.createElement('div');
          codeModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 100001;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          `;
          codeModal.innerHTML = `
            <h3 style="margin: 0 0 12px 0;">🔧 Fixed Script Code</h3>
            <pre style="background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px;">${cleanedScript}</pre>
            <button onclick="this.parentElement.remove()" style="margin-top: 12px; width: 100%; padding: 10px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer;">Close</button>
          `;
          document.body.appendChild(codeModal);
          
          // Ask again after showing code
          setTimeout(async () => {
            codeModal.remove();
            const nextAction = await agent.chat.askForFeedback(
              'Now that you\'ve seen the fixed code, what would you like to do?',
              ['Try fixing again', 'Regenerate from scratch', 'Cancel']
            );
            
            if (nextAction.includes('scratch')) {
              progressLog.remove();
              await generateScriptForScraper(scriptData.scraperConfig, scriptData.scraperId);
            } else if (nextAction.includes('again')) {
              progressLog.remove();
              await debugScriptWithAgent(scriptData);
            } else {
              progressLog.remove();
            }
          }, 100);
        } else if (continueDebug.includes('scratch')) {
          progressLog.remove();
          await generateScriptForScraper(scriptData.scraperConfig, scriptData.scraperId);
        } else if (continueDebug.includes('again')) {
          progressLog.remove();
          await debugScriptWithAgent(scriptData); // Recursive call
        } else {
          progressLog.remove();
        }
      }
      
    } catch (err) {
      addMessage(`⚠️ Error: ${err.message}`);
      setTimeout(() => progressLog.remove(), 3000);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
    
    if (progressLog) {
      const messagesDiv = progressLog.querySelector('#debug-messages');
      if (messagesDiv) {
        const errorLine = document.createElement('div');
        errorLine.textContent = '❌ ERROR: ' + error.message;
        errorLine.style.color = '#dc2626';
        errorLine.style.fontWeight = 'bold';
        messagesDiv.appendChild(errorLine);
      }
      
      setTimeout(() => progressLog.remove(), 5000);
    }
    
    alert('❌ Debug failed: ' + error.message);
  }
}

// Modal Helper Functions
function showLoadingModal(title, message) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="text-align: center; padding: 40px;">
      <h2 style="margin: 0 0 15px 0; color: #2563eb;">${title}</h2>
      <p style="color: #666; margin-bottom: 25px;">${message}</p>
      <div class="spinner" style="margin: 0 auto;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function updateLoadingModal(modal, title, message) {
  const content = modal.querySelector('.modal-content');
  if (content) {
    content.innerHTML = `
      <h2 style="margin: 0 0 15px 0; color: #2563eb;">${title}</h2>
      <p style="color: #666; margin-bottom: 25px;">${message}</p>
      <div class="spinner" style="margin: 0 auto;"></div>
    `;
  }
}

function closeModal(modal) {
  if (modal && modal.parentNode) {
    modal.remove();
  }
}

async function showSuccessModal(title, message, buttonText, onConfirm) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
        <h2 style="margin: 0 0 15px 0; color: #059669;">${title}</h2>
        <p style="color: #666; margin-bottom: 25px;">${message}</p>
        <button class="btn-primary" style="padding: 12px 30px; font-size: 16px;">
          ${buttonText}
        </button>
      </div>
    `;
    
    const button = modal.querySelector('button');
    button.addEventListener('click', () => {
      modal.remove();
      if (onConfirm) onConfirm();
      resolve();
    });
    
    document.body.appendChild(modal);
  });
}

async function showJavaScriptDetectionModal(result, scriptData) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; padding: 30px;">
        <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h2 style="margin: 0 0 15px 0; color: #ea580c; text-align: center;">JavaScript Rendering Required</h2>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #92400e;">Detection:</strong>
          <p style="margin: 5px 0 0 0; color: #78350f;">${result.jsDetectionReason}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          This page loads content dynamically with JavaScript. Your current scraper only fetches static HTML.
        </p>
        
        <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #075985;">Solution:</strong>
          <p style="margin: 5px 0 0 0; color: #0c4a6e;">
            Regenerate with <strong>Puppeteer</strong> support to use a real browser for rendering.
          </p>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 25px;">
          <button class="btn-secondary" data-action="cancel" style="flex: 1; padding: 12px;">
            Cancel
          </button>
          <button class="btn-primary" data-action="regenerate" style="flex: 1; padding: 12px;">
            🎭 Regenerate with Puppeteer
          </button>
        </div>
      </div>
    `;
    
    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
    
    modal.querySelector('[data-action="regenerate"]').addEventListener('click', async () => {
      modal.remove();
      await regenerateScriptWithPuppeteer(scriptData);
      resolve(true);
    });
    
    document.body.appendChild(modal);
  });
}
async function regenerateScriptWithPuppeteer(scriptData) {
  // Simply call the normal generation function with Puppeteer options
  await generateScriptForScraper(
    scriptData.scraperConfig, 
    scriptData.scraperId, 
    {
      usePuppeteer: true,
      reason: 'Page requires JavaScript rendering'
    }
  );
}

async function runScriptTest(scriptData) {
  try {
    const button = document.querySelector(`.test-script-btn[data-scraper-id="${scriptData.scraperId}"]`);
    if (button) {
      button.textContent = '⏳ Running...';
      button.disabled = true;
    }
    
    // Get target URL from scraper config - try multiple locations
    let fields = scriptData.scraperConfig.fields;
    if (typeof fields === 'string') {
      fields = JSON.parse(fields);
    }
    
    const targetUrl = fields?.['step1-calendar_url'] || 
                     fields?.['step1-court_url'] ||
                     fields?.['step1-listing_url'] ||
                     scriptData.scraperConfig.startUrl ||
                     scriptData.scraperConfig.url ||
                     scriptData.scraperConfig.targetUrl;
    
    if (!targetUrl) {
      alert('❌ No target URL found in scraper configuration');
      if (button) {
        button.textContent = '▶️ Test';
        button.disabled = false;
      }
      return;
    }
    
    // Execute via backend server (no CSP restrictions!)
    try {
      const response = await fetch('http://localhost:3002/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptCode: scriptData.code,
          targetUrl: targetUrl,
          timeout: 90000
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if page requires JavaScript rendering (but only if not already using Puppeteer)
      if (result.requiresJavaScript && !scriptData.requiresPuppeteer) {
        await showJavaScriptDetectionModal(result, scriptData);
        return;
      }
      
      // Show results
      showTestResultsModal(result, scriptData.scraperName);
      
    } catch (error) {
      // Check if backend is not running
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        alert(`❌ Backend Server Not Running\n\nTo run scrapers, start the backend server:\n\n1. Open terminal in: scraper-backend/\n2. Run: npm run execute\n   Or double-click: start-execute.bat\n\nThe server will run on http://localhost:3002\n\nWhy? Browser extensions can't execute dynamic code due to CSP restrictions. The backend runs scripts in Node.js where these restrictions don't apply.`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Test execution error:', error);
    alert('❌ Error running test:\n\n' + error.message);
  } finally {
    const button = document.querySelector(`.test-script-btn[data-scraper-id="${scriptData.scraperId}"]`);
    if (button) {
      button.textContent = '▶️ Test';
      button.disabled = false;
    }
  }
}

function showTestResultsModal(result, scraperName) {
  const modal = document.createElement('div');
  modal.className = 'test-results-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    width: 100%;
    max-width: 1000px;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  const aiSection = result.aiCalls && result.aiCalls.length > 0 ? `
    <div style="margin-top: 20px;">
      <h3>🤖 AI Analysis Calls (${result.aiCalls.length})</h3>
      ${result.aiCalls.map((call, i) => `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px;">Call ${i + 1} ${call.error ? '❌' : '✅'} (${call.duration}ms)</h4>
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 12px;">Prompt:</strong>
            <pre style="background: #fff; padding: 8px; border-radius: 4px; font-size: 11px; margin: 4px 0;">${call.prompt}</pre>
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 12px;">Input (${call.inputLength} chars):</strong>
            <pre style="background: #fff; padding: 8px; border-radius: 4px; font-size: 11px; margin: 4px 0; max-height: 150px; overflow-y: auto;">${call.input}</pre>
          </div>
          ${call.response ? `
            <div>
              <strong style="font-size: 12px;">AI Response:</strong>
              <pre style="background: #d4edda; padding: 8px; border-radius: 4px; font-size: 11px; margin: 4px 0;">${call.response}</pre>
            </div>
          ` : ''}
          ${call.error ? `
            <div>
              <strong style="font-size: 12px; color: #dc2626;">Error:</strong>
              <pre style="background: #fee; padding: 8px; border-radius: 4px; font-size: 11px; margin: 4px 0; color: #dc2626;">${call.error}</pre>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';
  
  content.innerHTML = `
    <h2 style="margin-top: 0;">${result.success ? '✅' : '❌'} Test Results: ${scraperName}</h2>
    <p style="font-size: 12px; color: #666; margin: 0 0 16px 0;">
      <strong>URL:</strong> ${result.url}<br>
      <strong>Time:</strong> ${new Date(result.timestamp).toLocaleString()}
    </p>
    
    ${result.success ? `
      <div style="margin-bottom: 20px;">
        <h3>📊 Scraped Data</h3>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; max-height: 300px; font-size: 12px;">${JSON.stringify(result.data, null, 2)}</pre>
      </div>
    ` : `
      <div style="margin-bottom: 20px; background: #fee2e2; border: 1px solid #dc2626; border-radius: 8px; padding: 16px;">
        <h3 style="color: #dc2626; margin-top: 0;">❌ Error</h3>
        <pre style="color: #991b1b; font-size: 12px;">${result.error}\\n\\n${result.stack || ''}</pre>
      </div>
    `}
    
    ${aiSection}
    
    ${result.logs && result.logs.length > 0 ? `
      <div style="margin-top: 20px;">
        <h3>📝 Console Logs</h3>
        <pre style="background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 8px; overflow-x: auto; max-height: 200px; font-size: 11px;">${result.logs.join('\\n')}</pre>
      </div>
    ` : ''}
    
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button id="copy-test-results" class="btn-secondary">📋 Copy All Results</button>
      <button id="copy-scraped-data" class="btn-secondary">📋 Copy Data Only</button>
      <button id="close-test-results" class="btn-primary" style="margin-left: auto;">Close</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('copy-test-results').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    showToast('✅ Full results copied');
  });
  
  document.getElementById('copy-scraped-data').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
    showToast('✅ Data copied');
  });
  
  document.getElementById('close-test-results').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}


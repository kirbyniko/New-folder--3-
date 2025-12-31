// Popup script - manages the UI and data collection flow

console.log('📜 Popup.js script parsing started');

// State management
const state = {
  currentStep: 1,
  metadata: {},
  calendarStructure: {},
  eventFields: {},
  detailsPage: {},
  capturedData: {}
};

console.log('📊 State initialized');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 DOMContentLoaded fired');
  console.log('📋 Step metadata element:', document.getElementById('step-metadata'));
  console.log('🔘 Autofill URL button:', document.getElementById('autofill-url'));
  console.log('🔘 Autofill Base URL button:', document.getElementById('autofill-base-url'));
  
  setupEventListeners();
  loadState();
  
  // Initialize intelligence config UI
  initializeIntelligenceConfig();
});

console.log('✅ Event listener for DOMContentLoaded registered');

// Load state from storage
function loadState() {
  chrome.storage.local.get(['scraperBuilderState'], (result) => {
    if (result.scraperBuilderState) {
      Object.assign(state, result.scraperBuilderState);
    }
    updateUI();
  });
}

// Save state to storage
function saveState() {
  chrome.storage.local.set({ scraperBuilderState: state });
}

// Setup event listeners
function setupEventListeners() {
  // Step navigation
  document.getElementById('next-to-calendar')?.addEventListener('click', () => {
    if (validateMetadata()) {
      goToStep(2);
    }
  });
  
  document.getElementById('back-to-metadata')?.addEventListener('click', () => goToStep(1));
  document.getElementById('next-to-fields')?.addEventListener('click', () => {
    if (validateCalendarStructure()) {
      goToStep(3);
    }
  });
  
  document.getElementById('back-to-calendar')?.addEventListener('click', () => goToStep(2));
  document.getElementById('next-to-details')?.addEventListener('click', () => goToStep(4));
  document.getElementById('skip-details')?.addEventListener('click', () => goToStep(5));
  
  document.getElementById('back-to-fields')?.addEventListener('click', () => goToStep(3));
  document.getElementById('next-to-review')?.addEventListener('click', () => goToStep(5));
  
  document.getElementById('back-to-details')?.addEventListener('click', () => goToStep(4));
  
  // Auto-fill buttons - with defensive checks
  const autofillUrlBtn = document.getElementById('autofill-url');
  const autofillBaseUrlBtn = document.getElementById('autofill-base-url');
  
  console.log('Setting up autofill buttons:', { autofillUrlBtn, autofillBaseUrlBtn });
  
  if (autofillUrlBtn) {
    console.log('✅ Attaching click listener to autofill-url button');
    autofillUrlBtn.addEventListener('click', (e) => {
      console.log('🔘 Button clicked!', e);
      autoFillCurrentURL();
    });
  } else {
    console.warn('❌ autofill-url button not found');
  }
  
  if (autofillBaseUrlBtn) {
    console.log('✅ Attaching click listener to autofill-base-url button');
    autofillBaseUrlBtn.addEventListener('click', (e) => {
      console.log('🔘 Button clicked!', e);
      autoFillBaseURL();
    });
  } else {
    console.warn('❌ autofill-base-url button not found');
  }
  
  // Ghost Mode toggle
  const ghostModeBtn = document.getElementById('toggle-ghost-mode');
  if (ghostModeBtn) {
    ghostModeBtn.addEventListener('click', toggleGhostMode);
  }
  
  // System Info Panel
  const showSystemInfoBtn = document.getElementById('show-system-info-btn');
  if (showSystemInfoBtn) {
    showSystemInfoBtn.addEventListener('click', toggleSystemInfo);
  }
  
  // Capture buttons
  document.querySelectorAll('.capture-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      startCapture(field, btn);
    });
  });
  
  // Details page checkbox
  document.getElementById('has-details-page')?.addEventListener('change', (e) => {
    document.getElementById('details-fields').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Event list checkbox
  document.getElementById('has-event-list')?.addEventListener('change', (e) => {
    document.getElementById('event-list-fields').style.display = e.target.checked ? 'block' : 'none';
    state.metadata.hasEventList = e.target.checked;
    saveState();
  });
  
  // Puppeteer detection
  document.querySelectorAll('input[name="puppeteer"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.metadata.requiresPuppeteer = e.target.value;
      saveState();
    });
  });
  
  document.getElementById('auto-detect-puppeteer')?.addEventListener('click', autoDetectPuppeteer);
  
  // Export buttons
  document.getElementById('export-json')?.addEventListener('click', exportJSON);
  document.getElementById('copy-json')?.addEventListener('click', copyToClipboard);
  
  // Form inputs - save on change
  document.getElementById('jurisdiction')?.addEventListener('input', (e) => {
    state.metadata.jurisdiction = e.target.value;
    saveState();
  });
  
  document.getElementById('state-code')?.addEventListener('change', (e) => {
    state.metadata.stateCode = e.target.value;
    saveState();
  });
  
  document.querySelectorAll('input[name="level"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.metadata.level = e.target.value;
      saveState();
    });
  });
  
  document.getElementById('calendar-url')?.addEventListener('input', (e) => {
    state.metadata.calendarUrl = e.target.value;
    saveState();
  });
  
  document.getElementById('calendar-url')?.addEventListener('input', (e) => {
    state.metadata.calendarUrl = e.target.value;
    saveState();
  });
  
  document.getElementById('notes')?.addEventListener('input', (e) => {
    state.metadata.notes = e.target.value;
    saveState();
  });
}

// Navigate to step
function goToStep(stepNumber) {
  state.currentStep = stepNumber;
  
  // Hide all steps
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show current step
  const stepMap = {
    1: 'step-metadata',
    2: 'step-calendar',
    3: 'step-fields',
    4: 'step-details',
    5: 'step-review'
  };
  
  document.getElementById(stepMap[stepNumber])?.classList.add('active');
  
  // Special handling for review step
  if (stepNumber === 5) {
    renderReview();
  }
  
  saveState();
}

// Auto-fill current URL
function autoFillCurrentURL() {
  console.log('🔗 AutoFill Current URL clicked');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log('Tabs query result:', tabs);
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      alert('Could not access current tab. Make sure the extension has permission.');
      return;
    }
    
    if (tabs && tabs[0] && tabs[0].url) {
      const urlInput = document.getElementById('calendar-url');
      console.log('URL input element:', urlInput);
      if (urlInput) {
        urlInput.value = tabs[0].url;
        state.metadata.calendarUrl = tabs[0].url;
        saveState();
        
        // Visual feedback
        urlInput.style.backgroundColor = '#d4edda';
        setTimeout(() => { urlInput.style.backgroundColor = ''; }, 500);
        console.log('✅ URL filled:', tabs[0].url);
      }
    } else {
      alert('Could not get current tab URL');
    }
  });
}

// Auto-fill base URL
function autoFillBaseURL() {
  console.log('🔗 AutoFill Base URL clicked');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log('Tabs query result:', tabs);
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      alert('Could not access current tab. Make sure the extension has permission.');
      return;
    }
    
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const baseUrlInput = document.getElementById('base-url');
        console.log('Base URL input element:', baseUrlInput);
        
        if (baseUrlInput) {
          baseUrlInput.value = baseUrl;
          state.metadata.baseUrl = baseUrl;
          saveState();
          
          // Visual feedback
          baseUrlInput.style.backgroundColor = '#d4edda';
          setTimeout(() => { baseUrlInput.style.backgroundColor = ''; }, 500);
          console.log('✅ Base URL filled:', baseUrl);
        }
      } catch (error) {
        console.error('Error parsing URL:', error);
        alert('Could not parse current URL');
      }
    } else {
      alert('Could not get current tab URL');
    }
  });
}

// Toggle Ghost Mode - make popup transparent and click-through
let ghostModeActive = false;
function toggleGhostMode() {
  ghostModeActive = !ghostModeActive;
  const app = document.getElementById('app');
  const html = document.documentElement;
  const body = document.body;
  const statusSpan = document.getElementById('ghost-mode-status');
  const btn = document.getElementById('toggle-ghost-mode');
  const controls = document.getElementById('ghost-mode-controls');
  
  if (ghostModeActive) {
    // Enable ghost mode - hide content, shrink popup
    app.style.display = 'none';
    body.style.width = '250px';
    body.style.height = 'auto';
    controls.style.backgroundColor = 'rgba(16, 185, 129, 0.95)';
    controls.style.color = 'white';
    statusSpan.textContent = '✓ Ghost Mode Active';
    statusSpan.style.color = 'white';
    statusSpan.style.fontWeight = 'bold';
    btn.textContent = '👻 Exit Ghost Mode';
    btn.style.backgroundColor = 'white';
    btn.style.color = '#10b981';
    console.log('Ghost mode ENABLED - popup minimized');
  } else {
    // Disable ghost mode - restore everything
    app.style.display = 'block';
    body.style.width = '';
    body.style.height = '';
    controls.style.backgroundColor = 'white';
    controls.style.color = '';
    statusSpan.textContent = '';
    statusSpan.style.fontWeight = 'normal';
    btn.textContent = '👻 Ghost Mode (Click Through)';
    btn.style.backgroundColor = '';
    btn.style.color = '';
    console.log('Ghost mode DISABLED - popup restored');
  }
}

// Auto-detect if Puppeteer is needed
function autoDetectPuppeteer() {
  const resultDiv = document.getElementById('puppeteer-result');
  resultDiv.innerHTML = '<em>Analyzing page...</em>';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'DETECT_PUPPETEER'
    }, (response) => {
      if (response && response.needsPuppeteer !== undefined) {
        const needs = response.needsPuppeteer;
        const radio = document.querySelector(`input[name="puppeteer"][value="${needs ? 'yes' : 'no'}"]`);
        if (radio) radio.checked = true;
        
        state.metadata.requiresPuppeteer = needs ? 'yes' : 'no';
        saveState();
        
        resultDiv.innerHTML = needs 
          ? '<strong style="color: #f59e0b;">⚠️ Likely needs Puppeteer</strong> - Content appears dynamically loaded'
          : '<strong style="color: #10b981;">✓ Static HTML detected</strong> - Regular fetch should work';
      } else {
        resultDiv.innerHTML = '<em style="color: #ef4444;">Could not analyze page</em>';
      }
    });
  });
}

// Start element capture
function startCapture(field, button) {
  console.log('🎯 startCapture called for field:', field);
  
  // Show helper box
  const helperBox = document.getElementById('capture-helper') || document.getElementById('capture-helper-fields');
  if (helperBox) {
    helperBox.style.display = 'block';
  }
  
  // Update button state
  button.classList.add('capturing');
  button.classList.remove('captured');
  
  // First, inject the content script, then send message
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log('📋 Active tab:', tabs[0]);
    if (chrome.runtime.lastError) {
      console.error('❌ Error querying tabs:', chrome.runtime.lastError);
      return;
    }
    
    const tabId = tabs[0].id;
    
    // Inject content script first
    console.log('💉 Injecting content script into tab:', tabId);
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error injecting script:', chrome.runtime.lastError.message);
        alert('Could not inject script. Make sure you\'re not on a chrome:// page.');
        button.classList.remove('capturing');
        return;
      }
      
      console.log('✅ Content script injected, now sending START_CAPTURE message');
      
      // Now send the message
      chrome.tabs.sendMessage(tabId, {
        type: 'START_CAPTURE',
        field: field
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error sending message:', chrome.runtime.lastError.message);
          alert('Could not connect to page. Try refreshing the page and reopening the extension.');
          button.classList.remove('capturing');
        } else {
          console.log('✅ Message sent successfully, response:', response);
        }
      });
    });
  });
}

// Listen for captured data from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ELEMENT_CAPTURED') {
    handleCapturedElement(message.data);
  } else if (message.type === 'CAPTURE_CANCELLED') {
    // Reset button states
    document.querySelectorAll('.capture-btn.capturing').forEach(btn => {
      btn.classList.remove('capturing');
    });
  }
});

// Handle captured element data
function handleCapturedElement(data) {
  const { field } = data;
  
  // Create a step object with selector and comment
  const step = {
    selector: data.selector,
    xpath: data.xpath,
    comment: '' // User can add this later
  };
  
  // Store in appropriate section (as an array of steps)
  if (field.startsWith('event-') && !field.startsWith('event-container')) {
    if (!Array.isArray(state.eventFields[field])) {
      state.eventFields[field] = [];
    }
    state.eventFields[field].push(step);
  } else if (field.startsWith('bill-')) {
    if (!state.detailsPage.billFields) state.detailsPage.billFields = {};
    if (!Array.isArray(state.detailsPage.billFields[field])) {
      state.detailsPage.billFields[field] = [];
    }
    state.detailsPage.billFields[field].push(step);
  } else if (['month-view-button', 'next-button', 'prev-button', 'event-container', 'event-item'].includes(field)) {
    if (!Array.isArray(state.calendarStructure[field])) {
      state.calendarStructure[field] = [];
    }
    state.calendarStructure[field].push(step);
  } else {
    if (!Array.isArray(state.detailsPage[field])) {
      state.detailsPage[field] = [];
    }
    state.detailsPage[field].push(step);
  }
  
  // Update button state (show captured, but keep it clickable for more steps)
  const button = document.querySelector(`.capture-btn[data-field="${field}"]`);
  if (button) {
    button.classList.remove('capturing');
    button.classList.add('captured');
    
    // Get step count
    let stepCount = 0;
    if (field.startsWith('event-') && !field.startsWith('event-container')) {
      stepCount = state.eventFields[field]?.length || 0;
    } else if (field.startsWith('bill-')) {
      stepCount = state.detailsPage.billFields?.[field]?.length || 0;
    } else if (['month-view-button', 'next-button', 'prev-button', 'event-container', 'event-item'].includes(field)) {
      stepCount = state.calendarStructure[field]?.length || 0;
    } else {
      stepCount = state.detailsPage[field]?.length || 0;
    }
    
    // Update button to show step count
    const statusSpan = button.querySelector('.status');
    if (statusSpan) {
      statusSpan.textContent = `✓ ${stepCount}`;
    }
  }
  
  // Show counts for containers
  if (field === 'event-container' && data.childCount) {
    document.getElementById('events-count').textContent = 
      `✓ Found ${data.childCount} events on page`;
  } else if (field === 'bills-container' && data.childCount) {
    document.getElementById('bills-count').textContent = 
      `✓ Found ${data.childCount} bills/items`;
  }
  
  // Update the step display
  updateStepDisplay(field);
  
  saveState();
}

// Update the visual display of captured steps
function updateStepDisplay(field) {
  const button = document.querySelector(`.capture-btn[data-field="${field}"]`);
  if (!button) return;
  
  // Find or create steps container
  let stepsContainer = button.parentElement.querySelector('.steps-container');
  if (!stepsContainer) {
    stepsContainer = document.createElement('div');
    stepsContainer.className = 'steps-container';
    button.insertAdjacentElement('afterend', stepsContainer);
  }
  
  // Get the steps for this field
  let steps = [];
  if (field.startsWith('event-') && !field.startsWith('event-container')) {
    steps = state.eventFields[field] || [];
  } else if (field.startsWith('bill-')) {
    steps = state.detailsPage.billFields?.[field] || [];
  } else if (['month-view-button', 'next-button', 'prev-button', 'event-container', 'event-item'].includes(field)) {
    steps = state.calendarStructure[field] || [];
  } else {
    steps = state.detailsPage[field] || [];
  }
  
  // Rebuild the display
  stepsContainer.innerHTML = '';
  
  steps.forEach((step, index) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'capture-step';
    stepDiv.innerHTML = `
      <div class="step-header">
        <span class="step-number">Step ${index + 1}</span>
        <button type="button" class="remove-step-btn" data-field="${field}" data-index="${index}">✕</button>
      </div>
      <div class="step-selector">${step.selector}</div>
      <input type="text" class="step-comment" placeholder="Add comment (optional)..." value="${step.comment || ''}" 
             data-field="${field}" data-index="${index}">
    `;
    stepsContainer.appendChild(stepDiv);
  });
  
  // Add event listeners for remove buttons
  stepsContainer.querySelectorAll('.remove-step-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const field = e.target.dataset.field;
      const index = parseInt(e.target.dataset.index);
      removeStep(field, index);
    });
  });
  
  // Add event listeners for comment inputs
  stepsContainer.querySelectorAll('.step-comment').forEach(input => {
    input.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      const index = parseInt(e.target.dataset.index);
      updateStepComment(field, index, e.target.value);
    });
  });
}

// Remove a step
function removeStep(field, index) {
  console.log('🗑️ Removing step', index, 'from field', field);
  
  if (field.startsWith('event-') && !field.startsWith('event-container')) {
    state.eventFields[field].splice(index, 1);
  } else if (field.startsWith('bill-')) {
    state.detailsPage.billFields[field].splice(index, 1);
  } else if (['month-view-button', 'next-button', 'prev-button', 'event-container', 'event-item'].includes(field)) {
    state.calendarStructure[field].splice(index, 1);
  } else {
    state.detailsPage[field].splice(index, 1);
  }
  
  saveState();
  updateStepDisplay(field);
}

// Update a step's comment
function updateStepComment(field, index, comment) {
  if (field.startsWith('event-') && !field.startsWith('event-container')) {
    state.eventFields[field][index].comment = comment;
  } else if (field.startsWith('bill-')) {
    state.detailsPage.billFields[field][index].comment = comment;
  } else if (['month-view-button', 'next-button', 'prev-button', 'event-container', 'event-item'].includes(field)) {
    state.calendarStructure[field][index].comment = comment;
  } else {
    state.detailsPage[field][index].comment = comment;
  }
  
  saveState();
}

// Validate metadata step
function validateMetadata() {
  const required = ['jurisdiction', 'state-code', 'calendar-url', 'base-url'];
  const missing = [];
  
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value) {
      missing.push(id);
      el.style.borderColor = '#ef4444';
    } else {
      el.style.borderColor = '#ddd';
    }
  });
  
  // Check level radio
  const levelChecked = document.querySelector('input[name="level"]:checked');
  if (!levelChecked) {
    missing.push('level');
  }
  
  // Check Puppeteer radio
  const puppeteerChecked = document.querySelector('input[name="puppeteer"]:checked');
  if (!puppeteerChecked) {
    missing.push('puppeteer');
  }
  
  if (missing.length > 0) {
    alert('Please fill in all required fields');
    return false;
  }
  
  // Save metadata
  const levelRadio = document.querySelector('input[name="level"]:checked');
  const puppeteerRadio = document.querySelector('input[name="puppeteer"]:checked');
  
  state.metadata = {
    jurisdiction: document.getElementById('jurisdiction').value,
    stateCode: document.getElementById('state-code').value,
    level: levelRadio ? levelRadio.value : '',
    calendarUrl: document.getElementById('calendar-url').value,
    baseUrl: document.getElementById('base-url').value,
    requiresPuppeteer: puppeteerRadio ? puppeteerRadio.value : 'no',
    notes: document.getElementById('notes').value
  };
  
  saveState();
  return true;
}

// Validate calendar structure
function validateCalendarStructure() {
  // Event list is optional now
  if (state.metadata.hasEventList !== false) {
    // If checkbox is checked (or not explicitly unchecked), require event list fields
    const required = ['event-container', 'event-item'];
    const missing = required.filter(field => !state.calendarStructure[field]);
    
    if (missing.length > 0) {
      const proceed = confirm(
        `Event list fields not captured: ${missing.join(', ')}\n\n` +
        `If this page doesn't have a visible event list, uncheck "Page has a visible event list" above.\n\n` +
        `Continue anyway?`
      );
      if (!proceed) return false;
    }
  }
  
  return true;
}

// Render review step
function renderReview() {
  // Generate summary
  const summary = document.getElementById('summary-content');
  
  const puppeteerLabel = {
    'yes': 'Yes - Requires Puppeteer',
    'no': 'No - Static HTML',
    'unknown': 'Unknown'
  }[state.metadata.requiresPuppeteer || 'no'];
  
  summary.innerHTML = `
    <div><strong>Jurisdiction:</strong> ${state.metadata.jurisdiction}</div>
    <div><strong>State:</strong> ${state.metadata.stateCode}</div>
    <div><strong>Level:</strong> ${state.metadata.level}</div>
    <div><strong>Calendar URL:</strong> ${state.metadata.calendarUrl}</div>
    <div><strong>Requires Puppeteer:</strong> ${puppeteerLabel}</div>
    <div><strong>Has Event List:</strong> ${state.metadata.hasEventList !== false ? 'Yes' : 'No (calendar only)'}</div>
    <div style="margin-top:12px;"><strong>Fields Captured:</strong></div>
    <div>• Calendar structure: ${Object.keys(state.calendarStructure).length} fields</div>
    <div>• Event fields: ${Object.keys(state.eventFields).length} fields</div>
    <div>• Details page: ${Object.keys(state.detailsPage).length} fields</div>
  `;
  
  // Validate
  const validation = validateData();
  const validationResults = document.getElementById('validation-results');
  validationResults.innerHTML = validation.map(item => 
    `<div class="validation-item ${item.type}">
      ${item.type === 'valid' ? '✅' : item.type === 'warning' ? '⚠️' : '❌'} ${item.message}
    </div>`
  ).join('');
  
  // Show JSON preview
  const json = generateJSON();
  document.getElementById('json-preview').textContent = JSON.stringify(json, null, 2);
}

// Validate collected data
function validateData() {
  const results = [];
  
  // Check required metadata
  if (state.metadata.jurisdiction && state.metadata.stateCode && state.metadata.calendarUrl) {
    results.push({ type: 'valid', message: 'Metadata complete' });
  } else {
    results.push({ type: 'invalid', message: 'Missing required metadata' });
  }
  
  // Check calendar structure
  if (state.calendarStructure['event-container'] && state.calendarStructure['event-item']) {
    results.push({ type: 'valid', message: 'Calendar structure captured' });
  } else {
    results.push({ type: 'invalid', message: 'Calendar structure incomplete' });
  }
  
  // Check required event fields
  const hasName = state.eventFields['name'];
  const hasDate = state.eventFields['date'];
  
  if (hasName && hasDate) {
    results.push({ type: 'valid', message: 'Required event fields captured' });
  } else {
    results.push({ type: 'invalid', message: 'Missing required event fields (name, date)' });
  }
  
  // Check recommended fields
  const hasLocation = state.eventFields['location'] || state.detailsPage['details-virtual-link'];
  const hasDetailsLink = state.eventFields['details-link'];
  
  if (hasLocation) {
    results.push({ type: 'valid', message: 'Location field captured' });
  } else {
    results.push({ type: 'warning', message: 'No location field - consider adding' });
  }
  
  if (hasDetailsLink) {
    results.push({ type: 'valid', message: 'Details link captured for enrichment' });
  } else {
    results.push({ type: 'warning', message: 'No details link - limited enrichment' });
  }
  
  return results;
}

// Generate final JSON specification
function generateJSON() {
  // Convert extension state to platform JSON format
  const config = {
    name: `${state.metadata.jurisdiction || 'Unknown'} ${state.metadata.level || 'Local'} Calendar`,
    description: `Legislative calendar scraper for ${state.metadata.jurisdiction || 'Unknown'}`,
    jurisdiction: state.metadata.jurisdiction,
    stateCode: state.metadata.stateCode,
    level: state.metadata.level,
    baseUrl: state.metadata.baseUrl,
    startUrl: state.metadata.startUrl || state.metadata.baseUrl,
    requiresPuppeteer: state.metadata.requiresPuppeteer === true || state.metadata.requiresPuppeteer === 'yes',
    active: true,
    metadata: {
      notes: state.metadata.notes || undefined,
      createdWith: 'Chrome Extension Scraper Builder'
    },
    pageStructures: [],
    navigationSteps: []
  };

  // Add navigation steps for calendar pagination
  let navStepOrder = 1;
  if (state.calendarStructure['next-button'] && Array.isArray(state.calendarStructure['next-button']) && state.calendarStructure['next-button'].length > 0) {
    state.calendarStructure['next-button'].forEach((step, idx) => {
      config.navigationSteps.push({
        stepOrder: navStepOrder++,
        stepType: 'click',
        selector: step.selector,
        xpath: step.xpath || undefined,
        comment: step.comment || `Next month button - step ${idx + 1}`
      });
    });
  }

  // Create calendar page structure
  const calendarPage = {
    pageType: 'calendar',
    pageName: 'Calendar View',
    hasPagination: !!(state.calendarStructure['next-button'] || state.calendarStructure['prev-button']),
    fields: []
  };

  // Add container/item selectors if present
  if (state.calendarStructure['event-container'] && Array.isArray(state.calendarStructure['event-container']) && state.calendarStructure['event-container'].length > 0) {
    calendarPage.containerSelector = state.calendarStructure['event-container'][0].selector;
  }
  if (state.calendarStructure['event-item'] && Array.isArray(state.calendarStructure['event-item']) && state.calendarStructure['event-item'].length > 0) {
    calendarPage.itemSelector = state.calendarStructure['event-item'][0].selector;
  }
  if (state.calendarStructure['next-button'] && Array.isArray(state.calendarStructure['next-button']) && state.calendarStructure['next-button'].length > 0) {
    calendarPage.nextButtonSelector = state.calendarStructure['next-button'][0].selector;
  }
  if (state.calendarStructure['prev-button'] && Array.isArray(state.calendarStructure['prev-button']) && state.calendarStructure['prev-button'].length > 0) {
    calendarPage.prevButtonSelector = state.calendarStructure['prev-button'][0].selector;
  }

  // Convert event fields
  let fieldOrder = 1;
  Object.entries(state.eventFields).forEach(([key, steps]) => {
    if (!Array.isArray(steps) || steps.length === 0) return;
    
    const fieldName = key.replace('event-', '').replace(/-/g, '_');
    const field = {
      fieldName: fieldName,
      fieldType: inferFieldType(fieldName),
      fieldOrder: fieldOrder++,
      isRequired: ['name', 'date', 'title'].includes(fieldName),
      transformation: fieldName.includes('date') ? 'parse_date' : (fieldName.includes('name') || fieldName.includes('title') ? 'trim' : undefined),
      comment: `${fieldName} field`,
      selectorSteps: steps.map((step, idx) => ({
        stepOrder: idx + 1,
        actionType: step.actionType || 'extract',
        selector: step.selector,
        xpath: step.xpath || undefined,
        attributeName: step.attribute || undefined,
        waitAfter: step.actionType === 'click' ? 500 : undefined,
        comment: step.comment || undefined
      }))
    };
    calendarPage.fields.push(field);
  });

  config.pageStructures.push(calendarPage);

  // Create detail page structure if there are detail page fields
  const detailFields = [];
  let detailFieldOrder = 1;
  Object.entries(state.detailsPage || {}).forEach(([key, steps]) => {
    if (!Array.isArray(steps) || steps.length === 0) return;
    
    const fieldName = key.replace('details-', '').replace(/-/g, '_');
    const field = {
      fieldName: fieldName,
      fieldType: inferFieldType(fieldName),
      fieldOrder: detailFieldOrder++,
      isRequired: false,
      comment: `${fieldName} from detail page`,
      selectorSteps: steps.map((step, idx) => ({
        stepOrder: idx + 1,
        actionType: step.actionType || 'extract',
        selector: step.selector,
        xpath: step.xpath || undefined,
        attributeName: step.attribute || undefined,
        waitAfter: step.actionType === 'click' ? 500 : undefined,
        comment: step.comment || undefined
      }))
    };
    detailFields.push(field);
  });

  if (detailFields.length > 0) {
    config.pageStructures.push({
      pageType: 'detail',
      pageName: 'Event Detail Page',
      fields: detailFields
    });
  }

  return config;
}

// Infer field type from field name
function inferFieldType(fieldName) {
  if (fieldName.includes('date')) return 'date';
  if (fieldName.includes('url') || fieldName.includes('link')) return 'url';
  if (fieldName.includes('html') || fieldName.includes('description')) return 'html';
  if (fieldName.includes('number') || fieldName.includes('count')) return 'number';
  return 'text';
}

// Export JSON file
function exportJSON() {
  const json = generateJSON();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  // Use jurisdiction name and sanitize for filename
  const safeName = (state.metadata.jurisdiction || 'scraper')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  a.download = `${safeName}-scraper.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Copy to clipboard
function copyToClipboard() {
  const json = generateJSON();
  const text = JSON.stringify(json, null, 2);
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-json');
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.background = '#22c55e';
    btn.style.color = 'white';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  });
}

// Update UI from state
function updateUI() {
  // Restore form values
  if (state.metadata.jurisdiction) {
    document.getElementById('jurisdiction').value = state.metadata.jurisdiction;
  }
  if (state.metadata.stateCode) {
    document.getElementById('state-code').value = state.metadata.stateCode;
  }
  if (state.metadata.level) {
    const levelRadio = document.querySelector(`input[name="level"][value="${state.metadata.level}"]`);
    if (levelRadio) levelRadio.checked = true;
  }
  if (state.metadata.calendarUrl) {
    document.getElementById('calendar-url').value = state.metadata.calendarUrl;
  }
  if (state.metadata.baseUrl) {
    document.getElementById('base-url').value = state.metadata.baseUrl;
  }
  if (state.metadata.notes) {
    document.getElementById('notes').value = state.metadata.notes;
  }
  
  // Restore Puppeteer radio
  if (state.metadata.requiresPuppeteer) {
    const puppeteerRadio = document.querySelector(`input[name="puppeteer"][value="${state.metadata.requiresPuppeteer}"]`);
    if (puppeteerRadio) puppeteerRadio.checked = true;
  }
  
  // Restore event list checkbox
  const hasEventListCheckbox = document.getElementById('has-event-list');
  if (hasEventListCheckbox) {
    hasEventListCheckbox.checked = state.metadata.hasEventList !== false;
    document.getElementById('event-list-fields').style.display = 
      state.metadata.hasEventList !== false ? 'block' : 'none';
  }
  
  // Update captured button states and restore step displays
  Object.keys(state.calendarStructure).forEach(field => {
    const btn = document.querySelector(`.capture-btn[data-field="${field}"]`);
    if (btn && Array.isArray(state.calendarStructure[field]) && state.calendarStructure[field].length > 0) {
      btn.classList.add('captured');
      updateStepDisplay(field);
    }
  });
  
  Object.keys(state.eventFields).forEach(field => {
    const btn = document.querySelector(`.capture-btn[data-field="${field}"]`);
    if (btn && Array.isArray(state.eventFields[field]) && state.eventFields[field].length > 0) {
      btn.classList.add('captured');
      updateStepDisplay(field);
    }
  });
  
  Object.keys(state.detailsPage).forEach(field => {
    const btn = document.querySelector(`.capture-btn[data-field="${field}"]`);
    if (btn) {
      const data = state.detailsPage[field];
      if (Array.isArray(data) && data.length > 0) {
        btn.classList.add('captured');
        updateStepDisplay(field);
      }
    }
  });
  
  // Go to step saved step
  goToStep(state.currentStep || 1);
}

// Toggle system info panel
async function toggleSystemInfo() {
  const panel = document.getElementById('system-info-panel');
  const btn = document.getElementById('show-system-info-btn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = '🔍 Hide System Resources';
    panel.innerHTML = '<div style="text-align: center; padding: 10px;"><span style="font-size: 12px;">⏳ Loading system info...</span></div>';
    
    try {
      // Fetch Ollama models and their status
      const response = await fetch('http://localhost:11434/api/ps');
      const data = await response.json();
      
      let html = '<div style="line-height: 1.6;">';
      html += '<strong style="font-size: 11px; color: #333;">📊 LOADED MODELS</strong><br><br>';
      
      if (data.models && data.models.length > 0) {
        data.models.forEach(model => {
          const name = model.name || 'unknown';
          const size = (model.size / 1024 / 1024 / 1024).toFixed(1) + ' GB';
          const processor = model.details?.quantization_level || 'unknown';
          
          // Parse processor split
          let gpuPercent = 0;
          let cpuPercent = 0;
          if (processor.includes('%')) {
            const match = processor.match(/(\d+)%\/(\d+)%\s+([^/]+)\/([^/]+)/);
            if (match) {
              gpuPercent = parseInt(match[2]);
              cpuPercent = parseInt(match[1]);
            }
          }
          
          // Color code based on GPU usage
          let statusColor = '#28a745'; // green
          if (gpuPercent < 100) {
            statusColor = '#ffc107'; // yellow
          }
          if (gpuPercent < 50) {
            statusColor = '#dc3545'; // red
          }
          
          html += `<div style="margin-bottom: 12px; padding: 8px; background: #fff; border: 1px solid #dee2e6; border-radius: 3px;">`;
          html += `<div style="font-weight: bold; color: ${statusColor};">● ${name}</div>`;
          html += `<div style="margin-top: 4px; color: #666;">Size: ${size}</div>`;
          
          if (gpuPercent > 0 || cpuPercent > 0) {
            html += `<div style="margin-top: 4px;">`;
            html += `<span style="color: ${statusColor};">GPU: ${gpuPercent}%</span> | `;
            html += `<span style="color: #6c757d;">CPU: ${cpuPercent}%</span>`;
            html += `</div>`;
            
            if (gpuPercent < 100) {
              html += `<div style="margin-top: 4px; font-size: 9px; color: #dc3545;">`;
              html += `⚠️ Model split between GPU/CPU - slower performance`;
              html += `</div>`;
            }
          }
          
          html += `</div>`;
        });
      } else {
        html += '<div style="color: #666;">No models currently loaded</div>';
      }
      
      html += '</div>';
      panel.innerHTML = html;
    } catch (error) {
      panel.innerHTML = `
        <div style="color: #dc3545; padding: 8px;">
          <strong>❌ Error fetching system info</strong><br>
          <span style="font-size: 9px;">${error.message}</span><br><br>
          <span style="font-size: 9px; color: #666;">
            Make sure Ollama is running on localhost:11434
          </span>
        </div>
      `;
    }
  } else {
    panel.style.display = 'none';
    btn.textContent = '🔍 Check System Resources';
  }
}

// Update System Capabilities UI
function updateSystemCapabilitiesUI(capabilities, summary) {
  const panel = document.getElementById('system-capabilities');
  if (!panel) return;
  
  panel.style.display = 'block';
  
  // Ollama Status
  const ollamaIndicator = document.getElementById('ollama-indicator');
  const ollamaStatus = document.getElementById('ollama-status');
  if (capabilities.ollama.available) {
    ollamaIndicator.textContent = '✅';
    const modelCount = capabilities.ollama.models.length;
    const maxContext = Math.max(...Object.values(capabilities.ollama.contextLimits));
    ollamaStatus.textContent = `${modelCount} model${modelCount !== 1 ? 's' : ''}, ${(maxContext/1000).toFixed(0)}K context`;
    ollamaStatus.style.color = '#10b981';
  } else {
    ollamaIndicator.textContent = '❌';
    ollamaStatus.textContent = 'Not available - Install for better context';
    ollamaStatus.style.color = '#666';
  }
  
  // GPU Status
  const gpuIndicator = document.getElementById('gpu-indicator');
  const gpuStatus = document.getElementById('gpu-vram-status');
  if (capabilities.gpu.detected) {
    const vramGB = Math.floor(capabilities.gpu.estimatedVRAM / 1024);
    const isManual = capabilities.gpu.vendor === 'manual-override';
    
    if (isManual) {
      gpuIndicator.textContent = '✅';
      gpuStatus.textContent = `${vramGB}GB (manual)`;
      gpuStatus.style.color = '#10b981';
    } else {
      // Show confidence based on detection method
      const confidence = capabilities.gpu.estimatedVRAM >= 16384 ? 'HIGH' : 'MEDIUM';
      gpuIndicator.textContent = confidence === 'HIGH' ? '✅' : '⚠️';
      gpuStatus.textContent = `~${vramGB}GB detected (${capabilities.gpu.vendor})`;
      gpuStatus.style.color = confidence === 'HIGH' ? '#10b981' : '#f59e0b';
    }
  } else {
    gpuIndicator.textContent = '⚠️';
    gpuStatus.textContent = 'Could not detect (assuming 8GB)';
    gpuStatus.style.color = '#f59e0b';
  }
  
  // WebGPU Status
  const webgpuIndicator = document.getElementById('webgpu-indicator');
  const webgpuStatus = document.getElementById('webgpu-status');
  if (capabilities.webgpu.available) {
    webgpuIndicator.textContent = '✅';
    webgpuStatus.textContent = 'Available (4K context limit)';
    webgpuStatus.style.color = '#10b981';
  } else {
    webgpuIndicator.textContent = '❌';
    webgpuStatus.textContent = 'Not available';
    webgpuStatus.style.color = '#666';
  }
  
  // Show recommendation
  const recPanel = document.getElementById('hardware-recommendation');
  const recText = document.getElementById('recommendation-text');
  if (summary && summary.recommendations.length > 0) {
    recPanel.style.display = 'block';
    // Pick the most important recommendation
    const topRec = summary.recommendations[0];
    recText.textContent = topRec.replace(/^[✅💡⚠️❌]\s*/, ''); // Strip emoji prefix
  }
}

// Initialize Intelligence Configuration UI
function initializeIntelligenceConfig() {
  const openBtn = document.getElementById('open-intelligence-config');
  if (!openBtn) {
    console.warn('Intelligence config button not found');
    return;
  }

  // Update summary display with hardware detection
  async function updateSummaryDisplay() {
    if (typeof AgentConfigManager !== 'function') {
      console.warn('AgentConfigManager not loaded yet');
      return;
    }

    try {
      const configManager = new AgentConfigManager();
      const estimates = configManager.tokenEstimates;
      const summary = configManager.getSummary();

      // Detect system capabilities
      let capabilities = null;
      if (window.SystemCapabilityDetector) {
        const detector = new window.SystemCapabilityDetector();
        capabilities = await detector.detectAll();
        const capSummary = detector.getSummary();
        
        // Update System Capabilities UI
        updateSystemCapabilitiesUI(capabilities, capSummary);
        
        // Log capabilities for user visibility
        console.log('🔍 System Capabilities Detected:');
        console.log(`  GPU VRAM: ~${capabilities.gpu.estimatedVRAM}MB`);
        console.log(`  Ollama: ${capabilities.ollama.available ? '✅ Available' : '❌ Not available'}`);
        if (capabilities.ollama.available) {
          console.log(`  Models: ${capabilities.ollama.models.map(m => m.name).join(', ')}`);
          console.log(`  Max Context: ${Math.max(...Object.values(capabilities.ollama.contextLimits))} tokens`);
        }
        console.log(`  WebGPU: ${capabilities.webgpu.available ? '✅ Available' : '❌ Not available'}`);
        console.log(`  Recommendations:`);
        capSummary.recommendations.forEach(rec => console.log(`    ${rec}`));
      }

      // Update summary section
      document.getElementById('current-tokens').textContent = `~${estimates.total.toLocaleString()} tokens`;
      
      const gpuStatus = document.getElementById('current-gpu-status');
      if (gpuStatus) {
        if (capabilities && capabilities.gpu.detected) {
          const vramGB = Math.floor(capabilities.gpu.estimatedVRAM / 1024);
          const limits = window.SystemCapabilityDetector ? 
            (new window.SystemCapabilityDetector()).getRecommendedLimits() : 
            { gpuSafe: 2048, balanced: 6144 };
          
          const fitsInGPU = estimates.total <= limits.balanced;
          gpuStatus.textContent = fitsInGPU ? `✅ Yes (~${vramGB}GB)` : `⚠️ High (~${vramGB}GB)`;
          gpuStatus.style.color = fitsInGPU ? '#10b981' : '#f59e0b';
        } else {
          gpuStatus.textContent = estimates.fitsInGPU ? '✅ Yes' : '❌ No';
          gpuStatus.style.color = estimates.fitsInGPU ? '#10b981' : '#ef4444';
        }
      }

      const cpuRisk = document.getElementById('current-cpu-risk');
      if (cpuRisk) {
        const riskColors = {
          'none': '#10b981',
          'low': '#8bc34a',
          'medium': '#f59e0b',
          'high': '#ef4444'
        };
        
        // Use async estimateCPURisk for dynamic detection
        let risk = estimates.cpuRisk;
        if (configManager.estimateCPURisk.constructor.name === 'AsyncFunction') {
          risk = await configManager.estimateCPURisk(estimates.total);
        }
        
        cpuRisk.textContent = risk.toUpperCase();
        cpuRisk.style.color = riskColors[risk] || '#666';
      }

      // Show summary
      document.getElementById('intelligence-summary').style.display = 'block';
    } catch (error) {
      console.warn('Error updating intelligence summary:', error);
    }
  }

  // Open config panel
  openBtn.addEventListener('click', () => {
    // Wait for panel to be loaded
    setTimeout(() => {
      if (window.agentConfigUI) {
        window.agentConfigUI.show();
      } else {
        console.error('AgentConfigUI not initialized');
        alert('Configuration panel is loading. Please try again in a moment.');
      }
    }, 100);
  });

  // Manual VRAM setting button
  const setVramBtn = document.getElementById('set-vram-btn');
  if (setVramBtn) {
    setVramBtn.addEventListener('click', () => {
      const currentVRAM = localStorage.getItem('manualGPUVRAM');
      const currentGB = currentVRAM ? Math.floor(parseInt(currentVRAM) / 1024) : 8;
      
      const vramInput = prompt(
        'Enter your GPU VRAM in GB:\n\nCommon values:\n• 4GB - Entry level\n• 8GB - Mid-range\n• 12GB - RTX 3060/4060 Ti\n• 16GB - RTX 4060 Ti 16GB\n• 24GB - RTX 3090/4090\n• 48GB - Professional cards',
        currentGB
      );
      
      if (vramInput !== null) {
        const vramGB = parseInt(vramInput);
        if (isNaN(vramGB) || vramGB <= 0) {
          alert('Please enter a valid number greater than 0');
          return;
        }
        
        localStorage.setItem('manualGPUVRAM', (vramGB * 1024).toString());
        console.log(`✅ GPU VRAM manually set to ${vramGB}GB`);
        
        // Refresh display
        updateSummaryDisplay();
      }
    });
  }
  
  // Update summary on load and when config changes
  setTimeout(updateSummaryDisplay, 500); // Wait for AgentConfigManager to load
  
  // Listen for config changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'agentIntelligenceConfig' || e.key === 'manualGPUVRAM') {
      updateSummaryDisplay();
    }
  });
}

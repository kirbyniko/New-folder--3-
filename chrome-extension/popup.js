// Popup script - manages the UI and data collection flow

// State management
const state = {
  currentStep: 1,
  metadata: {},
  calendarStructure: {},
  eventFields: {},
  detailsPage: {},
  capturedData: {}
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  updateUI();
});

// Load state from storage
function loadState() {
  chrome.storage.local.get(['scraperBuilderState'], (result) => {
    if (result.scraperBuilderState) {
      Object.assign(state, result.scraperBuilderState);
      updateUI();
    }
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
  
  // Auto-fill buttons
  document.getElementById('autofill-url')?.addEventListener('click', autoFillCurrentURL);
  document.getElementById('autofill-base-url')?.addEventListener('click', autoFillBaseURL);
  
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
  
  document.getElementById('base-url')?.addEventListener('input', (e) => {
    state.metadata.baseUrl = e.target.value;
    saveState();
  });
  
  document.getElementById('requires-js')?.addEventListener('change', (e) => {
    state.metadata.requiresJavaScript = e.target.checked;
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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      document.getElementById('calendar-url').value = tabs[0].url;
      state.metadata.calendarUrl = tabs[0].url;
      saveState();
    }
  });
}

// Auto-fill base URL
function autoFillBaseURL() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const baseUrl = `${url.protocol}//${url.host}`;
      document.getElementById('base-url').value = baseUrl;
      state.metadata.baseUrl = baseUrl;
      saveState();
    }
  });
}

// Start element capture
function startCapture(field, button) {
  // Update button state
  button.classList.add('capturing');
  button.classList.remove('captured');
  
  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'START_CAPTURE',
      field: field
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
  
  // Store in appropriate section
  if (field.startsWith('event-') && !field.startsWith('event-container')) {
    state.eventFields[field] = data;
  } else if (field.startsWith('bill-')) {
    if (!state.detailsPage.billFields) state.detailsPage.billFields = {};
    state.detailsPage.billFields[field] = data;
  } else if (['month-view-button', 'next-button', 'prev-button', 'event-container', 'event-item'].includes(field)) {
    state.calendarStructure[field] = data;
  } else {
    state.detailsPage[field] = data;
  }
  
  // Update button state
  const button = document.querySelector(`.capture-btn[data-field="${field}"]`);
  if (button) {
    button.classList.remove('capturing');
    button.classList.add('captured');
  }
  
  // Show counts for containers
  if (field === 'event-container' && data.childCount) {
    document.getElementById('events-count').textContent = 
      `✓ Found ${data.childCount} events on page`;
  } else if (field === 'bills-container' && data.childCount) {
    document.getElementById('bills-count').textContent = 
      `✓ Found ${data.childCount} bills/items`;
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
  
  if (missing.length > 0) {
    alert('Please fill in all required fields');
    return false;
  }
  
  // Save metadata
  state.metadata = {
    jurisdiction: document.getElementById('jurisdiction').value,
    stateCode: document.getElementById('state-code').value,
    level: document.querySelector('input[name="level"]:checked').value,
    calendarUrl: document.getElementById('calendar-url').value,
    baseUrl: document.getElementById('base-url').value,
    requiresJavaScript: document.getElementById('requires-js').checked,
    notes: document.getElementById('notes').value
  };
  
  saveState();
  return true;
}

// Validate calendar structure
function validateCalendarStructure() {
  const required = ['event-container', 'event-item'];
  const missing = required.filter(field => !state.calendarStructure[field]);
  
  if (missing.length > 0) {
    alert(`Please capture required fields: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

// Render review step
function renderReview() {
  // Generate summary
  const summary = document.getElementById('summary-content');
  summary.innerHTML = `
    <div><strong>Jurisdiction:</strong> ${state.metadata.jurisdiction}</div>
    <div><strong>State:</strong> ${state.metadata.stateCode}</div>
    <div><strong>Level:</strong> ${state.metadata.level}</div>
    <div><strong>Calendar URL:</strong> ${state.metadata.calendarUrl}</div>
    <div><strong>Requires JavaScript:</strong> ${state.metadata.requiresJavaScript ? 'Yes' : 'No'}</div>
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
  const spec = {
    metadata: {
      jurisdiction: state.metadata.jurisdiction,
      state_code: state.metadata.stateCode,
      level: state.metadata.level,
      calendar_name: state.metadata.jurisdiction + ' Calendar',
      base_url: state.metadata.baseUrl,
      scraper_type: state.metadata.requiresJavaScript ? 'dynamic' : 'static',
      requires_javascript: state.metadata.requiresJavaScript,
      notes: state.metadata.notes || undefined
    },
    calendar_page: {
      url: state.metadata.calendarUrl,
      method: state.metadata.requiresJavaScript ? 'dynamic' : 'static',
      navigation: {},
      event_list: {},
      event_fields: {}
    },
    details_page: {
      requires_navigation: !!state.eventFields['details-link'],
      fields: {}
    },
    geocoding: {
      default_location: `${state.metadata.jurisdiction}`,
      location_patterns: []
    },
    rate_limiting: {
      requests_per_minute: 20,
      delay_between_requests: 500,
      max_concurrent: 3
    },
    examples: []
  };
  
  // Add navigation
  if (state.calendarStructure['month-view-button']) {
    spec.calendar_page.navigation.month_view_button = formatField(state.calendarStructure['month-view-button']);
  }
  if (state.calendarStructure['next-button']) {
    spec.calendar_page.navigation.next_button = formatField(state.calendarStructure['next-button']);
  }
  if (state.calendarStructure['prev-button']) {
    spec.calendar_page.navigation.previous_button = formatField(state.calendarStructure['prev-button']);
  }
  
  // Add event list
  if (state.calendarStructure['event-container']) {
    spec.calendar_page.event_list.container_selector = state.calendarStructure['event-container'].selector;
    spec.calendar_page.event_list.sample_outer_html = state.calendarStructure['event-container'].outerHTML;
  }
  if (state.calendarStructure['event-item']) {
    spec.calendar_page.event_list.event_item_selector = state.calendarStructure['event-item'].selector;
    spec.calendar_page.event_list.sample_item_html = state.calendarStructure['event-item'].outerHTML;
  }
  
  // Add event fields
  Object.entries(state.eventFields).forEach(([key, data]) => {
    const fieldName = key.replace('event-', '').replace(/-/g, '_');
    spec.calendar_page.event_fields[fieldName] = formatField(data);
  });
  
  // Add details page fields
  Object.entries(state.detailsPage).forEach(([key, data]) => {
    if (key === 'billFields') return; // Handle separately
    const fieldName = key.replace('details-', '').replace(/-/g, '_');
    spec.details_page.fields[fieldName] = formatField(data);
  });
  
  // Add bill fields
  if (state.detailsPage.billFields) {
    spec.details_page.fields.bills = {
      container_selector: state.detailsPage['bills-container']?.selector,
      item_selector: state.detailsPage['bill-item']?.selector,
      fields: {}
    };
    
    Object.entries(state.detailsPage.billFields).forEach(([key, data]) => {
      const fieldName = key.replace('bill-', '').replace(/-/g, '_');
      spec.details_page.fields.bills.fields[fieldName] = formatField(data);
    });
  }
  
  return spec;
}

// Format field for JSON output
function formatField(data) {
  return {
    selector: data.selector,
    attribute: data.attribute || null,
    sample_html: data.outerHTML,
    sample_value: data.value
  };
}

// Export JSON file
function exportJSON() {
  const json = generateJSON();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.metadata.stateCode.toLowerCase()}-scraper-spec.json`;
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
    document.querySelector(`input[name="level"][value="${state.metadata.level}"]`).checked = true;
  }
  if (state.metadata.calendarUrl) {
    document.getElementById('calendar-url').value = state.metadata.calendarUrl;
  }
  if (state.metadata.baseUrl) {
    document.getElementById('base-url').value = state.metadata.baseUrl;
  }
  if (state.metadata.requiresJavaScript) {
    document.getElementById('requires-js').checked = true;
  }
  if (state.metadata.notes) {
    document.getElementById('notes').value = state.metadata.notes;
  }
  
  // Update captured button states
  Object.keys(state.calendarStructure).forEach(field => {
    const btn = document.querySelector(`.capture-btn[data-field="${field}"]`);
    if (btn) btn.classList.add('captured');
  });
  
  Object.keys(state.eventFields).forEach(field => {
    const btn = document.querySelector(`.capture-btn[data-field="${field}"]`);
    if (btn) btn.classList.add('captured');
  });
  
  Object.keys(state.detailsPage).forEach(field => {
    const btn = document.querySelector(`.capture-btn[data-field="${field}"]`);
    if (btn) btn.classList.add('captured');
  });
  
  // Go to saved step
  goToStep(state.currentStep || 1);
}

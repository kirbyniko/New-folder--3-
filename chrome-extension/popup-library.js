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

// ========================================
// SCRAPER LIBRARY (localStorage)
// ========================================

let scrapers = [];

function loadScraperLibrary() {
  const stored = localStorage.getItem('scrapers');
  scrapers = stored ? JSON.parse(stored) : [];
  displayScraperList();
}

function saveScrapers() {
  localStorage.setItem('scrapers', JSON.stringify(scrapers));
}

function displayScraperList() {
  const list = document.getElementById('scraper-list');
  
  if (scrapers.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No scrapers imported yet</p>';
    return;
  }
  
  list.innerHTML = scrapers.map((scraper, index) => `
    <div class="scraper-item" data-index="${index}">
      <h4>${scraper.name || 'Unnamed Scraper'}</h4>
      <p>${scraper.jurisdiction || 'Unknown'} • ${scraper.level || 'local'} • ${scraper.stateCode || 'N/A'}</p>
      <div class="scraper-actions">
        <button class="btn-secondary" onclick="viewScraperDetails(${index})">👁️ View</button>
        <button class="btn-primary" onclick="testScraper(${index})">🧪 Test</button>
        <button class="btn-danger" onclick="deleteScraper(${index})">🗑️</button>
      </div>
    </div>
  `).join('');
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
    displayScraperList();
    
    // Clear input
    document.getElementById('import-json').value = '';
    
    alert(`✅ Scraper "${scraper.name}" imported successfully!`);
  } catch (error) {
    alert(`❌ Invalid JSON: ${error.message}`);
  }
});

function viewScraperDetails(index) {
  const scraper = scrapers[index];
  alert(`Scraper Details:\n\n${JSON.stringify(scraper, null, 2)}`);
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
  displayScraperList();
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

/**
 * Scraper Builder Component
 * 
 * Visual scraper creation with:
 * - URL input & live preview
 * - AI-powered generation
 * - Code editor
 * - Live testing
 * - Save/load scrapers
 */

import * as monaco from 'monaco-editor';

export class ScraperBuilder {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentScraper = null;
    this.scraperCode = '';
    this.editor = null;
    
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.initEditor();
  }

  render() {
    this.container.innerHTML = `
      <div class="scraper-builder">
        <!-- Top Bar: URL & Actions -->
        <div class="scraper-header">
          <div class="url-input-group">
            <input type="url" id="target-url" 
                   placeholder="https://example.com" 
                   class="url-input">
            <button id="analyze-btn" class="btn btn-primary">🔍 Analyze</button>
            <button id="generate-scraper-btn" class="btn btn-success">🤖 Generate Scraper</button>
          </div>
          <div class="scraper-actions">
            <button id="test-scraper-btn" class="btn">🧪 Test</button>
            <button id="save-scraper-btn" class="btn">💾 Save</button>
            <button id="load-scraper-btn" class="btn">📂 Load</button>
          </div>
        </div>

        <!-- Main Layout -->
        <div class="scraper-layout">
          <!-- Left: Analysis & Config -->
          <div class="scraper-config-panel">
            <h3>📋 Scraper Configuration</h3>
            
            <!-- Analysis Results -->
            <div id="analysis-results" class="analysis-section">
              <h4>Analysis</h4>
              <div class="info-box">
                <p>Enter a URL and click "Analyze" to detect page structure.</p>
              </div>
            </div>

            <!-- Extraction Fields -->
            <div class="extraction-section">
              <h4>Fields to Extract</h4>
              <div id="extraction-fields">
                <div class="empty-state">No fields defined yet</div>
              </div>
              <button id="add-field-btn" class="btn btn-sm">+ Add Field</button>
            </div>

            <!-- Generation Settings -->
            <div class="generation-settings">
              <h4>Settings</h4>
              <label>
                <input type="checkbox" id="use-puppeteer" checked>
                Use Puppeteer (JavaScript sites)
              </label>
              <label>
                <input type="checkbox" id="handle-pagination">
                Handle Pagination
              </label>
              <label>
                <input type="checkbox" id="add-retry-logic" checked>
                Add Retry Logic
              </label>
            </div>
          </div>

          <!-- Right: Code Editor & Test Results -->
          <div class="scraper-code-panel">
            <div class="panel-tabs">
              <button class="panel-tab active" data-tab="code">Code</button>
              <button class="panel-tab" data-tab="test">Test Results</button>
              <button class="panel-tab" data-tab="logs">Logs</button>
            </div>

            <!-- Code Editor -->
            <div id="scraper-code-editor" class="scraper-editor"></div>

            <!-- Test Results (hidden by default) -->
            <div id="test-results-panel" class="test-panel" style="display:none">
              <div id="test-results"></div>
            </div>

            <!-- Logs (hidden by default) -->
            <div id="logs-panel" class="logs-panel" style="display:none">
              <div id="generation-logs"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    document.getElementById('analyze-btn').addEventListener('click', () => this.analyzePage());
    document.getElementById('generate-scraper-btn').addEventListener('click', () => this.generateScraper());
    document.getElementById('test-scraper-btn').addEventListener('click', () => this.testScraper());
    document.getElementById('save-scraper-btn').addEventListener('click', () => this.saveScraper());
    document.getElementById('load-scraper-btn').addEventListener('click', () => this.loadScraper());
    document.getElementById('add-field-btn').addEventListener('click', () => this.addExtractionField());

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.switchPanel(e.target.dataset.tab);
      });
    });
  }

  initEditor() {
    const editorContainer = document.getElementById('scraper-code-editor');
    
    this.editor = monaco.editor.create(editorContainer, {
      value: `// Generated scraper code will appear here\n// or write your own scraper`,
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14
    });

    this.editor.onDidChangeModelContent(() => {
      this.scraperCode = this.editor.getValue();
    });
  }

  async analyzePage() {
    const url = document.getElementById('target-url').value.trim();
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    const resultsDiv = document.getElementById('analysis-results');
    resultsDiv.innerHTML = '<div class="loading">🔄 Analyzing page...</div>';

    try {
      const response = await fetch('http://localhost:3002/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `
const axios = require('axios');
const cheerio = require('cheerio');

const response = await axios.get('${url}');
const $ = cheerio.load(response.data);

const analysis = {
  title: $('title').text(),
  hasJavaScript: response.data.includes('<script'),
  linkCount: $('a').length,
  imageCount: $('img').length,
  formCount: $('form').length,
  commonSelectors: [
    { selector: 'h1', count: $('h1').length },
    { selector: 'h2', count: $('h2').length },
    { selector: '.title', count: $('.title').length },
    { selector: '.content', count: $('.content').length },
    { selector: 'article', count: $('article').length }
  ].filter(s => s.count > 0)
};

return analysis;
`
        })
      });

      const result = await response.json();

      if (result.success) {
        const analysis = result.output;
        resultsDiv.innerHTML = `
          <div class="analysis-results">
            <h4>✅ Analysis Complete</h4>
            <div class="analysis-item">
              <strong>Title:</strong> ${analysis.title}
            </div>
            <div class="analysis-item">
              <strong>JavaScript Needed:</strong> ${analysis.hasJavaScript ? '✅ Yes' : '❌ No'}
            </div>
            <div class="analysis-item">
              <strong>Links:</strong> ${analysis.linkCount}
            </div>
            <div class="analysis-item">
              <strong>Images:</strong> ${analysis.imageCount}
            </div>
            ${analysis.commonSelectors.length > 0 ? `
              <div class="analysis-item">
                <strong>Common Selectors:</strong>
                ${analysis.commonSelectors.map(s => 
                  `<span class="selector-badge">${s.selector} (${s.count})</span>`
                ).join(' ')}
              </div>
            ` : ''}
          </div>
        `;

        // Auto-suggest Puppeteer if JavaScript detected
        if (analysis.hasJavaScript) {
          document.getElementById('use-puppeteer').checked = true;
        }
      } else {
        resultsDiv.innerHTML = `<div class="error">❌ Analysis failed: ${result.error}</div>`;
      }
    } catch (error) {
      resultsDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
    }
  }

  async generateScraper() {
    const url = document.getElementById('target-url').value.trim();
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    const usePuppeteer = document.getElementById('use-puppeteer').checked;
    const handlePagination = document.getElementById('handle-pagination').checked;
    const addRetryLogic = document.getElementById('add-retry-logic').checked;

    // Switch to logs panel
    document.querySelector('[data-tab="logs"]').click();
    const logsDiv = document.getElementById('generation-logs');
    logsDiv.innerHTML = '<div class="loading">🤖 Generating scraper with AI...</div>';

    try {
      const prompt = `Generate a ${usePuppeteer ? 'Puppeteer' : 'Cheerio'} web scraper for: ${url}

Requirements:
- Extract meaningful data from the page
${handlePagination ? '- Handle pagination' : ''}
${addRetryLogic ? '- Include retry logic for failed requests' : ''}
- Clean, well-commented code
- Error handling

Return ONLY the JavaScript code, no explanations.`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:14b',
          prompt: prompt,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let logText = 'Generation started...\n';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              generatedCode += data.response;
              logText += data.response;
              logsDiv.innerHTML = `<pre>${logText}</pre>`;
              logsDiv.scrollTop = logsDiv.scrollHeight;
            }
          } catch (e) {}
        }
      }

      // Extract code from markdown if wrapped in ```
      const codeMatch = generatedCode.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
      const cleanCode = codeMatch ? codeMatch[1] : generatedCode;

      this.scraperCode = cleanCode.trim();
      this.editor.setValue(this.scraperCode);

      // Switch back to code panel
      document.querySelector('[data-tab="code"]').click();
      logsDiv.innerHTML = `<div class="success">✅ Scraper generated successfully!</div>`;
    } catch (error) {
      logsDiv.innerHTML = `<div class="error">❌ Generation failed: ${error.message}</div>`;
    }
  }

  async testScraper() {
    if (!this.scraperCode) {
      alert('No scraper code to test');
      return;
    }

    document.querySelector('[data-tab="test"]').click();
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.innerHTML = '<div class="loading">🧪 Testing scraper...</div>';

    try {
      const response = await fetch('http://localhost:3002/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: this.scraperCode })
      });

      const result = await response.json();

      if (result.success) {
        resultsDiv.innerHTML = `
          <div class="test-success">
            <h4>✅ Test Successful</h4>
            <pre>${JSON.stringify(result.output, null, 2)}</pre>
          </div>
        `;
      } else {
        resultsDiv.innerHTML = `
          <div class="test-error">
            <h4>❌ Test Failed</h4>
            <pre>${result.error}</pre>
          </div>
        `;
      }
    } catch (error) {
      resultsDiv.innerHTML = `
        <div class="test-error">
          <h4>❌ Connection Error</h4>
          <pre>${error.message}</pre>
        </div>
      `;
    }
  }

  saveScraper() {
    const scrapers = JSON.parse(localStorage.getItem('saved_scrapers') || '[]');
    const url = document.getElementById('target-url').value;
    const name = prompt('Scraper name:', url.replace(/https?:\/\//, '').split('/')[0]);
    
    if (!name) return;

    scrapers.push({
      name,
      url,
      code: this.scraperCode,
      timestamp: new Date().toISOString()
    });

    localStorage.setItem('saved_scrapers', JSON.stringify(scrapers));
    alert(`✅ Scraper "${name}" saved!`);
  }

  loadScraper() {
    const scrapers = JSON.parse(localStorage.getItem('saved_scrapers') || '[]');
    if (scrapers.length === 0) {
      alert('No saved scrapers');
      return;
    }

    const name = prompt(`Available scrapers:\n${scrapers.map(s => s.name).join('\n')}\n\nEnter name:`);
    const scraper = scrapers.find(s => s.name === name);

    if (scraper) {
      document.getElementById('target-url').value = scraper.url;
      this.scraperCode = scraper.code;
      this.editor.setValue(this.scraperCode);
      alert(`✅ Scraper "${name}" loaded!`);
    }
  }

  addExtractionField() {
    const fieldsDiv = document.getElementById('extraction-fields');
    const empty = fieldsDiv.querySelector('.empty-state');
    if (empty) empty.remove();

    const fieldId = Date.now();
    const fieldHtml = `
      <div class="extraction-field" data-id="${fieldId}">
        <input type="text" placeholder="Field name" class="field-name">
        <input type="text" placeholder="CSS selector" class="field-selector">
        <button class="btn-sm" onclick="scraperBuilder.removeField(${fieldId})">🗑️</button>
      </div>
    `;
    fieldsDiv.insertAdjacentHTML('beforeend', fieldHtml);
  }

  removeField(fieldId) {
    const field = document.querySelector(`[data-id="${fieldId}"]`);
    if (field) field.remove();
  }

  switchPanel(panel) {
    document.getElementById('scraper-code-editor').style.display = panel === 'code' ? 'block' : 'none';
    document.getElementById('test-results-panel').style.display = panel === 'test' ? 'block' : 'none';
    document.getElementById('logs-panel').style.display = panel === 'logs' ? 'block' : 'none';
  }
}

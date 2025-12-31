// AI Agent for Scraper Generation
// Uses WebGPU inference via hidden iframe (fully local, no cloud)

class ScraperAIAgent {
  constructor() {
    // WebGPU iframe for local inference
    this.webgpuIframe = null;
    this.webgpuReady = false;
    this.webgpuInitialized = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
    
    // Fallback to Ollama if WebGPU unavailable
    this.ollamaEndpoint = 'http://127.0.0.1:11434/api/generate';
    this.model = 'qwen2.5-coder:32b';
    this.useWebGPU = true; // Prefer WebGPU
    
    this.contextFiles = {};
    this.analysisResults = {};
    
    // Selected context guides (user can configure)
    this.selectedContexts = ['basic-selectors', 'error-handling']; // Defaults
    
    // Initialize knowledge base and chat
    this.knowledge = new window.AgentKnowledge();
    this.chat = new window.AgentChat();
    this.interactiveMode = false;
    
    // Initialize WebGPU iframe
    this.initWebGPUInference();
  }

  // Initialize WebGPU inference iframe
  async initWebGPUInference() {
    return new Promise((resolve) => {
      // Create hidden iframe pointing to our webapp
      this.webgpuIframe = document.createElement('iframe');
      this.webgpuIframe.style.display = 'none';
      // Use deployed Cloudflare Pages domain
      this.webgpuIframe.src = 'https://civitracker.pages.dev/webgpu-inference.html';
      
      // Listen for messages from iframe
      window.addEventListener('message', (event) => {
        this.handleWebGPUMessage(event.data);
      });

      this.webgpuIframe.onload = () => {
        console.log('🚀 WebGPU inference iframe loaded');
        resolve();
      };

      document.body.appendChild(this.webgpuIframe);
    });
  }

  // Handle messages from WebGPU iframe
  handleWebGPUMessage(message) {
    const { type, data, text, success, error, progress } = message;

    switch (type) {
      case 'READY':
        console.log('✅ WebGPU available');
        this.webgpuReady = true;
        // Auto-initialize engine
        this.webgpuIframe.contentWindow.postMessage({ type: 'INIT_ENGINE' }, '*');
        break;

      case 'INIT_PROGRESS':
        console.log(`📥 Loading model: ${progress}% - ${text}`);
        break;

      case 'INIT_COMPLETE':
        if (success) {
          console.log('✅ WebGPU engine initialized');
          this.webgpuInitialized = true;
          this.useWebGPU = true;
        } else {
          console.warn('❌ WebGPU initialization failed:', error);
          console.log('↩️  Falling back to Ollama');
          this.useWebGPU = false;
        }
        break;

      case 'GENERATION_PROGRESS':
        console.log(`📝 Generating... (${text.length} chars)`);
        break;

      case 'GENERATION_COMPLETE':
        if (this.currentGenerationResolve) {
          if (success) {
            this.currentGenerationResolve(text);
          } else {
            this.currentGenerationReject(new Error(error));
          }
          this.currentGenerationResolve = null;
          this.currentGenerationReject = null;
        }
        break;

      case 'ERROR':
        console.error('❌ WebGPU error:', error);
        this.useWebGPU = false;
        break;
    }
  }

  // Check if Ollama is running
  async checkOllamaStatus() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        return { 
          available: true, 
          models: data.models || [],
          recommended: this.selectBestModel(data.models)
        };
      }
    } catch (error) {
      return { 
        available: false, 
        error: 'Ollama not running',
        installUrl: 'https://ollama.ai/download'
      };
    }
  }

  selectBestModel(models) {
    const preferred = [
      'deepseek-coder:33b',
      'deepseek-coder:6.7b',
      'codellama:13b',
      'codellama:7b',
      'mistral:7b'
    ];

    for (const model of preferred) {
      if (models.some(m => m.name === model)) {
        return model;
      }
    }

    return models[0]?.name || 'codellama:7b';
  }

  // Load context files for specific tools
  loadContextFiles() {
    this.contextFiles = {
      aiRuntime: `
# AI Analysis During Scraping (Runtime LLM Calls)

When a field is marked for AI analysis, call analyzeWithAI() with the scraped content.

Helper function (include at top of generated script):
\`\`\`javascript
async function analyzeWithAI(content, prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-coder:6.7b',
        prompt: \`\${prompt}\\n\\nContent:\\n\${content}\`,
        stream: false,
        options: { temperature: 0.3, num_predict: 500 }
      })
    });
    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('AI failed:', error);
    return null;
  }
}
\`\`\`

Usage examples:
\`\`\`javascript
// Extract dates from PDF
const pdfText = await parsePDF('doc.pdf');
const dates = await analyzeWithAI(pdfText, 'Extract dates in YYYY-MM-DD format as JSON array');

// Classify document
const htmlText = $('body').text();
const type = await analyzeWithAI(htmlText, 'What type of legal document is this? One word.');

// Structure unstructured data
const rawText = $('.content').text();
const structured = await analyzeWithAI(rawText, 'Extract case number, parties, date as JSON');
\`\`\`
`,

      pdfParsing: `
# PDF Parsing Context

Use pdf-parse or pdfjs-dist for PDF extraction.

Example pattern:
\`\`\`javascript
const pdf = require('pdf-parse');
const dataBuffer = fs.readFileSync('file.pdf');
const data = await pdf(dataBuffer);
// data.text contains full text
\`\`\`

Common issues:
- PDFs may have scanned images (need OCR)
- Text extraction order may not match visual layout
- Tables require special handling
`,

      htmlParsing: `
# HTML Parsing Context

Use cheerio for server-side HTML parsing.

Example pattern:
\`\`\`javascript
const cheerio = require('cheerio');
const $ = cheerio.load(html);

// CSS selectors
const items = $('.item-class');
items.each((i, elem) => {
  const text = $(elem).text();
  const href = $(elem).attr('href');
});
\`\`\`

Best practices:
- Use data attributes when available
- Fallback to multiple selectors for robustness
- Handle missing elements gracefully
`,

      apiRequests: `
# API Request Context

Use axios or fetch for HTTP requests.

Example pattern:
\`\`\`javascript
const axios = require('axios');

const response = await axios.get(url, {
  headers: { 'User-Agent': 'Mozilla/5.0...' },
  timeout: 10000
});

const data = response.data;
\`\`\`

Common patterns:
- Always set User-Agent
- Handle rate limiting (429 status)
- Retry on network errors
- Parse JSON safely with try/catch
`,

      dateHandling: `
# Date Parsing Context

Use dayjs or date-fns for date manipulation.

Example pattern:
\`\`\`javascript
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const date = dayjs(dateString, 'MM/DD/YYYY');
const iso = date.toISOString();
\`\`\`

Common formats:
- "January 15, 2024" -> dayjs('January 15, 2024', 'MMMM D, YYYY')
- "01/15/2024" -> dayjs('01/15/2024', 'MM/DD/YYYY')
- "2024-01-15" -> dayjs('2024-01-15')
`,

      errorHandling: `
# Error Handling Context

Always wrap scraping logic in try/catch blocks.

Pattern:
\`\`\`javascript
async function scrape() {
  try {
    // scraping logic
  } catch (error) {
    console.error('Scrape failed:', error.message);
    return { success: false, error: error.message };
  }
}
\`\`\`

Common errors to handle:
- Network timeouts
- Element not found
- Invalid selectors
- Rate limiting
- CORS issues (use proxy or server-side)
`
    };
  }

  // Orchestrate full scraper analysis
  async analyzeScraperConfig(scraperConfig, template) {
    const fieldAnalysis = {};
    const stepAnalysis = {};
    
    // Analyze all fields
    if (template && template.steps) {
      for (const step of template.steps) {
        for (const field of step.fields || []) {
          if (scraperConfig.fields[field.id]) {
            fieldAnalysis[field.id] = await this.analyzeField(field, scraperConfig);
          }
        }
      }
    }
    
    // Determine required tools
    const requiredTools = await this.determineRequiredTools(scraperConfig, fieldAnalysis, stepAnalysis);
    
    return {
      fieldAnalysis,
      stepAnalysis,
      requiredTools
    };
  }

  // Stage 1: Analyze each field capture requirement
  async analyzeField(field, scraperConfig) {
    const aiConfig = scraperConfig.aiFields?.[field.id];
    const aiNote = aiConfig?.enabled ? `\n⚡ AI-ENABLED: Runtime LLM call with prompt: "${aiConfig.prompt || 'Analyze this content'}"` : '';
    
    const prompt = `Analyze this web scraping field requirement:

Field: ${field.name}
Type: ${field.type}
Selector: ${scraperConfig.fields[field.id] || 'NOT CAPTURED'}
Required: ${field.required ? 'YES' : 'NO'}${aiNote}
${field.hint ? `Hint: ${field.hint}` : ''}

Task: Describe in 2-3 sentences:
1. What data this field captures
2. What challenges might exist
3. What parsing/transformation may be needed

Keep response concise and technical.`;

    return await this.queryLLM(prompt, { temperature: 0.3, max_tokens: 200 });
  }

  // Stage 2: Analyze multi-step captures
  async analyzeStepSequence(fieldId, steps) {
    if (!steps || steps.length === 0) return null;

    const stepDescriptions = Object.entries(steps)
      .filter(([id]) => id.startsWith(fieldId))
      .map(([id, data]) => `Step: ${data.action} -> ${data.selector}${data.note ? ` (${data.note})` : ''}`)
      .join('\n');

    const prompt = `Analyze this multi-step interaction sequence for web scraping:

${stepDescriptions}

Task: Explain in 2-3 sentences:
1. What user interaction sequence this represents
2. What timing/synchronization is needed
3. Potential failure points

Keep response concise and technical.`;

    return await this.queryLLM(prompt, { temperature: 0.3, max_tokens: 200 });
  }

  // Stage 3: Determine required tools/libraries
  async determineRequiredTools(scraperConfig, fieldAnalysis, stepAnalysis) {
    const allAnalysis = Object.values(fieldAnalysis).concat(Object.values(stepAnalysis).filter(Boolean));
    
    const prompt = `Based on these scraping requirements:

${allAnalysis.slice(0, 10).join('\n\n---\n\n')}

List ONLY the essential npm packages needed (max 5). Format as JSON array:
["package-name", "another-package"]

Consider: cheerio, axios, puppeteer, dayjs, pdf-parse`;

    const response = await this.queryLLM(prompt, { temperature: 0.2, max_tokens: 100 });
    
    try {
      return JSON.parse(response);
    } catch {
      return ['cheerio', 'axios'];
    }
  }

  // Stage 3.5: Analyze actual page structure
  async analyzePageStructure(url) {
    try {
      console.log('🔍 Fetching and analyzing page:', url);
      const response = await fetch(url);
      const html = await response.text();
      
      // Basic structure analysis
      const hasReact = html.includes('react') || html.includes('__REACT') || html.includes('_next');
      const hasVue = html.includes('vue') || html.includes('__VUE__');
      const hasAngular = html.includes('ng-') || html.includes('angular');
      const isEmptyBody = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim().length < 200;
      const needsPuppeteer = (hasReact || hasVue || hasAngular || isEmptyBody);
      
      // Find common container patterns
      const containers = [];
      const containerPatterns = [
        /<div[^>]*class="[^"]*(?:calendar|event|meeting|agenda|list)[^"]*"[^>]*>/gi,
        /<table[^>]*class="[^"]*(?:calendar|event|meeting)[^"]*"[^>]*>/gi,
        /<ul[^>]*class="[^"]*(?:calendar|event|meeting|list)[^"]*"[^>]*>/gi
      ];
      
      for (const pattern of containerPatterns) {
        const matches = html.match(pattern) || [];
        containers.push(...matches);
      }
      
      // Extract sample IDs and classes
      const ids = Array.from(new Set((html.match(/id="([^"]+)"/g) || []).map(m => m.match(/id="([^"]+)"/)?.[1])));
      const classes = Array.from(new Set((html.match(/class="([^"]+)"/g) || []).slice(0, 50).map(m => m.match(/class="([^"]+)"/)?.[1])));
      
      return {
        needsPuppeteer,
        framework: hasReact ? 'React' : hasVue ? 'Vue' : hasAngular ? 'Angular' : 'None',
        htmlLength: html.length,
        bodyLength: html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim().length || 0,
        containerSamples: containers.slice(0, 5),
        commonIds: ids.filter(id => id.includes('calendar') || id.includes('event') || id.includes('meeting')).slice(0, 10),
        commonClasses: classes.filter(c => c.includes('calendar') || c.includes('event') || c.includes('meeting')).slice(0, 10)
      };
    } catch (error) {
      console.warn('Page analysis failed:', error.message);
      return { needsPuppeteer: false, error: error.message };
    }
  }

  // Stage 4: Generate scraper script
  async generateScraperScript(scraperConfig, analysisContext, template, options = {}) {
    const { fieldAnalysis, stepAnalysis, requiredTools } = analysisContext;
    const { usePuppeteer = false, reason = '' } = options;
    
    // Check if any fields use AI analysis
    const hasAIFields = scraperConfig.aiFields && Object.values(scraperConfig.aiFields).some(f => f.enabled);
    
    // Get the target URL from config
    const targetUrl = scraperConfig.fields['step1-calendar_url'] || 
                     scraperConfig.fields['step1-court_url'] || 
                     scraperConfig.fields['step1-listing_url'] ||
                     scraperConfig.fields['step1-agenda_url'];

    // Build field list with extraction type hints
    const fieldGroups = {};
    Object.entries(scraperConfig.fields)
      .filter(([id]) => !id.startsWith('step1-')) // Skip metadata
      .forEach(([id, selector]) => {
        const step = id.split('-')[0];
        if (!fieldGroups[step]) fieldGroups[step] = [];
        
        // Determine what to extract based on field name
        let extractType = 'text';
        if (id.includes('url') || id.includes('link')) extractType = 'href';
        else if (id.includes('date')) extractType = 'text-parsed-date';
        else if (id.includes('time')) extractType = 'text-parsed-time';
        else if (id.includes('container')) extractType = 'multiple';
        
        const aiConfig = scraperConfig.aiFields?.[id];
        const aiPrompt = aiConfig?.enabled ? aiConfig.prompt : null;
        
        fieldGroups[step].push({
          id,
          selector,
          extractType,
          aiPrompt
        });
      });

    const fieldsDescription = Object.entries(fieldGroups)
      .map(([step, fields]) => {
        return `${step}:\n${fields.map(f => 
          `  - ${f.id}: selector="${f.selector}" extract=${f.extractType}${f.aiPrompt ? ' AI_ANALYZE="' + f.aiPrompt + '"' : ''}`
        ).join('\n')}`;
      })
      .join('\n\n');

    const aiHelperCode = hasAIFields ? `

// AI Analysis Helper
async function analyzeWithAI(content, prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-coder:6.7b',
        prompt: prompt + '\\n\\nContent:\\n' + content,
        stream: false,
        options: { temperature: 0.3, num_predict: 500 }
      })
    });
    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('AI analysis failed:', error);
    return null;
  }
}` : '';

    // Load selected context guides
    let contextGuidance = '';
    if (this.selectedContexts && this.selectedContexts.length > 0 && window.SCRAPER_CONTEXTS) {
      contextGuidance = '\n\n=== PROVEN PATTERNS & TACTICS ===\n';
      for (const contextKey of this.selectedContexts) {
        const ctx = window.SCRAPER_CONTEXTS[contextKey];
        if (ctx) {
          contextGuidance += `\n${ctx.content}\n`;
        }
      }
      contextGuidance += '\n=== END PATTERNS ===\n\n';
    }

    const prompt = `Generate a Node.js data extraction script.

SCRAPER: ${scraperConfig.name}
TARGET URL: ${targetUrl || 'url parameter'}
PACKAGES: ${usePuppeteer ? 'puppeteer' : 'cheerio, axios'}${hasAIFields ? ', node-fetch' : ''}
${usePuppeteer ? `\nREQUIRES PUPPETEER: ${reason}` : ''}

PAGE STRUCTURE ANALYSIS:
- Framework: ${analysisContext.pageStructure?.framework || 'None'}
- HTML Size: ${analysisContext.pageStructure?.htmlLength || 'Unknown'} bytes
- Body Content: ${analysisContext.pageStructure?.bodyLength || 'Unknown'} bytes
${analysisContext.pageStructure?.commonIds?.length ? `- Relevant IDs: ${analysisContext.pageStructure.commonIds.join(', ')}` : ''}
${analysisContext.pageStructure?.commonClasses?.length ? `- Relevant Classes: ${analysisContext.pageStructure.commonClasses.join(', ')}` : ''}
${contextGuidance}
FIELDS TO EXTRACT:
${fieldsDescription}

CRITICAL REQUIREMENTS:
1. Use the TARGET URL above - hardcode it or use as default parameter
2. ${usePuppeteer ? 'Use Puppeteer to render JavaScript, wait 3-5 seconds for content' : 'Use axios to fetch HTML'}
3. Look at PAGE STRUCTURE ANALYSIS above to find IDs/classes that match field descriptions
4. Extract ACTUAL VALUES not HTML:
   - For text: use .text().trim()${usePuppeteer ? ' or textContent' : ''}
   - For href: use .attr('href')${usePuppeteer ? ' or getAttribute("href")' : ''}
   - For dates/times: extract text then parse to ISO format
   - For containers: find all matching elements
5. FOR AI_ANALYZE fields: After extracting content, call analyzeWithAI(content, prompt) and use AI response
6. **FALLBACK BEHAVIOR**: If exact selector fails, try alternatives:
   - Try removing class prefixes/suffixes
   - Try finding by text content (contains, starts-with)
   - Try parent/sibling elements
   - Look for similar attribute names (data-*, aria-*)
   - Log what you tried: "Selector X failed, tried Y and Z, got: ..."
7. Handle missing elements gracefully (return null with note, not crash)
8. Return format: { success: true, data: { fieldId: value, ... }, metadata: { scrapedAt, url, fieldsFound: X, notes: [] } }
9. Add notes to metadata.notes for each fallback/issue: ["field_x: selector failed, used fallback", ...]
10. NEVER use eval(), Function(), or any dynamic code execution
11. **IMPORTANT**: Count ONLY non-null fields in metadata.fieldsFound:
    \`\`\`javascript
    const fieldsFound = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
    \`\`\`
12. **CRITICAL**: If NO fields are found, log detailed debugging info:
    - What selectors were tried
    - What the page HTML actually contains (first 500 chars of body)
    - Any errors encountered

${usePuppeteer ? `PUPPETEER EXAMPLE:
\`\`\`javascript
const puppeteer = require('puppeteer');${aiHelperCode}

module.exports = async function scrape(url = '${targetUrl}') {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const data = await page.evaluate(() => {
      const result = {};
      
      // Extract each field using DOM selectors
      const exampleElement = document.querySelector('.selector');
      result.fieldId = exampleElement ? exampleElement.textContent.trim() : null;
      
      return result;
    });
    
    // Apply AI analysis if needed
    for (const [key, value] of Object.entries(data)) {
      if (value && /* field needs AI */) {
        data[key + '_analyzed'] = await analyzeWithAI(value, 'your prompt');
      }
    }
    
    // Count only non-null fields
    const fieldsFound = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
    
    return {
      success: true,
      data,
      metadata: {
        scrapedAt: new Date().toISOString(),
        url,
        fieldsFound,
        notes: [] // Add any fallback notes here
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      metadata: { scrapedAt: new Date().toISOString(), url }
    };
  } finally {
    if (browser) await browser.close();
  }
};
\`\`\`
` : `EXAMPLE STRUCTURE:
\`\`\`javascript
const cheerio = require('cheerio');
const axios = require('axios');${aiHelperCode}

module.exports = async function scrape(url = '${targetUrl}') {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const data = {};
    
    // Extract each field with try-catch to prevent undefined errors
    try {
      const exampleElement = $('.selector');
      data.fieldId = exampleElement.length ? exampleElement.first().text().trim() : null;
    } catch (e) {
      console.log('Field extraction failed:', e.message);
      data.fieldId = null;
    }
    
    // For AI fields
    if (data.fieldId) {
      data.fieldId_analyzed = await analyzeWithAI(data.fieldId, 'your prompt');
    }
    
    // Count only non-null fields
    const fieldsFound = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
    
    return {
      success: true,
      data,
      metadata: {
        scrapedAt: new Date().toISOString(),
        url,
        fieldsFound,
        notes: [] // Add any fallback notes here
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      metadata: { scrapedAt: new Date().toISOString(), url }
    };
  }
};
\`\`\`
`}

CRITICAL OUTPUT INSTRUCTIONS (READ CAREFULLY):
Your response MUST follow this EXACT format:

===CODE_START===
const puppeteer = require('puppeteer');
... rest of your code here ...
module.exports = async function scrape(url) {
  ... implementation ...
};
===CODE_END===

RULES:
1. Start with ===CODE_START=== on its own line
2. Then your JavaScript code (NO markdown, NO explanations)
3. End with ===CODE_END=== on its own line
4. Do NOT include any text before ===CODE_START===
5. Do NOT include any text after ===CODE_END===

Generate the complete scraper code now:`;

    console.log('📝 Generating script with prompt length:', prompt.length, usePuppeteer ? '(Puppeteer mode)' : '(Cheerio mode)');

    return await this.queryLLM(prompt, { 
      temperature: 0.1,  // Lower temperature for more consistent output
      max_tokens: 4000,   // Increased for longer scripts
      stop: [],
      isCodeGeneration: true
    });
  }

  // Query LLM - uses WebGPU if available, falls back to Ollama
  async queryLLM(prompt, options = {}) {
    // Wait for WebGPU initialization if it's still loading
    if (this.useWebGPU && this.webgpuReady && !this.webgpuInitialized) {
      console.log('⏳ Waiting for WebGPU engine to initialize...');
      // Wait up to 5 minutes for initialization (4GB model download takes 2-5 minutes first time)
      const startTime = Date.now();
      while (!this.webgpuInitialized && (Date.now() - startTime) < 300000) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!this.webgpuInitialized) {
        console.warn('⚠️ WebGPU initialization timeout, falling back to Ollama');
        this.useWebGPU = false;
      }
    }

    // Try WebGPU first if available and initialized
    if (this.useWebGPU && this.webgpuReady && this.webgpuInitialized) {
      try {
        console.log('🎮 Using WebGPU inference (local, fast)');
        return await this.queryWebGPU(prompt, options);
      } catch (error) {
        console.error('❌ WebGPU failed:', error);
        console.warn('↩️  Falling back to Ollama');
        this.useWebGPU = false;
      }
    }

    // Fallback to Ollama (disable this if you want WebGPU-only)
    if (!this.useWebGPU) {
      throw new Error('WebGPU is still initializing. Please wait and try again in a moment.');
    }
    
    return await this.queryOllama(prompt, options);
  }

  // Query WebGPU inference iframe
  async queryWebGPU(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.webgpuInitialized) {
        reject(new Error('WebGPU engine not initialized yet'));
        return;
      }

      this.currentGenerationResolve = resolve;
      this.currentGenerationReject = reject;

      // Send generation request to iframe
      this.webgpuIframe.contentWindow.postMessage({
        type: 'GENERATE',
        data: {
          prompt: prompt,
          options: {
            temperature: options.temperature || 0.1,
            max_tokens: options.max_tokens || 4000
          }
        }
      }, '*');

      // Timeout after 2 minutes
      setTimeout(() => {
        if (this.currentGenerationResolve) {
          reject(new Error('WebGPU generation timeout'));
          this.currentGenerationResolve = null;
          this.currentGenerationReject = null;
        }
      }, 120000);
    });
  }

  // Query Ollama (fallback)
  async queryOllama(prompt, options = {}) {
    try {
      console.log('📤 Sending to Ollama:', {
        model: options.model || this.model,
        promptLength: prompt.length,
        maxTokens: options.max_tokens || 500
      });
      
      // Add system prefix for code generation tasks
      let finalPrompt = prompt;
      if (options.isCodeGeneration) {
        finalPrompt = `Task: Generate JavaScript code for web data extraction.\n\n${prompt}`;
      }
      
      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
        body: JSON.stringify({
          model: options.model || this.model,
          prompt: finalPrompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.max_tokens || 500,
            stop: options.stop || []
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama error response:', errorText);
        throw new Error(`LLM request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🤖 Ollama response:', data);
      console.log('🤖 Response text length:', data.response?.length);
      console.log('🤖 Response preview:', data.response?.substring(0, 200));
      
      if (!data.response || data.response.trim().length === 0) {
        console.error('❌ Ollama returned empty response. Full data:', data);
        throw new Error('AI returned empty response. Check if the model is loaded correctly.');
      }
      
      return data.response.trim();
    } catch (error) {
      console.error('LLM query failed:', error);
      throw error;
    }
  }

  // Extract clean JavaScript code from LLM response
  extractCode(response) {
    let code = response;
    
    console.log('🧹 Extracting code from response (length:', response.length, ')');
    
    // 0. Check for special markers first (most reliable)
    if (response.includes('===CODE_START===') && response.includes('===CODE_END===')) {
      const startMarker = '===CODE_START===';
      const endMarker = '===CODE_END===';
      const startIdx = response.indexOf(startMarker) + startMarker.length;
      const endIdx = response.indexOf(endMarker);
      
      if (startIdx > 0 && endIdx > startIdx) {
        code = response.substring(startIdx, endIdx).trim();
        console.log('✅ Extracted from special markers');
        return code;
      }
    }
    
    // 1. Extract from markdown code blocks first
    const codeBlockMatch = response.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1];
      console.log('✂️ Extracted from markdown block');
    }
    
    // 2. Remove HTML if present (common LLM mistake)
    if (code.includes('<!DOCTYPE') || code.includes('<html')) {
      console.log('⚠️ HTML detected in response, trying to extract code');
      // Try to find JavaScript after HTML
      const scriptMatch = code.match(/(?:^|\n)((?:const|module\.exports|async function)[\s\S]*)/);
      if (scriptMatch) {
        code = scriptMatch[1];
      }
    }
    
    // 3. Find code start if no code block
    if (code === response || code.includes('Here') || code.includes('Note:')) {
      const codePatterns = [
        /(?:^|\n)(const puppeteer[\s\S]*)/,
        /(?:^|\n)(const cheerio[\s\S]*)/,
        /(?:^|\n)(module\.exports[\s\S]*)/,
        /(?:^|\n)(async function[\s\S]*)/
      ];
      
      for (const pattern of codePatterns) {
        const match = code.match(pattern);
        if (match) {
          code = match[1];
          console.log('✂️ Found code start');
          break;
        }
      }
    }
    
    // 4. Remove trailing explanatory text after last complete statement
    const lastClosing = Math.max(
      code.lastIndexOf('};'),
      code.lastIndexOf('});')
    );
    
    if (lastClosing !== -1) {
      // Find the complete closing
      const afterClosing = code.substring(lastClosing + 2).trim();
      // If there's text after the closing that looks like explanation, remove it
      if (afterClosing && !afterClosing.startsWith('//') && /^[A-Z]/.test(afterClosing)) {
        code = code.substring(0, lastClosing + 2);
        console.log('✂️ Removed trailing text');
      }
    }
    
    // 5. Clean up common prefixes and suffixes
    code = code.replace(/^(?:Here'?s? (?:the|a) (?:fixed|corrected|updated|complete) (?:code|script|version)?:?\s*\n?)+/gi, '');
    code = code.replace(/^(?:Note:|Important:|Explanation:|Fixed version:).*?\n/gim, '');
    code = code.replace(/^(?:```javascript|```js|```)\n?/gm, '');
    code = code.replace(/```$/gm, '');
    
    code = code.trim();
    
    // 6. Remove any leading/trailing HTML
    code = code.replace(/^<!DOCTYPE[\s\S]*?<\/html>\s*/i, '');
    code = code.replace(/^<\?xml[\s\S]*?>\s*/i, '');
    
    // 7. Validate it looks like code
    const hasCode = code.includes('module.exports') || 
                   code.includes('const ') || 
                   code.includes('function ');
    
    const hasHTML = code.includes('<!DOCTYPE') || 
                   code.includes('<html') ||
                   code.includes('<body') ||
                   (code.includes('<') && code.includes('</') && !code.includes('${'));
    
    const hasJSON = code.trim().startsWith('{') && code.includes('"problems"');
    
    if (!hasCode) {
      console.error('⚠️ Extracted code does not contain expected patterns');
      console.log('First 500 chars:', code.substring(0, 500));
      throw new Error('LLM response does not contain valid JavaScript code');
    }
    
    if (hasJSON) {
      console.error('❌ JSON detected in response! LLM returned explanation instead of code');
      throw new Error('LLM returned JSON explanation instead of code');
    }
    
    if (hasHTML) {
      console.error('❌ HTML detected in extracted code! Attempting aggressive extraction...');
      // Last resort: find anything that looks like JavaScript
      const jsMatch = code.match(/(const|module\.exports|async function)[\s\S]+$/);
      if (jsMatch) {
        code = jsMatch[0];
        console.log('🔧 Recovered code from mixed content');
      } else {
        throw new Error('LLM returned HTML instead of code. Cannot extract valid JavaScript.');
      }
    }
    
    // 8. One final check - remove any trailing JSON
    const jsonStartIndex = code.indexOf('\n{');
    if (jsonStartIndex > 100 && code.substring(jsonStartIndex).includes('"problems"')) {
      console.log('✂️ Removing trailing JSON explanation');
      code = code.substring(0, jsonStartIndex);
    }
    
    console.log('✅ Code extracted (length:', code.length, ')');
    return code;
  }

  // Master orchestrator: Run full AI analysis pipeline
  async generateScraperWithAI(scraperConfig, template, progressCallback = null, options = {}) {
    const updateProgress = (message) => {
      console.log(message);
      if (progressCallback) progressCallback(message);
      if (this.interactiveMode) {
        this.chat.addMessage('agent', message);
      }
    };
    
    const { usePuppeteer = false, reason = '' } = options;
    
    updateProgress('🤖 Starting AI scraper generation...');
    
    // Start chat session if interactive mode
    if (this.interactiveMode) {
      this.chat.startSession(scraperConfig, {});
    }
    
    // Stage 0: Get relevant knowledge
    updateProgress('🧠 Checking knowledge base...');
    const relevantContext = this.knowledge.getRelevantContext(scraperConfig);
    
    if (relevantContext.warnings.length > 0) {
      updateProgress(`⚠️ Knowledge base warnings:`);
      relevantContext.warnings.forEach(w => updateProgress(`  ${w}`));
    }
    
    if (relevantContext.recommendedPatterns.length > 0) {
      updateProgress(`💡 Recommended patterns found: ${relevantContext.recommendedPatterns.length}`);
    }
    
    // Check if we should use a specific context template
    const contextTemplate = this.determineContextTemplate(scraperConfig, template);
    if (contextTemplate) {
      updateProgress(`📚 Using context: "${contextTemplate.description}"`);
    }
    
    // Stage 1: Initialize and analyze
    this.loadContextFiles();
    
    // Get target URL for page analysis
    const targetUrl = scraperConfig.fields['step1-calendar_url'] || 
                     scraperConfig.fields['step1-court_url'] || 
                     scraperConfig.fields['step1-listing_url'];
    
    // NEW: Analyze actual page structure first
    updateProgress('🔍 Analyzing page structure...');
    const pageStructure = await this.analyzePageStructure(targetUrl);
    updateProgress(`📊 Page analysis: ${pageStructure.framework || 'Static HTML'}, ${pageStructure.htmlLength} bytes`);
    
    if (pageStructure.needsPuppeteer && !usePuppeteer) {
      updateProgress(`⚠️ Page appears to need Puppeteer (${pageStructure.framework} detected)`);
    }
    
    updateProgress('📊 Analyzing scraper configuration...');
    const analysisContext = await this.analyzeScraperConfig(scraperConfig, template);
    
    // Add page structure to analysis context
    analysisContext.pageStructure = pageStructure;
    
    // Enhance analysis with knowledge
    analysisContext.relevantContext = relevantContext;
    analysisContext.contextTemplate = contextTemplate;
    
    updateProgress('✍️ Generating initial script with AI...');
    if (usePuppeteer) {
      updateProgress(`🎭 Using Puppeteer mode: ${reason}`);
    }
    
    let script;
    let scriptGenerationAttempts = 0;
    const maxScriptAttempts = 3;
    
    while (scriptGenerationAttempts < maxScriptAttempts) {
      scriptGenerationAttempts++;
      
      try {
        const rawScript = await this.generateScraperScript(scraperConfig, analysisContext, template, options);
        
        // Extract and clean the code
        script = this.extractCode(rawScript);
        script = this.cleanGeneratedCode(script);
        
        // Basic validation
        if (script.length < 100) {
          throw new Error('Generated script too short');
        }
        
        if (!script.includes('module.exports')) {
          throw new Error('Script missing module.exports');
        }
        
        // Success!
        break;
        
      } catch (extractError) {
        updateProgress(`⚠️ Script extraction failed (attempt ${scriptGenerationAttempts}/${maxScriptAttempts}): ${extractError.message}`);
        
        if (scriptGenerationAttempts >= maxScriptAttempts) {
          throw new Error(`Failed to generate valid script after ${maxScriptAttempts} attempts. Last error: ${extractError.message}`);
        }
        
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    updateProgress('✅ Initial script generated');
    
    // Stage 2: Agentic testing and refinement loop
    updateProgress('🔄 Starting agentic testing loop...');
    const maxIterations = 5;  // Increased for complex Puppeteer scripts
    let iteration = 0;
    let testResult = null;
    let lastDiagnosis = null;
    
    while (iteration < maxIterations) {
      iteration++;
      updateProgress(`\n🔍 Iteration ${iteration}/${maxIterations} - Testing script...`);
      
      // Test the script
      testResult = await this.testScriptAgentically(script, scraperConfig, updateProgress);
      
      if (testResult.success && testResult.fieldsExtracted > 0) {
        updateProgress(`✅ Success! Script extracted ${testResult.fieldsExtracted} fields`);
        
        // Record success in knowledge base
        this.knowledge.recordSuccess(scraperConfig, script, testResult, lastDiagnosis);
        updateProgress('🧠 Success pattern saved to knowledge base');
        break;
      }
      
      // Diagnose and fix
      updateProgress(`❌ Test failed: ${testResult.error || 'No fields extracted'}`);
      updateProgress('🔍 Diagnosing issues...');
      lastDiagnosis = this.diagnoseScriptWithHeuristics(script, testResult, scraperConfig);
      updateProgress(`💡 Diagnosis: ${lastDiagnosis.rootCause}`);
      
      // Record failure for learning
      this.knowledge.recordFailure(scraperConfig, script, testResult, lastDiagnosis);
      
      // Ask for user feedback if in interactive mode
      if (this.interactiveMode && iteration === 1) {
        try {
          updateProgress('💬 Requesting user feedback...');
          const feedback = await this.chat.askForFeedback(
            `The script failed with: "${testResult.error}"\n\nDiagnosis: ${lastDiagnosis.rootCause}\n\nDo you have any insights or suggestions?`,
            [
              'Continue with automatic fix',
              'The page structure looks different',
              'Try a different approach',
              'Skip and show me the script'
            ]
          );
          
          if (feedback !== '[skipped]') {
            updateProgress(`📝 User feedback: ${feedback}`);
            // Add feedback to diagnosis context
            lastDiagnosis.userFeedback = feedback;
          }
        } catch (err) {
          updateProgress('⏭️ Feedback timeout - continuing automatically');
        }
      }
      
      if (iteration < maxIterations) {
        updateProgress('🔧 Attempting to fix script...');
        
        let progressTimer = null;
        try {
          // Add timeout and progress tracking
          progressTimer = setInterval(() => {
            updateProgress('⏳ Still generating fix...');
          }, 10000); // Update every 10 seconds
          
          const fixPromise = this.fixScript(script, lastDiagnosis, testResult, scraperConfig, relevantContext);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fix generation timeout after 60s')), 60000)
          );
          
          const rawFix = await Promise.race([fixPromise, timeoutPromise]);
          clearInterval(progressTimer);
          progressTimer = null;
          updateProgress('✅ Fix generated, extracting code...');
          const fixedScript = this.extractCode(rawFix);
          const cleanedScript = this.cleanGeneratedCode(fixedScript);
          
          // Validate the fix
          if (cleanedScript.length < 100 || !cleanedScript.includes('module.exports')) {
            updateProgress('⚠️ Fix extraction produced invalid code (too short or malformed)');
            
            // If fix is extremely short (< 100 chars), WebGPU might be degraded
            if (cleanedScript.length < 100 && iteration < maxIterations - 1) {
              updateProgress('💡 Model may be degraded, will regenerate from scratch next iteration');
              // Keep original script but add a flag for next iteration
              script = script; // No change
            }
          } else {
            script = cleanedScript;
            updateProgress('✅ Script updated');
          }
        } catch (fixError) {
          if (progressTimer) clearInterval(progressTimer);
          updateProgress(`⚠️ Fix extraction failed: ${fixError.message}, keeping original script`);
          // Don't throw - keep original script and continue
        }
      }
    }
    
    updateProgress('🎉 Generation complete!');
    
    const finalSuccess = testResult?.success && testResult?.fieldsExtracted > 0;
    
    // Show knowledge base summary
    const summary = this.knowledge.getSummary();
    updateProgress(`\n📊 Knowledge Base: ${summary.totalSuccesses} successes, ${summary.totalFailures} failures (${summary.successRate}% success rate)`);
    
    return {
      script,
      iterations: iteration,
      finalTestResult: testResult,
      success: finalSuccess,
      knowledgeUsed: relevantContext,
      chatHistory: this.interactiveMode ? this.chat.chatHistory : null
    };
  }
  
  // Determine which context template to use
  determineContextTemplate(scraperConfig, template) {
    const templateName = scraperConfig.templateName?.toLowerCase() || '';
    
    if (templateName.includes('court') || templateName.includes('calendar')) {
      return this.knowledge.getContextForTask('court-calendar');
    }
    if (templateName.includes('bill') || templateName.includes('legislative')) {
      return this.knowledge.getContextForTask('legislative-bills');
    }
    if (templateName.includes('agenda') || templateName.includes('meeting')) {
      return this.knowledge.getContextForTask('meeting-agendas');
    }
    
    // Check URL patterns
    const url = scraperConfig.fields['step1-calendar_url'] || 
                scraperConfig.fields['step1-court_url'] || 
                scraperConfig.fields['step1-listing_url'] || '';
    
    if (url.includes('.pdf')) {
      return this.knowledge.getContextForTask('pdf-extraction');
    }
    
    return null;
  }
  
  // Test script by actually running it
  async testScriptAgentically(scriptCode, scraperConfig) {
    try {
      const targetUrl = scraperConfig.fields['step1-calendar_url'] || 
                       scraperConfig.fields['step1-court_url'] || 
                       scraperConfig.fields['step1-listing_url'];
      
      if (!targetUrl) {
        return {
          success: false,
          error: 'No target URL found in config',
          fieldsExtracted: 0
        };
      }
      
      console.log('🧪 Testing script via backend server:', targetUrl);
      
      // Execute script via backend server (no CSP restrictions)
      try {
        const response = await fetch('http://localhost:3002/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scriptCode,
            targetUrl,
            timeout: 90000
          })
        });
        
        if (!response.ok) {
          throw new Error(`Backend server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('📦 Backend response:', result);
        
        // The script returns { success, data, metadata } but we need the inner data
        // Check if result.data is the nested response
        let scriptResult = result;
        if (result.success && result.data && result.data.success !== undefined) {
          // Nested structure: { success: true, data: { success: true, data: {...}, metadata: {...} } }
          console.log('📦 Unwrapping nested response structure');
          scriptResult = result.data;
        }
        
        // Map backend response to expected format
        if (scriptResult.error) {
          return {
            success: false,
            error: scriptResult.error,
            stack: scriptResult.stack,
            fieldsExtracted: 0,
            url: targetUrl,
            logs: result.logs || []
          };
        }
        
        const fieldsFound = scriptResult.metadata?.fieldsFound || 0;
        const hasData = scriptResult.data && Object.keys(scriptResult.data).length > 0;
        
        // Log what data was actually extracted
        if (hasData) {
          console.log('📊 Extracted data:', scriptResult.data);
          console.log('📈 Fields found:', fieldsFound);
          
          // Log individual field values
          for (const [key, value] of Object.entries(scriptResult.data)) {
            console.log(`  - ${key}: ${value === null ? 'NULL' : value === undefined ? 'UNDEFINED' : value === '' ? 'EMPTY' : typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value}`);
          }
        } else {
          console.warn('⚠️ No data extracted from page');
          console.log('📋 Metadata:', scriptResult.metadata);
          if (result.logs && result.logs.length > 0) {
            console.log('📜 Script logs:', result.logs.join('\n'));
          }
        }
        
        return {
          success: hasData && fieldsFound > 0,
          data: scriptResult.data,
          metadata: scriptResult.metadata,
          fieldsExtracted: fieldsFound,
          url: targetUrl,
          requiresJavaScript: result.requiresJavaScript,
          jsDetectionReason: result.jsDetectionReason,
          logs: result.logs || []
        };
        
      } catch (fetchError) {
        // Backend server not running or connection failed
        return {
          success: false,
          error: `Backend execution failed: ${fetchError.message}. Make sure execute server is running (npm run execute in scraper-backend)`,
          fieldsExtracted: 0,
          url: targetUrl
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fieldsExtracted: 0
      };
    }
  }
  
  
  // Diagnose why the script failed
  async diagnoseScriptFailure(script, testResult, scraperConfig, relevantContext = null) {
    // Build context from knowledge base
    let knowledgeContext = '';
    if (relevantContext) {
      if (relevantContext.similarFailures && relevantContext.similarFailures.length > 0) {
        knowledgeContext += '\n\nPAST FAILURES TO AVOID:\n';
        relevantContext.similarFailures.slice(0, 3).forEach((f, i) => {
          knowledgeContext += `${i+1}. Error: "${f.error}" - Root cause: "${f.rootCause}"\n`;
        });
      }
      
      if (relevantContext.similarSuccesses && relevantContext.similarSuccesses.length > 0) {
        knowledgeContext += '\n\nSUCCESSFUL PATTERNS:\n';
        relevantContext.similarSuccesses.slice(0, 2).forEach((s, i) => {
          knowledgeContext += `${i+1}. Used: ${s.tools.join(', ')} - Extracted ${s.fieldsExtracted} fields\n`;
          if (s.selectors && s.selectors.length > 0) {
            knowledgeContext += `   Selectors: ${s.selectors.slice(0, 3).join(', ')}\n`;
          }
        });
      }
    }
    
    // Determine error type from backend response
    const isSyntaxError = testResult.error && (
      testResult.error.includes('SyntaxError') ||
      testResult.error.includes('Unexpected token') ||
      testResult.error.includes('missing )') ||
      testResult.error.includes('missing }') ||
      testResult.error.includes('Unexpected identifier')
    );
    
    const isRuntimeError = testResult.error && !isSyntaxError && (
      testResult.error.includes('is not defined') ||
      testResult.error.includes('Cannot read property') ||
      testResult.error.includes('undefined')
    );
    
    let errorTypeHint = '';
    if (isSyntaxError) {
      errorTypeHint = '\n\nIMPORTANT: This is a SYNTAX ERROR. The code is malformed and cannot be parsed. Focus on:\n- Missing or extra parentheses, brackets, or braces\n- Incomplete template literals\n- Invalid arrow function syntax\n- Malformed async/await statements';
    } else if (isRuntimeError) {
      errorTypeHint = '\n\nIMPORTANT: This is a RUNTIME ERROR. The code executes but crashes. Focus on:\n- Undefined variables or missing imports\n- Null/undefined checks\n- Incorrect method calls';
    }
    
    // Quick heuristic-based diagnosis (faster than LLM analysis)
    let rootCause = 'Unknown issue';
    let problems = [];
    let recommendation = 'Check selectors and page structure';
    
    if (isSyntaxError) {
      rootCause = 'Syntax error in generated code';
      problems = ['Code has syntax errors', 'Cannot be parsed by Node.js', 'Missing brackets or parentheses'];
      recommendation = 'Regenerate with proper syntax';
    } else if (isRuntimeError) {
      rootCause = 'Runtime error - undefined variable or missing declaration';
      problems = ['Variable not defined', 'Missing import or declaration', 'Incorrect variable reference'];
      recommendation = 'Add missing declarations and imports';
    } else if (testResult.fieldsExtracted === 0) {
      rootCause = 'Selectors not finding elements on page';
      problems = ['Wrong CSS selectors', 'Page structure different than expected', 'Elements may be loaded by JavaScript'];
      recommendation = 'Update selectors to match actual page structure';
    } else {
      rootCause = 'Incomplete data extraction';
      problems = ['Some fields not extracted', 'Partial success', 'Missing fields in output'];
      recommendation = 'Add extraction for missing fields';
    }
    
    // Add knowledge context if available
    if (relevantContext?.similarFailures?.length > 0) {
      const pastError = relevantContext.similarFailures[0];
      if (pastError.rootCause) {
        problems.unshift(`Past similar error: ${pastError.rootCause}`);
      }
    }
    
    return {
      problems: problems.slice(0, 3),
      rootCause,
      recommendation
    };
  }
  
  // Synchronous heuristic-based diagnosis (instant, no LLM)
  diagnoseScriptWithHeuristics(script, testResult, scraperConfig = null) {
    const errorString = testResult.error?.toLowerCase() || '';
    const isSyntaxError = errorString.includes('syntaxerror') || 
                         errorString.includes('unexpected') ||
                         errorString.includes('missing') ||
                         errorString.includes('invalid or unexpected token');
    
    const isRuntimeError = errorString.includes('is not defined') ||
                          errorString.includes('cannot read') ||
                          errorString.includes('undefined');
    
    let rootCause = 'Unknown issue';
    let problems = [];
    let recommendation = 'Check selectors and page structure';
    
    if (isSyntaxError) {
      rootCause = 'Syntax error in generated code';
      problems = ['Code has syntax errors', 'Cannot be parsed by Node.js'];
      recommendation = 'Regenerate with proper syntax';
    } else if (isRuntimeError) {
      rootCause = 'Runtime error - undefined variable or missing declaration';
      problems = ['Variable not defined', 'Missing import', 'Incorrect variable reference'];
      recommendation = 'Add missing declarations and imports';
    } else if (testResult.fieldsExtracted === 0 || !testResult.data || Object.keys(testResult.data).length === 0) {
      rootCause = 'Selectors not finding elements on page';
      problems = ['Wrong CSS selectors', 'Page structure different than expected'];
      recommendation = 'Update selectors to match actual page structure';
    } else {
      rootCause = 'Incomplete data extraction';
      problems = ['Some fields not extracted', 'Partial success'];
      recommendation = 'Add extraction for missing fields';
    }
    
    return {
      problems: problems.slice(0, 3),
      rootCause,
      recommendation
    };
  }
  
  // Fix the script based on diagnosis
  async fixScript(script, diagnosis, testResult, scraperConfig, relevantContext = null) {
    const targetUrl = scraperConfig.fields['step1-calendar_url'] || 
                     scraperConfig.fields['step1-court_url'] || 
                     scraperConfig.fields['step1-listing_url'];
    
    // Build enhanced context
    let enhancedContext = '';
    
    if (relevantContext?.contextTemplate) {
      const ctx = relevantContext.contextTemplate;
      enhancedContext += `\n\nRELEVANT CONTEXT (${ctx.description}):\n`;
      enhancedContext += `Common patterns:\n${ctx.commonPatterns.join('\n')}\n`;
      if (ctx.examples) {
        enhancedContext += `\nExample code:\n${ctx.examples}\n`;
      }
    }
    
    if (diagnosis.userFeedback) {
      enhancedContext += `\n\nUSER FEEDBACK: ${diagnosis.userFeedback}\n`;
    }
    
    // Include stack trace if available for syntax errors
    let errorDetails = testResult.error || 'No specific error';
    if (testResult.stack) {
      errorDetails += `\n\nStack trace:\n${testResult.stack.substring(0, 500)}`;
    }
    
    const prompt = `You are a code repair expert. Fix this broken web scraper.

CURRENT SCRIPT:
\`\`\`javascript
${script}
\`\`\`

DIAGNOSIS:
Problems: ${diagnosis.problems.join(', ')}
Root cause: ${diagnosis.rootCause}
Recommendation: ${diagnosis.recommendation}
${enhancedContext}

TEST FAILURE:
${errorDetails}
Fields extracted: ${testResult.fieldsExtracted} (expected more)

TARGET URL: ${targetUrl}

CRITICAL FIXES NEEDED:
1. Fix any SYNTAX ERRORS first - check for missing/extra parentheses, brackets, braces
2. Ensure all async functions are properly declared with 'async' keyword
3. Add try-catch blocks where missing
4. Ensure selectors are correct - use .first().text().trim() or .first().attr('href')
5. Check module.exports format: module.exports = async function scrape(url) { ... }
6. Return proper format: { success: true, data: {...}, metadata: {...} }

OUTPUT FORMAT (EXACT):
===CODE_START===
const puppeteer = require('puppeteer');
... your fixed code here ...
===CODE_END===

Do NOT add any text before ===CODE_START=== or after ===CODE_END===

Generate the FIXED complete script now:`;

    return await this.queryLLM(prompt, { 
      temperature: 0.2, 
      max_tokens: 4000,
      isCodeGeneration: true
    });
  }
  
  // Clean generated code
  cleanGeneratedCode(code) {
    let clean = code.trim();
    
    // Remove markdown code blocks
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:javascript|js)?\n/, '').replace(/```$/m, '').trim();
    }
    
    // Remove explanatory text before/after code
    const lines = clean.split('\n');
    let codeStart = 0;
    let codeEnd = lines.length;
    
    // Find first line with actual code
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('const ') || 
          lines[i].trim().startsWith('module.exports') ||
          lines[i].trim().startsWith('async function')) {
        codeStart = i;
        break;
      }
    }
    
    return lines.slice(codeStart, codeEnd).join('\n').trim();
  }

  // Master orchestrator: Run full AI analysis pipeline (OLD VERSION - DEPRECATED)
  async generateScraperWithAI_OLD(scraperConfig, template) {
    console.log('🤖 Starting AI scraper generation...');
    
    // Stage 0: Initialize
    this.loadContextFiles();
    
    // Stage 1: Analyze each field
    console.log('📊 Stage 1: Analyzing fields...');
    const fieldAnalysis = {};
    for (const step of template.steps) {
      const fields = step.fields || [];
      for (const field of fields) {
        const fieldId = `step${step.stepNumber}-${field.name}`;
        if (scraperConfig.fields[fieldId]) {
          console.log(`  Analyzing: ${field.name}`);
          fieldAnalysis[fieldId] = await this.analyzeField(field, scraperConfig);
        }
      }
    }

    // Stage 2: Analyze multi-step sequences
    console.log('🔄 Stage 2: Analyzing step sequences...');
    const stepAnalysis = {};
    for (const [fieldId, selector] of Object.entries(scraperConfig.fields)) {
      const fieldSteps = Object.entries(scraperConfig.steps)
        .filter(([id]) => id.startsWith(fieldId));
      
      if (fieldSteps.length > 0) {
        console.log(`  Analyzing steps for: ${fieldId}`);
        stepAnalysis[fieldId] = await this.analyzeStepSequence(
          fieldId, 
          Object.fromEntries(fieldSteps)
        );
      }
    }

    // Stage 3: Determine tools
    console.log('🔧 Stage 3: Determining required tools...');
    const requiredTools = await this.determineRequiredTools(
      scraperConfig, 
      fieldAnalysis, 
      stepAnalysis
    );
    console.log('  Tools:', requiredTools.join(', '));

    // Stage 4: Generate script
    console.log('⚙️ Stage 4: Generating scraper code...');
    const code = await this.generateScraperScript(scraperConfig, {
      fieldAnalysis,
      stepAnalysis,
      requiredTools
    }, template);

    console.log('✅ AI generation complete!');

    return {
      code: this.cleanGeneratedCode(code),
      analysis: {
        fields: fieldAnalysis,
        steps: stepAnalysis,
        tools: requiredTools
      },
      metadata: {
        model: this.model,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Clean up generated code
  cleanGeneratedCode(code) {
    // Remove markdown code blocks if present
    code = code.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any explanation text before the code
    const lines = code.split('\n');
    const codeStartIndex = lines.findIndex(line => 
      line.includes('const') || 
      line.includes('require') || 
      line.includes('module.exports') ||
      line.includes('async function')
    );
    
    if (codeStartIndex > 0) {
      code = lines.slice(codeStartIndex).join('\n');
    }
    
    return code.trim();
  }
}

// Export for use in popup
window.ScraperAIAgent = ScraperAIAgent;

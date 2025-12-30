// AI Agent for Scraper Generation
// Uses local LLM (Ollama) running on user's machine

class ScraperAIAgent {
  constructor() {
    this.ollamaEndpoint = 'http://127.0.0.1:11434/api/generate';
    this.model = 'deepseek-coder:6.7b'; // or 'codellama:13b'
    this.contextFiles = {};
    this.analysisResults = {};
    
    // Initialize knowledge base and chat
    this.knowledge = new window.AgentKnowledge();
    this.chat = new window.AgentChat();
    this.interactiveMode = false; // Can be toggled by user
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

  // Stage 4: Generate scraper script
  async generateScraperScript(scraperConfig, analysisContext, template) {
    const { fieldAnalysis, stepAnalysis, requiredTools } = analysisContext;
    
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

    const prompt = `You are an expert web scraping engineer. Generate a production-ready Node.js scraper.

SCRAPER: ${scraperConfig.name}
TARGET URL: ${targetUrl || 'url parameter'}
PACKAGES: cheerio, axios${hasAIFields ? ', node-fetch' : ''}

FIELDS TO EXTRACT:
${fieldsDescription}

CRITICAL REQUIREMENTS:
1. Use the TARGET URL above - hardcode it or use as default parameter
2. Extract ACTUAL VALUES not HTML:
   - For text: use .text().trim()
   - For href: use .attr('href')
   - For dates/times: extract text then parse to ISO format
   - For containers: find all matching elements
3. FOR AI_ANALYZE fields: After extracting content, call analyzeWithAI(content, prompt) and use AI response
4. Handle missing elements gracefully (return null, not crash)
5. Return format: { success: true, data: { fieldId: value, ... }, metadata: { scrapedAt, url } }
6. NEVER use eval(), Function(), or any dynamic code execution - Chrome extensions block this

EXAMPLE STRUCTURE:
\`\`\`javascript
const cheerio = require('cheerio');
const axios = require('axios');${aiHelperCode}

module.exports = async function scrape(url = '${targetUrl}') {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const data = {};
    
    // Extract each field properly
    const exampleElement = $('.selector');
    data.fieldId = exampleElement.length ? exampleElement.first().text().trim() : null;
    
    // For AI fields
    if (data.fieldId) {
      data.fieldId_analyzed = await analyzeWithAI(data.fieldId, 'your prompt');
    }
    
    return {
      success: true,
      data,
      metadata: {
        scrapedAt: new Date().toISOString(),
        url,
        fieldsFound: Object.keys(data).length
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

Generate the complete scraper code following this pattern. Use EXACT selectors provided. Extract clean values. NO markdown, NO explanations, ONLY code:`;

    console.log('📝 Generating script with prompt length:', prompt.length);

    return await this.queryLLM(prompt, { 
      temperature: 0.1,  // Lower temperature for more consistent output
      max_tokens: 4000,   // Increased for longer scripts
      stop: [] 
    });
  }

  // Query local LLM
  async queryLLM(prompt, options = {}) {
    try {
      console.log('📤 Sending to Ollama:', {
        model: options.model || this.model,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 300) + '...',
        maxTokens: options.max_tokens || 500
      });
      
      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
        body: JSON.stringify({
          model: options.model || this.model,
          prompt: prompt,
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

  // Master orchestrator: Run full AI analysis pipeline
  async generateScraperWithAI(scraperConfig, template, progressCallback = null) {
    const updateProgress = (message) => {
      console.log(message);
      if (progressCallback) progressCallback(message);
      if (this.interactiveMode) {
        this.chat.addMessage('agent', message);
      }
    };
    
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
    
    updateProgress('📊 Analyzing scraper configuration...');
    const analysisContext = await this.analyzeScraperConfig(scraperConfig, template);
    
    // Enhance analysis with knowledge
    analysisContext.relevantContext = relevantContext;
    analysisContext.contextTemplate = contextTemplate;
    
    updateProgress('✍️ Generating initial script with AI...');
    let script = await this.generateScraperScript(scraperConfig, analysisContext, template);
    
    // Clean up the script
    script = this.cleanGeneratedCode(script);
    updateProgress('✅ Initial script generated');
    
    // Stage 2: Agentic testing and refinement loop
    updateProgress('🔄 Starting agentic testing loop...');
    const maxIterations = 3;
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
      lastDiagnosis = await this.diagnoseScriptFailure(script, testResult, scraperConfig, relevantContext);
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
        script = await this.fixScript(script, lastDiagnosis, testResult, scraperConfig, relevantContext);
        script = this.cleanGeneratedCode(script);
        updateProgress('✅ Script updated');
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
      
      console.log('🌐 Fetching target page:', targetUrl);
      
      // Fetch the page HTML
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch page: ${response.status}`,
          fieldsExtracted: 0,
          url: targetUrl
        };
      }
      
      const html = await response.text();
      console.log('📄 Page fetched, HTML length:', html.length);
      
      // Execute the script in a simulated environment
      const result = await this.executeScriptInSandbox(scriptCode, targetUrl, html);
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fieldsExtracted: 0
      };
    }
  }
  
  // Execute script safely in a CSP-compliant way
  async executeScriptInSandbox(scriptCode, url, html) {
    try {
      // Parse HTML with DOMParser (CSP-safe)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Create a cheerio-like API using real DOM methods
      const createCheerioLike = (contextDoc) => {
        const $ = (selector) => {
          const elements = Array.from(contextDoc.querySelectorAll(selector));
          
          const cheerioObj = {
            length: elements.length,
            get: (index) => elements[index],
            first: () => {
              const el = elements[0];
              return {
                text: () => el?.textContent?.trim() || '',
                attr: (name) => el?.getAttribute(name) || '',
                html: () => el?.innerHTML || ''
              };
            },
            text: () => elements[0]?.textContent?.trim() || '',
            attr: (name) => elements[0]?.getAttribute(name) || '',
            html: () => elements[0]?.innerHTML || '',
            find: (subselector) => $(subselector),
            each: (callback) => {
              elements.forEach((el, i) => {
                const wrapped = {
                  text: () => el.textContent?.trim() || '',
                  attr: (name) => el.getAttribute(name) || '',
                  html: () => el.innerHTML || '',
                  find: (s) => {
                    const found = Array.from(el.querySelectorAll(s));
                    return $(s);
                  }
                };
                callback(i, wrapped);
              });
            },
            map: (callback) => {
              return elements.map((el, i) => {
                const wrapped = $(el);
                return callback(i, wrapped);
              });
            }
          };
          
          return cheerioObj;
        };
        
        $.load = (htmlContent) => {
          const newDoc = parser.parseFromString(htmlContent, 'text/html');
          return createCheerioLike(newDoc);
        };
        
        return $;
      };
      
      const $ = createCheerioLike(doc);
      
      // Mock axios
      const axios = {
        get: async (targetUrl, options) => ({
          data: html,
          status: 200,
          headers: {},
          config: options || {}
        }),
        post: async (targetUrl, data, options) => ({
          data: {},
          status: 200,
          headers: {},
          config: options || {}
        })
      };
      
      // Mock other common libraries
      const dayjs = (date) => ({
        format: (fmt) => new Date(date).toISOString(),
        toDate: () => new Date(date),
        isValid: () => true
      });
      
      // Create a safe require function
      const require = (moduleName) => {
        const modules = {
          'cheerio': { load: $.load },
          'axios': axios,
          'dayjs': dayjs,
          'pdf-parse': async () => ({ text: '' })
        };
        return modules[moduleName] || {};
      };
      
      // Create module.exports container
      const module = { exports: null };
      const exports = {};
      
      // Instead of eval, we'll manually parse and execute common patterns
      // This is a simplified interpreter for the most common scraper patterns
      
      // Try to extract the async function from the script
      let scraperFunction = null;
      
      // Pattern 1: module.exports = async function scrape(url) { ... }
      const pattern1 = /module\.exports\s*=\s*async\s+function\s+\w*\s*\([^)]*\)\s*{([\s\S]*)}/;
      const match1 = scriptCode.match(pattern1);
      
      if (match1) {
        // We found the pattern, but we can't use eval
        // Instead, we'll execute this in a sandboxed iframe
        return await this.executeInIframe(scriptCode, url, html, $, axios, require);
      }
      
      // If we can't safely execute, return an error
      throw new Error('Script format not supported for CSP-safe execution. Try running test in a new tab instead.');
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fieldsExtracted: 0,
        executionSuccess: false
      };
    }
  }
  
  // Execute in sandboxed iframe with proper CSP handling
  async executeInIframe(scriptCode, url, html, $, axios, require) {
    return new Promise((resolve) => {
      try {
        // Create a sandboxed iframe
        const iframe = document.createElement('iframe');
        iframe.sandbox = 'allow-scripts';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Create a script that sets up the environment and runs the scraper
        const setupScript = `
          <script>
            (async () => {
              try {
                // Mock environment
                const $ = ${JSON.stringify(this.serializeCheerioResults($, html))};
                const axios = {
                  get: async () => ({ data: ${JSON.stringify(html)} })
                };
                const require = (name) => {
                  if (name === 'cheerio') return { load: () => $ };
                  if (name === 'axios') return axios;
                  return {};
                };
                
                // The actual scraper code
                const module = { exports: null };
                ${scriptCode}
                
                // Execute the exported function
                const result = await module.exports('${url}');
                
                // Send result back to parent
                window.parent.postMessage({
                  type: 'scraper-result',
                  result: result
                }, '*');
              } catch (error) {
                window.parent.postMessage({
                  type: 'scraper-error',
                  error: error.message,
                  stack: error.stack
                }, '*');
              }
            })();
          </script>
        `;
        
        // Listen for results
        const messageHandler = (event) => {
          if (event.data.type === 'scraper-result') {
            window.removeEventListener('message', messageHandler);
            iframe.remove();
            
            const result = event.data.result;
            const fieldsExtracted = result?.data ? 
              Object.keys(result.data).filter(k => result.data[k]).length : 0;
            
            resolve({
              success: result?.success || false,
              data: result?.data || {},
              fieldsExtracted,
              executionSuccess: true
            });
          } else if (event.data.type === 'scraper-error') {
            window.removeEventListener('message', messageHandler);
            iframe.remove();
            
            resolve({
              success: false,
              error: event.data.error,
              fieldsExtracted: 0,
              executionSuccess: false
            });
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          iframe.remove();
          resolve({
            success: false,
            error: 'Execution timeout',
            fieldsExtracted: 0,
            executionSuccess: false
          });
        }, 10000);
        
        // Write and execute
        iframeDoc.open();
        iframeDoc.write(setupScript);
        iframeDoc.close();
        
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          fieldsExtracted: 0,
          executionSuccess: false
        });
      }
    });
  }
  
  // Helper to serialize cheerio results for iframe
  serializeCheerioResults($, html) {
    // Return a simplified object that can be JSON-stringified
    return {
      html: html,
      // We'll reconstruct the $ function in the iframe
    };
  }
        stack: error.stack,
        fieldsExtracted: 0,
        executionSuccess: false
      };
    }
  }
  
  // Diagnose why the script failed
  async diagnoseScriptFailure(script, testResult, scraperConfig) {
    const prompt = `You are a debugging expert. Analyze this web scraper failure:

SCRIPT:
\`\`\`javascript
${script.substring(0, 1500)}
\`\`\`

TEST RESULT:
- Success: ${testResult.success}
- Fields extracted: ${testResult.fieldsExtracted}
- Error: ${testResult.error || 'None'}
- Execution success: ${testResult.executionSuccess}

EXPECTED FIELDS (from config):
${Object.keys(scraperConfig.fields).filter(k => !k.startsWith('step1-')).slice(0, 10).join(', ')}

DIAGNOSIS TASK:
Identify the TOP 3 most likely problems:
1. Are selectors wrong/not finding elements?
2. Is the extraction logic broken (.text() vs .attr())?
3. Are there syntax errors?
4. Is the module.exports format wrong?
5. Other issues?

Respond with ONLY a JSON object:
{
  "problems": ["problem 1", "problem 2", "problem 3"],
  "rootCause": "most likely root cause",
  "recommendation": "specific fix to apply"
}`;

    const response = await this.queryLLM(prompt, { temperature: 0.3, max_tokens: 500 });
    
    try {
      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse diagnosis JSON, using raw response');
    }
    
    return {
      problems: ['Unknown issue'],
      rootCause: response.substring(0, 200),
      recommendation: 'Regenerate with clearer instructions'
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
${testResult.error || 'No specific error'}
Fields extracted: ${testResult.fieldsExtracted} (expected more)

TARGET URL: ${targetUrl}

CRITICAL FIXES NEEDED:
1. Ensure selectors are correct - use .first().text().trim() or .first().attr('href')
2. Check module.exports format: module.exports = async function scrape(url) { ... }
3. Return proper format: { success: true, data: {...}, metadata: {...} }
4. Handle missing elements: check if element exists before extracting

Generate the FIXED complete script. NO explanations, NO markdown, ONLY code:`;

    return await this.queryLLM(prompt, { temperature: 0.2, max_tokens: 4000 });
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

// AI Agent for Scraper Generation
// Uses local LLM (Ollama) running on user's machine

class ScraperAIAgent {
  constructor() {
    this.ollamaEndpoint = 'http://127.0.0.1:11434/api/generate';
    this.model = 'deepseek-coder:6.7b'; // or 'codellama:13b'
    this.contextFiles = {};
    this.analysisResults = {};
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
    };
    
    updateProgress('🤖 Starting AI scraper generation...');
    
    // Stage 0: Initialize
    this.loadContextFiles();
    
    // Stage 1: Analyze and generate initial script
    updateProgress('📊 Analyzing scraper configuration...');
    const analysisContext = await this.analyzeScraperConfig(scraperConfig, template);
    
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
    
    while (iteration < maxIterations) {
      iteration++;
      updateProgress(`\n🔍 Iteration ${iteration}/${maxIterations} - Testing script...`);
      
      // Test the script
      testResult = await this.testScriptAgentically(script, scraperConfig, updateProgress);
      
      if (testResult.success && testResult.fieldsExtracted > 0) {
        updateProgress(`✅ Success! Script extracted ${testResult.fieldsExtracted} fields`);
        break;
      }
      
      // Diagnose and fix
      updateProgress(`❌ Test failed: ${testResult.error || 'No fields extracted'}`);
      updateProgress('🔍 Diagnosing issues...');
      const diagnosis = await this.diagnoseScriptFailure(script, testResult, scraperConfig);
      updateProgress(`💡 Diagnosis: ${diagnosis.rootCause}`);
      
      if (iteration < maxIterations) {
        updateProgress('🔧 Attempting to fix script...');
        script = await this.fixScript(script, diagnosis, testResult, scraperConfig);
        script = this.cleanGeneratedCode(script);
        updateProgress('✅ Script updated');
      }
    }
    
    updateProgress('🎉 Generation complete!');
    
    return {
      script,
      iterations: iteration,
      finalTestResult: testResult,
      success: testResult?.success && testResult?.fieldsExtracted > 0
    };
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
  
  // Execute script safely
  async executeScriptInSandbox(scriptCode, url, html) {
    try {
      // Create a minimal Node.js-like environment
      const cheerio = window.cheerio || { load: () => null }; // Will need to bundle cheerio
      
      // Simple cheerio-like implementation for testing
      const $ = (selector) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const elements = doc.querySelectorAll(selector);
        
        return {
          length: elements.length,
          first: () => ({
            text: () => elements[0]?.textContent || '',
            attr: (name) => elements[0]?.getAttribute(name) || null
          }),
          text: () => elements[0]?.textContent || '',
          attr: (name) => elements[0]?.getAttribute(name) || null,
          each: (callback) => {
            elements.forEach((el, i) => {
              callback(i, {
                textContent: el.textContent,
                getAttribute: (name) => el.getAttribute(name)
              });
            });
          }
        };
      };
      
      $.load = (htmlContent) => $;
      
      // Mock axios
      const axios = {
        get: async (targetUrl) => ({
          data: html,
          status: 200
        })
      };
      
      // Create module.exports context
      let exportedFunction = null;
      const module = { exports: null };
      
      // Wrap and execute the script
      const wrappedScript = `
        (async function() {
          ${scriptCode}
          return module.exports;
        })();
      `;
      
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const executor = new AsyncFunction('module', 'require', '$', 'axios', wrappedScript);
      
      // Mock require
      const mockRequire = (name) => {
        if (name === 'cheerio') return { load: $.load };
        if (name === 'axios') return axios;
        return {};
      };
      
      exportedFunction = await executor(module, mockRequire, $, axios);
      
      if (typeof exportedFunction !== 'function') {
        exportedFunction = module.exports;
      }
      
      if (typeof exportedFunction !== 'function') {
        throw new Error('Script did not export a function');
      }
      
      // Execute the scraper
      const result = await exportedFunction(url);
      
      // Analyze result
      const fieldsExtracted = result?.data ? Object.keys(result.data).filter(k => result.data[k] !== null && result.data[k] !== undefined).length : 0;
      
      return {
        success: result?.success || false,
        data: result?.data || {},
        error: result?.error,
        fieldsExtracted,
        url,
        executionSuccess: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
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
  async fixScript(script, diagnosis, testResult, scraperConfig) {
    const targetUrl = scraperConfig.fields['step1-calendar_url'] || 
                     scraperConfig.fields['step1-court_url'] || 
                     scraperConfig.fields['step1-listing_url'];
    
    const prompt = `You are a code repair expert. Fix this broken web scraper.

CURRENT SCRIPT:
\`\`\`javascript
${script}
\`\`\`

DIAGNOSIS:
Problems: ${diagnosis.problems.join(', ')}
Root cause: ${diagnosis.rootCause}
Recommendation: ${diagnosis.recommendation}

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

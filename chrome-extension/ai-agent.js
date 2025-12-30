// AI Agent for Scraper Generation
// Uses local LLM (Ollama) running on user's machine

class ScraperAIAgent {
  constructor() {
    this.ollamaEndpoint = 'http://localhost:11434/api/generate';
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
    
    // Build context from relevant context files
    const contextParts = [];
    if (hasAIFields) {
      contextParts.push(this.contextFiles.aiRuntime);
    }
    if (requiredTools.some(t => t.includes('pdf'))) {
      contextParts.push(this.contextFiles.pdfParsing);
    }
    contextParts.push(this.contextFiles.htmlParsing);
    contextParts.push(this.contextFiles.apiRequests);
    contextParts.push(this.contextFiles.errorHandling);

    // Build AI fields list
    let aiFieldsList = '';
    if (hasAIFields) {
      aiFieldsList = '\n\nAI-ENABLED FIELDS (call analyzeWithAI after scraping):\n';
      for (const [fieldId, aiConfig] of Object.entries(scraperConfig.aiFields || {})) {
        if (aiConfig.enabled) {
          const fieldInfo = template?.steps?.flatMap(s => s.fields).find(f => f.id === fieldId);
          aiFieldsList += `  ${fieldId} (${fieldInfo?.name || fieldId}): "${aiConfig.prompt || 'Analyze this content'}"\n`;
        }
      }
    }

    const fields = Object.entries(scraperConfig.fields).map(([id, selector]) => {
      const analysis = fieldAnalysis[id];
      const aiMarker = scraperConfig.aiFields?.[id]?.enabled ? ' [AI-ENABLED]' : '';
      return `  ${id}: "${selector}" // ${analysis || ''}${aiMarker}`;
    }).join('\n');

    const prompt = `Generate a complete Node.js web scraper based on this configuration:

SCRAPER NAME: ${scraperConfig.name}
PACKAGES: ${requiredTools.join(', ')}

FIELDS TO EXTRACT:
${fields}${aiFieldsList}

BASE URL: ${scraperConfig.fields['step1-base_url'] || ''}
TARGET URL: ${scraperConfig.fields['step1-court_url'] || scraperConfig.fields['step1-listing_url'] || ''}

${contextParts.join('\n\n')}

REQUIREMENTS:
1. Use async/await
2. Export a function: module.exports = async function scrape(url)
3. FOR AI-ENABLED FIELDS: After scraping content, call analyzeWithAI(content, prompt) and use the AI response
4. Include analyzeWithAI() helper function at top if any AI fields exist
5. Return JSON with all fields
6. Handle errors gracefully
7. Include comments explaining each step
8. Use the exact selectors provided
9. Return format: { success: true, data: { field1: value1, ... } }

Generate ONLY the JavaScript code, no explanations:`;

    return await this.queryLLM(prompt, { 
      temperature: 0.2, 
      max_tokens: 2000,
      stop: ['```'] 
    });
  }

  // Query local LLM
  async queryLLM(prompt, options = {}) {
    try {
      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(`LLM request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response.trim();
    } catch (error) {
      console.error('LLM query failed:', error);
      throw error;
    }
  }

  // Master orchestrator: Run full AI analysis pipeline
  async generateScraperWithAI(scraperConfig, template) {
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

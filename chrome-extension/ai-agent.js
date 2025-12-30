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

    // Build simplified field list (no analysis to save tokens)
    const fields = Object.entries(scraperConfig.fields)
      .filter(([id]) => !id.startsWith('step1-')) // Skip metadata fields
      .slice(0, 10) // Limit to first 10 fields
      .map(([id, selector]) => `  ${id}: "${selector}"`)
      .join('\n');

    const prompt = `Generate a Node.js web scraper function.

Scraper: ${scraperConfig.name}
Packages: ${requiredTools.slice(0, 3).join(', ')}
Target URL: ${scraperConfig.fields['step1-calendar_url'] || scraperConfig.fields['step1-court_url'] || 'provided as parameter'}

Fields to extract:
${fields}

Requirements:
- Export: module.exports = async function scrape(url)
- Use cheerio/axios for HTML parsing
${hasAIFields ? '- Include analyzeWithAI(content, prompt) helper function that calls http://localhost:11434/api/generate' : ''}
- Return: { success: true, data: {...fields...} }
- Add try/catch error handling
- Keep code concise

Generate ONLY the JavaScript code:`;

    console.log('📝 Generating script with prompt length:', prompt.length);

    return await this.queryLLM(prompt, { 
      temperature: 0.2, 
      max_tokens: 3000,
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

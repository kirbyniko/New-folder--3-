/**
 * Context Manager - Provides context selection and VRAM optimization recommendations
 */

export interface ModelConfig {
  name: string;
  vramRequired: number; // in GB
  contextWindow: number;
  speedTokSec: number; // Expected tokens/sec on GPU
  description: string;
  recommended: string[]; // Use cases
}

export interface ContextTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[]; // Which tools to enable
  modelRecommendation?: string;
}

// Model database with VRAM requirements
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    name: 'qwen2.5-coder:1.5b',
    vramRequired: 2,
    contextWindow: 32768,
    speedTokSec: 50,
    description: 'Ultra-fast, minimal VRAM, great for simple tasks',
    recommended: ['Quick queries', 'Simple scraping', 'JSON parsing']
  },
  {
    name: 'qwen2.5-coder:3b',
    vramRequired: 3,
    contextWindow: 32768,
    speedTokSec: 40,
    description: 'Fast, low VRAM, good balance',
    recommended: ['Web scraping', 'Data extraction', 'Code generation']
  },
  {
    name: 'qwen2.5-coder:7b',
    vramRequired: 6,
    contextWindow: 32768,
    speedTokSec: 30,
    description: 'Balanced speed and capability',
    recommended: ['Complex scraping', 'Multi-step tasks', 'API integration']
  },
  {
    name: 'qwen2.5-coder:14b',
    vramRequired: 10,
    contextWindow: 32768,
    speedTokSec: 20,
    description: 'High quality, slower but more accurate',
    recommended: ['Complex reasoning', 'Multiple tool chains', 'Error recovery']
  },
  {
    name: 'mistral-nemo:12b-instruct-2407-q8_0',
    vramRequired: 9,
    contextWindow: 4096,
    speedTokSec: 18,
    description: 'Current default, good instruction following',
    recommended: ['General purpose', 'Structured output', 'Tool usage']
  },
  {
    name: 'llama3.2:3b',
    vramRequired: 3,
    contextWindow: 8192,
    speedTokSec: 35,
    description: 'Fast Meta model, good for chat',
    recommended: ['Quick responses', 'Simple tasks', 'Low memory']
  },
  {
    name: 'deepseek-coder-v2:16b',
    vramRequired: 12,
    contextWindow: 16384,
    speedTokSec: 15,
    description: 'Excellent coding, requires more VRAM',
    recommended: ['Complex code generation', 'Puppeteer scripts', 'Debugging']
  }
];

// Context templates for different use cases
export const CONTEXT_TEMPLATES: ContextTemplate[] = [
  {
    id: 'scraper-builder',
    name: 'Scraper Builder',
    description: 'Build web scrapers based on SCRAPER_GUIDE_SHORT.md patterns',
    systemPrompt: `You are a web scraping expert. Your job is to analyze webpage structures and generate functional scrapers.

## Available Patterns
1. **Static HTML** - Use cheerio + fetch() for simple HTML pages
2. **JSON API** - Use fetch() with proper headers for REST/GraphQL APIs
3. **JavaScript SPA** - Use Puppeteer for React/Vue/Angular apps

## Process
1. Analyze the provided HTML/JSON structure
2. Identify the data extraction pattern (CSS selectors, JSON paths, etc.)
3. Generate clean, production-ready code following SCRAPER_GUIDE_SHORT.md patterns
4. Include error handling and null checks
5. Return ONLY the code, no explanations

## Using Manual Capture Templates (Flexible Hints)
If user provides JSON with \`pageStructures\` and \`selectorSteps\`:
- Extract selectors from \`selectorSteps[].selector\` fields - these are HINTS
- Verify selectors still work with execute_code
- **Look for additional fields** not in template by inspecting HTML
- Build **complete scraper** with all available fields, not just template fields

## Field Discovery (Go Beyond Template)
Extract ALL fields available on the page:
- Template fields (title, date from selectorSteps)
- **Additional fields:** location, agenda_url, meeting_type, status, video_url, etc.
- Inspect HTML to find fields the template missed
- Report which fields were found and any additional ones discovered

Example: Template has title + date, but you find location + agenda links → include them!`,
    tools: ['execute_code', 'fetch_url'],
    modelRecommendation: 'qwen2.5-coder:7b'
  },
  {
    id: 'data-analyzer',
    name: 'Data Analyzer',
    description: 'Analyze scraped data, find patterns, validate results',
    systemPrompt: `You are a data analysis expert. Analyze scraped data for quality, patterns, and completeness.

## Tasks
- Validate data structure against schema
- Identify missing or malformed fields
- Detect duplicates
- Check date formats
- Verify URL validity
- Calculate statistics (count, date range, etc.)

Return analysis in structured JSON format.`,
    tools: ['execute_code'],
    modelRecommendation: 'qwen2.5-coder:3b'
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'General purpose tasks, web research, information gathering',
    systemPrompt: `You are a helpful AI assistant with access to web scraping and code execution tools.

Follow these principles:
1. Break complex tasks into steps
2. Use tools efficiently (search first, then fetch details)
3. Validate data before returning
4. Be concise but thorough
5. If you can't find something after reasonable effort, ask the user

Available tools: search_web, fetch_url, execute_code`,
    tools: ['execute_code', 'fetch_url', 'search_web'],
    modelRecommendation: 'mistral-nemo:12b-instruct-2407-q8_0'
  },
  {
    id: 'puppeteer-specialist',
    name: 'Puppeteer Specialist',
    description: 'Generate Puppeteer scripts for JavaScript-heavy sites',
    systemPrompt: `You are a Puppeteer automation expert. Generate robust browser automation scripts.

## Requirements
- Always wait for selectors with reasonable timeouts
- Handle popups, modals, cookie banners
- Extract ALL requested fields from the JSON template
- Use efficient selectors (ID > class > XPath)
- Include error handling for missing elements
- Test for dynamic content loading

## Output
Return ONLY executable Puppeteer code, no markdown, no explanations.

Example structure:
\`\`\`javascript
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle2' });

// Extract data
const data = await page.evaluate(() => {
  // Your extraction logic
});

await browser.close();
return data;
\`\`\``,
    tools: ['execute_code'],
    modelRecommendation: 'deepseek-coder-v2:16b'
  },
  {
    id: 'quick-query',
    name: 'Quick Query',
    description: 'Fast responses for simple questions (uses smallest model)',
    systemPrompt: `You are a fast, efficient AI assistant. Provide concise, accurate answers.

Keep responses short and to the point. Use tools only when necessary.`,
    tools: ['search_web', 'fetch_url'],
    modelRecommendation: 'qwen2.5-coder:1.5b'
  },
  {
    id: 'scraper-guide',
    name: 'Scraper Guide (Mistral-optimized)',
    description: 'Compressed scraper guide (1,500 tokens) with RAG fallback for examples',
    systemPrompt: `You are a web scraping expert specializing in legislative calendars.

## WORKFLOW (MANDATORY)
Before generating ANY scraper, you MUST:
1. Use execute_code to fetch and inspect the target website HTML
2. Find the ACTUAL selectors by analyzing the DOM structure
3. NEVER invent generic selectors like .event-list or .event-item
4. Test your scraper with execute_code before responding

## USING MANUAL CAPTURE TEMPLATES (FLEXIBLE HINTS)
If the user provides a JSON template with selectorSteps, treat these as **HELPFUL HINTS, NOT RULES**:

**What the template contains:**
- \`pageStructures[].fields[].selectorSteps\` = Selectors discovered by clicking elements
- \`containerSelector\` = Parent container where items live
- \`itemSelector\` = Individual item selector
- \`notes\` = Important context about the page behavior

**CRITICAL - Detect Dynamic Content:**
If the template contains notes/fields with these keywords, **USE PUPPETEER**:
- "click", "popup", "modal", "dropdown", "expand"
- "you have to click", "appears when", "shows on hover"
- "JavaScript", "dynamic", "loads after"

**Example requiring Puppeteer:**
\`\`\`json
{
  "fields": [{
    "fieldName": "name-note",
    "selectorSteps": [{"selector": "This and the rest of the following fields are inside the event, you have to click the single event for this information to popup"}]
  }]
}
\`\`\`
→ **Keywords "click" and "popup" = USE PUPPETEER with page.click()**

**CRITICAL - Templates are STARTING POINTS:**
1. Extract selectors from \`selectorSteps[].selector\` fields
2. **Check notes for dynamic behavior** - if it mentions clicking/modals, use Puppeteer
3. **Verify selectors still work** - websites change!
4. **Look for additional fields** not in the template (location, document links, contact info)
5. **Inspect the actual HTML** with execute_code to find what the template missed
6. Build a **complete scraper** that captures ALL available data, not just template fields

**Example template:**
\`\`\`json
{
  "pageStructures": [{
    "containerSelector": ".events-list",
    "fields": [
      {"fieldName": "title", "selectorSteps": [{"selector": "h2.event-title"}]},
      {"fieldName": "date", "selectorSteps": [{"selector": ".event-date"}]}
    ]
  }]
}
\`\`\`

**Your job:**
1. Use \`.events-list\`, \`h2.event-title\`, \`.event-date\` as hints
2. Fetch HTML and verify these selectors work
3. **Discover additional fields:** location, agenda URL, meeting type, status, etc.
4. Build scraper with ALL fields found, not just title + date

## DECISION TREE
**Check template notes FIRST:**
- Contains "click", "popup", "modal"? → **PUPPETEER**
- Mentions "event details", "expand", "dropdown"? → **PUPPETEER**

**Then check page:**
1. View page source → content visible? → **Static HTML** (use cheerio)
2. Network tab shows /api/ endpoint? → **JSON API** (use fetch)
3. Empty source, JavaScript-rendered? → **Puppeteer**
4. Calendar loads dynamically? → **Puppeteer**
5. Can't find calendar in 10min? → **STOP & ASK USER**

## CORE PATTERNS

### Pattern 1: List Scraping (Most Common)
\`\`\`javascript
const events = [];
$('.event-list').each(() => {          // Container
  $('.event-item').each(() => {        // Item  
    events.push({
      title: $('.title').text(),       // Field
      date: $('.date').text(),         
      location: $('.location').text()  
    });
  });
});
\`\`\`

### Pattern 2: Table Scraping
\`\`\`javascript
$('table tr').each((_, row) => {
  const cells = $(row).find('td');
  events.push({
    title: $(cells[0]).text(),
    date: $(cells[1]).text(),
    location: $(cells[2]).text()
  });
});
\`\`\`

### Pattern 3: JSON API
\`\`\`javascript
const response = await fetch('https://api.state.gov/events');
const data = await response.json();
return data.events.map(e => ({
  title: e.name,
  date: e.start_date,
  location: e.venue
}));
\`\`\`

## SELECTOR PRIORITY
1. **ID** (best): #event-123
2. **Class + Tag**: div.event-item, h2.title
3. **Data attributes**: [data-event-id]
4. **Hierarchy**: .calendar .event-list .item
5. **Text matching** (last resort): contains("Meeting")

## COMMON SELECTORS
- Containers: .events, .calendar-list, #meetings
- Items: .event-item, .meeting-row, tr
- Titles: h2, .title, .event-name
- Dates: .date, time, [datetime]
- Locations: .location, .venue, .room

## REQUESTING EXAMPLES
If you need a platform-specific example, ask the user:
"Show me the [platform-name] scraping pattern"

Available examples: legistar, granicus, civicplus, static-table, json-api, graphql, puppeteer, pagination

## DATABASE INTEGRATION
Scrapers write to PostgreSQL:
\`\`\`sql
INSERT INTO events (title, date, location, source)
VALUES ($1, $2, $3, $4)
ON CONFLICT (source, external_id) DO UPDATE SET ...
\`\`\`

Tags are AUTO-GENERATED by DB (25 categories, 150 keywords).
You only provide: title, description, location.

## COMMON ISSUES
- **Empty results?** → JavaScript-rendered, try Puppeteer
- **Missing data?** → Wrong selector, inspect element
- **Pagination loops?** → Add maxPages limit
- **Dates parse wrong?** → Use regex: /(\\w+)\\s+(\\d+),\\s+(\\d{4})/`,
    tools: ['execute_code', 'fetch_url'],
    modelRecommendation: 'mistral-nemo:12b-instruct-2407-q8_0'
  },
  {
    id: 'pdf-parser',
    name: 'PDF Agenda Parser',
    description: 'Extract bills and topics from legislative PDF agendas',
    systemPrompt: `You are a PDF parsing specialist for legislative meeting agendas.

## Your Task
Extract structured data from PDF agendas:
1. **Bill Numbers** - Find all bill references (HB ###, SB ###, etc.)
2. **Topics/Tags** - Categorize content using keyword matching
3. **Meeting Details** - Extract virtual links, participation info
4. **Action Items** - Identify votes, hearings, testimonies

## Process
1. Use pdfjs-dist to extract text from ALL pages
2. Parse text with regex patterns for bills
3. Generate tags from keywords (Healthcare, Education, etc.)
4. Return structured JSON

## Output Format
Return JSON only:
{
  "bills": ["HB 1234", "SB 5678"],
  "tags": ["Healthcare", "Education"],
  "virtualLink": "https://...",
  "publicComment": true,
  "summary": "Brief meeting description"
}

Follow patterns from AGENDA_PDF_PARSER_GUIDE.md`,
    tools: ['execute_code', 'fetch_url'],
    modelRecommendation: 'qwen2.5-coder:3b'
  },
  {
    id: 'agenda-summarizer',
    name: 'Agenda Summarizer',
    description: 'Generate AI summaries of meeting agendas using Ollama',
    systemPrompt: `You are an agenda summarization expert. Generate concise, informative summaries of legislative meetings.

## Input
You'll receive extracted text from PDF agendas (via pdf-parser agent).

## Output Format
Generate a 2-3 sentence summary covering:
1. Main topics/bills discussed
2. Type of meeting (hearing, vote, testimony)
3. Key stakeholders or committees

Example:
"Senate Healthcare Committee hearing on HB 1234 regarding Medicaid expansion. Public testimony scheduled with 15 speakers registered. Vote expected on SB 5678 concerning rural hospital funding."

Keep it factual, concise, and informative.`,
    tools: ['execute_code'],
    modelRecommendation: 'qwen2.5-coder:3b'
  }
];

/**
 * Get optimal model recommendations based on available VRAM
 */
export function getModelRecommendations(availableVramGB: number): {
  recommended: ModelConfig[];
  tooLarge: ModelConfig[];
} {
  // Add 1GB buffer for system overhead
  const usableVram = availableVramGB - 1;
  
  const recommended = AVAILABLE_MODELS
    .filter(m => m.vramRequired <= usableVram)
    .sort((a, b) => b.speedTokSec - a.speedTokSec); // Fastest first
  
  const tooLarge = AVAILABLE_MODELS
    .filter(m => m.vramRequired > usableVram)
    .sort((a, b) => a.vramRequired - b.vramRequired); // Smallest first
  
  return { recommended, tooLarge };
}

/**
 * Get example from SCRAPER_EXAMPLES.json based on query
 * (RAG system for Mistral-optimized guide)
 */
export function getScraperExample(query: string): string | null {
  try {
    const fs = require('fs');
    const path = require('path');
    const examplesPath = path.join(__dirname, '../../SCRAPER_EXAMPLES.json');
    const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf-8'));
    
    // Keyword matching
    const keywords = query.toLowerCase();
    
    if (keywords.includes('legistar')) return JSON.stringify(examples.legistar, null, 2);
    if (keywords.includes('granicus')) return JSON.stringify(examples.granicus, null, 2);
    if (keywords.includes('civicplus')) return JSON.stringify(examples.civicplus, null, 2);
    if (keywords.includes('table')) return JSON.stringify(examples['static-table'], null, 2);
    if (keywords.includes('api') || keywords.includes('json')) return JSON.stringify(examples['json-api'], null, 2);
    if (keywords.includes('graphql')) return JSON.stringify(examples.graphql, null, 2);
    if (keywords.includes('puppeteer') || keywords.includes('javascript')) return JSON.stringify(examples.puppeteer, null, 2);
    if (keywords.includes('pagination') || keywords.includes('next')) return JSON.stringify(examples.pagination, null, 2);
    if (keywords.includes('date')) return JSON.stringify(examples.date_parsing, null, 2);
    
    return null;
  } catch (error) {
    console.error('Failed to load scraper examples:', error);
    return null;
  }
}

/**
 * Extracts clean selectors from manual capture template JSON
 * Removes documentation comments and extracts actual CSS selectors
 */
export function extractSelectorsFromTemplate(templateJson: string): {
  containerSelector?: string;
  itemSelector?: string;
  fields: Array<{fieldName: string, selector: string, attributeName?: string}>;
} | null {
  try {
    const template = JSON.parse(templateJson);
    
    if (!template.pageStructures || !Array.isArray(template.pageStructures)) {
      return null;
    }
    
    const pageStructure = template.pageStructures[0];
    const result = {
      containerSelector: pageStructure.containerSelector,
      itemSelector: pageStructure.itemSelector,
      fields: [] as Array<{fieldName: string, selector: string, attributeName?: string}>
    };
    
    // Extract field selectors from selectorSteps
    if (pageStructure.fields && Array.isArray(pageStructure.fields)) {
      for (const field of pageStructure.fields) {
        if (field.selectorSteps && Array.isArray(field.selectorSteps)) {
          // Get the first selector step (usually the primary one)
          const step = field.selectorSteps[0];
          if (step && step.selector) {
            result.fields.push({
              fieldName: field.fieldName,
              selector: step.selector,
              attributeName: step.attributeName
            });
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Failed to parse template:', error);
    return null;
  }
}

/**
 * Get VRAM info from system (if available)
 */
export async function detectVRAM(): Promise<{ totalGB: number; available: boolean }> {
  try {
    // Try nvidia-smi first
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits');
    const vramMB = parseInt(stdout.trim());
    const vramGB = Math.round(vramMB / 1024);
    
    return { totalGB: vramGB, available: true };
  } catch {
    // Fallback: assume 8GB if we can't detect
    return { totalGB: 8, available: false };
  }
}

/**
 * Get context by ID
 */
export function getContextById(id: string): ContextTemplate | undefined {
  return CONTEXT_TEMPLATES.find(c => c.id === id);
}

/**
 * List all available contexts
 */
export function listContexts(): ContextTemplate[] {
  return CONTEXT_TEMPLATES;
}

/**
 * Get context optimized for scraper extension integration
 */
export function getScraperExtensionContext(jsonTemplate: any): {
  context: ContextTemplate;
  model: ModelConfig;
  enhancedPrompt: string;
} {
  const context = getContextById('scraper-builder')!;
  const model = AVAILABLE_MODELS.find(m => m.name === 'qwen2.5-coder:7b')!;
  
  // Extract fields from JSON template
  const fields = extractFieldsFromTemplate(jsonTemplate);
  
  const enhancedPrompt = `${context.systemPrompt}

## USER'S JSON TEMPLATE FIELDS
${fields.map(f => `- ${f.name}: ${f.type}${f.description ? ` (${f.description})` : ''}`).join('\n')}

## YOUR TASK
1. Analyze the webpage structure provided
2. Determine the best scraping approach (Static HTML, JSON API, or Puppeteer)
3. Generate code that extracts ALL ${fields.length} fields above
4. Test the code using execute_code tool
5. Report results:
   - Total events/items found
   - Which fields were successfully extracted
   - Which fields are missing (and why)
   - Recommended next steps if data is incomplete

Return code first, then analysis.`;

  return { context, model, enhancedPrompt };
}

/**
 * Extract field definitions from JSON template
 */
function extractFieldsFromTemplate(template: any): Array<{name: string, type: string, description?: string}> {
  const fields: Array<{name: string, type: string, description?: string}> = [];
  
  if (Array.isArray(template)) {
    // If template is an array, examine first object
    if (template[0]) {
      return extractFieldsFromTemplate(template[0]);
    }
  } else if (typeof template === 'object' && template !== null) {
    for (const [key, value] of Object.entries(template)) {
      let type: string = typeof value;
      if (Array.isArray(value)) type = 'array';
      if (value === null) type = 'null';
      
      fields.push({
        name: key,
        type,
        description: undefined // Could be enhanced to parse JSDoc comments
      });
      
      // Recursively extract nested fields
      if (typeof value === 'object' && value !== null) {
        const nested = extractFieldsFromTemplate(value);
        fields.push(...nested.map(f => ({
          ...f,
          name: `${key}.${f.name}`
        })));
      }
    }
  }
  
  return fields;
}

/**
 * Format model info for display
 */
export function formatModelInfo(model: ModelConfig): string {
  return `**${model.name}**
- VRAM: ${model.vramRequired}GB
- Speed: ~${model.speedTokSec} tok/s
- Context: ${model.contextWindow} tokens
- ${model.description}
- Best for: ${model.recommended.join(', ')}`;
}

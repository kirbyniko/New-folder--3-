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

## Field Mapping
Extract ALL fields from the user's JSON template:
- Event name/title
- Date/time
- Location
- Committee/body
- Agenda URL
- Video/stream URL
- Any custom fields

Report which fields were found and which are missing.`,
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

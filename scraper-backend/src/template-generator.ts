/**
 * Template-Based Scraper Generator
 * 
 * Generates Puppeteer/Cheerio scrapers from Chrome extension JSON configs
 * using deterministic templates, with optional LLM refinement for errors.
 * 
 * This replaces the unreliable ReAct agent approach with:
 * - Deterministic template selection based on config patterns
 * - 95% of code from templates (not LLM generation)
 * - Small model only used to fix specific errors
 * - Guaranteed reproducibility (same config → same output)
 */

interface ScraperConfig {
  name: string;
  startUrl: string;
  requiresPuppeteer?: boolean;
  pageStructures?: Array<{
    containerSelector?: string;
    itemSelector?: string;
    fields: Array<{
      fieldName: string;
      fieldType?: string;
      selectorSteps: Array<{
        selector: string;
        actionType?: string;
        attributeName?: string;
        waitAfter?: number;
      }>;
    }>;
  }>;
}

interface TemplateResult {
  code: string;
  template: string;
  success: boolean;
  error?: string;
  attempts: number;
}

interface ExecuteResult {
  success: boolean;
  data?: any;
  error?: string;
  logs: string[];
}

/**
 * Template interface for different scraper patterns
 */
interface ScraperTemplate {
  name: string;
  description: string;
  detectCondition: (config: ScraperConfig) => boolean;
  generate: (config: ScraperConfig) => string;
}

/**
 * All available templates
 */
const TEMPLATES: ScraperTemplate[] = [
  {
    name: 'puppeteer-click-reveal',
    description: 'For dynamic content with click actions (modals, popups)',
    
    detectCondition: (config) => {
      if (!config.requiresPuppeteer) return false;
      const hasClickAction = config.pageStructures?.[0]?.fields?.some(field =>
        field.selectorSteps?.some(step => step.actionType === 'click')
      );
      return hasClickAction || false;
    },
    
    generate: (config) => {
      const ps = config.pageStructures?.[0];
      if (!ps) throw new Error('No page structure in config');
      
      const itemSelector = ps.itemSelector || ps.containerSelector || 'body';
      const clickFields = ps.fields.filter(f => 
        f.selectorSteps?.some(s => s.actionType === 'click')
      );
      const extractFields = ps.fields.filter(f => 
        !f.selectorSteps?.some(s => s.actionType === 'click')
      );
      
      return `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('${config.startUrl}', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Page loaded: ${config.startUrl}');
    
    // Wait for items to appear
    try {
      await page.waitForSelector('${itemSelector}', { timeout: 10000 });
    } catch (e) {
      console.log('Warning: Item selector not found immediately');
    }
    
    const items = await page.$$('${itemSelector}');
    console.log('Found ' + items.length + ' items');
    
    const results = [];
    const maxItems = Math.min(items.length, 10);
    
    for (let i = 0; i < maxItems; i++) {
      console.log('Processing item ' + (i + 1) + '/' + maxItems);
      
      try {
        // Get a fresh reference to the item
        const items = await page.$$('${itemSelector}');
        const item = items[i];
        
${clickFields.map(field => {
  const clickStep = field.selectorSteps.find(s => s.actionType === 'click');
  return `        // Click to reveal ${field.fieldName}
        try {
          const clickTarget = await item.$('${clickStep?.selector}');
          if (clickTarget) {
            await clickTarget.click();
            await page.waitForTimeout(${clickStep?.waitAfter || 1000});
            console.log('Clicked for ${field.fieldName}');
          }
        } catch (e) {
          console.log('Click failed for ${field.fieldName}:', e.message);
        }
`;
}).join('\n')}
        // Extract data from page (after clicks)
        const data = await page.evaluate(() => {
          const result = {};
          
${extractFields.map(field => {
  const step = field.selectorSteps[0];
  const attr = step.attributeName;
  return `          // Extract ${field.fieldName}
          try {
            const el = document.querySelector('${step.selector}');
            if (el) {
              result.${field.fieldName} = ${attr ? `el.getAttribute('${attr}')` : 'el.textContent.trim()'};
            } else {
              result.${field.fieldName} = null;
            }
          } catch (e) {
            console.log('Extract failed for ${field.fieldName}:', e.message);
            result.${field.fieldName} = null;
          }
`;
}).join('\n')}
          return result;
        });
        
        results.push(data);
        
        // Close modal/popup if it's still open
        try {
          const closeBtn = await page.$('.close, .modal-close, [aria-label="Close"]');
          if (closeBtn) await closeBtn.click();
          await page.waitForTimeout(300);
        } catch (e) {
          // No close button or already closed
        }
        
      } catch (itemError) {
        console.log('Error processing item ' + (i + 1) + ':', itemError.message);
      }
    }
    
    console.log('\\nExtracted ' + results.length + ' items');
    console.log(JSON.stringify(results, null, 2));
    
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});`;
    }
  },
  
  {
    name: 'puppeteer-simple',
    description: 'For dynamic content without click actions',
    
    detectCondition: (config) => {
      return config.requiresPuppeteer === true;
    },
    
    generate: (config) => {
      const ps = config.pageStructures?.[0];
      if (!ps) throw new Error('No page structure in config');
      
      const itemSelector = ps.itemSelector || ps.containerSelector || 'body';
      
      return `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('${config.startUrl}', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Page loaded: ${config.startUrl}');
    
    // Wait for items
    await page.waitForSelector('${itemSelector}', { timeout: 10000 });
    
    const results = await page.evaluate((itemSel) => {
      const items = document.querySelectorAll(itemSel);
      const data = [];
      
      items.forEach((item, i) => {
        if (i >= 10) return; // Limit to 10 items
        
        const result = {};
        
${ps.fields.map(field => {
  const step = field.selectorSteps[0];
  const attr = step.attributeName;
  return `        // Extract ${field.fieldName}
        try {
          const el = item.querySelector('${step.selector}');
          result.${field.fieldName} = el ? ${attr ? `el.getAttribute('${attr}')` : 'el.textContent.trim()'} : null;
        } catch (e) {
          result.${field.fieldName} = null;
        }
`;
}).join('\n')}
        data.push(result);
      });
      
      return data;
    }, '${itemSelector}');
    
    console.log('Extracted ' + results.length + ' items');
    console.log(JSON.stringify(results, null, 2));
    
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});`;
    }
  },
  
  {
    name: 'cheerio-static',
    description: 'For static HTML content',
    
    detectCondition: (config) => {
      return !config.requiresPuppeteer;
    },
    
    generate: (config) => {
      const ps = config.pageStructures?.[0];
      if (!ps) throw new Error('No page structure in config');
      
      const itemSelector = ps.itemSelector || ps.containerSelector || 'body';
      
      return `const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    console.log('Fetching: ${config.startUrl}');
    
    const { data: html } = await axios.get('${config.startUrl}', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(html);
    const items = $('${itemSelector}');
    
    console.log('Found ' + items.length + ' items');
    
    const results = [];
    
    items.each((i, item) => {
      if (i >= 10) return false; // Limit to 10 items
      
      const $item = $(item);
      const data = {};
      
${ps.fields.map(field => {
  const step = field.selectorSteps[0];
  const attr = step.attributeName;
  return `      // Extract ${field.fieldName}
      try {
        const el = $item.find('${step.selector}');
        data.${field.fieldName} = el.length ? ${attr ? `el.attr('${attr}')` : 'el.text().trim()'} : null;
      } catch (e) {
        data.${field.fieldName} = null;
      }
`;
}).join('\n')}
      results.push(data);
    });
    
    console.log('Extracted ' + results.length + ' items');
    console.log(JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Script error:', error.message);
    process.exit(1);
  }
})();`;
    }
  }
];

/**
 * Main template generator class
 */
export class TemplateScraperGenerator {
  private executeServerUrl = 'http://localhost:3002/run';
  private ollamaUrl = 'http://localhost:11434/api/generate';
  private model = 'deepseek-coder:6.7b';
  
  /**
   * Generate scraper code from config, test it, and refine if needed
   */
  async generate(
    config: ScraperConfig,
    onProgress?: (message: string) => void
  ): Promise<TemplateResult> {
    const log = (msg: string) => {
      console.log(msg);
      onProgress?.(msg);
    };
    
    log(`\n🔧 TEMPLATE GENERATOR STARTED`);
    log(`   Config: ${config.name}`);
    log(`   URL: ${config.startUrl}`);
    log(`   Requires Puppeteer: ${config.requiresPuppeteer ? 'YES' : 'NO'}`);
    
    // Select template
    const template = this.selectTemplate(config);
    log(`\n📋 Selected template: ${template.name}`);
    log(`   Description: ${template.description}`);
    
    // Generate initial code
    let code = template.generate(config);
    log(`\n✅ Generated ${code.split('\n').length} lines of code`);
    
    // Test and refine loop
    for (let attempt = 1; attempt <= 3; attempt++) {
      log(`\n🧪 Test attempt ${attempt}/3`);
      
      const result = await this.test(code);
      
      if (result.success) {
        log(`✅ SUCCESS! Scraper works correctly`);
        log(`   Extracted items: ${Array.isArray(result.data) ? result.data.length : 'unknown'}`);
        
        return {
          code,
          template: template.name,
          success: true,
          attempts: attempt
        };
      }
      
      log(`❌ Test failed: ${result.error}`);
      log(`   Logs: ${result.logs.join(', ')}`);
      
      if (attempt < 3) {
        log(`\n🔧 Attempting to fix with model...`);
        code = await this.refineWithModel(code, result.error || 'Unknown error', result.logs);
      }
    }
    
    log(`\n❌ FAILED after 3 attempts`);
    
    return {
      code,
      template: template.name,
      success: false,
      error: 'Failed after 3 refinement attempts',
      attempts: 3
    };
  }
  
  /**
   * Select the best template for the config
   */
  private selectTemplate(config: ScraperConfig): ScraperTemplate {
    // Try templates in priority order
    for (const template of TEMPLATES) {
      if (template.detectCondition(config)) {
        return template;
      }
    }
    
    // Fallback to Cheerio static
    return TEMPLATES[TEMPLATES.length - 1];
  }
  
  /**
   * Test generated code on execute server
   */
  private async test(code: string): Promise<ExecuteResult> {
    try {
      const response = await fetch(this.executeServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptCode: code,
          targetUrl: '',
          timeout: 30000
        })
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Execute server error: ${response.statusText}`,
          logs: []
        };
      }
      
      const result = await response.json();
      return result;
      
    } catch (error: any) {
      return {
        success: false,
        error: `Network error: ${error.message}`,
        logs: []
      };
    }
  }
  
  /**
   * Use small model to fix specific error
   * (Much simpler task than generating from scratch)
   */
  private async refineWithModel(
    code: string,
    error: string,
    logs: string[]
  ): Promise<string> {
    const prompt = `You are debugging a Puppeteer/Cheerio scraper that has an error.

ERROR: ${error}

LOGS:
${logs.slice(-5).join('\n')}

CURRENT CODE:
\`\`\`javascript
${code}
\`\`\`

Fix the error. Output ONLY the corrected JavaScript code with NO explanation.
The code must use require() for imports (not import statements).
Start your response with \`\`\`javascript and end with \`\`\`.`;

    try {
      const response = await fetch(this.ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 1500
          }
        })
      });
      
      if (!response.ok) {
        console.error('Ollama error:', response.statusText);
        return code; // Return original on error
      }
      
      const result = await response.json();
      const refinedResponse = result.response || '';
      
      // Extract code from markdown code blocks
      const codeMatch = refinedResponse.match(/```(?:javascript)?\n([\s\S]+?)\n```/);
      if (codeMatch) {
        return codeMatch[1];
      }
      
      // If no code block, check if response is pure code
      if (refinedResponse.includes('require(') && refinedResponse.includes('async')) {
        return refinedResponse.trim();
      }
      
      console.warn('Could not extract code from model response');
      return code; // Return original if extraction fails
      
    } catch (error: any) {
      console.error('Model refinement error:', error.message);
      return code; // Return original on error
    }
  }
}

/**
 * Convenience function for simple usage
 */
export async function generateScraperFromConfig(
  config: ScraperConfig,
  onProgress?: (message: string) => void
): Promise<TemplateResult> {
  const generator = new TemplateScraperGenerator();
  return generator.generate(config, onProgress);
}

/**
 * LLM-powered scraper script generator
 * Uses local Ollama models to generate custom Puppeteer scripts
 */

import { OllamaClient } from './ollama-client.js';
import type { ScraperConfig } from '../types.js';

export interface ScriptGenerationRequest {
  config: ScraperConfig;
  htmlSnapshot?: string;
  failureReason?: string;
  existingAttempts?: number;
}

export interface GeneratedScript {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  estimatedSuccessRate: number;
}

export class ScraperScriptGenerator {
  private llm: OllamaClient;

  constructor(llm?: OllamaClient) {
    this.llm = llm || new OllamaClient();
  }

  /**
   * Generate a custom Puppeteer script for a scraper
   */
  async generateScript(request: ScriptGenerationRequest): Promise<GeneratedScript> {
    const { config, htmlSnapshot, failureReason } = request;

    // Build context-rich prompt
    const prompt = this.buildPrompt(config, htmlSnapshot, failureReason);

    // Generate code
    const response = await this.llm.generate({
      model: 'gemma3:4b',
      prompt,
      system: this.getSystemPrompt(),
      temperature: 0.2 // Low temp for more deterministic code
    });

    // Parse response
    const code = this.extractCode(response);
    const confidence = this.assessConfidence(code, config);

    return {
      code,
      confidence: confidence.level,
      reasoning: confidence.reasoning,
      estimatedSuccessRate: confidence.score
    };
  }

  private getSystemPrompt(): string {
    return `You are an elite web scraping engineer. Generate production-ready Puppeteer code that extracts civic meeting data.

=== CRITICAL RULES ===
1. NO IMPORTS: Libraries (cheerio, puppeteer) are already in scope. Never write require() or import.
2. CORRECT API USAGE:
   - Use page.$() for single elements → returns ElementHandle or null
   - Use page.$$() for multiple elements → returns ElementHandle[]
   - Use page.$eval() to extract text from ONE element
   - Use page.$$eval() to extract from MULTIPLE elements
   - Use page.evaluate() for complex DOM manipulation
3. PROPER ERROR HANDLING:
   - Always check if elements exist before accessing
   - Use try-catch blocks around extraction logic
   - Return empty array [] if nothing found (never throw on no results)
4. SMART WAITING:
   - Use page.waitForSelector() for dynamic content
   - Use {timeout: 5000} on all waits to prevent hanging
   - Never use arbitrary setTimeout delays

=== CORRECT PATTERNS ===

Extract text from multiple items:
\`\`\`javascript
const items = await page.$$eval('.item-selector', elements => 
  elements.map(el => ({
    title: el.querySelector('.title')?.textContent?.trim() || '',
    date: el.querySelector('.date')?.textContent?.trim() || ''
  }))
);
\`\`\`

Extract with complex logic:
\`\`\`javascript
const items = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.item')).map(item => ({
    name: item.querySelector('.name')?.textContent?.trim() || '',
    link: item.querySelector('a')?.href || ''
  }));
});
\`\`\`

Safe attribute extraction:
\`\`\`javascript
const links = await page.$$eval('a.meeting', anchors => 
  anchors.map(a => a.getAttribute('href')).filter(Boolean)
);
\`\`\`

=== YOUR TASK ===
Write ONE function: async function scrapeData(page, config)
- page is an active Puppeteer Page object (already navigated to the URL)
- config contains field specifications
- Return an array of objects with the extracted data
- If no data found, return []
- No explanations, no markdown, just executable code`;
  }

  private buildPrompt(
    config: ScraperConfig,
    htmlSnapshot?: string,
    failureReason?: string
  ): string {
    let prompt = `=== SCRAPING TARGET ===
URL: ${config.startUrl}
TYPE: ${config.description}
${config.requiresPuppeteer ? '⚠️  DYNAMIC SITE: Requires JavaScript rendering' : '✓ STATIC: HTML-based content'}

`;

    // Add failure context if retrying
    if (failureReason) {
      prompt += `❌ PREVIOUS FAILURE: ${failureReason}
Your new code MUST fix this issue.

`;
    }

    // Add field extraction requirements with better formatting
    prompt += `=== DATA TO EXTRACT ===\n`;
    for (const ps of config.pageStructures) {
      prompt += `\n📋 ${ps.pageType}:\n`;
      
      if (ps.containerSelector) {
        prompt += `   Container: "${ps.containerSelector}"\n`;
      }
      if (ps.itemSelector) {
        prompt += `   Item selector: "${ps.itemSelector}"\n`;
      }

      prompt += `   Required fields:\n`;
      for (const field of ps.fields) {
        prompt += `   • ${field.fieldName} (${field.fieldType})`;
        
        if (field.selectorSteps && field.selectorSteps.length > 0) {
          const mainSelector = field.selectorSteps[0].selector;
          const attr = field.selectorSteps[0].attributeName;
          prompt += ` → ${field.selectorSteps[0].actionType} "${mainSelector}"`;
          if (attr) prompt += ` [${attr}]`;
        }
        prompt += '\n';
      }
    }

    // Add navigation steps
    if (config.navigationSteps && config.navigationSteps.length > 0) {
      prompt += `\n=== NAVIGATION REQUIRED ===\n`;
      for (const nav of config.navigationSteps) {
        prompt += `${nav.stepOrder}. ${nav.stepType.toUpperCase()}`;
        if (nav.selector) prompt += ` → "${nav.selector}"`;
        if (nav.waitTime) prompt += ` (wait ${nav.waitTime}ms)`;
        prompt += '\n';
      }
    }

    // Add HTML snapshot if available (focused on structure)
    if (htmlSnapshot) {
      const truncated = htmlSnapshot.length > 4000 
        ? htmlSnapshot.substring(0, 4000) + '\n... [HTML truncated]'
        : htmlSnapshot;
      prompt += `\n=== PAGE HTML STRUCTURE ===\n\`\`\`html\n${truncated}\n\`\`\`\n`;
    }

    prompt += `\n=== YOUR CODE ===
Write the scrapeData function following the patterns from the system prompt.
Focus on:
1. Using page.$$eval() or page.evaluate() correctly
2. Extracting ALL fields specified above
3. Returning valid data even if some fields are missing
4. Handling the page structure shown in the HTML

async function scrapeData(page, config) {
  // Your code here
}`;

    return prompt;
  }

  private extractCode(response: string): string {
    // Remove any explanatory text before/after code
    let code = response.trim();
    
    // Extract from markdown code blocks
    const codeBlockMatch = code.match(/```(?:javascript|js|typescript|ts)?\s*\n([\s\S]+?)\n```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1].trim();
    }

    // Remove any leading/trailing explanations
    const functionStart = code.search(/(async\s+)?function\s+scrapeData/);
    if (functionStart > 0) {
      code = code.substring(functionStart);
    }

    // Remove any require/import statements (LLM might still add them)
    code = code.replace(/^(const|let|var)\s+\w+\s*=\s*require\([^)]+\);?\s*$/gm, '');
    code = code.replace(/^import\s+.+;?\s*$/gm, '');
    
    // Clean up extra whitespace
    code = code.trim();

    return code;
  }

  private assessConfidence(code: string, config: ScraperConfig): {
    level: 'high' | 'medium' | 'low';
    score: number;
    reasoning: string;
  } {
    let score = 60; // Base score
    const issues: string[] = [];
    const strengths: string[] = [];

    // Check for correct Puppeteer API usage
    if (code.includes('page.$$eval') || code.includes('page.$eval')) {
      score += 20;
      strengths.push('Correct Puppeteer API');
    } else if (code.includes('page.evaluate')) {
      score += 15;
      strengths.push('Uses page.evaluate');
    }

    // Check for proper element selection
    if (code.includes('querySelectorAll') && code.includes('.map')) {
      score += 10;
      strengths.push('Proper list extraction');
    }

    // Check for safe access patterns
    if (code.includes('?.') || code.includes('|| \'\'') || code.includes('|| ""')) {
      score += 10;
      strengths.push('Safe property access');
    } else {
      issues.push('Missing null safety');
      score -= 5;
    }

    // Error handling
    if (code.includes('try') && code.includes('catch')) {
      score += 10;
      strengths.push('Error handling');
    } else {
      issues.push('No error handling');
    }

    // Check if it returns an array
    if (code.includes('return [') || code.includes('return items') || code.includes('return events')) {
      score += 5;
      strengths.push('Returns array');
    }

    // Check field coverage
    const allFields = config.pageStructures.flatMap(ps => ps.fields.map(f => f.fieldName));
    const fieldsInCode = allFields.filter(field => 
      code.toLowerCase().includes(field.toLowerCase())
    );
    const fieldCoverage = allFields.length > 0 ? fieldsInCode.length / allFields.length : 1;
    score += fieldCoverage * 15;
    
    if (fieldCoverage >= 0.8) {
      strengths.push('Excellent field coverage');
    } else if (fieldCoverage >= 0.5) {
      strengths.push('Good field coverage');
    } else {
      issues.push(`Low field coverage (${Math.round(fieldCoverage * 100)}%)`);
    }

    // Check for anti-patterns
    if (code.includes('require(') || code.includes('import ')) {
      issues.push('Contains import statements');
      score -= 15;
    }

    if (code.includes('elements.querySelectorAll') && !code.includes('Array.from')) {
      issues.push('Incorrect DOM API usage');
      score -= 10;
    }

    // Determine confidence level
    let level: 'high' | 'medium' | 'low';
    if (score >= 80) level = 'high';
    else if (score >= 50) level = 'medium';
    else level = 'low';

    const reasoning = [
      strengths.length > 0 ? `Strengths: ${strengths.join(', ')}` : '',
      issues.length > 0 ? `Issues: ${issues.join(', ')}` : ''
    ].filter(Boolean).join('. ');

    return { level, score: Math.min(100, Math.max(0, score)), reasoning: reasoning || 'Code structure looks acceptable' };
  }
}

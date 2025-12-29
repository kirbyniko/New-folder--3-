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
    return `You are an expert web scraping engineer specializing in Puppeteer scripts.
Your task is to generate production-ready, robust scraper code that:
1. Handles timeouts and errors gracefully
2. Waits for dynamic content to load
3. Uses proper selectors (CSS or XPath)
4. Extracts data according to the field specifications
5. Returns clean, structured JSON data
6. Works on real-world websites with ads, popups, and dynamic loading

CRITICAL RULES:
- DO NOT use require() or import statements
- DO NOT write: const puppeteer = require("puppeteer")
- DO NOT write: const cheerio = require("cheerio")
- The libraries puppeteer and cheerio are ALREADY AVAILABLE in your function scope
- You can use them directly: cheerio.load(), puppeteer features, etc.

Generate ONLY the scraper function code. No explanations, no markdown formatting.
The function signature MUST be: async function scrapeData(page, config)
Return an array of objects with the extracted data.`;
  }

  private buildPrompt(
    config: ScraperConfig,
    htmlSnapshot?: string,
    failureReason?: string
  ): string {
    let prompt = `Generate a Puppeteer scraper function for this website:

TARGET SITE: ${config.startUrl}
DESCRIPTION: ${config.description}
${config.requiresPuppeteer ? 'REQUIRES: JavaScript rendering (dynamic site)' : 'SITE TYPE: Static HTML'}

`;

    // Add failure context if retrying
    if (failureReason) {
      prompt += `PREVIOUS ATTEMPT FAILED: ${failureReason}
The new script must handle this issue.

`;
    }

    // Add field extraction requirements
    prompt += `FIELDS TO EXTRACT:\n`;
    for (const ps of config.pageStructures) {
      prompt += `\nPage Type: ${ps.pageType}\n`;
      if (ps.containerSelector) {
        prompt += `Container: ${ps.containerSelector}\n`;
      }
      if (ps.itemSelector) {
        prompt += `Items: ${ps.itemSelector}\n`;
      }

      for (const field of ps.fields) {
        prompt += `  - ${field.fieldName} (${field.fieldType}): `;
        
        if (field.selectorSteps && field.selectorSteps.length > 0) {
          const steps = field.selectorSteps.map(s => 
            `${s.actionType}('${s.selector}'${s.attributeName ? `, attr: '${s.attributeName}'` : ''})`
          ).join(' → ');
          prompt += steps + '\n';
        } else {
          prompt += 'No selector specified\n';
        }
      }
    }

    // Add navigation steps
    if (config.navigationSteps && config.navigationSteps.length > 0) {
      prompt += `\nNAVIGATION:\n`;
      for (const nav of config.navigationSteps) {
        prompt += `  ${nav.stepOrder}. ${nav.stepType}: ${nav.selector}\n`;
      }
    }

    // Add HTML snapshot if available (truncated)
    if (htmlSnapshot) {
      const truncated = htmlSnapshot.length > 3000 
        ? htmlSnapshot.substring(0, 3000) + '\n... (truncated)'
        : htmlSnapshot;
      prompt += `\nHTML STRUCTURE:\n${truncated}\n`;
    }

    prompt += `\n\nGenerate the scrapeData(page, config) function now. Return only executable JavaScript code.`;

    return prompt;
  }

  private extractCode(response: string): string {
    // Try to extract code from markdown blocks
    const codeBlockMatch = response.match(/```(?:javascript|js|typescript|ts)?\n([\s\S]+?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find function definition
    const functionMatch = response.match(/(async\s+)?function\s+scrapeData[\s\S]+/);
    if (functionMatch) {
      return functionMatch[0].trim();
    }

    // Return raw response if no patterns match
    return response.trim();
  }

  private assessConfidence(code: string, config: ScraperConfig): {
    level: 'high' | 'medium' | 'low';
    score: number;
    reasoning: string;
  } {
    let score = 50; // Base score
    const issues: string[] = [];
    const strengths: string[] = [];

    // Check for essential patterns
    if (code.includes('await page.waitForSelector') || code.includes('await page.waitFor')) {
      score += 15;
      strengths.push('Proper waiting logic');
    } else {
      issues.push('Missing wait logic');
      score -= 10;
    }

    if (code.includes('try') && code.includes('catch')) {
      score += 10;
      strengths.push('Error handling');
    } else {
      issues.push('No error handling');
      score -= 5;
    }

    if (code.includes('page.evaluate') || code.includes('page.$$eval')) {
      score += 10;
      strengths.push('Uses page evaluation');
    }

    // Check if all required fields are referenced
    const allFields = config.pageStructures.flatMap(ps => ps.fields.map(f => f.fieldName));
    const fieldsInCode = allFields.filter(field => code.includes(field));
    const fieldCoverage = fieldsInCode.length / allFields.length;
    score += fieldCoverage * 20;
    
    if (fieldCoverage > 0.8) {
      strengths.push('Good field coverage');
    } else {
      issues.push(`Only ${Math.round(fieldCoverage * 100)}% field coverage`);
    }

    // Check for common anti-patterns
    if (code.includes('sleep(') || code.includes('setTimeout')) {
      issues.push('Uses arbitrary delays instead of smart waits');
      score -= 5;
    }

    // Determine confidence level
    let level: 'high' | 'medium' | 'low';
    if (score >= 75) level = 'high';
    else if (score >= 50) level = 'medium';
    else level = 'low';

    const reasoning = [
      strengths.length > 0 ? `Strengths: ${strengths.join(', ')}` : '',
      issues.length > 0 ? `Issues: ${issues.join(', ')}` : ''
    ].filter(Boolean).join('. ');

    return { level, score: Math.min(100, Math.max(0, score)), reasoning };
  }
}

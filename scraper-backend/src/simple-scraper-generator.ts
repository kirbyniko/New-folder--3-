/**
 * Simple Scraper Generator - NO AGENT LOGIC
 * 
 * This bypasses the LangChain agent entirely and directly generates scrapers.
 * Much more reliable with small local models.
 */

import Ollama from 'ollama';

interface ScraperConfig {
  name: string;
  startUrl: string;
  pageStructures: Array<{
    fields: Array<{
      fieldName: string;
      selectorSteps: Array<{
        selector: string;
      }>;
    }>;
    itemSelector?: string;
  }>;
}

export async function generateScraper(config: ScraperConfig, model: string = 'mistral-nemo:12b-instruct-2407-q8_0'): Promise<string> {
  // Step 1: Detect if dynamic content (keywords in ANY field)
  const configString = JSON.stringify(config);
  const dynamicKeywords = ['click', 'popup', 'modal', 'dropdown', 'expand', 'hover', 'appears when'];
  const needsPuppeteer = dynamicKeywords.some(keyword => configString.toLowerCase().includes(keyword));

  console.log(`\n🔍 Scraper Detection:`);
  console.log(`   Needs Puppeteer: ${needsPuppeteer ? '✅ YES' : '❌ NO'}`);
  console.log(`   Keywords found: ${dynamicKeywords.filter(k => configString.toLowerCase().includes(k)).join(', ') || 'none'}`);

  // Step 2: Build the appropriate prompt (no tool calling, just code generation)
  const prompt = needsPuppeteer
    ? buildPuppeteerPrompt(config)
    : buildCheerioPrompt(config);

  console.log(`\n📝 Generated prompt (${prompt.length} chars)`);
  console.log(`   Using model: ${model}`);

  // Step 3: Call Ollama directly for code generation ONLY
  try {
    const ollama = new Ollama({ host: 'http://localhost:11434' });
    
    console.log(`\n🤖 Calling Ollama...`);
    const response = await ollama.chat({
      model,
      messages: [{
        role: 'user',
        content: prompt
      }],
      options: {
        temperature: 0.3,
        num_ctx: 8192
      }
    });

    const code = response.message.content;
    console.log(`\n✅ Generated ${code.length} chars of code`);
    
    // Extract code block if wrapped in markdown
    const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    const cleanCode = codeMatch ? codeMatch[1].trim() : code;

    return cleanCode;
  } catch (error) {
    console.error(`\n❌ Ollama error:`, error);
    throw error;
  }
}

function buildPuppeteerPrompt(config: ScraperConfig): string {
  return `You are a JavaScript code generator. Generate ONLY JavaScript code, NO explanations.

Task: Generate a Puppeteer scraper for this configuration:
${JSON.stringify(config, null, 2)}

CRITICAL: This site has DYNAMIC content that requires clicking/interacting.

Generate a complete, runnable Puppeteer script that:
1. Launches browser
2. Goes to: ${config.startUrl}
3. Finds all items matching: ${config.pageStructures[0]?.itemSelector || 'the item selector'}
4. For EACH item:
   - CLICK the item to open modal/popup
   - WAIT for modal content to load
   - Extract fields: ${config.pageStructures[0]?.fields.map(f => f.fieldName).join(', ')}
   - Close modal
5. Output JSON array of results

Use these selectors:
${config.pageStructures[0]?.fields.map(f => `- ${f.fieldName}: ${f.selectorSteps[0]?.selector}`).join('\n')}

Output ONLY the JavaScript code, starting with:
const puppeteer = require('puppeteer');

NO markdown, NO explanations, JUST CODE.`;
}

function buildCheerioPrompt(config: ScraperConfig): string {
  return `You are a JavaScript code generator. Generate ONLY JavaScript code, NO explanations.

Task: Generate a cheerio/axios scraper for this configuration:
${JSON.stringify(config, null, 2)}

This site has STATIC content - no clicking needed.

Generate a complete, runnable script that:
1. Uses axios to fetch: ${config.startUrl}
2. Uses cheerio to parse HTML
3. Finds all items matching: ${config.pageStructures[0]?.itemSelector || 'the item selector'}
4. Extracts fields: ${config.pageStructures[0]?.fields.map(f => f.fieldName).join(', ')}
5. Outputs JSON array of results

Use these selectors:
${config.pageStructures[0]?.fields.map(f => `- ${f.fieldName}: ${f.selectorSteps[0]?.selector}`).join('\n')}

Output ONLY the JavaScript code, starting with:
const axios = require('axios');
const cheerio = require('cheerio');

NO markdown, NO explanations, JUST CODE.`;
}

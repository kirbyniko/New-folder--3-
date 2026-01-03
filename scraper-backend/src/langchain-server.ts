/**
 * LangChain Agent API Server
 * Exposes the LangChain agent via HTTP for the frontend to use
 */

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createScraperAgent, runAgentTask } from './langchain-agent.js';
import { runAgentWithValidation } from './validation-loop.js';
import { listContexts } from './agent-contexts.js';
import { agentMemory } from './agent-memory.js';
import { localTracer } from './local-tracer.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { 
  AVAILABLE_MODELS, 
  CONTEXT_TEMPLATES, 
  getModelRecommendations, 
  detectVRAM,
  getScraperExtensionContext 
} from './context-manager.js';

const execAsync = promisify(exec);
const PORT = process.env.LANGCHAIN_PORT || 3003;

// Check if Ollama is using GPU
async function checkOllamaGpuUsage(): Promise<{usingGpu: boolean, gpuLayers: number, totalLayers: number}> {
  try {
    // First check running models
    const { stdout: psOut } = await execAsync('curl -s http://localhost:11434/api/ps');
    const models = JSON.parse(psOut);
    
    if (models.models && models.models.length > 0) {
      const activeModel = models.models[0];
      
      // Check size_vram vs size (if size_vram > 0, GPU is being used)
      const sizeVram = activeModel.size_vram || 0;
      const totalSize = activeModel.size || 0;
      
      if (sizeVram > 0) {
        // Calculate approximate GPU layers
        const gpuPercentage = totalSize > 0 ? (sizeVram / totalSize) * 100 : 0;
        return { 
          usingGpu: true, 
          gpuLayers: Math.round(gpuPercentage), 
          totalLayers: 100 
        };
      }
    }
    
    // Fallback: check if CUDA/GPU libraries are loaded
    const { stdout: showOut } = await execAsync('curl -s http://localhost:11434/api/show -d \'{"name": "mistral-nemo:12b-instruct-2407-q8_0"}\'');
    const modelInfo = JSON.parse(showOut);
    
    // If parameters mention GPU settings, it's trying to use GPU
    if (modelInfo.parameters && modelInfo.parameters.includes('gpu')) {
      return { usingGpu: true, gpuLayers: 100, totalLayers: 100 };
    }
    
  } catch (error) {
    console.error('Failed to check GPU usage:', error);
  }
  
  // If we can't determine, assume CPU fallback
  return { usingGpu: false, gpuLayers: 0, totalLayers: 100 };
}

// Error classification helpers
function classifyError(error: string): string {
  if (error.includes('Unexpected token') || error.includes('SyntaxError')) {
    return 'SYNTAX_ERROR';
  }
  if (error.includes('JSON') || error.includes('parse')) {
    return 'JSON_PARSE_ERROR';
  }
  if (error.includes('Cannot find module') || error.includes('require')) {
    return 'DEPENDENCY_ERROR';
  }
  if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
    return 'TIMEOUT_ERROR';
  }
  if (error.includes('No items extracted') || error.includes('itemCount: 0')) {
    return 'NO_ITEMS';
  }
  return 'UNKNOWN_ERROR';
}

function analyzeFailurePattern(allErrors: Array<{attempt: number, error: string, type: string}>) {
  if (allErrors.length === 0) {
    return { type: 'NO_ERRORS', consistent: false, count: 0, sampleError: '' };
  }
  
  // Check if same error type in all attempts
  const errorTypes = allErrors.map(e => e.type);
  const uniqueTypes = new Set(errorTypes);
  
  if (uniqueTypes.size === 1) {
    const type = Array.from(uniqueTypes)[0];
    return { 
      type, 
      consistent: true, 
      count: allErrors.length,
      sampleError: allErrors[0].error
    };
  }
  
  // Check if majority of errors are same type
  const typeCounts: Record<string, number> = {};
  errorTypes.forEach(t => {
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  
  const dominantType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (dominantType && dominantType[1] >= allErrors.length * 0.6) {
    return {
      type: dominantType[0],
      consistent: true,
      count: dominantType[1],
      sampleError: allErrors.find(e => e.type === dominantType[0])?.error || ''
    };
  }
  
  return { type: 'MIXED_ERRORS', consistent: false, count: allErrors.length, sampleError: allErrors[0]?.error || '' };
}

// Ollama selector analysis function
async function findSelectorsWithOllama(
  html: string, 
  fieldsRequired: string[], 
  previousAttempt?: { selectors: any, error: string, itemCount?: number, missingFields?: string[] },
  cleanJSON: boolean = false
): Promise<{ containerSelector: string, fields: Record<string, string> }> {
  
  // Limit HTML to ~5-8KB for Ollama
  const $ = cheerio.load(html);
  const bodySnippet = $('body').html()?.substring(0, 8000) || '';
  
  // Build analysis prompt
  const prompt = `You are analyzing HTML to find CSS selectors for web scraping.

HTML STRUCTURE (limited sample):
${bodySnippet}

FIELDS TO EXTRACT:
${fieldsRequired.map(f => `- ${f}`).join('\n')}

${previousAttempt ? `
PREVIOUS ATTEMPT FAILED:
Container: ${previousAttempt.selectors?.containerSelector || 'unknown'}
Field selectors: ${JSON.stringify(previousAttempt.selectors?.fields || {}, null, 2)}
Error: ${previousAttempt.error}
Items found: ${previousAttempt.itemCount || 0}
${previousAttempt.missingFields ? `Missing fields: ${previousAttempt.missingFields.join(', ')}` : ''}

You MUST improve on this attempt by finding better selectors.
` : ''}

Analyze the HTML structure and identify:
1. A container selector that matches repeating items (events, rows, articles, etc.)
2. Field selectors relative to each container for each required field

CRITICAL: Return ONLY valid JSON between <selectors> and </selectors> tags.

Format:
<selectors>
{
  "containerSelector": ".actual-class-in-html or tr.actual-class",
  "fields": {
    "fieldName": ".actual-selector-for-field",
    "another_field": "td:nth-child(2) or .another-class"
  }
}
</selectors>

Rules:
- Use ONLY selectors that exist in the HTML above
- Container must match multiple elements (for repeating items)
- Field selectors are relative to container
- Be specific to avoid false matches
- Look for semantic class names, IDs, or structure patterns`;

  console.log('📤 Sending prompt to Ollama...');
  
  // Call Ollama
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3-groq-tool-use',
    prompt: prompt,
    stream: false,
    temperature: 0.1,
    options: {
      num_predict: 500
    }
  }, { timeout: 60000 });
  
  const responseText = response.data.response || '';
  console.log('📥 Ollama response received, length:', responseText.length);
  
  // Extract JSON between delimiters
  const selectorMatch = responseText.match(/<selectors>([\s\S]*?)<\/selectors>/);
  if (!selectorMatch) {
    console.log('❌ No <selectors> tags found in response');
    console.log('Response:', responseText.substring(0, 500));
    throw new Error('Ollama did not return selectors in correct format');
  }
  
  let jsonText = selectorMatch[1].trim();
  
  // Clean JSON if requested (remove comments and trailing commas)
  if (cleanJSON) {
    console.log('🧹 Cleaning Ollama JSON output...');
    // Remove JavaScript-style comments
    jsonText = jsonText.replace(/\/\/.*$/gm, '');
    jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove trailing commas before closing braces/brackets
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
    console.log('✅ JSON cleaned');
  }
  
  console.log('📋 Extracted JSON:', jsonText.substring(0, 200));
  
  try {
    const selectors = JSON.parse(jsonText);
    
    if (!selectors.containerSelector || !selectors.fields) {
      throw new Error('Missing containerSelector or fields in response');
    }
    
    console.log('✅ Parsed selectors:', {
      container: selectors.containerSelector,
      fieldCount: Object.keys(selectors.fields).length
    });
    
    return selectors;
  } catch (parseError: any) {
    console.log('❌ JSON parse error:', parseError.message);
    console.log('JSON text:', jsonText);
    throw new Error(`Failed to parse Ollama JSON: ${parseError.message}`);
  }
}

// Validation loop function (worker level)
async function runValidationLoop(
  url: string,
  html: string,
  validFields: string[],
  appliedFixes: string[] = [],
  onProgress?: (data: any) => void
): Promise<{
  validated: boolean;
  code: string;
  itemCount: number;
  attempts: number;
  allErrors: Array<{attempt: number, error: string, type: string}>;
  bestAttempt: any;
}> {
  
  const MAX_ATTEMPTS = 5;
  let bestAttempt: any = { code: '', itemCount: 0, error: '', attempt: 0, missingFields: [] };
  let previousSelectors: any = null;
  const allErrors: Array<{attempt: number, error: string, type: string}> = [];
  
  // Check which fixes are applied
  const shouldQuoteFields = appliedFixes.includes('quote-field-names');
  const shouldCleanJSON = appliedFixes.includes('clean-ollama-json');
  const useAlternativeSelectors = appliedFixes.includes('use-alternative-selectors');
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${MAX_ATTEMPTS}`);
    onProgress?.({ type: 'info', message: `🔄 Attempt ${attempt}/${MAX_ATTEMPTS}` });
    
    // Get selectors
    let containerSelector = '';
    let fieldSelectors: Record<string, string> = {};
    
    if (attempt === 1 && !useAlternativeSelectors) {
      // First attempt: simple heuristics
      console.log('📐 Using heuristic selectors');
      onProgress?.({ type: 'info', message: '📐 Trying heuristic selectors...' });
      
      containerSelector = 'div.em-cal-event > div, .event, .calendar-item, article, .item, tr, li';
      validFields.forEach(field => {
        fieldSelectors[field] = `.${field.replace('_', '-')}`;
      });
    } else {
      // Subsequent attempts OR alternative selectors requested: ask Ollama
      console.log('🤖 Asking Ollama for selector suggestions');
      onProgress?.({ type: 'info', message: '🤖 Analyzing HTML with Ollama...' });
      
      try {
        const selectors = await findSelectorsWithOllama(html, validFields, previousSelectors, shouldCleanJSON);
        containerSelector = selectors.containerSelector;
        fieldSelectors = selectors.fields;
        console.log('✅ Ollama suggested:', { containerSelector, fieldCount: Object.keys(fieldSelectors).length });
      } catch (error: any) {
        console.log('❌ Ollama analysis failed:', error.message);
        onProgress?.({ type: 'warning', message: `⚠️ Ollama analysis failed: ${error.message}` });
        allErrors.push({ attempt, error: `Ollama failed: ${error.message}`, type: classifyError(error.message) });
        // Fall back to heuristics
        containerSelector = 'div, article, li, tr';
        validFields.forEach(field => {
          fieldSelectors[field] = `.${field.replace('_', '-')}`;
        });
      }
    }
    
    // Validate container selector exists
    const $ = cheerio.load(html);
    const containers = containerSelector.split(',').map(s => s.trim());
    let matchingContainer = '';
    let matchCount = 0;
    
    for (const container of containers) {
      const count = $(container).length;
      if (count > 0) {
        matchingContainer = container;
        matchCount = count;
        break;
      }
    }
    
    if (!matchingContainer) {
      console.log('❌ No container matches found');
      const error = 'No container matches';
      allErrors.push({ attempt, error, type: 'NO_ITEMS' });
      previousSelectors = { selectors: { containerSelector, fields: fieldSelectors }, error };
      continue;
    }
    
    console.log(`✅ Container "${matchingContainer}" matches ${matchCount} elements`);
    
    // Build scraper code with optional fixes
    console.log('🔨 Building scraper code...');
    onProgress?.({ type: 'info', message: '🔨 Building scraper...' });
    
    const fieldMappings = validFields.map((field: string) => {
      const selector = fieldSelectors[field] || `.${field.replace('_', '-')}`;
      const isUrl = field.includes('url');
      
      // Apply fix: Quote field names with special characters OR if shouldQuoteFields is true
      const fieldKey = (shouldQuoteFields || field.includes('-') || field.includes('_'))
        ? `'${field}'`
        : field;
      
      if (isUrl) {
        return `          ${fieldKey}: $(el).find('${selector}').attr('href') || $(el).find('a').first().attr('href') || '',`;
      } else {
        return `          ${fieldKey}: $(el).find('${selector}').text().trim() || '',`;
      }
    }).join('\n');
    
    const scraperCode = `module.exports = async function(url) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const results = [];
  
  const items = $('${matchingContainer}');
  console.log('Found', items.length, 'items with selector: ${matchingContainer}');
  
  items.each((i, el) => {
    const item = {
${fieldMappings}
    };
    
    // Reject false positives
    const values = Object.values(item).filter(v => v && v.length > 0);
    if (values.length === 0) return;
    
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1 && values.length > 1) {
      console.log('Rejecting item with identical values:', item);
      return;
    }
    
    const hasEcho = Object.entries(item).some(([key, val]) => 
      val && typeof val === 'string' && val.toLowerCase().includes(key.toLowerCase())
    );
    if (hasEcho && values.length < 3) {
      console.log('Rejecting item with field name echo:', item);
      return;
    }
    
    const hasData = values.length >= Math.min(2, Object.keys(item).length / 2);
    if (hasData) results.push(item);
  });
  
  return results;
};`;
    
    console.log('📝 Scraper built, length:', scraperCode.length);
    
    // Test the scraper
    console.log('🧪 Testing scraper...');
    onProgress?.({ type: 'info', message: '🧪 Testing scraper...' });
    
    try {
      const testResponse = await axios.post('http://localhost:3002/run', {
        code: scraperCode,
        args: [url]
      }, { timeout: 30000 });
      
      const testData = testResponse.data;
      
      if (!testData.success) {
        console.log('❌ Test execution failed:', testData.error);
        onProgress?.({ type: 'warning', message: `⚠️ Test failed: ${testData.error}` });
        allErrors.push({ attempt, error: testData.error, type: classifyError(testData.error) });
        previousSelectors = { selectors: { containerSelector: matchingContainer, fields: fieldSelectors }, error: testData.error };
        continue;
      }
      
      const items = testData.result || [];
      console.log(`📊 Test extracted ${items.length} items`);
      
      if (items.length === 0) {
        console.log('❌ No items extracted');
        onProgress?.({ type: 'warning', message: '⚠️ No items extracted' });
        const error = 'Extracted 0 items';
        allErrors.push({ attempt, error, type: 'NO_ITEMS' });
        previousSelectors = { selectors: { containerSelector: matchingContainer, fields: fieldSelectors }, error };
        continue;
      }
      
      // Validate fields
      const firstItem = items[0];
      const missingFields = validFields.filter(field => 
        !firstItem[field] || (typeof firstItem[field] === 'string' && firstItem[field].trim() === '')
      );
      
      const fieldCoverage = ((validFields.length - missingFields.length) / validFields.length * 100).toFixed(0);
      console.log(`📊 Field coverage: ${fieldCoverage}% (${validFields.length - missingFields.length}/${validFields.length})`);
      
      // Track best attempt
      if (items.length > bestAttempt.itemCount || 
         (items.length === bestAttempt.itemCount && missingFields.length < bestAttempt.missingFields?.length)) {
        bestAttempt = {
          code: scraperCode,
          itemCount: items.length,
          missingFields: missingFields,
          fieldCoverage: fieldCoverage,
          sampleItems: items.slice(0, 5), // Store first 5 items for preview
          error: missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : '',
          attempt: attempt,
          firstItem: firstItem
        };
      }
      
      if (missingFields.length === 0) {
        // SUCCESS!
        console.log(`✅ SUCCESS on attempt ${attempt}! All fields validated.`);
        return {
          validated: true,
          code: scraperCode,
          itemCount: items.length,
          attempts: attempt,
          allErrors,
          bestAttempt
        };
      } else {
        // Partial success
        console.log(`⚠️ Partial success: missing ${missingFields.length} fields:`, missingFields);
        onProgress?.({ type: 'warning', message: `⚠️ ${fieldCoverage}% complete - missing: ${missingFields.join(', ')}` });
        previousSelectors = { 
          selectors: { containerSelector: matchingContainer, fields: fieldSelectors }, 
          error: `Missing fields: ${missingFields.join(', ')}`,
          itemCount: items.length,
          missingFields: missingFields
        };
      }
      
    } catch (error: any) {
      console.log('❌ Test error:', error.message);
      onProgress?.({ type: 'warning', message: `⚠️ Test error: ${error.message}` });
      allErrors.push({ attempt, error: error.message, type: classifyError(error.message) });
      previousSelectors = { 
        selectors: { containerSelector: matchingContainer, fields: fieldSelectors }, 
        error: error.message 
      };
    }
  }
  
  // All attempts exhausted
  console.log(`\n❌ All ${MAX_ATTEMPTS} attempts exhausted`);
  console.log('📊 Best attempt:', {
    attempt: bestAttempt.attempt,
    itemCount: bestAttempt.itemCount,
    missingFields: bestAttempt.missingFields?.length || 'N/A'
  });
  
  // Build detailed diagnostics
  const diagnostics = {
    totalAttempts: MAX_ATTEMPTS,
    bestAttemptNumber: bestAttempt.attempt || 0,
    itemsExtracted: bestAttempt.itemCount,
    fieldsWorking: fieldsRequired.length - (bestAttempt.missingFields?.length || fieldsRequired.length),
    fieldsTotal: fieldsRequired.length,
    missingFieldsList: bestAttempt.missingFields || [],
    errorTypes: allErrors.map(e => e.type).filter((v, i, a) => a.indexOf(v) === i),
    lastError: allErrors[allErrors.length - 1]?.error || 'Unknown error',
    suggestions: generateSuggestions(allErrors, bestAttempt)
  };
  
  return {
    validated: false,
    code: bestAttempt.code || '// No valid scraper generated',
    itemCount: bestAttempt.itemCount,
    fieldCoverage: bestAttempt.fieldCoverage || '0',
    missingFields: bestAttempt.missingFields || [],
    sampleItems: bestAttempt.sampleItems || [],
    attempts: MAX_ATTEMPTS,
    allErrors,
    bestAttempt,
    diagnostics  // New detailed diagnostics
  };
}

// Helper function to generate suggestions based on errors
function generateSuggestions(errors: any[], bestAttempt: any): string[] {
  const suggestions: string[] = [];
  
  if (bestAttempt.itemCount === 0) {
    suggestions.push('Container selector may not match any elements. Try inspecting the page structure manually.');
  }
  
  if (bestAttempt.missingFields?.length > 0) {
    suggestions.push(`Missing fields: ${bestAttempt.missingFields.join(', ')}. Use browser DevTools to find correct selectors.`);
  }
  
  const hasParseErrors = errors.some(e => e.type === 'PARSE_ERROR');
  if (hasParseErrors) {
    suggestions.push('HTML parsing issues detected. Site may require JavaScript rendering (try Puppeteer).');
  }
  
  const hasTimeouts = errors.some(e => e.type === 'TIMEOUT');
  if (hasTimeouts) {
    suggestions.push('Timeout issues detected. Site may be slow or blocking scrapers.');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Try using the "Continue Iterating" button to let the AI make another attempt.');
  }
  
  return suggestions;
}

interface AgentRequest {
  task: string;
  config?: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
    tools?: string[];
    context?: string; // Context ID
    sessionId?: string; // Session ID for memory
  };
}

const server = http.createServer(async (req, res) => {
  // CORS headers - allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // GET /contexts - List available contexts and models
  if (req.method === 'GET' && req.url === '/contexts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      contexts: CONTEXT_TEMPLATES,
      models: AVAILABLE_MODELS
    }));
    return;
  }
  
  // GET /vram-info - Get VRAM detection and model recommendations
  if (req.method === 'GET' && req.url === '/vram-info') {
    try {
      const vramInfo = await detectVRAM();
      const recommendations = getModelRecommendations(vramInfo.totalGB);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...vramInfo,
        ...recommendations
      }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // POST /scraper-context - Get enhanced prompt for scraper extension
  if (req.method === 'POST' && req.url === '/scraper-context') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { jsonTemplate } = JSON.parse(body);
        const result = getScraperExtensionContext(jsonTemplate);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          enhancedPrompt: result.enhancedPrompt,
          recommendedModel: result.model.name,
          context: result.context
        }));
      } catch (error: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // POST /test-model - Quick model test
  if (req.method === 'POST' && req.url === '/test-model') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { model, prompt } = JSON.parse(body);
        
        const startTime = Date.now();
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: prompt || 'Say OK',
            stream: false
          })
        });
        
        const data = await response.json();
        const elapsed = Date.now() - startTime;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          response: data.response,
          tokens: data.eval_count || 0,
          timeMs: elapsed
        }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
    return;
  }
  
  // POST /agent-scraper - Intelligent agent that inspects HTML and builds scraper
  if (req.method === 'POST' && req.url === '/agent-scraper') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { config } = JSON.parse(body);
        const url = config.startUrl;
        const fields = config.pageStructures[0]?.fields || [];
        
        console.log(`\n🤖 INTELLIGENT AGENT - Building scraper for: ${url}`);
        console.log(`📊 Config:`, JSON.stringify(config, null, 2));
        console.log(`📊 Fields:`, fields);
        console.log(`📊 Fields to extract: ${fields.map(f => f.name || f.id || 'unnamed').join(', ')}`);
        
        // Set SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        const sendEvent = (type: string, content: string) => {
          res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
        };
        
        sendEvent('token', '🔍 Inspecting HTML structure...\n');
        
        // Build field list for task
        const fieldDescriptions = fields.map((f, i) => {
          const fieldName = f.fieldName || f.name || f.id || `field_${i}`;
          const fieldDesc = f.description || f.label || 'extract this field';
          return `- ${fieldName}: ${fieldDesc}`;
        }).join('\n');
        
        // Build intelligent task for agent
        const task = `You are building a web scraper. Follow ALL steps - do not stop early!

TARGET: ${url}

FIELDS TO EXTRACT:
${fieldDescriptions}

REQUIRED WORKFLOW (COMPLETE ALL STEPS):

STEP 1: Fetch HTML
Use execute_code: const axios = require('axios'); const {data} = await axios.get('${url}'); console.log(data.substring(0, 2000));

STEP 2: Analyze HTML Structure
Look at the HTML output. Find selectors for each field. Look for class names, IDs, tag patterns.

STEP 3: Build Complete Scraper
Use execute_code with this template (modify selectors based on HTML):
\`\`\`javascript
module.exports = async function(url) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  const {data} = await axios.get(url);
  const $ = cheerio.load(data);
  const results = [];
  
  // TODO: Find correct item selector from HTML
  $('.your-item-selector').each((i, el) => {
    results.push({
      ${fields.map(f => `${f.fieldName || 'field'}: $(el).find('.your-selector').text().trim()`).join(',\n      ')}
    });
  });
  
  console.log(JSON.stringify(results, null, 2));
  return results;
};
\`\`\`

STEP 4: Test the Scraper
Use execute_code to run the complete scraper function.

STEP 5: Verify Results
Check if fields have data (not null). If null, go back to Step 2 and find better selectors.

STEP 6: Return Final Code
Once scraper extracts real data, return ONLY the working code in a code block.

🚨 CRITICAL:
- Use JavaScript ONLY (no Python!)
- Use require() not import
- Must complete ALL 6 steps
- Do NOT stop after Step 1!
- The final code MUST extract actual field data`;

        
        // Import agent functions
        const { runAgentTask } = await import('./langchain-agent.js');
        
        // Run the agent with proper config (use Qwen2.5-Coder - better at JS, supports tools!)
        const result = await runAgentTask(task, {
          model: 'qwen2.5-coder:7b',
          context: 'scraper-guide',
          tools: ['execute_code'],
          temperature: 0.1
        }, (progress: any) => {
          if (progress.type === 'llm_token') {
            // Stream individual tokens
            sendEvent('token', progress.token);
          } else if (progress.type === 'llm_start') {
            sendEvent('token', '\n🧠 Thinking...\n');
          } else if (progress.type === 'tool_start') {
            sendEvent('token', `\n\n🛠️ ${progress.message}\n`);
          } else if (progress.type === 'tool_end') {
            const preview = progress.output?.substring(0, 150) || '';
            sendEvent('token', `\n✅ Completed: ${preview}...\n\n`);
          } else if (progress.type === 'llm_end') {
            sendEvent('token', `\n✓ ${progress.message}\n`);
          }
        });
        
        sendEvent('complete', result.output || '(agent returned no output)');
        
        console.log(`\n📤 AGENT RESULT:`, result);
        console.log(`   Success: ${result.success}`);
        console.log(`   Output length: ${result.output?.length || 0}`);
        if (!result.success) {
          console.error(`   Error: ${result.error}`);
        }
        
        res.end();
        
      } catch (error: any) {
        console.error('❌ Agent scraper error:', error);
        console.error('Stack:', error.stack);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message || String(error) })}\n\n`);
        res.end();
      }
    });
    return;
  }
  
  // POST /simple-scraper - Generate scraper without agent (more reliable!)
  if (req.method === 'POST' && req.url === '/simple-scraper') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { config, model } = JSON.parse(body);
        
        // Import dynamically to avoid circular deps
        const { generateScraper } = await import('./simple-scraper-generator.js');
        
        console.log(`\n🚀 SIMPLE SCRAPER GENERATOR (NO AGENT)`);
        const code = await generateScraper(config, model);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          code,
          method: 'simple-generator'
        }));
      } catch (error: any) {
        console.error(`❌ Simple scraper error:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
    return;
  }
  
  // POST /template-scraper - Generate scraper using templates (RECOMMENDED!)
  if (req.method === 'POST' && req.url === '/template-scraper') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { config } = JSON.parse(body);
        
        // Import template generator
        const { generateScraperFromConfig } = await import('./template-generator.js');
        
        console.log(`\n🎯 TEMPLATE SCRAPER GENERATOR`);
        console.log(`   Config: ${config.name}`);
        
        // Progress callback
        const progressCallback = (message: string) => {
          // Could stream progress here if needed
          console.log(`   ${message}`);
        };
        
        const result = await generateScraperFromConfig(config, progressCallback);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: result.success,
          code: result.code,
          template: result.template,
          attempts: result.attempts,
          error: result.error,
          method: 'template-generator'
        }));
      } catch (error: any) {
        console.error(`❌ Template scraper error:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
    return;
  }
  
  if (req.method === 'POST' && req.url === '/agent') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        // Log raw body for debugging
        console.log(`📥 Received body (first 500 chars):`, body.substring(0, 500));
        console.log(`📏 Body length: ${body.length} characters`);
        
        let request: AgentRequest;
        try {
          request = JSON.parse(body);
        } catch (parseError: any) {
          console.error(`❌ JSON Parse Error:`, parseError.message);
          console.error(`❌ Body around error position:`, body.substring(
            Math.max(0, parseError.message.match(/\d+/)?.[0] - 100),
            Math.min(body.length, parseError.message.match(/\d+/)?.[0] + 100)
          ));
          
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: `Invalid JSON: ${parseError.message}`,
            hint: 'Check for unescaped quotes in notes or prompts'
          }));
          return;
        }
        
        if (!request.task) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Missing required field: task' 
          }));
          return;
        }
        
        console.log(`🤖 Running agent task: ${request.task.substring(0, 100)}...`);
        console.log(`⚙️  Config:`, request.config || 'default');
        
        // Extract fieldsRequired from config if present (for scraper tasks)
        let fieldsRequired: string[] = [];
        if (request.config?.pageStructures?.[0]?.fields) {
          fieldsRequired = request.config.pageStructures[0].fields.map(
            (f: any) => f.fieldName || f.name || f.id
          ).filter(Boolean);
          console.log(`📊 Extracted fields: ${fieldsRequired.join(', ')}`);
        }
        
        // Set up SSE for streaming progress
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        
        // Send progress updates
        const sendProgress = (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        
        // Check GPU usage before starting
        const gpuStatus = await checkOllamaGpuUsage();
        sendProgress({ 
          type: 'gpu_status', 
          usingGpu: gpuStatus.usingGpu,
          gpuLayers: gpuStatus.gpuLayers,
          totalLayers: gpuStatus.totalLayers,
          message: gpuStatus.usingGpu 
            ? `✓ GPU ACTIVE (${gpuStatus.gpuLayers}/${gpuStatus.totalLayers} layers)` 
            : '⚠ WARNING: CPU FALLBACK DETECTED'
        });
        
        // Pass fieldsRequired to agent config
        const agentConfig = {
          ...request.config,
          fieldsRequired: fieldsRequired.length > 0 ? fieldsRequired : undefined
        };
        
        // Use validation loop to ensure agent completes the task
        const result = await runAgentWithValidation({
          task: request.task,
          config: agentConfig,
          onProgress: sendProgress,
          maxAttempts: 5
        });
        
        // Send final result
        sendProgress({ type: 'complete', result });
        res.end();
        
        console.log(`✅ Task completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      } catch (error: any) {
        console.error('❌ Agent error:', error);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error.message 
        })}\n\n`);
        res.end();
      }
    });
  } else if (req.method === 'POST' && req.url === '/manual-agent') {
    // Simple manual scraper - bypasses LangChain completely
    console.log('🎯 Manual agent endpoint hit');
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        console.log('📦 Received body:', body.substring(0, 200));
        const { task, config = {} } = JSON.parse(body);
        const { fieldsRequired = [] } = config;
        
        console.log('📥 Manual agent request received');
        console.log('   Task:', task.substring(0, 100));
        console.log('   Fields:', fieldsRequired);
        
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        console.log('✅ Response headers sent');

        // Extract URL from task
        const urlMatch = task.match(/https?:\/\/[^\s]+/);
        if (!urlMatch) {
          console.log('❌ No URL found in task');
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'No URL found in task' })}\n\n`);
          res.end();
          return;
        }
        const url = urlMatch[0];
        console.log('🔗 Extracted URL:', url);
        
        res.write(`data: ${JSON.stringify({ type: 'info', message: `📥 Fetching HTML from ${url}` })}\n\n`);
        console.log('📤 Sent info message');
        
        // Step 1: Fetch HTML directly with axios (not through execute server)
        let html = "";
        try {
          console.log('🌐 Fetching HTML...');
          const response = await axios.get(url, { timeout: 15000 });
          html = response.data;
          console.log(`✅ HTML fetched: ${html.length} chars`);
          res.write(`data: ${JSON.stringify({ type: 'success', message: `✅ HTML fetched (${html.length} chars)` })}\n\n`);
          console.log('📤 Sent success message');
        } catch (error: any) {
          console.log('❌ Fetch error:', error.message);
          res.write(`data: ${JSON.stringify({ type: 'error', error: `Failed to fetch HTML: ${error.message}` })}\n\n`);
          res.end();
          return;
        }
        
        // Step 2: Build simple scraper with multiple common selectors
        console.log('🔨 Building scraper...');
        res.write(`data: ${JSON.stringify({ type: 'info', message: '🔨 Building scraper...' })}\n\n`);
        console.log('📤 Sent building message');
        
        // Extract field names from objects or use strings directly
        const validFields = fieldsRequired
          .map((f: any) => {
            if (typeof f === 'string') return f;
            if (f && typeof f === 'object') return f.fieldName || f.name || f.field;
            return null;
          })
          .filter((f: any) => f && typeof f === 'string');
        console.log('✅ Valid fields:', validFields);
        
        if (validFields.length === 0) {
          console.log('❌ No valid fields provided');
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'No valid fields provided' })}\n\n`);
          res.end();
          return;
        }
        
        const fieldMappings = validFields.map((field: string) => {
          const isUrl = field.includes('url');
          const selector = `.${field.replace('_', '-')}`;
          
          if (isUrl) {
            return `      ${field}: $(el).find('${selector}').attr('href') || $(el).find('a').first().attr('href') || '',`;
          } else {
            return `      ${field}: $(el).find('${selector}').text().trim() || '',`;
          }
        }).join('\n');

        const scraperCode = `module.exports = async function(url) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  const results = [];
  
  // Try multiple common selectors
  const selectors = [
    'div.em-cal-event > div',
    '.event',
    '.calendar-item',
    'article',
    '.item',
    'tr',
    'li'
  ];
  
  for (const selector of selectors) {
    const items = $(selector);
    if (items.length > 0) {
      items.each((i, el) => {
        const item = {
${fieldMappings}
        };
        
        // Only add if at least one field has data
        const hasData = Object.values(item).some(v => v && v.length > 0);
        if (hasData) results.push(item);
      });
      
      if (results.length > 0) break; // Found working selector
    }
  }
  
  return results;
};`;

        console.log('📝 Scraper code built, length:', scraperCode.length);
        console.log('📤 Sending complete message...');
        res.write(`data: ${JSON.stringify({ type: 'complete', output: scraperCode })}\n\n`);
        console.log('✅ Complete message sent');
        res.end();
        console.log('🏁 Response ended');
        
      } catch (error: any) {
        console.error('❌ Manual agent error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
    });
  } else if (req.method === 'POST' && req.url === '/manual-agent-validated') {
    // ITERATIVE WRAPPER with intelligent error correction
    console.log('🎯 Manual agent VALIDATED endpoint hit (with iterative wrapper)');
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { task, config = {} } = JSON.parse(body);
        const { fieldsRequired = [] } = config;
        
        // Set SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        
        const sendProgress = (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        
        // Extract field names from objects or strings
        const validFields = fieldsRequired
          .map((f: any) => {
            if (typeof f === 'string') return f;
            if (f && typeof f === 'object') return f.fieldName || f.name || f.field;
            return null;
          })
          .filter((f: any) => f && typeof f === 'string');
        
        if (validFields.length === 0) {
          sendProgress({ type: 'error', error: 'No valid fields provided' });
          res.end();
          return;
        }
        
        console.log('📥 Validated agent request:', { fields: validFields });
        sendProgress({ type: 'info', message: '📥 Starting iterative validation...' });
        
        // Extract URL from task
        const urlMatch = task.match(/https?:\/\/[^\s\n]+/);
        if (!urlMatch) {
          sendProgress({ type: 'error', error: 'No URL found in task' });
          res.end();
          return;
        }
        const url = urlMatch[0];
        console.log('🔗 URL:', url);
        
        // Fetch HTML once
        console.log('🌐 Fetching HTML...');
        sendProgress({ type: 'info', message: '🌐 Fetching HTML...' });
        const htmlResponse = await axios.get(url, { timeout: 15000 });
        const html = htmlResponse.data;
        console.log(`✅ HTML fetched: ${html.length} chars`);
        sendProgress({ type: 'success', message: `✅ Fetched ${html.length} chars` });
        
        // ITERATIVE WRAPPER LOOP (Supervisor level)
        const MAX_SUPERVISOR_ATTEMPTS = 3;
        let supervisorAttempt = 0;
        let appliedFixes: string[] = [];
        let lastResult: any = null;
        
        while (supervisorAttempt < MAX_SUPERVISOR_ATTEMPTS) {
          supervisorAttempt++;
          console.log(`\n🔄 SUPERVISOR Iteration ${supervisorAttempt}/${MAX_SUPERVISOR_ATTEMPTS}`);
          sendProgress({ 
            type: 'info', 
            message: `🔄 Supervisor iteration ${supervisorAttempt}/${MAX_SUPERVISOR_ATTEMPTS}` 
          });
          
          if (appliedFixes.length > 0) {
            console.log('🔧 Applied fixes:', appliedFixes);
            sendProgress({ 
              type: 'info', 
              message: `🔧 Applying fixes: ${appliedFixes.join(', ')}` 
            });
          }
          
          // Run validation loop (worker level)
          lastResult = await runValidationLoop(
            url,
            html,
            validFields,
            appliedFixes,
            sendProgress
          );
          
          if (lastResult.validated) {
            // SUCCESS!
            console.log(`✅ SUPERVISOR: Validation succeeded on iteration ${supervisorAttempt}`);
            sendProgress({ 
              type: 'complete', 
              output: lastResult.code,
              validated: true,
              attempts: lastResult.attempts,
              supervisorIterations: supervisorAttempt,
              itemCount: lastResult.itemCount,
              sampleItem: lastResult.bestAttempt?.firstItem
            });
            res.end();
            return;
          }
          
          // ANALYZE FAILURE PATTERN
          console.log('📊 SUPERVISOR: Analyzing failure pattern...');
          const pattern = analyzeFailurePattern(lastResult.allErrors);
          console.log('📊 Pattern detected:', pattern);
          
          if (pattern.consistent && supervisorAttempt < MAX_SUPERVISOR_ATTEMPTS) {
            if (pattern.type === 'SYNTAX_ERROR') {
              console.log('🔧 SUPERVISOR: Applying syntax fixes...');
              sendProgress({ 
                type: 'warning', 
                message: '🔧 Detected syntax errors, applying fixes...' 
              });
              if (!appliedFixes.includes('quote-field-names')) {
                appliedFixes.push('quote-field-names');
              }
              continue;  // Retry with fixes
            }
            
            if (pattern.type === 'JSON_PARSE_ERROR') {
              console.log('🔧 SUPERVISOR: Applying JSON cleaning...');
              sendProgress({ 
                type: 'warning', 
                message: '🔧 Detected JSON errors, applying cleaning...' 
              });
              if (!appliedFixes.includes('clean-ollama-json')) {
                appliedFixes.push('clean-ollama-json');
              }
              continue;
            }
            
            if (pattern.type === 'NO_ITEMS') {
              console.log('🔧 SUPERVISOR: Trying alternative selector strategies...');
              sendProgress({ 
                type: 'warning', 
                message: '🔧 Selectors failing, trying alternatives...' 
              });
              if (!appliedFixes.includes('use-alternative-selectors')) {
                appliedFixes.push('use-alternative-selectors');
              }
              continue;
            }
          }
          
          // No fixable pattern or already tried all fixes
          console.log('⚠️ SUPERVISOR: No fixable pattern, returning best attempt');
          sendProgress({ 
            type: 'warning', 
            message: '⚠️ No fixable pattern detected' 
          });
          break;
        }
        
        // Return best attempt after all supervisor iterations
        console.log(`\n❌ SUPERVISOR: All ${MAX_SUPERVISOR_ATTEMPTS} iterations exhausted`);
        sendProgress({ 
          type: 'complete', 
          output: lastResult.code,
          validated: false,
          attempts: lastResult.attempts,
          supervisorIterations: MAX_SUPERVISOR_ATTEMPTS,
          error: `Validation incomplete after ${MAX_SUPERVISOR_ATTEMPTS} supervisor iterations. ${lastResult.bestAttempt?.error || 'No items extracted.'}`,
          itemCount: lastResult.itemCount,
          fieldCoverage: lastResult.fieldCoverage || '0',
          missingFields: lastResult.missingFields || [],
          sampleData: lastResult.sampleItems || [],
          html: html, // Include HTML for refinement
          diagnostics: lastResult.diagnostics || {}, // Include diagnostics
          bestAttempt: {
            attempt: lastResult.bestAttempt?.attempt || 0,
            itemCount: lastResult.itemCount,
            sampleItem: lastResult.bestAttempt?.firstItem
          }
        });
        res.end();
        
      } catch (error: any) {
        console.error('❌ Validated agent error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
    });
  } else if (req.method === 'POST' && req.url === '/manual-agent-refine') {
    // Refine scraper with user feedback
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { 
          originalCode, 
          url, 
          feedback, // Array of { field, issue, notes, correctSelector }
          fieldsRequired,
          html
        } = JSON.parse(body);
        
        console.log('\n🔧 Refining scraper with user feedback');
        console.log('Feedback received for fields:', feedback.map((f: any) => f.field));
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const sendProgress = (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        
        sendProgress({ type: 'info', message: '🔧 Analyzing your feedback...' });
        
        // Extract current container selector from original code
        const containerMatch = originalCode.match(/\$\('([^']+)'\)\.each/);
        const currentContainer = containerMatch ? containerMatch[1] : 'div';
        
        // Build new field selectors based on feedback
        const validFields = fieldsRequired.map((f: any) => 
          typeof f === 'string' ? f : f.fieldName || f.name || f.field
        ).filter((f: string) => f && typeof f === 'string');
        
        const fieldSelectors: Record<string, string> = {};
        
        for (const field of validFields) {
          const feedbackForField = feedback.find((f: any) => f.field === field);
          
          if (feedbackForField?.correctSelector) {
            // User provided correct selector - use it!
            console.log(`✅ Using user-provided selector for "${field}": ${feedbackForField.correctSelector}`);
            fieldSelectors[field] = feedbackForField.correctSelector;
            sendProgress({ 
              type: 'info', 
              message: `✅ Using your selector for "${field}"` 
            });
          } else if (feedbackForField?.notes) {
            // User provided notes but no selector - ask Ollama to find it
            console.log(`🤖 Asking Ollama to find selector for "${field}" with guidance: ${feedbackForField.notes}`);
            sendProgress({ 
              type: 'info', 
              message: `🤖 Asking Ollama to improve "${field}"...` 
            });
            
            try {
              const $ = cheerio.load(html);
              const bodySnippet = $('body').html()?.substring(0, 8000) || '';
              
              const prompt = `You are helping fix a web scraper. A user needs a better CSS selector for a field.

FIELD NAME: ${field}
CURRENT CONTAINER: ${currentContainer}
USER'S FEEDBACK: ${feedbackForField.notes}

HTML STRUCTURE:
${bodySnippet}

Find the correct CSS selector for this field based on the user's description.
The selector should be RELATIVE to the container: ${currentContainer}

Return ONLY the selector between tags:
<selector>.your-selector-here</selector>`;

              const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
                model: 'llama3-groq-tool-use',
                prompt: prompt,
                stream: false,
                temperature: 0.1,
                options: { num_predict: 200 }
              }, { timeout: 30000 });
              
              const responseText = ollamaResponse.data.response || '';
              const selectorMatch = responseText.match(/<selector>(.*?)<\/selector>/);
              
              if (selectorMatch) {
                fieldSelectors[field] = selectorMatch[1].trim();
                console.log(`✅ Ollama suggested: ${fieldSelectors[field]}`);
              } else {
                // Fallback to simple selector
                fieldSelectors[field] = `.${field.replace('_', '-')}`;
                console.log(`⚠️ Ollama failed, using fallback: ${fieldSelectors[field]}`);
              }
            } catch (error: any) {
              console.error(`❌ Ollama failed for "${field}":`, error.message);
              fieldSelectors[field] = `.${field.replace('_', '-')}`;
            }
          } else {
            // No feedback for this field - try to extract from original code
            const fieldMatch = originalCode.match(new RegExp(`['"]${field}['"]:\\s*\\$\\(el\\)\\.find\\('([^']+)'\\)`));
            fieldSelectors[field] = fieldMatch ? fieldMatch[1] : `.${field.replace('_', '-')}`;
          }
        }
        
        console.log('🔨 Building refined scraper...');
        sendProgress({ type: 'info', message: '🔨 Building refined scraper...' });
        
        // Build refined scraper code with updated selectors
        const shouldQuoteFields = false; // Fields already handled
        const fieldMappings = validFields.map((field: string) => {
          const selector = fieldSelectors[field] || `.${field.replace('_', '-')}`;
          const isUrl = field.includes('url');
          
          const fieldKey = (field.includes('-') || field.includes('_'))
            ? `'${field}'`
            : field;
          
          if (isUrl) {
            return `          ${fieldKey}: $(el).find('${selector}').attr('href') || $(el).find('a').first().attr('href') || '',`;
          } else {
            return `          ${fieldKey}: $(el).find('${selector}').text().trim() || '',`;
          }
        }).join('\n');
        
        const refinedCode = `module.exports = async function(url) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const results = [];
  
  const items = $('${currentContainer}');
  console.log('Found', items.length, 'items with selector: ${currentContainer}');
  
  items.each((i, el) => {
    const item = {
${fieldMappings}
    };
    
    // Reject false positives
    const values = Object.values(item).filter(v => v && v.length > 0);
    if (values.length === 0) return;
    
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1 && values.length > 1) {
      console.log('Rejecting item with identical values:', item);
      return;
    }
    
    const hasEcho = Object.entries(item).some(([key, val]) => 
      val && typeof val === 'string' && val.toLowerCase().includes(key.toLowerCase())
    );
    if (hasEcho) {
      console.log('Rejecting item with echo pattern:', item);
      return;
    }
    
    results.push(item);
  });
  
  console.log('Extracted', results.length, 'items');
  return results;
};`;
        
        // Test the refined scraper
        console.log('🧪 Testing refined scraper...');
        sendProgress({ type: 'info', message: '🧪 Testing refined scraper...' });
        
        const testResult = await axios.post('http://localhost:3002/run', {
          code: refinedCode,
          args: [url]
        });
        
        const testData = testResult.data;
        
        if (!testData.success) {
          throw new Error(testData.error);
        }
        
        const items = testData.result || [];
        console.log(`📊 Refined scraper extracted ${items.length} items`);
        
        // Validate field coverage
        if (items.length > 0) {
          const firstItem = items[0];
          const missingFields = validFields.filter((field: string) => 
            !firstItem[field] || (typeof firstItem[field] === 'string' && firstItem[field].trim() === '')
          );
          
          const coverage = ((validFields.length - missingFields.length) / validFields.length * 100).toFixed(0);
          
          console.log(`✅ Field coverage: ${coverage}% (${validFields.length - missingFields.length}/${validFields.length})`);
          if (missingFields.length > 0) {
            console.log(`⚠️ Still missing: ${missingFields.join(', ')}`);
          }
          
          sendProgress({ 
            type: 'complete', 
            output: refinedCode,
            validated: missingFields.length === 0,
            itemCount: items.length,
            fieldCoverage: coverage,
            missingFields: missingFields,
            sampleData: items.slice(0, 5) // Send first 5 rows for preview
          });
        } else {
          sendProgress({ 
            type: 'complete', 
            output: refinedCode,
            validated: false,
            error: 'Refined scraper extracted 0 items',
            itemCount: 0
          });
        }
        
        res.end();
        
      } catch (error: any) {
        console.error('❌ Refinement failed:', error.message);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error.message 
        })}\n\n`);
        res.end();
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
  } else if (req.method === 'GET' && req.url === '/contexts') {
    // List available contexts
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ contexts: listContexts() }));
  } else if (req.method === 'POST' && req.url === '/session/create') {
    // Create new session
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const { context } = JSON.parse(body || '{}');
      const sessionId = agentMemory.createSession(context || 'general');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId, context: context || 'general' }));
    });
  } else if (req.method === 'GET' && req.url?.startsWith('/session/')) {
    // Get session info
    const sessionId = req.url.split('/session/')[1];
    const session = agentMemory.getSession(sessionId);
    if (session) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
    }
  } else if (req.method === 'DELETE' && req.url?.startsWith('/session/')) {
    // Clear session
    const sessionId = req.url.split('/session/')[1];
    agentMemory.clearSession(sessionId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else if (req.method === 'GET' && req.url === '/sessions') {
    // List all sessions
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessions: agentMemory.listSessions() }));
  } else if (req.method === 'GET' && req.url?.startsWith('/trace/')) {
    // Get trace by ID
    const traceId = req.url.split('/')[2];
    try {
      const trace = localTracer.getTrace(traceId);
      if (!trace) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Trace not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trace));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.method === 'GET' && req.url?.startsWith('/traces')) {
    // List recent traces
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const traces = localTracer.listTraces(limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ traces }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.method === 'POST' && req.url === '/scrapers/save') {
    // Save a scraper
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { name, url, code, fields, validated, itemCount } = JSON.parse(body);
        
        // Save to file system
        const fs = await import('fs/promises');
        const path = await import('path');
        const scrapersDir = path.join(process.cwd(), 'saved-scrapers');
        
        // Create directory if it doesn't exist
        try {
          await fs.access(scrapersDir);
        } catch {
          await fs.mkdir(scrapersDir, { recursive: true });
        }
        
        const scraper = {
          id: Date.now().toString(),
          name: name || `Scraper ${Date.now()}`,
          url,
          code,
          fields,
          validated: validated || false,
          itemCount: itemCount || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const filename = path.join(scrapersDir, `${scraper.id}.json`);
        await fs.writeFile(filename, JSON.stringify(scraper, null, 2));
        
        console.log(`💾 Saved scraper: ${scraper.name}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, scraper }));
      } catch (error: any) {
        console.error('❌ Save scraper error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/scrapers/list') {
    // List all saved scrapers
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const scrapersDir = path.join(process.cwd(), 'saved-scrapers');
      
      try {
        await fs.access(scrapersDir);
      } catch {
        // Directory doesn't exist yet
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
      
      const files = await fs.readdir(scrapersDir);
      const scrapers = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(scrapersDir, file), 'utf-8');
          scrapers.push(JSON.parse(content));
        }
      }
      
      // Sort by creation date (newest first)
      scrapers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(scrapers));
    } catch (error: any) {
      console.error('❌ List scrapers error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.method === 'GET' && req.url?.startsWith('/scrapers/')) {
    // Get a specific scraper
    const id = req.url.split('/scrapers/')[1];
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filename = path.join(process.cwd(), 'saved-scrapers', `${id}.json`);
      
      const content = await fs.readFile(filename, 'utf-8');
      const scraper = JSON.parse(content);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(scraper));
    } catch (error: any) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Scraper not found' }));
    }
  } else if (req.method === 'DELETE' && req.url?.startsWith('/scrapers/')) {
    // Delete a scraper
    const id = req.url.split('/scrapers/')[1];
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filename = path.join(process.cwd(), 'saved-scrapers', `${id}.json`);
      
      await fs.unlink(filename);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.method === 'GET' && req.url === '/stats') {
    // Get trace statistics
    try {
      const stats = localTracer.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 LangChain Agent Server STARTED');
  console.log('================================');
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🤖 Agent endpoint: POST http://localhost:${PORT}/agent`);
  console.log(`❤️  Health check: GET http://localhost:${PORT}/health`);
  console.log('');
  console.log('✅ Ready to accept agent tasks!');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down LangChain Agent Server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

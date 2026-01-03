/**
 * Manual Agent Loop
 * Since Ollama models don't properly work with LangChain's ReAct agent,
 * we implement a custom loop that explicitly orchestrates tool calls.
 */

import { ChatOllama } from "@langchain/ollama";
import axios from "axios";

interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
}

export async function runManualAgentLoop(
  task: string,
  config: any,
  onProgress?: (data: any) => void
): Promise<string> {
  const { model = 'llama3-groq-tool-use', temperature = 0.1, fieldsRequired = [] } = config;
  
  const llm = new ChatOllama({
    model,
    temperature,
    baseUrl: "http://localhost:11434",
  });

  const EXECUTE_SERVER = "http://localhost:3002/run";
  const MAX_ITERATIONS = 10;
  
  onProgress?.({ type: 'info', message: `🔁 Starting manual agent loop (max ${MAX_ITERATIONS} iterations)` });
  
  // Step 1: Fetch HTML
  onProgress?.({ type: 'tool_start', tool: 'fetch_html', message: '📥 Step 1: Fetching HTML...' });
  
  const url = task.match(/https?:\/\/[^\s]+/)?.[0];
  if (!url) {
    return "Error: No URL found in task";
  }

  let html = "";
  try {
    const fetchCode = `
const axios = require('axios');
const response = await axios.get('${url}');
console.log(response.data);
`;
    const fetchResponse = await axios.post(EXECUTE_SERVER, { code: fetchCode }, { timeout: 30000 });
    html = fetchResponse.data.output || "";
    
    if (!html || html.includes("Error:")) {
      onProgress?.({ type: 'error', message: '❌ Failed to fetch HTML' });
      return `Error fetching HTML: ${html}`;
    }
    
    onProgress?.({ type: 'tool_end', message: `✅ HTML fetched (${html.length} chars)` });
  } catch (error: any) {
    onProgress?.({ type: 'error', message: `❌ Fetch failed: ${error.message}` });
    return `Error: ${error.message}`;
  }

  // Step 2: Ask LLM to analyze HTML and build selectors
  onProgress?.({ type: 'llm_start', message: '🧠 Step 2: Analyzing HTML structure...' });
  
  const analysisPrompt = `You are a web scraping expert. Analyze this HTML and identify CSS selectors for these fields:
${fieldsRequired.map((f: string) => `- ${f}`).join('\n')}

HTML snippet (first 5000 chars):
\`\`\`html
${html.substring(0, 5000)}
\`\`\`

Your response MUST be ONLY valid JSON in this exact format:
{
  "itemSelector": "CSS selector for each item/event",
  "fields": {
    "fieldName": "CSS selector relative to item"
  }
}

Example:
{
  "itemSelector": "div.event",
  "fields": {
    "time": ".time-class",
    "date": ".date-class",
    "name": "h2.title"
  }
}

NO explanations, NO markdown, ONLY the JSON object:`;

  let selectors: any = null;
  try {
    const analysisResponse = await llm.invoke(analysisPrompt);
    const analysisText = typeof analysisResponse.content === 'string' 
      ? analysisResponse.content 
      : JSON.stringify(analysisResponse.content);
    
    onProgress?.({ type: 'llm_end', message: '✅ Analysis complete' });
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      onProgress?.({ type: 'error', message: '❌ LLM did not return valid JSON' });
      return `Error: LLM response was not valid JSON: ${analysisText}`;
    }
    
    selectors = JSON.parse(jsonMatch[0]);
    onProgress?.({ type: 'info', message: `📋 Selectors identified: ${JSON.stringify(selectors, null, 2)}` });
  } catch (error: any) {
    onProgress?.({ type: 'error', message: `❌ Analysis failed: ${error.message}` });
    return `Error: ${error.message}`;
  }

  // Step 3: Build scraper code
  onProgress?.({ type: 'info', message: '🔨 Step 3: Building scraper...' });
  
  const fieldMappings = fieldsRequired.map((field: string) => {
    const selector = selectors.fields[field] || selectors.fields[field.replace('_', '-')] || `.${field}`;
    const isUrl = field.includes('url');
    
    if (isUrl) {
      return `      ${field}: $(el).find('${selector}').attr('href') || '',`;
    } else {
      return `      ${field}: $(el).find('${selector}').text().trim() || '',`;
    }
  }).join('\n');

  const scraperCode = `
const axios = require('axios');
const cheerio = require('cheerio');

const url = '${url}';
const { data } = await axios.get(url);
const $ = cheerio.load(data);

const results = [];
$('${selectors.itemSelector}').each((i, el) => {
  results.push({
${fieldMappings}
  });
});

console.log(JSON.stringify(results, null, 2));
`;

  // Step 4: Execute scraper
  onProgress?.({ type: 'tool_start', tool: 'execute_scraper', message: '▶️  Step 4: Executing scraper...' });
  
  try {
    const executeResponse = await axios.post(EXECUTE_SERVER, { code: scraperCode }, { timeout: 30000 });
    const output = executeResponse.data.output || "";
    
    if (output.includes("Error:")) {
      onProgress?.({ type: 'error', message: '❌ Scraper execution failed' });
      return output;
    }
    
    // Parse results
    const results = JSON.parse(output);
    onProgress?.({ type: 'tool_end', message: `✅ Scraper executed: ${results.length} items` });
    
    // Step 5: Validate
    if (results.length === 0) {
      onProgress?.({ type: 'warning', message: '⚠️  No items extracted - selectors may be wrong' });
      return `Scraped 0 items. HTML preview:\n${html.substring(0, 1000)}`;
    }
    
    const firstItem = results[0];
    const nullFields = fieldsRequired.filter((f: string) => !firstItem[f] || firstItem[f] === '');
    
    if (nullFields.length > 0) {
      onProgress?.({ type: 'warning', message: `⚠️  Missing fields: ${nullFields.join(', ')}` });
    } else {
      onProgress?.({ type: 'success', message: '✅ All fields extracted successfully!' });
    }
    
    // Return final scraper as module.exports
    const finalCode = `module.exports = async function(url) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  const results = [];
  $('${selectors.itemSelector}').each((i, el) => {
    results.push({
${fieldMappings}
    });
  });
  
  return results;
};`;
    
    return finalCode;
    
  } catch (error: any) {
    onProgress?.({ type: 'error', message: `❌ Execution failed: ${error.message}` });
    return `Error: ${error.message}`;
  }
}

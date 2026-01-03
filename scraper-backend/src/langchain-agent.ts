/**
 * LangChain-powered Agent
 * Replaces the 5,555-line custom agent loop with production-grade orchestration
 */

import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import axios from "axios";
import * as cheerio from "cheerio";
import { getContext, listContexts } from './context-manager.js';
import { agentMemory } from './agent-memory.js';
import { localTracer } from './local-tracer.js';

// Tool 1: Execute Code (via our execute-server)
const executeCodeTool = tool(
  async ({ code }) => {
    try {
      const response = await fetch('http://localhost:3002/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scriptCode: code, 
          targetUrl: '',
          timeout: 30000
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return `Error: ${result.error}\nLogs: ${result.logs?.join('\n') || 'No logs'}`;
      }
      
      // Return data or logs
      if (result.data) {
        return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
      }
      
      return result.logs?.join('\n') || 'Code executed successfully (no output)';
    } catch (error: any) {
      return `Failed to execute code: ${error.message}`;
    }
  },
  {
    name: "execute_code",
    description: `Execute JavaScript/Node.js code. 
    
🚨 CRITICAL: Only JavaScript allowed - NO PYTHON!

Examples that work:
\`\`\`javascript
const axios = require('axios');
const html = await axios.get('https://example.com');
console.log(html.data);
\`\`\`

\`\`\`javascript
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
console.log(await page.title());
await browser.close();
\`\`\`

Always use console.log() to see output!
NO import statements - use require()
NO Python syntax`,
    schema: z.object({
      code: z.string().describe("JavaScript code ONLY (not Python). Must use console.log() for output!")
    })
  }
);

// Tool 2: Fetch URL (simple HTTP GET)
const fetchUrlTool = tool(
  async ({ url }) => {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000,
        maxRedirects: 5
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
      return `Failed to fetch URL: ${error.message}`;
    }
  },
  {
    name: "fetch_url",
    description: "Fetch HTML content from a URL. Returns the raw HTML as a string.",
    schema: z.object({
      url: z.string().url().describe("The URL to fetch")
    })
  }
);

// Tool 3: Search Web (DuckDuckGo HTML parsing - no API key!)
const searchWebTool = tool(
  async ({ query }) => {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const results: Array<{title: string, url: string, snippet: string}> = [];
      
      $('.result').slice(0, 10).each((i, elem) => {
        const title = $(elem).find('.result__title').text().trim();
        let url = $(elem).find('.result__url').attr('href') || '';
        
        // Extract real URL from DuckDuckGo redirect
        if (url.includes('uddg=')) {
          const match = url.match(/uddg=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          }
        }
        
        const snippet = $(elem).find('.result__snippet').text().trim();
        
        if (title && url) {
          results.push({ title, url, snippet });
        }
      });
      
      if (results.length === 0) {
        return 'No results found. Try a different search query.';
      }
      
      return `Found ${results.length} results:\n\n` + 
        results.map((r, i) => 
          `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}\n`
        ).join('\n');
    } catch (error: any) {
      return `Search failed: ${error.message}`;
    }
  },
  {
    name: "search_web",
    description: "Search the web using DuckDuckGo (no API key needed). Returns URLs and snippets. Use this when you need to find websites or information online.",
    schema: z.object({
      query: z.string().describe("The search query")
    })
  }
);

// Tool 4: Test Scraper (GOAL-AWARE VALIDATION)
const testScraperTool = tool(
  async ({ code, targetUrl, fieldsRequired }) => {
    try {
      console.log(`\n🧪 TEST_SCRAPER: Validating scraper code`);
      console.log(`   URL: ${targetUrl}`);
      console.log(`   Required fields: ${fieldsRequired.join(', ')}`);
      
      // 1. Execute the code
      const response = await fetch('http://localhost:3002/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scriptCode: code, 
          targetUrl: targetUrl,
          timeout: 30000
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: result.error || 'Code execution failed',
          logs: result.logs || [],
          suggestion: "Fix syntax errors or runtime issues in your code"
        }, null, 2);
      }
      
      // 2. Parse output as JSON
      let items;
      const output = result.data || result.logs?.join('\n') || '';
      
      try {
        // Try to find JSON in output
        const jsonMatch = output.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          items = JSON.parse(jsonMatch[0]);
        } else {
          items = JSON.parse(output);
        }
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Output is not valid JSON array",
          output: output.substring(0, 300),
          suggestion: "Make sure your code uses: console.log(JSON.stringify(results, null, 2))"
        }, null, 2);
      }
      
      if (!Array.isArray(items)) {
        return JSON.stringify({
          success: false,
          error: "Output must be an array of items",
          output: output.substring(0, 300),
          suggestion: "Your scraper should return: [{field1: value1, field2: value2}, ...]"
        }, null, 2);
      }
      
      if (items.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Scraper extracted 0 items",
          suggestion: "Check your item selector - it's not finding any elements on the page"
        }, null, 2);
      }
      
      // 3. Validate field extraction
      const validation: any = {
        itemCount: items.length,
        fieldsFound: {} as Record<string, boolean>,
        fieldsWithData: {} as Record<string, number>,
        missingFields: [] as string[],
        nullFields: [] as string[]
      };
      
      fieldsRequired.forEach((field: string) => {
        const itemsWithField = items.filter(item => field in item);
        const itemsWithData = items.filter(item => {
          const val = item[field];
          return val !== null && val !== undefined && val !== '';
        });
        
        validation.fieldsFound[field] = itemsWithField.length === items.length;
        validation.fieldsWithData[field] = itemsWithData.length;
        
        if (itemsWithField.length === 0) {
          validation.missingFields.push(field);
        } else if (itemsWithData.length === 0) {
          validation.nullFields.push(field);
        }
      });
      
      // 4. Determine success
      const allFieldsPresent = validation.missingFields.length === 0;
      const allFieldsHaveData = validation.nullFields.length === 0;
      
      if (allFieldsPresent && allFieldsHaveData) {
        const successMsg = {
          success: true,
          message: `✅ SUCCESS! Extracted ${items.length} items with all ${fieldsRequired.length} fields containing data!`,
          validation: validation,
          sampleItem: items[0]
        };
        console.log(`   ✅ Validation PASSED`);
        return JSON.stringify(successMsg, null, 2);
      }
      
      // 5. Provide actionable feedback
      let feedback = `❌ Validation FAILED:\n`;
      feedback += `- Items extracted: ${items.length}\n`;
      
      if (validation.missingFields.length > 0) {
        feedback += `\n🚨 MISSING fields (not in results object): ${validation.missingFields.join(', ')}\n`;
        feedback += `   → Your .push() needs ALL fields: {${fieldsRequired.join(', ')}}\n`;
      }
      
      if (validation.nullFields.length > 0) {
        feedback += `\n🚨 NULL/EMPTY fields: ${validation.nullFields.join(', ')}\n`;
        feedback += `   → These fields exist but have no data (null/empty)\n`;
        feedback += `   → Selectors are wrong or elements don't exist\n`;
        feedback += `   → Use execute_code to inspect HTML and find correct selectors\n`;
      }
      
      const partialFields = Object.entries(validation.fieldsWithData)
        .filter(([field, count]: [string, any]) => count > 0 && count < items.length)
        .map(([field]) => field);
      
      if (partialFields.length > 0) {
        feedback += `\n⚠️ PARTIAL data: ${partialFields.join(', ')}\n`;
        feedback += `   → Some items have data, some don't - selector might be inconsistent\n`;
      }
      
      const result2 = {
        success: false,
        feedback: feedback,
        validation: validation,
        sampleItems: items.slice(0, 2),
        nextStep: "Use execute_code to fetch HTML and inspect the structure to find correct selectors"
      };
      
      console.log(`   ❌ Validation FAILED: ${validation.missingFields.length} missing, ${validation.nullFields.length} null`);
      return JSON.stringify(result2, null, 2);
      
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: `test_scraper failed: ${error.message}`,
        suggestion: "Check if code is valid JavaScript"
      }, null, 2);
    }
  },
  {
    name: "test_scraper",
    description: `🎯 CRITICAL: Test scraper code and validate it extracts ALL required fields with REAL DATA.
    
This tool executes your scraper and checks:
✅ Code runs without errors
✅ Returns array of items (not empty)
✅ Every item has ALL required fields
✅ NO fields are null/empty

YOU MUST call this after building every scraper!
Do NOT finish until this returns success: true`,
    schema: z.object({
      code: z.string().describe("Complete scraper code to test (module.exports = async function...)"),
      targetUrl: z.string().describe("URL to test scraper against"),
      fieldsRequired: z.array(z.string()).describe("List of field names that MUST be extracted with data")
    })
  }
);

// Tool 5: Request User Help
const requestUserHelpTool = tool(
  async ({ question, context, options }) => {
    console.log(`\n❓ AGENT REQUESTING USER HELP`);
    console.log(`   Question: ${question}`);
    console.log(`   Options: ${options.join(', ')}`);
    
    return JSON.stringify({
      status: 'waiting_for_user',
      question: question,
      context: context,
      options: options,
      message: "⏸️ Agent paused - awaiting user response. User will select an option and agent will continue."
    }, null, 2);
  },
  {
    name: "request_user_help",
    description: `Ask user for help when stuck (after 3+ failed attempts to find selectors).

When to use:
- Can't find correct CSS selector after multiple tries
- Multiple similar elements, unclear which contains data
- Ambiguous HTML structure

Provide:
- Specific question about what you're looking for
- 2-4 HTML examples showing possible elements
- Clear options user can choose from

Example: "I can't find the meeting time. Which element contains it?"
Options: ["A: <span class='date'>...</span>", "B: <div class='meta'>2:00 PM</div>", "C: <p class='info'>...</p>"]`,
    schema: z.object({
      question: z.string().describe("Clear, specific question for user (what are you trying to find?)"),
      context: z.string().describe("Relevant HTML snippet(s) showing the issue - helps user understand"),
      options: z.array(z.string()).describe("2-4 concrete choices user can pick from (label each: A, B, C...)")
    })
  }
);

// Tool 6: Validate Scraper Result (legacy - keeping for compatibility)
const validateResultTool = tool(
  async ({ data, schema }) => {
    try {
      const parsed = JSON.parse(data);
      const schemaObj = schema ? JSON.parse(schema) : null;
      
      // Basic validation
      if (!parsed || typeof parsed !== 'object') {
        return 'Invalid: Data must be a JSON object or array';
      }
      
      // Count items
      const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
      
      // Check for empty values
      const hasEmptyValues = JSON.stringify(parsed).includes('null') || 
                              JSON.stringify(parsed).includes('undefined');
      
      // Schema validation (if provided)
      if (schemaObj && schemaObj.required) {
        const missing = schemaObj.required.filter((key: string) => !(key in parsed));
        if (missing.length > 0) {
          return `Missing required fields: ${missing.join(', ')}`;
        }
      }
      
      return `✅ Valid: ${count} items${hasEmptyValues ? ' (some empty values)' : ''}\n${JSON.stringify(parsed, null, 2).slice(0, 200)}...`;
    } catch (error: any) {
      return `❌ Validation error: ${error.message}`;
    }
  },
  {
    name: "validate_result",
    description: "Validate scraped data structure. Use after scraping to check data quality.",
    schema: z.object({
      data: z.string().describe("JSON string of scraped data to validate"),
      schema: z.string().optional().describe("Optional JSON schema with required fields")
    })
  }
);

// Create the agent
export async function createScraperAgent(config: {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  tools?: string[];
  context?: string; // Context ID from agent-contexts.ts
  sessionId?: string; // Session ID for conversation memory
}) {
  const {
    model = 'deepseek-coder:6.7b',
    temperature = 0.1,
    systemPrompt,
    tools: enabledTools,
    context = 'general',
    sessionId
  } = config;
  
  // Load context if specified
  console.log(`\n🔍 CONTEXT DEBUGGING:`);
  console.log(`   Requested context: "${context}"`);
  const contextConfig = getContext(context);
  console.log(`   Context loaded: "${contextConfig.id}" - ${contextConfig.name}`);
  
  const finalSystemPrompt = systemPrompt || contextConfig.systemPrompt;
  const finalTools = enabledTools || contextConfig.tools;
  const finalTemperature = temperature ?? contextConfig.temperature;
  
  console.log(`   Tools enabled: [${finalTools.join(', ')}]`);
  console.log(`   System prompt length: ${finalSystemPrompt.length} chars`);
  console.log(`   First 300 chars of prompt:`);
  console.log(`   "${finalSystemPrompt.substring(0, 300)}..."`);
  console.log(``);
  
  // Check for keyword detection in prompt
  const hasKeywordDetection = finalSystemPrompt.includes('click') && finalSystemPrompt.includes('PUPPETEER');
  console.log(`   ⚠️  Contains keyword detection: ${hasKeywordDetection ? '✅ YES' : '❌ NO'}`);
  if (!hasKeywordDetection) {
    console.log(`   🚨 WARNING: Prompt may not detect dynamic content keywords!`);
  }
  console.log(``);
  
  // Select tools based on config
  const allTools = {
    execute_code: executeCodeTool,
    test_scraper: testScraperTool,
    request_user_help: requestUserHelpTool,
    fetch_url: fetchUrlTool,
    search_web: searchWebTool,
    validate_result: validateResultTool
  };
  
  const selectedTools = finalTools
    .filter(name => name in allTools)
    .map(name => allTools[name as keyof typeof allTools]);
  
  if (selectedTools.length === 0) {
    throw new Error('At least one tool must be enabled');
  }
  
  // Initialize Ollama with GPU-optimized settings
  const llm = new ChatOllama({
    model: model,
    temperature: finalTemperature,
    baseUrl: 'http://localhost:11434',
    // Force 100% GPU acceleration
    numGpu: 999, // Use all available GPU layers
    numThread: 1, // Minimize CPU threads (GPU-only)
    numCtx: 4096, // Context window
    useMMap: false, // Don't use memory mapping (slower on GPU)
    useMlock: true, // Lock memory for faster GPU access
    f16Kv: true, // Use float16 for key/value cache (faster GPU)
  });
  
  // Use context-based system prompt
  const enhancedSystemPrompt = `${finalSystemPrompt}

=== CRITICAL AUTONOMY RULES ===
1. You are AUTONOMOUS - never ask the user to provide information
2. When you find multiple options, PICK ONE yourself (usually the first or most relevant)
3. NEVER say "please provide" or "please select" - make decisions yourself
4. If you're unsure, make an educated guess and proceed
5. In execute_code, ALWAYS end with console.log() or you'll get no output!
6. Chain tools together - use results from one tool as input to another
7. If a tool fails, try a different approach with another tool
8. Keep trying until you succeed - never give up!
9. ONLY respond with plain text when you have the FINAL answer

=== TOOL USAGE EXAMPLES ===

Example 1: Scraping with execute_code
Task: "Get top 5 headlines from Hacker News"
You: Use execute_code with:
  const axios = require('axios');
  const cheerio = require('cheerio');
  const html = (await axios.get('https://news.ycombinator.com')).data;
  const $ = cheerio.load(html);
  const headlines = $('.titleline').slice(0, 5).map((i, el) => $(el).text()).get();
  console.log(headlines);

Example 2: Search then scrape
Task: "Find the latest React documentation"
You: 1. Use search_web with query "React official documentation"
     2. Use fetch_url with the first URL from results
     3. Use execute_code to extract relevant content with cheerio

=== ERROR HANDLING ===
- If fetch_url fails (401, 403, CORS), use execute_code with axios and custom headers
- If you get "no output", you forgot console.log()!
- If a website blocks you, try a different URL from search results`;
  
  // Create ReAct agent (LangGraph's prebuilt agent)
  const agent = createReactAgent({
    llm,
    tools: selectedTools,
    messageModifier: enhancedSystemPrompt,
  });
  
  return agent;
}

// Helper: Run agent with a task (with local tracing)
export async function runAgentTask(
  task: string, 
  config?: Parameters<typeof createScraperAgent>[0],
  onProgress?: (data: any) => void
) {
  console.log(`\n📋 TASK RECEIVED:`);
  console.log(`   Task length: ${task.length} chars`);
  console.log(`   First 500 chars: "${task.substring(0, 500)}..."`);
  
  // Extract fieldsRequired from config if present
  const fieldsRequired = (config as any)?.fieldsRequired;
  if (fieldsRequired && fieldsRequired.length > 0) {
    console.log(`   📊 Required fields: ${fieldsRequired.join(', ')}`);
    
    // Enhance task with structured field information
    task = `${task}

📊 REQUIRED FIELDS (you MUST extract ALL of these):
${fieldsRequired.map((f: string) => `- ${f}`).join('\n')}

🎯 VALIDATION: After building scraper, you MUST call test_scraper with:
- code: your complete scraper code
- targetUrl: the URL you're scraping
- fieldsRequired: ${JSON.stringify(fieldsRequired)}

Do NOT finish until test_scraper returns success: true!`;
  }
  
  // Check if task contains scraper config
  const hasScraperConfig = task.includes('pageStructures') || task.includes('selectorSteps');
  console.log(`   Contains scraper config: ${hasScraperConfig ? '✅ YES' : '❌ NO'}`);
  
  if (hasScraperConfig) {
    // Check for dynamic content keywords
    const hasClick = task.toLowerCase().includes('click');
    const hasPopup = task.toLowerCase().includes('popup');
    const hasModal = task.toLowerCase().includes('modal');
    
    console.log(`   🎯 DYNAMIC CONTENT DETECTION:`);
    console.log(`      - Contains "click": ${hasClick ? '✅' : '❌'}`);
    console.log(`      - Contains "popup": ${hasPopup ? '✅' : '❌'}`);
    console.log(`      - Contains "modal": ${hasModal ? '✅' : '❌'}`);
    
    if (hasClick || hasPopup || hasModal) {
      console.log(`   🚨 SHOULD USE PUPPETEER!`);
    }
  }
  console.log(``);
  
  const agent = await createScraperAgent(config || {});
  const sessionId = config?.sessionId;
  
  const startTime = Date.now();
  const traceId = localTracer.startTrace({
    type: 'agent_task',
    input: task,
    context: config?.context || 'general',
    sessionId: sessionId || null
  });
  
  try {
    onProgress?.({ type: 'step', message: 'Agent initialized, starting task...' });
    
    // Get conversation history if session exists
    const history = sessionId ? agentMemory.getHistory(sessionId) : [];
    
    let llmStartTime = 0;
    let totalTokens = 0;
    let stepCount = 0;
    
    const result = await agent.invoke(
      {
        messages: [...history, { role: "user", content: task }]
      },
      {
        recursionLimit: 25, // Allow up to 25 steps for testing/iteration
        callbacks: [
          {
            handleToolStart: (tool: any, input: string) => {
              stepCount++;
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              onProgress?.({ 
                type: 'tool_start', 
                tool: tool.name,
                message: `Using tool: ${tool.name}`,
                step: stepCount,
                elapsed: elapsed + 's'
              });
              console.log(`🛠️  [${elapsed}s] Step ${stepCount}: Using tool ${tool.name}`);
            },
            handleToolEnd: (output: any) => {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
              onProgress?.({ 
                type: 'tool_end', 
                message: 'Tool completed',
                output: outputStr.substring(0, 150),
                elapsed: elapsed + 's' 
              });
              console.log(`✅ [${elapsed}s] Tool completed: ${outputStr.substring(0, 100)}...`);
            },
            handleLLMStart: () => {
              llmStartTime = Date.now();
              const elapsed = ((llmStartTime - startTime) / 1000).toFixed(1);
              onProgress?.({ 
                type: 'llm_start', 
                message: 'Thinking...',
                elapsed: elapsed + 's' 
              });
              console.log(`🧠 [${elapsed}s] LLM thinking...`);
            },
            handleLLMNewToken: (token: string) => {
              totalTokens++;
              const llmElapsed = (Date.now() - llmStartTime) / 1000;
              const tokensPerSec = llmElapsed > 0 ? (totalTokens / llmElapsed).toFixed(1) : '0';
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              
              onProgress?.({ 
                type: 'llm_token', 
                token: token,
                tokens: totalTokens,
                tokensPerSec: tokensPerSec,
                elapsed: elapsed + 's',
                message: `Generating... ${totalTokens} tokens (${tokensPerSec} tok/s)`
              });
            },
            handleLLMEnd: (output: any) => {
              const llmElapsed = ((Date.now() - llmStartTime) / 1000).toFixed(1);
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              const tokensPerSec = parseFloat(llmElapsed) > 0 ? (totalTokens / parseFloat(llmElapsed)).toFixed(1) : '0';
              
              onProgress?.({ 
                type: 'llm_end', 
                message: `Decision made (${totalTokens} tokens in ${llmElapsed}s @ ${tokensPerSec} tok/s)`,
                tokens: totalTokens,
                tokensPerSec: tokensPerSec,
                elapsed: elapsed + 's'
              });
              console.log(`✓ [${elapsed}s] LLM completed: ${totalTokens} tokens in ${llmElapsed}s (${tokensPerSec} tok/s)`);
              totalTokens = 0; // Reset for next LLM call
            }
          }
        ]
      }
    );
    
    console.log(`\n🎯 AGENT INVOCATION COMPLETE`);
    console.log(`   Result type: ${typeof result}`);
    console.log(`   Result keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
    
    // Extract the final message from the agent
    const messages = result.messages || [];
    console.log(`   Messages count: ${messages.length}`);
    
    const finalMessage = messages[messages.length - 1];
    console.log(`   Final message type: ${finalMessage?.type}`);
    console.log(`   Final message content length: ${finalMessage?.content?.length || 0}`);
    
    const output = finalMessage?.content || 'No output generated';
    
    // 🔍 ANALYZE OUTPUT
    console.log(`\n📤 AGENT OUTPUT ANALYSIS:`);
    console.log(`   Output length: ${output.length} chars`);
    console.log(`   First 500 chars: "${output.substring(0, 500)}..."`);
    
    const containsPython = output.toLowerCase().includes('python') || output.includes('import requests') || output.includes('from bs4');
    const containsJavaScript = output.includes('const') || output.includes('require(') || output.includes('puppeteer');
    const containsBeautifulSoup = output.includes('BeautifulSoup') || output.includes('bs4');
    const containsPuppeteer = output.includes('puppeteer') && output.includes('page.click');
    
    console.log(`   🐍 Contains Python: ${containsPython ? '❌ WRONG!' : '✅'}`);
    console.log(`   📜 Contains JavaScript: ${containsJavaScript ? '✅' : '❌'}`);
    console.log(`   🍜 Uses BeautifulSoup: ${containsBeautifulSoup ? '❌ WRONG!' : '✅'}`);
    console.log(`   🎭 Uses Puppeteer: ${containsPuppeteer ? '✅ CORRECT!' : '❌ Missing'}`);
    
    if (containsPython || containsBeautifulSoup) {
      console.log(`   🚨 ERROR: Agent generated Python despite JavaScript-only instructions!`);
    }
    console.log(``);
    
    const executionTime = Date.now() - startTime;
    
    // Save to memory if session exists
    if (sessionId) {
      agentMemory.addMessage(sessionId, 'user', task);
      agentMemory.addMessage(sessionId, 'assistant', output);
    }
    
    // Complete local trace
    localTracer.endTrace(traceId, {
      success: true,
      output: output,
      executionTime,
      tokenCount: output.length / 4 // Rough estimate
    });
    
    console.log(`📊 Local trace saved: ${traceId}`);
    
    return {
      success: true,
      output: output,
      messages: messages,
      sessionId: sessionId,
      executionTime,
      traceId: traceId
    };
  } catch (error: any) {
    localTracer.endTrace(traceId, {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
    
    return {
      success: false,
      error: error.message,
      output: null,
      executionTime: Date.now() - startTime,
      traceId: traceId
    };
  }
}

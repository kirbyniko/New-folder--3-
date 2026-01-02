/**
 * LangChain-powered Agent
 * Replaces the 5,555-line custom agent loop with production-grade orchestration
 */

import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { AgentExecutor } from "@langchain/langgraph/prebuilt";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { z } from "zod";
import axios from "axios";
import * as cheerio from "cheerio";

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
    description: `Execute Node.js code with pre-loaded axios, cheerio, and puppeteer modules.
CRITICAL: Always end with console.log() to see output!
Both patterns work:
- const axios = require('axios'); // ✅ Works
- await axios.get(url); // ✅ Also works (pre-loaded)

Example: const html = await axios.get('https://example.com'); console.log(html.data);`,
    schema: z.object({
      code: z.string().describe("The Node.js code to execute. Must end with console.log() for output!")
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

// Create the agent
export async function createScraperAgent(config: {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  tools?: string[]; // ['execute_code', 'fetch_url', 'search_web']
}) {
  const {
    model = 'mistral-nemo:12b-instruct-2407-q8_0',
    temperature = 0.3,
    systemPrompt = 'You are a helpful web scraping assistant.',
    tools: enabledTools = ['execute_code', 'fetch_url', 'search_web']
  } = config;
  
  // Select tools based on config
  const allTools = {
    execute_code: executeCodeTool,
    fetch_url: fetchUrlTool,
    search_web: searchWebTool
  };
  
  const selectedTools = enabledTools
    .filter(name => name in allTools)
    .map(name => allTools[name as keyof typeof allTools]);
  
  if (selectedTools.length === 0) {
    throw new Error('At least one tool must be enabled');
  }
  
  // Initialize Ollama
  const llm = new ChatOllama({
    model: model,
    temperature: temperature,
    baseUrl: 'http://localhost:11434',
  });
  
  // Enhanced system prompt with autonomy rules
  const enhancedSystemPrompt = `${systemPrompt}

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
  
  // Create the agent using ReAct pattern
  const agent = createReactAgent({
    llm,
    tools: selectedTools,
    messageModifier: enhancedSystemPrompt,
  });
  
  return agent;
}

// Helper: Run agent with a task
export async function runAgentTask(
  task: string, 
  config?: Parameters<typeof createScraperAgent>[0],
  onProgress?: (data: any) => void
) {
  const agent = await createScraperAgent(config || {});
  
  try {
    onProgress?.({ type: 'step', message: 'Agent initialized, starting task...' });
    
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: task }]
      },
      {
        callbacks: [
          {
            handleToolStart: (tool: any, input: string) => {
              onProgress?.({ 
                type: 'tool_start', 
                tool: tool.name,
                message: `Using tool: ${tool.name}` 
              });
            },
            handleToolEnd: (output: any) => {
              onProgress?.({ 
                type: 'tool_end', 
                message: 'Tool completed',
                output: output.substring(0, 100) 
              });
            },
            handleLLMStart: () => {
              onProgress?.({ 
                type: 'llm_start', 
                message: 'Thinking...' 
              });
            },
            handleLLMEnd: () => {
              onProgress?.({ 
                type: 'llm_end', 
                message: 'Decision made' 
              });
            }
          }
        ]
      }
    );
    
    // Extract the final message from the agent
    const messages = result.messages || [];
    const finalMessage = messages[messages.length - 1];
    const output = finalMessage?.content || 'No output generated';
    
    return {
      success: true,
      output: output,
      messages: messages, // Full conversation for debugging
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      output: null
    };
  }
}

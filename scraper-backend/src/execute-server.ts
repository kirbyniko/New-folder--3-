#!/usr/bin/env node
/**
 * Script Execution Server
 * 
 * Provides HTTP endpoint for executing generated scraper scripts
 * This bypasses browser CSP restrictions by running scripts in Node.js
 */

import http from 'http';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';

const PORT = process.env.EXECUTE_PORT || 3002;

interface ExecuteRequest {
  scriptCode: string;
  targetUrl: string;
  timeout?: number;
}

interface ExecuteResponse {
  success: boolean;
  data?: any;
  error?: string;
  stack?: string;
  logs: string[];
  duration: number;
  requiresJavaScript?: boolean;
  jsDetectionReason?: string;
}

/**
 * Execute a scraper script in isolated context
 */
async function executeScript(req: ExecuteRequest): Promise<ExecuteResponse> {
  const startTime = Date.now();
  const logs: string[] = [];
  
  // Mock console to capture logs
  const mockConsole = {
    log: (...args: any[]) => {
      logs.push(args.map(a => String(a)).join(' '));
      console.log('[SCRIPT]', ...args);
    },
    error: (...args: any[]) => {
      logs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
      console.error('[SCRIPT ERROR]', ...args);
    },
    warn: (...args: any[]) => {
      logs.push('[WARN] ' + args.map(a => String(a)).join(' '));
      console.warn('[SCRIPT WARN]', ...args);
    }
  };
  
  try {
    // Create module context
    const module = { exports: null as any };
    const exports = {};
    
    // Create require function with cheerio, axios, and puppeteer
    const require = (moduleName: string) => {
      if (moduleName === 'cheerio') return cheerio;
      if (moduleName === 'axios') return axios;
      if (moduleName === 'puppeteer') return puppeteer;
      throw new Error(`Module '${moduleName}' not available`);
    };
    
    // Mock analyzeWithAI (extension will need to provide this via API)
    const analyzeWithAI = async (content: string, prompt: string): Promise<string> => {
      logs.push(`[AI] Analyzing content (${content.length} chars) with prompt: ${prompt.substring(0, 100)}...`);
      
      try {
        const response = await axios.post('http://localhost:11434/api/generate', {
          model: 'deepseek-coder:6.7b',
          prompt: `${prompt}\n\nContent:\n${content}`,
          stream: false,
          options: { temperature: 0.3, num_predict: 500 }
        });
        
        return response.data.response.trim();
      } catch (error: any) {
        logs.push(`[AI ERROR] ${error.message}`);
        return '';
      }
    };
    
    // Wrap code in async IIFE if it contains await but no async function wrapper
    let codeToExecute = req.scriptCode;
    const hasAwait = /\bawait\b/.test(codeToExecute);
    const hasAsyncFunction = /async\s+function|async\s*\(/.test(codeToExecute);
    const hasModuleExports = /module\.exports/.test(codeToExecute);
    
    if (hasAwait && !hasAsyncFunction && !hasModuleExports) {
      // Wrap in async IIFE that returns a scraper function
      codeToExecute = `module.exports = async function(url) {\n${codeToExecute}\n};`;
      logs.push('[AUTO-WRAP] Wrapped code in async function');
    }
    
    // Execute the script with controlled context
    const scriptFunc = new Function(
      'module',
      'exports', 
      'require',
      'console',
      'analyzeWithAI',
      codeToExecute
    );
    
    scriptFunc(module, exports, require, mockConsole, analyzeWithAI);
    
    // Get the exported scraper function
    const scraperFunc = module.exports;
    
    if (typeof scraperFunc !== 'function') {
      throw new Error('Script must export a function via module.exports');
    }
    
    // Execute with timeout (90 seconds for Puppeteer scripts)
    const timeout = req.timeout || 90000;
    const result = await Promise.race([
      scraperFunc(req.targetUrl),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Execution timeout (${timeout}ms)`)), timeout)
      )
    ]);
    
    // Detect if page likely needs JavaScript rendering
    let requiresJavaScript = false;
    let jsDetectionReason = '';
    
    if (result && typeof result === 'object') {
      const resultData = result.data || result;
      const dataKeys = Object.keys(resultData);
      const hasNoData = dataKeys.length === 0 || 
                        (result.metadata?.fieldsFound === 0) ||
                        (result.events?.length === 0);
      
      if (hasNoData) {
        logs.push('[JS DETECTION] No data found, checking for JavaScript indicators...');
        // Fetch page to check for JS indicators
        try {
          const pageResponse = await axios.get(req.targetUrl, { timeout: 5000 });
          const html = pageResponse.data;
          
          // Check for common JS framework indicators
          const jsIndicators = [
            { pattern: /<div[^>]+id=["']root["'][^>]*><\/div>/i, reason: 'React root element detected' },
            { pattern: /<div[^>]+id=["']app["'][^>]*><\/div>/i, reason: 'Vue/SPA app element detected' },
            { pattern: /ng-app|ng-controller|\[ng-/i, reason: 'Angular directives detected' },
            { pattern: /<noscript>.*?enable JavaScript.*?<\/noscript>/is, reason: 'NoScript warning found' },
            { pattern: /data-react-|data-reactroot/i, reason: 'React data attributes detected' },
            { pattern: /__NEXT_DATA__|_next\/static/i, reason: 'Next.js detected' },
            { pattern: /_nuxt\/|__NUXT__/i, reason: 'Nuxt.js detected' },
            { pattern: /src=["'][^"']*\.js["'][^>]*defer|async/i, reason: 'Deferred/async JavaScript detected' },
            { pattern: /<script[^>]*>\s*window\./i, reason: 'Window object manipulation detected' }
          ];
          
          for (const indicator of jsIndicators) {
            if (indicator.pattern.test(html)) {
              requiresJavaScript = true;
              jsDetectionReason = indicator.reason;
              logs.push(`[JS DETECTION] ✓ ${jsDetectionReason}`);
              break;
            }
          }
          
          // If still no detection but page is suspiciously small
          if (!requiresJavaScript && html.length < 5000 && hasNoData) {
            requiresJavaScript = true;
            jsDetectionReason = 'Page HTML is suspiciously minimal (< 5KB) with no data found';
            logs.push(`[JS DETECTION] ✓ ${jsDetectionReason}`);
          }
          
          // If STILL no detection but we have empty data, assume JS is needed
          if (!requiresJavaScript && hasNoData) {
            requiresJavaScript = true;
            jsDetectionReason = 'Scraper returned no data - page may require JavaScript rendering';
            logs.push(`[JS DETECTION] ✓ ${jsDetectionReason} (default assumption)`);
          }
        } catch (err) {
          logs.push(`[JS DETECTION] Could not fetch page for analysis: ${err}`);
          // If we can't fetch, but have no data, assume JS needed
          requiresJavaScript = true;
          jsDetectionReason = 'Cannot analyze page, but scraper returned no data - assuming JavaScript required';
        }
      }
    }
    
    return {
      success: true,
      data: result,
      logs,
      duration: Date.now() - startTime,
      requiresJavaScript,
      jsDetectionReason
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      logs,
      duration: Date.now() - startTime
    };
  }
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Only accept POST to /execute, /run, or /fetch-html
  if (req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /execute, /run, or /fetch-html' }));
    return;
  }
  
  // Route: /run - Simple code execution (no scraping context)
  if (req.url === '/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { code, args = [] } = JSON.parse(body);
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: 'Missing required field: code' 
          }));
          return;
        }
        
        console.log(`\n🔧 Executing code (${code.length} chars) with ${args.length} args`);
        const startTime = Date.now();
        const logs: string[] = [];
        
        // Mock console to capture logs
        const mockConsole = {
          log: (...args: any[]) => {
            logs.push(args.map(a => String(a)).join(' '));
            console.log('[CODE]', ...args);
          },
          error: (...args: any[]) => {
            logs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
            console.error('[CODE ERROR]', ...args);
          }
        };
        
        try {
          // Mock require for axios, cheerio, puppeteer
          const mockRequire = (moduleName: string) => {
            if (moduleName === 'axios') return axios;
            if (moduleName === 'cheerio') return cheerio;
            if (moduleName === 'puppeteer') return puppeteer;
            throw new Error(`Module '${moduleName}' not available. Supported: axios, cheerio, puppeteer`);
          };
          
          // Create mock module.exports for code that uses module.exports pattern
          const mockModule = { exports: {} };
          
          // Execute the code to define the function (handles module.exports pattern)
          const wrappedCode = `
            return (async function(module, exports, require, console) {
              ${code}
              return module.exports;
            })(module, module.exports, require, console);
          `;
          
          const scriptFunc = new Function('module', 'require', 'console', wrappedCode);
          const exportedFunc = await scriptFunc(mockModule, mockRequire, mockConsole);
          
          // If code exported a function, call it with args
          let result;
          if (typeof exportedFunc === 'function') {
            console.log(`📞 Calling exported function with ${args.length} arguments`);
            result = await exportedFunc(...args);
          } else {
            // Code didn't export a function, return whatever it returned/exported
            result = exportedFunc;
          }
          
          const duration = Date.now() - startTime;
          console.log(`✅ Code executed successfully in ${duration}ms, extracted ${Array.isArray(result) ? result.length : 0} items`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            result: result,
            logs: logs,
            duration: duration
          }));
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error('❌ Code execution failed:', error);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
            logs: logs,
            duration: duration
          }));
        }
      } catch (error: any) {
        console.error('❌ Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          logs: []
        }));
      }
    });
    return;
  }
  
  // Route to appropriate handler
  if (req.url === '/fetch-html') {
    // Simple HTML fetcher for providing context to LLM
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        console.log('📥 /fetch-html received body:', body);
        const parsed = JSON.parse(body);
        console.log('📦 Parsed JSON:', parsed);
        const { url } = parsed;
        if (!url) {
          console.log('❌ Missing url in request:', parsed);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter', received: parsed }));
          return;
        }
        
        console.log(`🌐 Fetching HTML from: ${url}`);
        const response = await axios.get(url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        console.log(`✅ Fetched ${response.data.length} chars from ${url}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, html: response.data }));
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
  
  if (req.url !== '/execute') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /execute, /run, or /fetch-html' }));
    return;
  }
  
  // Parse request body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const request: ExecuteRequest = JSON.parse(body);
      
      // Validate request
      if (!request.scriptCode || !request.targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: 'Missing scriptCode or targetUrl' 
        }));
        return;
      }
      
      console.log(`\n🔧 Executing script for: ${request.targetUrl}`);
      
      // Execute the script
      const result = await executeScript(request);
      
      console.log(`${result.success ? '✅' : '❌'} Execution ${result.success ? 'succeeded' : 'failed'} in ${result.duration}ms`);
      
      // Send response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      
    } catch (error: any) {
      console.error('❌ Server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false,
        error: error.message,
        logs: []
      }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Script Execution Server`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`   Endpoint: POST /execute`);
  console.log(`   Ready to execute scraper scripts!\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down execution server...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down execution server...');
  server.close(() => process.exit(0));
});

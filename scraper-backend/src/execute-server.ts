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
  
  // Mock console.log to capture logs
  const mockConsole = {
    log: (...args: any[]) => {
      logs.push(args.map(a => String(a)).join(' '));
      console.log('[SCRIPT]', ...args);
    }
  };
  
  try {
    // Create module context
    const module = { exports: null as any };
    const exports = {};
    
    // Create require function with cheerio and axios
    const require = (moduleName: string) => {
      if (moduleName === 'cheerio') return cheerio;
      if (moduleName === 'axios') return axios;
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
    
    // Execute the script with controlled context
    const scriptFunc = new Function(
      'module',
      'exports', 
      'require',
      'console',
      'analyzeWithAI',
      req.scriptCode
    );
    
    scriptFunc(module, exports, require, mockConsole, analyzeWithAI);
    
    // Get the exported scraper function
    const scraperFunc = module.exports;
    
    if (typeof scraperFunc !== 'function') {
      throw new Error('Script must export a function via module.exports');
    }
    
    // Execute with timeout
    const timeout = req.timeout || 30000;
    const result = await Promise.race([
      scraperFunc(req.targetUrl),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Execution timeout (${timeout}ms)`)), timeout)
      )
    ]);
    
    return {
      success: true,
      data: result,
      logs,
      duration: Date.now() - startTime
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
  
  // Only accept POST to /execute
  if (req.method !== 'POST' || req.url !== '/execute') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /execute' }));
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

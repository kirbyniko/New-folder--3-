/**
 * LangChain Agent API Server
 * Exposes the LangChain agent via HTTP for the frontend to use
 */

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createScraperAgent, runAgentTask } from './langchain-agent.js';
import { listContexts } from './agent-contexts.js';
import { agentMemory } from './agent-memory.js';
import { localTracer } from './local-tracer.js';
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
        
        const result = await runAgentTask(request.task, request.config, sendProgress);
        
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

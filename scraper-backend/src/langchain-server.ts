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
  
  if (req.method === 'POST' && req.url === '/agent') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const request: AgentRequest = JSON.parse(body);
        
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

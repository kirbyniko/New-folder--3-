/**
 * LangChain Agent API Server
 * Exposes the LangChain agent via HTTP for the frontend to use
 */

import http from 'http';
import { createScraperAgent, runAgentTask } from './langchain-agent.js';
import { listContexts } from './agent-contexts.js';
import { agentMemory } from './agent-memory.js';

const PORT = process.env.LANGCHAIN_PORT || 3003;

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

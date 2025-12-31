#!/usr/bin/env node
/**
 * Unified API Server
 * 
 * Provides:
 * 1. Script execution (bypasses CSP)
 * 2. Scraper config storage (PostgreSQL)
 * 3. RAG memory storage (PostgreSQL)
 * 4. Template management
 */

import http from 'http';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.API_PORT || 3001;
const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'civitracker',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connected');
}).catch(err => {
  console.warn('⚠️  Database not available - running in offline mode');
  console.warn('   Scrapers will work but won\'t be saved to database');
});

/**
 * Execute Script (from execute-server.ts)
 */
async function executeScript(scriptCode: string, targetUrl: string): Promise<any> {
  const startTime = Date.now();
  const logs: string[] = [];
  
  const mockConsole = {
    log: (...args: any[]) => {
      logs.push(args.map(a => String(a)).join(' '));
    }
  };
  
  try {
    const module = { exports: null as any };
    const exports = {};
    
    const require = (moduleName: string) => {
      if (moduleName === 'cheerio') return cheerio;
      if (moduleName === 'axios') return axios;
      if (moduleName === 'puppeteer') return puppeteer;
      throw new Error(`Module '${moduleName}' not available`);
    };
    
    const analyzeWithAI = async (content: string, prompt: string): Promise<string> => {
      try {
        const response = await axios.post('http://localhost:11434/api/generate', {
          model: 'qwen2.5-coder:14b',
          prompt: `${prompt}\n\nContent:\n${content}`,
          stream: false,
          options: { temperature: 0.3, num_predict: 500 }
        });
        return response.data.response.trim();
      } catch {
        return '';
      }
    };
    
    const scriptFunc = new Function(
      'module', 'exports', 'require', 'console', 'analyzeWithAI',
      scriptCode
    );
    
    scriptFunc(module, exports, require, mockConsole, analyzeWithAI);
    
    const scraperFunc = module.exports;
    if (typeof scraperFunc !== 'function') {
      throw new Error('Script must export a function');
    }
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Execution timeout')), 90000)
    );
    
    const result = await Promise.race([
      scraperFunc(targetUrl),
      timeoutPromise
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
      logs,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Database Schema Initialization
 */
async function initDatabase() {
  try {
    // Scraper configs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scraper_configs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        template_name VARCHAR(255),
        fields JSONB NOT NULL,
        ai_fields JSONB,
        script_code TEXT,
        test_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        steps JSONB NOT NULL,
        storage JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // RAG episodes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rag_episodes (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255),
        template_type VARCHAR(255),
        url TEXT,
        success BOOLEAN,
        script TEXT,
        test_result JSONB,
        diagnosis JSONB,
        embedding FLOAT8[],
        summary TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // RAG domain concepts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rag_domain_concepts (
        domain VARCHAR(255) PRIMARY KEY,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        common_selectors JSONB,
        common_tools JSONB,
        common_issues JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Database schema initialized');
  } catch (error: any) {
    console.warn('⚠️  Database schema initialization failed:', error.message);
  }
}

initDatabase();

/**
 * API Handlers
 */
type Handler = (req: http.IncomingMessage, res: http.ServerResponse, body: any) => Promise<void>;

const handlers: Record<string, Handler> = {
  
  // Execute scraper script
  '/api/execute': async (req, res, body) => {
    const result = await executeScript(body.scriptCode, body.targetUrl);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  },
  
  // Save scraper config  
  'POST /api/scrapers': async (req, res, body) => {
      try {
        const { name, url, templateName, fields, aiFields, scriptCode, testResult } = body;
        
        const result = await pool.query(`
          INSERT INTO scraper_configs (name, url, template_name, fields, ai_fields, script_code, test_result)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, created_at
        `, [name, url, templateName, fields, aiFields, scriptCode, testResult]);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          id: result.rows[0].id,
          created_at: result.rows[0].created_at
        }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
  },
  
  // Update scraper
  'PUT /api/scrapers/:id': async (req, res, body) => {
      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const id = url.pathname.split('/').pop();
        
        const { name, url: scraperUrl, templateName, fields, aiFields, scriptCode, testResult } = body;
        
        await pool.query(`
          UPDATE scraper_configs 
          SET name = $1, url = $2, template_name = $3, fields = $4, 
              ai_fields = $5, script_code = $6, test_result = $7, updated_at = NOW()
          WHERE id = $8
        `, [name, scraperUrl, templateName, fields, aiFields, scriptCode, testResult, id]);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
  },
  
  // List all scrapers
  'GET /api/scrapers/list': async (req, res, body) => {
      try {
        const result = await pool.query(`
          SELECT id, name, url, template_name, fields, ai_fields, created_at, updated_at
          FROM scraper_configs
        ORDER BY updated_at DESC
      `);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ scrapers: result.rows }));
    } catch (error: any) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ scrapers: [] }));
    }
  },
  
  // Delete scraper
  '/api/scrapers/:id/delete': {
    'DELETE': async (req, res, body) => {
      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const id = url.pathname.split('/')[3];
        
        await pool.query('DELETE FROM scraper_configs WHERE id = $1', [id]);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
  },
  
  // Templates endpoint
  '/api/templates': async (req, res, body) => {
    if (req.method === 'GET') {
      try {
        const result = await pool.query(`
          SELECT id, name, description, steps, storage, created_at
          FROM templates
          ORDER BY name
        `);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ templates: result.rows }));
      } catch (error: any) {
        console.error('❌ GET /api/templates error:', error.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ templates: [] }));
      }
    } else if (req.method === 'POST') {
      try {
        const { name, description, steps, storage } = body;
        
        const result = await pool.query(`
          INSERT INTO templates (name, description, steps, storage)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (name) DO UPDATE 
          SET description = $2, steps = $3, storage = $4
          RETURNING id
        `, [name, description, steps, storage]);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: result.rows[0].id }));
      } catch (error: any) {
        console.error('❌ POST /api/templates error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
  },
  
  // Save RAG episode
  'POST /api/rag/episode': async (req, res, body) => {
      try {
        const { domain, templateType, url, success, script, testResult, diagnosis, embedding, summary } = body;
        
        await pool.query(`
          INSERT INTO rag_episodes (domain, template_type, url, success, script, test_result, diagnosis, embedding, summary)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [domain, templateType, url, success, script, testResult, diagnosis, embedding, summary]);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        console.error('❌ POST /api/rag/episode error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
  },
  
  // Get RAG episodes
  'GET /api/rag/episodes': async (req, res, body) => {
      try {
        const result = await pool.query(`
          SELECT domain, template_type, url, success, test_result, diagnosis, summary, created_at
          FROM rag_episodes
          ORDER BY created_at DESC
          LIMIT 200
        `);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ episodes: result.rows }));
      } catch (error: any) {
        console.error('❌ GET /api/rag/episodes error:', error.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ episodes: [] }));
      }
  }
};

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse body
  let body = '';
  req.on('data', chunk => body += chunk);
  await new Promise(resolve => req.on('end', resolve));
  
  const parsedBody = body ? JSON.parse(body) : {};
  
  // Route to handler
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';
  
  // Try "METHOD /path" format first
  let handler = handlers[`${method} ${path}`];
  
  // Try plain path (for handlers that handle multiple methods internally)
  if (!handler) {
    handler = handlers[path];
  }
  
  // Pattern match (for :id routes)
  if (!handler) {
    for (const [pattern, h] of Object.entries(handlers)) {
      const cleanPattern = pattern.replace(/^(GET|POST|PUT|DELETE) /, '');
      if (cleanPattern.includes(':id')) {
        const regex = new RegExp('^' + cleanPattern.replace(':id', '\\d+') + '$');
        if (regex.test(path)) {
          // Check if pattern includes method prefix
          if (pattern.startsWith(method + ' ') || !pattern.match(/^(GET|POST|PUT|DELETE) /)) {
            handler = h;
            break;
          }
        }
      }
    }
  }
  
  if (handler) {
    try {
      await handler(req, res, parsedBody);
    } catch (error: any) {
      console.error(`❌ ${method} ${path} error:`, error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    console.warn(`⚠️  ${method} ${path} not found`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log('   Endpoints:');
  console.log('   - POST /api/execute - Execute scraper script');
  console.log('   - POST /api/scrapers - Save scraper config');
  console.log('   - PUT  /api/scrapers/:id - Update scraper');
  console.log('   - GET  /api/scrapers/list - List all scrapers');
  console.log('   - DELETE /api/scrapers/:id/delete - Delete scraper');
  console.log('   - GET  /api/templates - Get templates');
  console.log('   - POST /api/templates - Save template');
  console.log('   - POST /api/rag/episode - Save RAG episode');
  console.log('   - GET  /api/rag/episodes - Get RAG episodes\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close(() => pool.end(() => process.exit(0)));
});

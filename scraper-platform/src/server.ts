import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/client.js';
import { ScraperEngine } from './engine/scraper-engine.js';
import { ScraperConfig } from './types.js';
import { HybridScraperExecutor } from './llm/hybrid-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Singleton executor instance for script caching
const hybridExecutor = new HybridScraperExecutor();

// Log streaming for execution monitoring
const executionClients = new Map<number, Response[]>();
const executionLogs = new Map<number, Array<{ timestamp: string; level: string; message: string }>>();

export function broadcastLog(scraperId: number, level: string, message: string) {
  const timestamp = new Date().toISOString();
  const log = { timestamp, level, message };
  
  // Store log
  if (!executionLogs.has(scraperId)) {
    executionLogs.set(scraperId, []);
  }
  executionLogs.get(scraperId)!.push(log);
  
  // Broadcast to connected clients
  const clients = executionClients.get(scraperId) || [];
  const data = `data: ${JSON.stringify(log)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(data);
    } catch (err) {
      // Client disconnected
    }
  });
  
  // Also log to console
  const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[level] || '📝';
  console.log(`${emoji} [Scraper ${scraperId}] ${message}`);
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/examples', express.static(path.join(__dirname, '../examples')));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time execution logs
app.get('/api/scrapers/:id/logs', (req: Request, res: Response) => {
  const scraperId = parseInt(req.params.id);
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Register client
  if (!executionClients.has(scraperId)) {
    executionClients.set(scraperId, []);
  }
  executionClients.get(scraperId)!.push(res);
  
  // Send existing logs
  const logs = executionLogs.get(scraperId) || [];
  logs.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });
  
  // Handle client disconnect
  req.on('close', () => {
    const clients = executionClients.get(scraperId) || [];
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

// Check Ollama status
app.get('/api/ollama/status', async (req: Request, res: Response) => {
  try {
    const { OllamaClient } = await import('./llm/ollama-client.js');
    const ollama = new OllamaClient();
    
    const isAvailable = await ollama.checkAvailability();
    const models = await ollama.listModels();
    
    res.json({
      available: isAvailable,
      models: models,
      recommended: 'deepseek-coder:6.7b',
      installCommand: 'ollama pull deepseek-coder:6.7b'
    });
  } catch (error: any) {
    res.json({
      available: false,
      error: error.message,
      help: 'Install Ollama from https://ollama.ai/ and run: ollama serve'
    });
  }
});

// List all scrapers
app.get('/api/scrapers', async (req: Request, res: Response) => {
  try {
    const scrapers = await db.listScrapers();
    res.json(scrapers);
  } catch (error: any) {
    console.error('Error fetching scrapers:', error.message);
    res.status(500).json({ 
      error: error.message,
      hint: 'Make sure PostgreSQL is running and the scraper_platform database exists'
    });
  }
});

// Get scraper by ID
app.get('/api/scrapers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const scraper = await db.getScraper(id);
    
    if (!scraper) {
      return res.status(404).json({ error: 'Scraper not found' });
    }
    
    res.json(scraper);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export scraper configuration
app.get('/api/scrapers/:id/export', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const config = await db.exportScraper(id);
    
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import scraper
app.post('/api/scrapers/import', async (req: Request, res: Response) => {
  try {
    const config: ScraperConfig = req.body;
    const scraperId = await db.importScraper(config);
    
    res.json({ 
      success: true, 
      scraperId,
      message: `Imported scraper: ${config.name}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// BUILDER TEMPLATES API
// ========================================

// Get all builder templates
app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const result = await db.pool.query(`
      SELECT id, name, description, category, steps, created_at, updated_at
      FROM builder_templates
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get template by ID
app.get('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.pool.query(`
      SELECT * FROM builder_templates WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create builder template
app.post('/api/templates', async (req: Request, res: Response) => {
  try {
    const { name, description, category, steps, storage } = req.body;
    
    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Name and steps are required' });
    }
    
    const result = await db.pool.query(`
      INSERT INTO builder_templates (name, description, category, steps, storage_config)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, created_at
    `, [
      name,
      description || '',
      category || 'custom',
      JSON.stringify(steps),
      JSON.stringify(storage || {})
    ]);
    
    res.json({
      success: true,
      template: result.rows[0],
      message: `Created template: ${name}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update builder template
app.put('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, category, steps, storage } = req.body;
    
    const result = await db.pool.query(`
      UPDATE builder_templates
      SET name = $1, description = $2, category = $3, steps = $4, storage_config = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, name, updated_at
    `, [name, description, category, JSON.stringify(steps), JSON.stringify(storage), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      success: true,
      template: result.rows[0],
      message: `Updated template: ${name}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete builder template
app.delete('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.pool.query(`
      DELETE FROM builder_templates WHERE id = $1 RETURNING name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      success: true,
      message: `Deleted template: ${result.rows[0].name}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// SCRAPERS API
// ========================================

// Create/Update scraper
app.post('/api/scrapers', async (req: Request, res: Response) => {
  try {
    const config: ScraperConfig = req.body;
    const scraperId = await db.importScraper(config);
    
    res.json({ 
      success: true, 
      scraperId,
      message: `Saved scraper: ${config.name}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete scraper
app.delete('/api/scrapers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.deleteScraper(id);
    
    res.json({ success: true, message: 'Scraper deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run scraper (hybrid mode: generic engine → LLM fallback)
app.post('/api/scrapers/:id/run', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const options = req.body || {};
    const useHybrid = options.hybrid !== false; // Default to hybrid mode
    
    // Load config
    const config = await db.exportScraper(id);
    
    if (useHybrid) {
      // Use singleton hybrid executor (generic → LLM fallback with caching)
      
      // Run in background with detailed logging
      hybridExecutor.execute(config, id).then(result => {
        console.log(`✅ [Scraper ${id}] Execution completed:`, {
          scraper: config.name,
          mode: result.executionMode,
          items: result.itemCount,
          duration: `${Math.round(result.duration / 1000)}s`,
          success: result.success
        });
        
        if (result.executionMode === 'llm-generated') {
          console.log(`🤖 [Scraper ${id}] LLM generated custom script`);
        } else if (result.executionMode === 'cached-script') {
          console.log(`⚡ [Scraper ${id}] Used cached script (instant execution)`);
        }
      }).catch(err => {
        console.error(`❌ [Scraper ${id}] Execution failed:`, {
          scraper: config.name,
          error: err.message
        });
      });
      
      res.json({ 
        success: true, 
        message: `Scraper "${config.name}" started in hybrid mode`,
        scraperId: id,
        mode: 'hybrid',
        details: {
          scraper: config.name,
          jurisdiction: config.jurisdiction,
          pageStructures: config.pageStructures?.length || 0,
          fields: config.pageStructures?.reduce((sum, ps) => sum + (ps.fields?.length || 0), 0) || 0
        }
      });
    } else {
      // Use generic engine only
      const engine = new ScraperEngine(config, {
        headless: options.headless !== false,
        maxPages: options.maxPages || 10,
        saveToDatabase: options.save !== false,
        verbose: false
      });
      
      // Run in background
      engine.run().catch(err => {
        console.error(`Error running scraper ${id}:`, err);
      });
      
      res.json({ 
        success: true, 
        message: 'Scraper started (generic mode only)',
        scraperId: id
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get scraper runs
app.get('/api/scrapers/:id/runs', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db['pool'].query(
      `SELECT * FROM scraper_runs 
       WHERE scraper_id = $1 
       ORDER BY started_at DESC 
       LIMIT 50`,
      [id]
    );
    
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get scraped data
app.get('/api/scrapers/:id/data', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const { rows } = await db['pool'].query(
      `SELECT * FROM scraped_data 
       WHERE scraper_id = $1 
       ORDER BY scraped_at DESC 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all scraped data (with pagination)
app.get('/api/data', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const scraperId = req.query.scraperId ? parseInt(req.query.scraperId as string) : null;
    
    let query = `SELECT sd.*, s.name as scraper_name 
                 FROM scraped_data sd 
                 JOIN scrapers s ON sd.scraper_id = s.id`;
    const params: any[] = [];
    
    if (scraperId) {
      query += ` WHERE scraper_id = $1`;
      params.push(scraperId);
      query += ` ORDER BY scraped_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY scraped_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }
    
    const { rows } = await db['pool'].query(query, params);
    
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Scripts Management API =====
// List all cached scripts
app.get('/api/scripts', async (req: Request, res: Response) => {
  try {
    const scripts = hybridExecutor.getAllCachedScripts();
    
    // Enrich with scraper names
    const enriched = await Promise.all(scripts.map(async (script) => {
      try {
        const config = await db.exportScraper(script.scraperId);
        return {
          ...script,
          scraperName: config.name,
          jurisdiction: config.jurisdiction
        };
      } catch (err) {
        return {
          ...script,
          scraperName: `Scraper ${script.scraperId}`,
          jurisdiction: 'Unknown'
        };
      }
    }));
    
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get execution details for a scraper
app.get('/api/scrapers/:id/execution-details', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const details = hybridExecutor.getExecutionDetails(id);
    
    if (!details) {
      return res.status(404).json({ error: 'No execution data available. Run the scraper first!' });
    }
    
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific script
app.get('/api/scripts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const script = hybridExecutor.getCachedScript(id);
    
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    
    const config = await db.exportScraper(id);
    res.json({
      ...script,
      scraperName: config.name,
      jurisdiction: config.jurisdiction
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete cached script
app.delete('/api/scripts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    hybridExecutor.deleteCachedScript(id);
    
    res.json({ success: true, message: 'Script deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Scraper Platform API running on http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Scrapers API: http://localhost:${PORT}/api/scrapers`);
});

// Prevent premature exit
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server');
  server.close(() => process.exit(0));
});

export default app;

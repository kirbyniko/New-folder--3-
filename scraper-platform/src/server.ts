import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/client.js';
import { ScraperEngine } from './engine/scraper-engine.js';
import { ScraperConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
      // Use hybrid executor (generic → LLM fallback)
      const { HybridScraperExecutor } = await import('./llm/hybrid-executor.js');
      const executor = new HybridScraperExecutor();
      
      // Run in background
      executor.execute(config, id).then(result => {
        console.log(`✅ Scraper ${id} completed:`, {
          mode: result.executionMode,
          items: result.itemCount,
          duration: `${Math.round(result.duration / 1000)}s`
        });
      }).catch(err => {
        console.error(`❌ Scraper ${id} failed:`, err.message);
      });
      
      res.json({ 
        success: true, 
        message: 'Scraper started (hybrid mode: generic engine → LLM fallback)',
        scraperId: id
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

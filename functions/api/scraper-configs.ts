/**
 * API endpoint for managing scraper configurations
 * Uses Neon HTTP API for Cloudflare Workers compatibility (no TCP connections)
 */

interface ScraperConfig {
  id?: string;
  name: string;
  description?: string;
  startUrl: string;
  fields: Record<string, any>;
  aiFields?: Record<string, any>;
  storage?: {
    eventType?: string;
    scraperSource?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Parse Neon connection string to extract API components
function parseNeonUrl(connectionString: string) {
  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+?)(\?|$)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  
  const [, username, password, host, database] = match;
  const projectId = host.split('.')[0].split('-').slice(-1)[0]; // Extract from ep-xxx-xxx-adlutkdw
  
  return { username, password, host, database, projectId };
}

// Execute SQL query via Neon HTTP API
async function query(connectionString: string, sql: string, params: any[] = []) {
  const { host, database, username, password } = parseNeonUrl(connectionString);
  
  // Neon HTTP API endpoint (remove pooler suffix and use direct endpoint)
  const directHost = host.replace('-pooler', '');
  const apiUrl = `https://${directHost}/sql`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': connectionString,
      'Neon-Raw-Text-Output': 'true',
      'Neon-Array-Mode': 'false'
    },
    body: JSON.stringify({
      query: sql,
      params: params
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Database query failed: ${error}`);
  }
  
  const result = await response.json();
  return result.rows || [];
}

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Temporary hardcoded connection string for testing
  const DATABASE_URL = env.DATABASE_URL || 'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET - List all scraper configs
    if (request.method === 'GET') {
      const rows = await query(DATABASE_URL, 
        'SELECT id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at FROM scraper_configs ORDER BY updated_at DESC'
      );
      
      const configs = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        startUrl: row.start_url,
        fields: row.fields,
        aiFields: row.ai_fields,
        storage: row.storage,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      return new Response(JSON.stringify({ configs }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // POST - Create new scraper config
    if (request.method === 'POST') {
      const config: ScraperConfig = await request.json();
      
      const rows = await query(DATABASE_URL,
        'INSERT INTO scraper_configs (name, description, start_url, fields, ai_fields, storage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at',
        [
          config.name,
          config.description || null,
          config.startUrl,
          JSON.stringify(config.fields),
          config.aiFields ? JSON.stringify(config.aiFields) : null,
          config.storage ? JSON.stringify(config.storage) : null
        ]
      );
      
      const saved = rows[0];
      
      return new Response(JSON.stringify({
        success: true,
        config: {
          id: saved.id,
          name: saved.name,
          description: saved.description,
          startUrl: saved.start_url,
          fields: saved.fields,
          aiFields: saved.ai_fields,
          storage: saved.storage,
          createdAt: saved.created_at,
          updatedAt: saved.updated_at
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // PUT - Update existing scraper config
    if (request.method === 'PUT') {
      const config: ScraperConfig = await request.json();
      
      if (!config.id) {
        return new Response(JSON.stringify({ error: 'Missing config ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const rows = await query(DATABASE_URL,
        'UPDATE scraper_configs SET name = $1, description = $2, start_url = $3, fields = $4, ai_fields = $5, storage = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at',
        [
          config.name,
          config.description || null,
          config.startUrl,
          JSON.stringify(config.fields),
          config.aiFields ? JSON.stringify(config.aiFields) : null,
          config.storage ? JSON.stringify(config.storage) : null,
          config.id
        ]
      );
      
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Config not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const saved = rows[0];
      
      return new Response(JSON.stringify({
        success: true,
        config: {
          id: saved.id,
          name: saved.name,
          description: saved.description,
          startUrl: saved.start_url,
          fields: saved.fields,
          aiFields: saved.ai_fields,
          storage: saved.storage,
          createdAt: saved.created_at,
          updatedAt: saved.updated_at
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // DELETE - Remove scraper config
    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing config ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      await query(DATABASE_URL, 'DELETE FROM scraper_configs WHERE id = $1', [id]);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error('Scraper configs API error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * API endpoint for managing scraper configurations
 * Allows Chrome extension to save/load scraper definitions to/from PostgreSQL
 */

import { getDbPool } from '../utils/db/index.js';

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

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
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
    const db = getDbPool(env);
    
    // GET - List all scraper configs
    if (request.method === 'GET') {
      const result = await db.query(`
        SELECT id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at
        FROM scraper_configs
        ORDER BY updated_at DESC
      `);
      
      const configs = result.rows.map((row: any) => ({
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
      
      const result = await db.query(`
        INSERT INTO scraper_configs (name, description, start_url, fields, ai_fields, storage)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at
      `, [
        config.name,
        config.description || null,
        config.startUrl,
        JSON.stringify(config.fields),
        config.aiFields ? JSON.stringify(config.aiFields) : null,
        config.storage ? JSON.stringify(config.storage) : null
      ]);
      
      const saved = result.rows[0];
      
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
      
      const result = await db.query(`
        UPDATE scraper_configs
        SET name = $1, description = $2, start_url = $3, fields = $4, ai_fields = $5, storage = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at
      `, [
        config.name,
        config.description || null,
        config.startUrl,
        JSON.stringify(config.fields),
        config.aiFields ? JSON.stringify(config.aiFields) : null,
        config.storage ? JSON.stringify(config.storage) : null,
        config.id
      ]);
      
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Config not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const saved = result.rows[0];
      
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
      
      await db.query('DELETE FROM scraper_configs WHERE id = $1', [id]);
      
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

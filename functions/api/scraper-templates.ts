// API endpoint for scraper templates
import { Env } from '../types';

interface ScraperTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  url_pattern: string;
  selectors: string;
  example_url: string;
  requires_javascript: number;
  created_at: string;
  updated_at: string;
  is_public: number;
  use_count: number;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

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
    // GET /api/scraper-templates - List all templates
    if (request.method === 'GET' && !url.searchParams.get('id')) {
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      
      let query = 'SELECT * FROM scraper_templates WHERE is_public = 1';
      const params: string[] = [];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY use_count DESC, name ASC';
      
      const { results } = await env.DB.prepare(query).bind(...params).all();
      
      // Parse selectors JSON
      const templates = (results as ScraperTemplate[]).map(t => ({
        ...t,
        selectors: JSON.parse(t.selectors || '{}')
      }));
      
      return new Response(JSON.stringify({
        success: true,
        templates,
        count: templates.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/scraper-templates?id=xxx - Get single template
    if (request.method === 'GET' && url.searchParams.get('id')) {
      const id = url.searchParams.get('id');
      
      const { results } = await env.DB.prepare(
        'SELECT * FROM scraper_templates WHERE id = ?'
      ).bind(id).all();
      
      if (!results || results.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Template not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const template = results[0] as ScraperTemplate;
      template.selectors = JSON.parse(template.selectors || '{}') as any;
      
      // Increment use count
      await env.DB.prepare(
        'UPDATE scraper_templates SET use_count = use_count + 1 WHERE id = ?'
      ).bind(id).run();
      
      return new Response(JSON.stringify({
        success: true,
        template
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/scraper-templates - Create new template
    if (request.method === 'POST') {
      const data = await request.json() as Partial<ScraperTemplate>;
      
      const id = data.id || `template-${Date.now()}`;
      const selectorsJson = JSON.stringify(data.selectors || {});
      
      await env.DB.prepare(`
        INSERT INTO scraper_templates 
        (id, name, description, category, url_pattern, selectors, example_url, requires_javascript, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        data.name || 'Untitled Template',
        data.description || '',
        data.category || 'Custom',
        data.url_pattern || '.*',
        selectorsJson,
        data.example_url || '',
        data.requires_javascript || 0,
        data.is_public !== undefined ? data.is_public : 1
      ).run();
      
      return new Response(JSON.stringify({
        success: true,
        id,
        message: 'Template created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /api/scraper-templates?id=xxx - Update template
    if (request.method === 'PUT' && url.searchParams.get('id')) {
      const id = url.searchParams.get('id');
      const data = await request.json() as Partial<ScraperTemplate>;
      
      const selectorsJson = data.selectors ? JSON.stringify(data.selectors) : undefined;
      
      const updates: string[] = [];
      const params: any[] = [];
      
      if (data.name) { updates.push('name = ?'); params.push(data.name); }
      if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
      if (data.category) { updates.push('category = ?'); params.push(data.category); }
      if (data.url_pattern) { updates.push('url_pattern = ?'); params.push(data.url_pattern); }
      if (selectorsJson) { updates.push('selectors = ?'); params.push(selectorsJson); }
      if (data.example_url !== undefined) { updates.push('example_url = ?'); params.push(data.example_url); }
      if (data.requires_javascript !== undefined) { updates.push('requires_javascript = ?'); params.push(data.requires_javascript); }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      if (updates.length === 1) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No fields to update'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      params.push(id);
      
      await env.DB.prepare(`
        UPDATE scraper_templates SET ${updates.join(', ')} WHERE id = ?
      `).bind(...params).run();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Template updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /api/scraper-templates?id=xxx - Delete template
    if (request.method === 'DELETE' && url.searchParams.get('id')) {
      const id = url.searchParams.get('id');
      
      await env.DB.prepare('DELETE FROM scraper_templates WHERE id = ?').bind(id).run();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Template deleted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Template API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

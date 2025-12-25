/**
 * Cloudflare Pages Function: Database Maintenance
 * Endpoint: /api/db-maintenance
 * 
 * Clean up old events, vacuum, analyze database
 */

import { getSQL } from '../utils/db/connection.js';

export async function onRequest(context: any) {
  const { request, env } = context;
  
  // Simple API key authentication
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== env.ADMIN_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
  
  try {
    const sql = getSQL(context.env);
    const results: any = {};
    
    // Delete events older than 7 days
    const cleanupResult = await sql`
      DELETE FROM events WHERE date < CURRENT_DATE - INTERVAL '7 days'
    `;
    results.deletedEvents = cleanupResult.length;
    
    // Delete old scraper health logs (>30 days)
    const healthResult = await sql`
      DELETE FROM scraper_health WHERE scraped_at < NOW() - INTERVAL '30 days'
    `;
    results.deletedHealthLogs = healthResult.length;
    
    // Vacuum analyze (optimize database)
    await sql`VACUUM ANALYZE events`;
    await sql`VACUUM ANALYZE bills`;
    results.vacuumed = true;
    
    console.log('Database maintenance complete:', results);
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('Database maintenance error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

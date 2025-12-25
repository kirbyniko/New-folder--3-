/**
 * Cloudflare Pages Function: Test/Health Check
 * Endpoint: /api/test
 */

import { getSQL } from '../utils/db/connection.js';

export async function onRequest(context: any) {
  try {
    // Test database connection
    const sql = getSQL(context.env);
    const result = await sql`SELECT NOW() as current_time, COUNT(*) as event_count FROM events`;
    
    return new Response(
      JSON.stringify({ 
        message: 'Test function works!',
        timestamp: new Date().toISOString(),
        service: 'CiviTracker API',
        database: {
          connected: true,
          serverTime: result[0].current_time,
          totalEvents: result[0].event_count
        }
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
    console.error('Test endpoint error:', error);
    return new Response(
      JSON.stringify({ 
        message: 'Test function works!',
        timestamp: new Date().toISOString(),
        service: 'CiviTracker API',
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

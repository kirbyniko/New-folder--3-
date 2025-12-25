/**
 * Cloudflare Pages Function: Top/Featured Events
 * Endpoint: /api/top-events
 */

import { getSQL } from '../utils/db/connection.js';

export async function onRequest(context: any) {
  const sql = getSQL(context.env);
  
  try {
    // Get top 100 upcoming events sorted by date
    const result = await sql`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.lat,
        e.lng,
        e.level,
        e.type,
        e.state_code as state,
        e.committee_name as committee,
        e.description,
        e.source_url as "sourceUrl",
        COALESCE(
          array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM events e
      LEFT JOIN event_tags et ON e.id = et.event_id
      WHERE e.date >= CURRENT_DATE
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
      LIMIT 100
    `;
    
    const events = result.map(event => ({
      ...event,
      tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null 
        ? event.tags.filter((t: any) => t !== null) 
        : []
    }));
    
    const response = {
      events: events,
      count: events.length,
      lastUpdated: new Date().toISOString(),
      prioritization: 'date-based',
      cached: false
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching top events:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch top events' }),
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

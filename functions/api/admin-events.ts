/**
 * Cloudflare Pages Function: Admin Event Management
 * Endpoint: /api/admin-events
 * 
 * CRUD operations for events (requires authentication)
 */

import { getSQL } from '../utils/db/connection.js';

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;
  
  // Only require authentication for write operations (POST, DELETE, PUT)
  if (method !== 'GET') {
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
  }
  
  const sql = getSQL(context.env);
  
  try {
    if (method === 'GET') {
      // Get basic query results
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      
      const result = await sql`
        SELECT 
          e.id,
          e.name,
          e.date,
          e.time,
          e.location_name as location,
          e.state_code as state,
          e.level,
          e.type,
          e.committee_name as committee,
          e.description,
          e.source_url as "detailsUrl",
          e.scraped_at as "scrapedAt",
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'number', b.bill_number,
                'title', b.title,
                'url', b.url,
                'summary', b.summary
              )
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'::json
          ) as bills,
          COALESCE(
            array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
            ARRAY[]::text[]
          ) as tags
        FROM events e
        LEFT JOIN event_bills eb ON e.id = eb.event_id
        LEFT JOIN bills b ON eb.bill_id = b.id
        LEFT JOIN event_tags et ON e.id = et.event_id
        WHERE e.date >= CURRENT_DATE
        GROUP BY e.id
        ORDER BY e.date ASC, e.time ASC
        LIMIT ${limit}
      `;
      
      // Format response to match DataViewer expectations
      const events = result.map((event: any) => ({
        ...event,
        bills: event.bills && Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
        tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null 
          ? event.tags.filter((t: any) => t !== null) 
          : []
      }));
      
      const response = {
        events: events,
        pagination: {
          total: events.length,
          limit: limit,
          offset: 0,
          hasMore: events.length === limit
        },
        filters: {
          state: null,
          level: null,
          date: null
        },
        stats: {
          withBills: events.filter((e: any) => e.bills && e.bills.length > 0).length,
          withTags: events.filter((e: any) => e.tags && e.tags.length > 0).length,
          withParticipation: 0
        }
      };
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    if (method === 'POST') {
      // Create new event
      const body = await request.json();
      
      const result = await sql`
        INSERT INTO events (id, name, date, time, location_name, state_code, level, type)
        VALUES (${body.id}, ${body.name}, ${body.date}, ${body.time}, ${body.location}, ${body.state}, ${body.level}, ${body.type})
        RETURNING *
      `;
      
      return new Response(
        JSON.stringify(result[0]),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    if (method === 'DELETE') {
      // Delete event
      const eventId = url.searchParams.get('id');
      
      await sql`DELETE FROM events WHERE id = ${eventId}`;
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('Admin events error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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

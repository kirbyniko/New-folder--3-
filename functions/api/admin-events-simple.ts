// Minimal admin-events function with inline DB connection
import { neon, neonConfig } from '@neondatabase/serverless';

// Enable fetch mode for Cloudflare Workers
neonConfig.fetchConnectionCache = true;

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get DATABASE_URL from environment
    const connectionString = env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }

    const sql = neon(connectionString);
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
    
    // Format response
    const events = result.map((event: any) => ({
      ...event,
      bills: event.bills && Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
      tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null 
        ? event.tags.filter((t: any) => t !== null) 
        : []
    }));

    return new Response(JSON.stringify({
      events: events,
      pagination: {
        total: events.length,
        limit: limit,
        offset: 0,
        hasMore: events.length === limit
      }
    }), {
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch events',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

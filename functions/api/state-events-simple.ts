// Minimal state-events function
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get('state')?.toUpperCase();
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!stateAbbr) {
    return new Response(JSON.stringify({
      error: 'State parameter required'
    }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const sql = neon(env.DATABASE_URL);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    
    const result = await sql`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.state_code as state,
        e.location_name as location,
        e.committee_name as committee,
        e.type,
        e.description,
        e.details_url,
        e.docket_url,
        e.virtual_meeting_url,
        e.allows_public_participation,
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
      WHERE e.state_code = ${stateAbbr}
      AND e.date >= CURRENT_DATE
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
      LIMIT ${limit}
    `;

    const events = result.map((e: any) => ({
      ...e,
      bills: e.bills && Array.isArray(e.bills) && e.bills[0] !== null ? e.bills : [],
      tags: e.tags && Array.isArray(e.tags) && e.tags[0] !== null ? e.tags.filter((t: any) => t !== null) : []
    }));

    return new Response(JSON.stringify({
      events: events
    }), {
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch state events',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Cloudflare Pages Function wrapper for state-events
import { neon } from '@neondatabase/serverless';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get('state')?.toUpperCase();

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!stateAbbr || stateAbbr.length !== 2) {
    return new Response(
      JSON.stringify({ error: 'Valid 2-letter state code required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const db = neon(env.DATABASE_URL);

    // Query events with bills and tags
    const events = await db`
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
        e.details_url as "detailsUrl",
        e.docket_url as "docketUrl",
        e.virtual_meeting_url as "virtualMeetingUrl",
        e.source_url as "sourceUrl",
        e.allows_public_participation as "allowsPublicParticipation",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', b.bill_number,
              'number', b.bill_number,
              'title', b.title,
              'url', b.url,
              'status', b.status,
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
    `;

    return new Response(JSON.stringify(events), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error fetching state events:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

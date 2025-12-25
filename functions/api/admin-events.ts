// Cloudflare Pages Function: Admin Events API
// Uses D1 database binding

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
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    
    // Get events with D1
    const { results: events } = await env.DB.prepare(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.state_code as state,
        e.level,
        e.lat,
        e.lng,
        e.type,
        e.committee_name as committee,
        e.description,
        e.source_url as detailsUrl,
        e.scraped_at as scrapedAt
      FROM events e
      WHERE e.date >= date('now')
      ORDER BY e.date ASC, e.time ASC
      LIMIT ?
    `).bind(limit).all();

    // Add empty bills and tags arrays (optimize: don't fetch for all events)
    // Bills/tags can be fetched on-demand for individual events if needed
    for (const event of events) {
      event.bills = [];
      event.tags = [];
    }

    return new Response(JSON.stringify({ events }), {
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch events',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

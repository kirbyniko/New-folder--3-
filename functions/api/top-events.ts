/**
 * Cloudflare Pages Function: Top/Featured Events
 * Endpoint: /api/top-events
 */

export async function onRequest(context: any) {
  const { request, env } = context;
  
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
    // Get top 100 upcoming events sorted by date
    const { results: events } = await env.DB.prepare(`
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
        e.source_url as sourceUrl
      FROM events e
      WHERE e.date >= date('now')
      ORDER BY e.date ASC, e.time ASC
      LIMIT 100
    `).all();
    
    // Get tags for each event
    for (const event of events) {
      const { results: tags } = await env.DB.prepare(`
        SELECT tag FROM event_tags WHERE event_id = ?
      `).bind(event.id).all();
      
      event.tags = tags?.map((t: any) => t.tag) || [];
    }
    
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
  } catch (error: any) {
    console.error('Error fetching top events:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch top events',
        message: error.message,
        stack: error.stack
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

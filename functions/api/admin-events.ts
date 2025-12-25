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

    // Get all event IDs for batch queries
    const eventIds = events.map((e: any) => e.id);
    
    if (eventIds.length > 0) {
      // Batch fetch all bills for these events (single query)
      const placeholders = eventIds.map(() => '?').join(',');
      const { results: billResults } = await env.DB.prepare(`
        SELECT 
          eb.event_id,
          b.bill_number as number,
          b.title,
          b.url,
          b.summary
        FROM bills b
        INNER JOIN event_bills eb ON b.id = eb.bill_id
        WHERE eb.event_id IN (${placeholders})
      `).bind(...eventIds).all();
      
      // Batch fetch all tags for these events (single query)
      const { results: tagResults } = await env.DB.prepare(`
        SELECT event_id, tag 
        FROM event_tags 
        WHERE event_id IN (${placeholders})
      `).bind(...eventIds).all();
      
      // Group bills and tags by event_id
      const billsByEvent = new Map();
      const tagsByEvent = new Map();
      
      for (const bill of (billResults || [])) {
        if (!billsByEvent.has(bill.event_id)) {
          billsByEvent.set(bill.event_id, []);
        }
        billsByEvent.get(bill.event_id).push(bill);
      }
      
      for (const tag of (tagResults || [])) {
        if (!tagsByEvent.has(tag.event_id)) {
          tagsByEvent.set(tag.event_id, []);
        }
        tagsByEvent.get(tag.event_id).push(tag.tag);
      }
      
      // Assign bills and tags to events
      for (const event of events) {
        event.bills = billsByEvent.get(event.id) || [];
        event.tags = tagsByEvent.get(event.id) || [];
      }
    } else {
      // No events, add empty arrays
      for (const event of events) {
        event.bills = [];
        event.tags = [];
      }
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

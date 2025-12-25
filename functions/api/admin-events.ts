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

    // Fetch bills and tags for events (optimized for small result sets)
    if (events.length > 0 && events.length <= 100) {
      // Get event IDs as a comma-separated string for SQL IN clause
      const eventIds = events.map(e => `'${e.id}'`).join(',');
      
      // Build a map of event IDs to their bills and tags
      const billsMap = new Map();
      const tagsMap = new Map();
      
      // Initialize empty arrays for all events
      for (const event of events) {
        billsMap.set(event.id, []);
        tagsMap.set(event.id, []);
      }
      
      // Fetch bills for these specific events
      const { results: allBills } = await env.DB.prepare(`
        SELECT 
          eb.event_id,
          b.bill_number as number,
          b.title,
          b.url,
          b.summary
        FROM event_bills eb
        INNER JOIN bills b ON eb.bill_id = b.id
        WHERE eb.event_id IN (${eventIds})
        ORDER BY eb.event_id, b.bill_number
      `).all();
      
      // Fetch tags for these specific events
      const { results: allTags } = await env.DB.prepare(`
        SELECT event_id, tag
        FROM event_tags
        WHERE event_id IN (${eventIds})
        ORDER BY event_id, tag
      `).all();
      
      // Group bills by event_id
      for (const bill of (allBills || [])) {
        if (billsMap.has(bill.event_id)) {
          billsMap.get(bill.event_id).push(bill);
        }
      }
      
      // Group tags by event_id
      for (const tagRow of (allTags || [])) {
        if (tagsMap.has(tagRow.event_id)) {
          tagsMap.get(tagRow.event_id).push(tagRow.tag);
        }
      }
      
      // Assign bills and tags to events
      for (const event of events) {
        event.bills = billsMap.get(event.id) || [];
        event.tags = tagsMap.get(event.id) || [];
      }
    } else {
      // For large result sets, skip bills/tags
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

// Cloudflare Pages Function: State Events API (D1)
// Uses D1 database binding - Updated 2025-12-26

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get('state')?.toUpperCase();
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Calendar-Sources, X-Data-Source',
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
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    
    // Get events for state
    const { results: events } = await env.DB.prepare(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.level,
        e.lat,
        e.lng,
        e.state_code as state,
        e.location_name as location,
        e.committee_name as committee,
        e.type,
        e.description,
        e.details_url as detailsUrl,
        e.source_url as sourceUrl,
        e.docket_url as docketUrl,
        e.agenda_url as agendaUrl,
        e.virtual_meeting_url as virtualMeetingUrl,
        e.allows_public_participation
      FROM events e
      WHERE e.state_code = ?
      AND e.date >= date('now')
      ORDER BY e.date ASC, e.time ASC
      LIMIT ?
    `).bind(stateAbbr, limit).all();

    // Get bills and tags for each event
    for (const event of events) {
      // Get bills
      const { results: bills } = await env.DB.prepare(`
        SELECT 
          b.bill_number as number,
          b.title,
          b.url,
          b.summary
        FROM bills b
        INNER JOIN event_bills eb ON b.id = eb.bill_id
        WHERE eb.event_id = ?
      `).bind(event.id).all();
      
      event.bills = bills || [];
      
      // Get tags
      const { results: tags } = await env.DB.prepare(`
        SELECT tag FROM event_tags WHERE event_id = ?
      `).bind(event.id).all();
      
      event.tags = tags?.map((t: any) => t.tag) || [];
      
      // Get agenda summary
      const { results: agendaSummaries } = await env.DB.prepare(`
        SELECT summary FROM agenda_summaries WHERE event_id = ? LIMIT 1
      `).bind(event.id).all();
      
      if (agendaSummaries && agendaSummaries.length > 0 && agendaSummaries[0].summary) {
        event.agendaSummary = agendaSummaries[0].summary;
      }
    }

    // Get data sources for this state
    let calendarSources = [];
    try {
      const { results: sources } = await env.DB.prepare(`
        SELECT name, url, type, description, notes, status
        FROM data_sources
        WHERE state_code = ?
      `).bind(stateAbbr).all();
      calendarSources = sources || [];
    } catch (sourcesError: any) {
      console.error('Error fetching data sources:', sourcesError);
      // Continue without sources if query fails
    }

    return new Response(JSON.stringify(events), {
      headers: {
        ...corsHeaders,
        'X-Calendar-Sources': JSON.stringify(calendarSources)
      }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch state events',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

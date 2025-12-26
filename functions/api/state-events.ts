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

    // Batch fetch bills, tags, and agenda summaries for all events at once
    const eventIds = events.map(e => e.id);
    
    // Get all bills for these events in one query
    const billsMap = new Map();
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const { results: allBills } = await env.DB.prepare(`
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
      
      for (const bill of (allBills || [])) {
        if (!billsMap.has(bill.event_id)) {
          billsMap.set(bill.event_id, []);
        }
        const { event_id, ...billData } = bill;
        billsMap.get(bill.event_id).push(billData);
      }
    }
    
    // Get all tags for these events in one query
    const tagsMap = new Map();
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const { results: allTags } = await env.DB.prepare(`
        SELECT event_id, tag FROM event_tags WHERE event_id IN (${placeholders})
      `).bind(...eventIds).all();
      
      for (const tagRow of (allTags || [])) {
        if (!tagsMap.has(tagRow.event_id)) {
          tagsMap.set(tagRow.event_id, []);
        }
        tagsMap.get(tagRow.event_id).push(tagRow.tag);
      }
    }
    
    // Get all agenda summaries for these events in one query
    const summariesMap = new Map();
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const { results: allSummaries } = await env.DB.prepare(`
        SELECT event_id, summary FROM agenda_summaries WHERE event_id IN (${placeholders})
      `).bind(...eventIds).all();
      
      for (const summaryRow of (allSummaries || [])) {
        if (summaryRow.summary) {
          summariesMap.set(summaryRow.event_id, summaryRow.summary);
        }
      }
    }
    
    // Attach bills, tags, and summaries to each event
    for (const event of events) {
      event.bills = billsMap.get(event.id) || [];
      event.tags = tagsMap.get(event.id) || [];
      if (summariesMap.has(event.id)) {
        event.agendaSummary = summariesMap.get(event.id);
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

    // Build headers
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    responseHeaders.set('Access-Control-Expose-Headers', 'X-Calendar-Sources');
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('Cache-Control', 'public, max-age=300, s-maxage=600'); // Cache for 5min browser, 10min CDN
    responseHeaders.set('X-Calendar-Sources', JSON.stringify(calendarSources));

    return new Response(JSON.stringify(events), {
      headers: responseHeaders
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

// Cloudflare Pages Function: Agenda Summaries API
// Returns events with their agenda summaries

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
    const stateFilter = url.searchParams.get('state')?.toUpperCase();
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    
    // Build query with filters
    let query = `
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.state_code as state,
        e.committee_name as committee,
        e.docket_url,
        e.details_url,
        a.id as agenda_id,
        a.agenda_url,
        a.summary as agenda_summary,
        a.last_summarized_at
      FROM events e
      LEFT JOIN agenda_summaries a ON e.id = a.event_id
      WHERE e.date >= date('now')
      AND e.docket_url IS NOT NULL
    `;
    
    const params: any[] = [];
    
    if (stateFilter) {
      query += ` AND e.state_code = ?`;
      params.push(stateFilter);
    }
    
    query += ` ORDER BY e.date ASC, e.time ASC LIMIT ?`;
    params.push(limit);
    
    const stmt = env.DB.prepare(query);
    const { results: agendas } = await stmt.bind(...params).all();

    return new Response(JSON.stringify({ agendas }), {
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch agenda summaries',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

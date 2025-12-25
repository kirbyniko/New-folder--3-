/**
 * Cloudflare Pages Function: Local City Council Meetings
 * Endpoint: /api/local-meetings
 * 
 * READ-ONLY: Serves local meetings from database.
 * Scraping handled by PC backend.
 */

export async function onRequest(context: any) {
  const { request, env } = context;
  
  console.log('🏘️ LOCAL-MEETINGS: Request received');
  
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get('lat') || '');
  const lng = parseFloat(url.searchParams.get('lng') || '');
  const radius = parseInt(url.searchParams.get('radius') || '50');

  console.log(`Parsed: lat=${lat}, lng=${lng}, radius=${radius}`);

  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid lat/lng parameters');
    return new Response(
      JSON.stringify({ 
        error: 'Valid latitude and longitude required',
        message: 'Please provide lat and lng query parameters'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  try {
    // Query local events from database within radius
    // SQLite doesn't have built-in geo functions, so get all local events and filter
    const { results: allEvents } = await env.DB.prepare(`
      SELECT 
        id, name, date, time, location_name as location, lat, lng,
        level, type, state_code as state, committee_name as committee, description,
        source_url as sourceUrl
      FROM events
      WHERE level = 'local'
        AND date >= date('now')
      ORDER BY date ASC, time ASC
      LIMIT 500
    `).all();
    
    // Filter by distance using Haversine formula
    const result = allEvents.filter((event: any) => {
      const dLat = (event.lat - lat) * 69; // 1 degree lat ≈ 69 miles
      const dLng = (event.lng - lng) * 69 * Math.cos(lat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return distance <= radius;
    }).slice(0, 100);
    
    console.log(`Found ${result.length} local events within ${radius} miles`);
    
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800', // 30 minutes
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error: any) {
    console.error('Error in local-meetings:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch local meetings',
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

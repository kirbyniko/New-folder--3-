/**
 * Cloudflare Pages Function: Local City Council Meetings
 * Endpoint: /api/local-meetings
 * 
 * READ-ONLY: Serves local meetings from database.
 * Scraping handled by PC backend.
 */

import { getSQL } from '../utils/db/connection.js';

export async function onRequest(context: any) {
  const { request } = context;
  
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

  const sql = getSQL(context.env);
  
  try {
    // Query local events from database within radius
    // Using Haversine formula for distance calculation
    const result = await sql`
      SELECT 
        id, name, date, time, location_name as location, lat, lng,
        level, type, state_code as state, committee_name as committee, description,
        source_url as "sourceUrl"
      FROM events
      WHERE level = 'local'
        AND date >= CURRENT_DATE
        AND (
          6371 * acos(
            cos(radians(${lat})) * cos(radians(lat)) *
            cos(radians(lng) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(lat))
          )
        ) <= ${radius}
      ORDER BY date ASC, time ASC
      LIMIT 100
    `;
    
    console.log(`Found ${result.length} local events within ${radius}km`);
    
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
  } catch (error) {
    console.error('Error in local-meetings:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch local meetings',
        details: error instanceof Error ? error.message : 'Unknown error'
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

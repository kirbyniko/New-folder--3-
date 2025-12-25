/**
 * Cloudflare Pages Function: State Events API
 * Endpoint: /api/state-events
 * 
 * READ-ONLY: Serves state legislative events from the database.
 * Database is populated by scraper running on local PC.
 * NO SCRAPING in Cloudflare Workers - just serves cached data.
 */

import { getSQL } from '../utils/db/connection.js';

interface StateJurisdiction {
  id: string;
  capitol: { lat: number; lng: number; city: string };
}

const STATE_JURISDICTIONS: Record<string, StateJurisdiction> = {
  'AL': { id: 'ocd-jurisdiction/country:us/state:al/government', capitol: { lat: 32.3617, lng: -86.2792, city: 'Montgomery' } },
  'AK': { id: 'ocd-jurisdiction/country:us/state:ak/government', capitol: { lat: 58.3019, lng: -134.4197, city: 'Juneau' } },
  'AZ': { id: 'ocd-jurisdiction/country:us/state:az/government', capitol: { lat: 33.4484, lng: -112.0740, city: 'Phoenix' } },
  'AR': { id: 'ocd-jurisdiction/country:us/state:ar/government', capitol: { lat: 34.7465, lng: -92.2896, city: 'Little Rock' } },
  'CA': { id: 'ocd-jurisdiction/country:us/state:ca/government', capitol: { lat: 38.5767, lng: -121.4934, city: 'Sacramento' } },
  'CO': { id: 'ocd-jurisdiction/country:us/state:co/government', capitol: { lat: 39.7392, lng: -104.9903, city: 'Denver' } },
  'CT': { id: 'ocd-jurisdiction/country:us/state:ct/government', capitol: { lat: 41.7658, lng: -72.6734, city: 'Hartford' } },
  'DE': { id: 'ocd-jurisdiction/country:us/state:de/government', capitol: { lat: 39.1582, lng: -75.5244, city: 'Dover' } },
  'FL': { id: 'ocd-jurisdiction/country:us/state:fl/government', capitol: { lat: 30.4383, lng: -84.2807, city: 'Tallahassee' } },
  'GA': { id: 'ocd-jurisdiction/country:us/state:ga/government', capitol: { lat: 33.7490, lng: -84.3880, city: 'Atlanta' } },
  'HI': { id: 'ocd-jurisdiction/country:us/state:hi/government', capitol: { lat: 21.3099, lng: -157.8581, city: 'Honolulu' } },
  'ID': { id: 'ocd-jurisdiction/country:us/state:id/government', capitol: { lat: 43.6150, lng: -116.2023, city: 'Boise' } },
  'IL': { id: 'ocd-jurisdiction/country:us/state:il/government', capitol: { lat: 39.7817, lng: -89.6501, city: 'Springfield' } },
  'IN': { id: 'ocd-jurisdiction/country:us/state:in/government', capitol: { lat: 39.7684, lng: -86.1581, city: 'Indianapolis' } },
  'IA': { id: 'ocd-jurisdiction/country:us/state:ia/government', capitol: { lat: 41.5868, lng: -93.6250, city: 'Des Moines' } },
  'KS': { id: 'ocd-jurisdiction/country:us/state:ks/government', capitol: { lat: 39.0473, lng: -95.6752, city: 'Topeka' } },
  'KY': { id: 'ocd-jurisdiction/country:us/state:ky/government', capitol: { lat: 38.1867, lng: -84.8753, city: 'Frankfort' } },
  'LA': { id: 'ocd-jurisdiction/country:us/state:la/government', capitol: { lat: 30.4515, lng: -91.1871, city: 'Baton Rouge' } },
  'ME': { id: 'ocd-jurisdiction/country:us/state:me/government', capitol: { lat: 44.3106, lng: -69.7795, city: 'Augusta' } },
  'MD': { id: 'ocd-jurisdiction/country:us/state:md/government', capitol: { lat: 38.9784, lng: -76.4922, city: 'Annapolis' } },
  'MA': { id: 'ocd-jurisdiction/country:us/state:ma/government', capitol: { lat: 42.3601, lng: -71.0589, city: 'Boston' } },
  'MI': { id: 'ocd-jurisdiction/country:us/state:mi/government', capitol: { lat: 42.7325, lng: -84.5555, city: 'Lansing' } },
  'MN': { id: 'ocd-jurisdiction/country:us/state:mn/government', capitol: { lat: 44.9537, lng: -93.0900, city: 'Saint Paul' } },
  'MS': { id: 'ocd-jurisdiction/country:us/state:ms/government', capitol: { lat: 32.2988, lng: -90.1848, city: 'Jackson' } },
  'MO': { id: 'ocd-jurisdiction/country:us/state:mo/government', capitol: { lat: 38.5767, lng: -92.1735, city: 'Jefferson City' } },
  'MT': { id: 'ocd-jurisdiction/country:us/state:mt/government', capitol: { lat: 46.5884, lng: -112.0245, city: 'Helena' } },
  'NE': { id: 'ocd-jurisdiction/country:us/state:ne/government', capitol: { lat: 40.8136, lng: -96.7026, city: 'Lincoln' } },
  'NV': { id: 'ocd-jurisdiction/country:us/state:nv/government', capitol: { lat: 39.1638, lng: -119.7674, city: 'Carson City' } },
  'NH': { id: 'ocd-jurisdiction/country:us/state:nh/government', capitol: { lat: 43.2081, lng: -71.5376, city: 'Concord' } },
  'NJ': { id: 'ocd-jurisdiction/country:us/state:nj/government', capitol: { lat: 40.2206, lng: -74.7597, city: 'Trenton' } },
  'NM': { id: 'ocd-jurisdiction/country:us/state:nm/government', capitol: { lat: 35.6870, lng: -105.9378, city: 'Santa Fe' } },
  'NY': { id: 'ocd-jurisdiction/country:us/state:ny/government', capitol: { lat: 42.6526, lng: -73.7562, city: 'Albany' } },
  'NC': { id: 'ocd-jurisdiction/country:us/state:nc/government', capitol: { lat: 35.7796, lng: -78.6382, city: 'Raleigh' } },
  'ND': { id: 'ocd-jurisdiction/country:us/state:nd/government', capitol: { lat: 46.8083, lng: -100.7837, city: 'Bismarck' } },
  'OH': { id: 'ocd-jurisdiction/country:us/state:oh/government', capitol: { lat: 39.9612, lng: -82.9988, city: 'Columbus' } },
  'OK': { id: 'ocd-jurisdiction/country:us/state:ok/government', capitol: { lat: 35.4676, lng: -97.5164, city: 'Oklahoma City' } },
  'OR': { id: 'ocd-jurisdiction/country:us/state:or/government', capitol: { lat: 44.9429, lng: -123.0351, city: 'Salem' } },
  'PA': { id: 'ocd-jurisdiction/country:us/state:pa/government', capitol: { lat: 40.2732, lng: -76.8867, city: 'Harrisburg' } },
  'RI': { id: 'ocd-jurisdiction/country:us/state:ri/government', capitol: { lat: 41.8240, lng: -71.4128, city: 'Providence' } },
  'SC': { id: 'ocd-jurisdiction/country:us/state:sc/government', capitol: { lat: 34.0007, lng: -81.0348, city: 'Columbia' } },
  'SD': { id: 'ocd-jurisdiction/country:us/state:sd/government', capitol: { lat: 44.3683, lng: -100.3510, city: 'Pierre' } },
  'TN': { id: 'ocd-jurisdiction/country:us/state:tn/government', capitol: { lat: 36.1627, lng: -86.7816, city: 'Nashville' } },
  'TX': { id: 'ocd-jurisdiction/country:us/state:tx/government', capitol: { lat: 30.2672, lng: -97.7431, city: 'Austin' } },
  'UT': { id: 'ocd-jurisdiction/country:us/state:ut/government', capitol: { lat: 40.7608, lng: -111.8910, city: 'Salt Lake City' } },
  'VT': { id: 'ocd-jurisdiction/country:us/state:vt/government', capitol: { lat: 44.2601, lng: -72.5754, city: 'Montpelier' } },
  'VA': { id: 'ocd-jurisdiction/country:us/state:va/government', capitol: { lat: 37.5407, lng: -77.4360, city: 'Richmond' } },
  'WA': { id: 'ocd-jurisdiction/country:us/state:wa/government', capitol: { lat: 47.0379, lng: -122.9007, city: 'Olympia' } },
  'WV': { id: 'ocd-jurisdiction/country:us/state:wv/government', capitol: { lat: 38.3498, lng: -81.6326, city: 'Charleston' } },
  'WI': { id: 'ocd-jurisdiction/country:us/state:wi/government', capitol: { lat: 43.0731, lng: -89.4012, city: 'Madison' } },
  'WY': { id: 'ocd-jurisdiction/country:us/state:wy/government', capitol: { lat: 41.1400, lng: -104.8202, city: 'Cheyenne' } }
};

export async function onRequest(context: any) {
  const { request, env } = context;
  
  console.log('🏢 STATE-EVENTS: Request received');
  
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get('state')?.toUpperCase();
  
  console.log(`State requested: ${stateAbbr}`);
  
  if (!stateAbbr || !STATE_JURISDICTIONS[stateAbbr]) {
    console.error(`Invalid state: ${stateAbbr}`);
    return new Response(
      JSON.stringify({ 
        error: 'Valid state abbreviation required',
        message: 'Please provide a valid 2-letter US state abbreviation'
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
    console.log(`📊 Querying database for ${stateAbbr} events...`);
    
    // Check if we have recent data - note: neon uses template literals, not pool.query
    const dataAgeResult = await sql`
      SELECT 
        MAX(scraped_at) as last_scraped,
        COUNT(*) as event_count
      FROM events
      WHERE state_code = ${stateAbbr}
        AND date >= CURRENT_DATE
    `;
    
    const { last_scraped, event_count } = dataAgeResult[0];
    
    if (event_count === 0) {
      console.log(`⚠️ No events found in database for ${stateAbbr}`);
      
      return new Response(
        JSON.stringify([]),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'X-Data-Source, X-Message',
            'X-Data-Source': 'database-empty',
            'X-Message': 'No events available. Scraper on local PC will populate data.'
          }
        }
      );
    }
    
    const dataAge = last_scraped ? Date.now() - new Date(last_scraped).getTime() : null;
    const dataAgeHours = dataAge ? Math.floor(dataAge / 1000 / 60 / 60) : null;
    
    console.log(`✅ Found ${event_count} events, last scraped ${dataAgeHours}h ago`);
    
    // Query events with all related data - using template literal syntax
    const cleanedEvents = await sql`
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
    
    // Clean up response - neon returns array directly
    const formattedEvents = cleanedEvents.map(event => ({
      ...event,
      bills: event.bills && Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
      tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null ? event.tags.filter((t: any) => t !== null) : []
    }));
    
    console.log(`📦 Returning ${formattedEvents.length} events from database`);
    
    return new Response(
      JSON.stringify(formattedEvents),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'X-Data-Source, X-Data-Age-Hours, X-Last-Scraped',
          'X-Data-Source': 'database',
          'X-Data-Age-Hours': String(dataAgeHours),
          'X-Last-Scraped': last_scraped || 'unknown'
        }
      }
    );
    
  } catch (dbError: any) {
    console.error(`❌ Database error for ${stateAbbr}:`, dbError);
    return new Response(
      JSON.stringify({
        error: 'Database error',
        message: 'Failed to retrieve events from database'
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

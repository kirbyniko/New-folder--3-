import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { loadEnvFile } from './utils/env-loader.js';
import { ScraperRegistry, CacheManager, initializeScrapers } from './utils/scrapers/index.js';
import { sanitizeEvent } from './utils/security.js';

// Helper function to get state legislature homepage URL
function getStateLegislatureUrl(stateCode: string): string | null {
  const urls: Record<string, string> = {
    'IL': 'https://www.ilga.gov',
    'OH': 'https://www.legislature.ohio.gov',
    'GA': 'https://www.legis.ga.gov',
    'NC': 'https://www.ncleg.gov',
    'MI': 'https://www.legislature.mi.gov'
  };
  return urls[stateCode] || null;
}

interface StateJurisdiction {
  id: string;
  capitol: {
    lat: number;
    lng: number;
    city: string;
  };
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

interface OpenStatesEvent {
  id: string;
  name: string;
  description?: string;
  classification: string;
  start_date: string;
  end_date?: string;
  status: string;
  location?: {
    name?: string;
    url?: string;
    coordinates?: {
      latitude?: string;
      longitude?: string;
    };
  };
  participants?: Array<{
    name: string;
    entity_type: string;
  }>;
}

interface OpenStatesResponse {
  results: OpenStatesEvent[];
}

// Initialize scrapers once (singleton pattern)
let scrapersInitialized = false;

export const handler: Handler = async (event) => {
  loadEnvFile();
  console.log('🏢 STATE-EVENTS: Request received');
  console.log('Query params:', event.queryStringParameters);
  
  // Initialize scrapers on first request
  if (!scrapersInitialized) {
    await initializeScrapers();
    scrapersInitialized = true;
  }
  
  const stateAbbr = event.queryStringParameters?.state?.toUpperCase();
  console.log(`State requested: ${stateAbbr}`);
  
  if (!stateAbbr || !STATE_JURISDICTIONS[stateAbbr]) {
    console.error(`Invalid state: ${stateAbbr}`);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Valid state abbreviation required',
        message: 'Please provide a valid 2-letter US state abbreviation'
      })
    };
  }

  const apiKey = process.env.OPENSTATES_API_KEY || process.env.VITE_OPENSTATES_API_KEY;
  console.log('API Key present:', !!apiKey, 'Keys available:', Object.keys(process.env).filter(k => k.includes('OPENSTATES')));
  
  if (!apiKey) {
    console.error('No OpenStates API key found');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'OpenStates API key not configured',
        message: 'Please add VITE_OPENSTATES_API_KEY to your environment variables'
      })
    };
  }

  try {
    const state = STATE_JURISDICTIONS[stateAbbr];
    const isLocal = !process.env.NETLIFY_DEV;
    let store: any = null;
    
    // Only use blob storage in production
    if (!isLocal) {
      try {
        store = getStore('events');
      } catch (err) {
        console.warn('⚠️  Blob storage not available, using local cache');
      }
    }
    
    // ===== STRATEGY 0: Check blob storage for pre-scraped data (FASTEST) =====
    if (store) {
      console.log(`💾 Checking blob storage for ${stateAbbr}...`);
      try {
        const blobData = await store.get(`state-${stateAbbr}`, { type: 'json' });
        if (blobData) {
          const age = Date.now() - new Date(blobData.lastUpdated).getTime();
          const ageHours = Math.floor(age / (1000 * 60 * 60));
          
          console.log(`✅ Blob storage hit! Age: ${ageHours}h, Events: ${blobData.count}`);
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=21600', // 6 hours
              'X-Cache': 'HIT-BLOB',
              'X-Cache-Age': String(ageHours)
            },
            body: JSON.stringify(blobData.events || [])
          };
        }
      } catch (err) {
        console.log(`⚠️ Blob storage miss for ${stateAbbr}, falling back to scraping`);
      }
    } else {
      console.log(`🏠 Running in local dev, skipping blob storage`);
    }
    
    // ===== STRATEGY 1: Try custom scraper (comprehensive but slower) =====
    console.log('🔍 Checking for custom scraper...');
    const scraper = ScraperRegistry.get(stateAbbr);
    
    if (scraper && scraper.getHealth().enabled) {
      console.log(`✅ Custom scraper available for ${stateAbbr}`);
      
      // Check memory cache (24-hour TTL)
      const cacheKey = `scraper:${stateAbbr}:events`;
      const cached = CacheManager.get(cacheKey);
      
      if (cached) {
        console.log(`🎯 Returning cached scraper results for ${stateAbbr}`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400', // 24 hours
            'X-Cache': 'HIT-MEMORY'
          },
          body: JSON.stringify(cached)
        };
      }
      
      // Scrape fresh data
      try {
        console.log(`🕷️ Running custom scraper for ${stateAbbr}...`);
        const scrapedEvents = await scraper.scrape();
        
        console.log(`✅ Scraper returned ${scrapedEvents.length} events`);
        
        // Add state capitol coordinates to events that don't have them
        const eventsWithCoords = scrapedEvents.map(event => {
          if (event.lat === 0 && event.lng === 0) {
            return {
              ...event,
              lat: state.capitol.lat,
              lng: state.capitol.lng
            };
          }
          return event;
        });
        
        console.log(`📍 Added coordinates to events (using ${state.capitol.city} capitol)`);
        
        // Cache the results (24 hours)
        CacheManager.set(cacheKey, eventsWithCoords, 86400);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400' // 24 hours
          },
          body: JSON.stringify(eventsWithCoords)
        };
        
      } catch (scraperError) {
        console.error(`❌ Scraper failed for ${stateAbbr}:`, scraperError);
        console.log(`⬇️ Falling back to OpenStates API...`);
        // Continue to OpenStates fallback
      }
    } else {
      console.log(`⚠️ No custom scraper for ${stateAbbr}, using OpenStates API`);
    }
    
    // ===== STRATEGY 2: Fallback to OpenStates API =====
    console.log('🌐 Fetching from OpenStates API...');
    
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const endDate = futureDate.toISOString().split('T')[0];

    const url = `https://v3.openstates.org/events?jurisdiction=${state.id}&start_date=${today}&end_date=${endDate}&per_page=20`;
    console.log('Fetching OpenStates API:', url);
    console.log('Date range:', today, 'to', endDate);

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenStates API Error:', response.status, errorText);
      throw new Error(`OpenStates API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: OpenStatesResponse = await response.json();
    console.log(`Received ${data.results.length} total events from OpenStates`);
    
    if (data.results.length > 0) {
      const sample = data.results[0];
      console.log(`Sample event: ${sample.name}, Date: ${sample.start_date}, Status: ${sample.status}`);
    }
    
    const now = new Date();
    const events = data.results
      .filter((event) => {
        const eventDate = new Date(event.start_date);
        const isFuture = eventDate >= now;
        const notCancelled = event.status !== 'cancelled';
        if (!isFuture || !notCancelled) {
          console.log(`Filtered out: ${event.name} (${event.start_date}) - Future: ${isFuture}, NotCancelled: ${notCancelled}`);
        }
        return notCancelled && isFuture;
      })
      .map((event) => {
        const startDate = new Date(event.start_date);
        
        return {
          id: event.id,
          name: event.name,
          date: event.start_date,
          time: startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          location: event.location?.name || state.capitol.city,
          committee: event.participants?.[0]?.name || 'State Legislature',
          type: event.classification || 'meeting',
          level: 'state',
          lat: event.location?.coordinates?.latitude 
            ? parseFloat(event.location.coordinates.latitude) 
            : state.capitol.lat,
          lng: event.location?.coordinates?.longitude 
            ? parseFloat(event.location.coordinates.longitude) 
            : state.capitol.lng,
          zipCode: null,
          url: event.location?.url || getStateLegislatureUrl(stateAbbr!) || null
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(events)
    };

  } catch (error) {
    console.error('OpenStates API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch state events',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

import type { Handler } from '@netlify/functions';
import { loadEnvFile } from './utils/env-loader';
import { findNearbyCities } from './utils/legistar-cities';
import { sanitizeEvent } from './utils/security';
import { scrapeNYCCouncil } from './utils/scrapers/local/nyc-council';
import { scrapeBirminghamMeetings } from './utils/scrapers/local/birmingham';
import { scrapeMontgomeryMeetings } from './utils/scrapers/local/montgomery';
import { CacheManager } from './utils/scrapers/cache-manager';

interface LegistarEvent {
  EventId: number;
  EventGuid: string;
  EventBodyId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string;
  EventLocation: string;
  EventAgendaStatusName: string;
  EventInSiteURL: string;
  EventItems?: Array<{
    EventItemTitle: string;
    EventItemAgendaNumber: string;
  }>;
}

export const handler: Handler = async (event) => {
  console.log('🏘️ LOCAL-MEETINGS: Handler invoked!');
  
  loadEnvFile();
  
  console.log('🏘️ LOCAL-MEETINGS: Request received');
  console.log('Query params:', event.queryStringParameters);
  
  const lat = parseFloat(event.queryStringParameters?.lat || '');
  const lng = parseFloat(event.queryStringParameters?.lng || '');
  const radius = parseInt(event.queryStringParameters?.radius || '50');

  console.log(`Parsed: lat=${lat}, lng=${lng}, radius=${radius}`);

  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid lat/lng parameters');
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Valid latitude and longitude required',
        message: 'Please provide lat and lng query parameters'
      })
    };
  }

  try {
    // Find cities within radius that use Legistar
    let nearbyCities = findNearbyCities(lat, lng, radius);
    
    // Special handling: If searching in NY state and NYC isn't in results, add it
    // NYC is ~150 miles from Albany, so state capitol searches would miss it
    const isNYState = (lat >= 40.5 && lat <= 45.0) && (lng >= -79.8 && lng <= -71.8);
    const hasNYC = nearbyCities.some(c => c.client === 'nyccouncil');
    
    if (isNYState && !hasNYC) {
      console.log('🗽 NY state search detected, adding NYC Council to results');
      nearbyCities = [
        { name: 'New York City', client: 'nyccouncil', state: 'NY', lat: 40.7128, lng: -74.0060, population: 8336817 },
        ...nearbyCities
      ];
    }
    
    // Special handling: Alabama cities with custom scrapers (not in Legistar)
    const isAlabama = (lat >= 30.2 && lat <= 35.0) && (lng >= -88.5 && lng <= -84.9);
    console.log(`🔍 Alabama check: lat=${lat}, lng=${lng}, isAlabama=${isAlabama}`);
    
    const hasBirmingham = nearbyCities.some(c => c.client === 'birmingham');
    const hasMontgomery = nearbyCities.some(c => c.client === 'montgomery');
    
    if (isAlabama) {
      console.log('✅ Alabama coordinates detected! Adding custom city scrapers...');
      if (!hasBirmingham) {
        console.log('🏛️ Adding Birmingham to nearby cities');
        nearbyCities.push({
          name: 'Birmingham',
          client: 'birmingham',
          state: 'AL',
          lat: 33.5186,
          lng: -86.8104,
          population: 200733
        });
      }
      if (!hasMontgomery) {
        console.log('🏛️ Adding Montgomery to nearby cities');
        nearbyCities.push({
          name: 'Montgomery',
          client: 'montgomery',
          state: 'AL',
          lat: 32.3792,
          lng: -86.3077,
          population: 200603
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Alabama cities)`);
    }
    
    console.log(`Found ${nearbyCities.length} Legistar cities within ${radius} miles:`, nearbyCities.map(c => c.name));
    
    if (nearbyCities.length === 0) {
      console.log('No Legistar cities found, returning empty array');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        },
        body: JSON.stringify([])
      };
    }

    // Fetch events from each nearby city (parallel)
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    
    // Prioritize Alabama cities - move them to the front if present
    const alabamaCities = nearbyCities.filter(c => c.client === 'birmingham' || c.client === 'montgomery');
    const otherCities = nearbyCities.filter(c => c.client !== 'birmingham' && c.client !== 'montgomery');
    const prioritizedCities = [...alabamaCities, ...otherCities];
    
    console.log(`🎯 Processing cities (Alabama cities prioritized):`, prioritizedCities.map(c => c.name));
    
    const cityEventPromises = prioritizedCities.slice(0, 5).map(async (city) => {
      try {
        // NYC uses special Legistar instance - use custom HTML scraper with cache
        if (city.client === 'nyccouncil') {
          console.log(`🗽 ${city.name}: Using custom NYC Council scraper`);
          
          // Check cache first (24-hour TTL)
          const cacheKey = 'local:nyc:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ Returning cached NYC events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          // Cache miss - scrape fresh data
          console.log(`🕷️ Cache miss - scraping NYC Council website...`);
          const nycEvents = await scrapeNYCCouncil();
          
          // Cache for 24 hours (86400 seconds)
          CacheManager.set(cacheKey, nycEvents, 86400);
          console.log(`💾 Cached ${nycEvents.length} NYC events for 24 hours`);
          
          return nycEvents.slice(0, 10); // Limit to 10 events
        }
        
        // Birmingham, AL - custom Next.js calendar scraper
        if (city.client === 'birmingham') {
          console.log(`🏛️ BIRMINGHAM SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:birmingham:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Birmingham events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Birmingham Puppeteer scrape...`);
          const rawEvents = await scrapeBirminghamMeetings();
          console.log(`✅ Birmingham scraper returned ${rawEvents.length} raw events`);
          
          // Convert RawEvent format to local-meetings format
          const events = rawEvents.map(evt => sanitizeEvent({
            id: evt.id,
            name: evt.name,
            date: evt.date,
            time: evt.time,
            location: evt.location,
            committee: evt.committee,
            type: evt.type,
            level: 'local' as const,
            lat: city.lat,
            lng: city.lng,
            zipCode: null,
            city: city.name,
            state: city.state,
            url: evt.sourceUrl || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Birmingham events for 24 hours`);
          
          return events.slice(0, 10);
        }
        
        // Montgomery, AL - custom scraper (Akamai bypass with Puppeteer)
        if (city.client === 'montgomery') {
          console.log(`🏛️ MONTGOMERY SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:montgomery:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Montgomery events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Montgomery Puppeteer scrape (Akamai bypass)...`);
          
          console.log(`🕷️ Cache miss - attempting Montgomery scrape (likely blocked)...`);
          const rawEvents = await scrapeMontgomeryMeetings();
          
          // Convert RawEvent format to local-meetings format
          const events = rawEvents.map(evt => sanitizeEvent({
            id: evt.id,
            name: evt.name,
            date: evt.date,
            time: evt.time,
            location: evt.location,
            committee: evt.committee,
            type: evt.type,
            level: 'local' as const,
            lat: city.lat,
            lng: city.lng,
            zipCode: null,
            city: city.name,
            state: city.state,
            url: evt.sourceUrl || null
          }));
          
          if (events.length > 0) {
            CacheManager.set(cacheKey, events, 86400); // 24-hour cache
            console.log(`💾 Cached ${events.length} Montgomery events for 24 hours`);
          }
          
          return events.slice(0, 10);
        }
        
        // Legistar public API endpoint with date filter
        // $filter parameter uses OData query syntax
        const startDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const url = `https://webapi.legistar.com/v1/${city.client}/events?$filter=EventDate ge datetime'${startDateStr}'`;
        console.log(`Fetching from: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`Legistar API error for ${city.name}: ${response.status}`);
          return [];
        }

        const events: LegistarEvent[] = await response.json();
        console.log(`${city.name}: ${events.length} events returned from API`);
        
        // Filter upcoming events (within 90 days)
        const upcomingEvents = events
          .filter(evt => {
            const eventDate = new Date(evt.EventDate);
            return eventDate >= today && eventDate <= futureDate;
          })
          .slice(0, 10) // Limit per city
          .map(evt => sanitizeEvent({
            id: `legistar-${city.client}-${evt.EventId}`,
            name: evt.EventBodyName || 'City Council Meeting',
            date: evt.EventDate,
            time: evt.EventTime || 'Time TBD',
            location: evt.EventLocation || `${city.name} City Hall`,
            committee: evt.EventBodyName || 'City Council',
            type: 'meeting',
            level: 'local' as const,
            lat: city.lat,
            lng: city.lng,
            zipCode: null,
            city: city.name,
            state: city.state,
            url: evt.EventInSiteURL || null
          }));

        return upcomingEvents;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.warn(`Timeout fetching ${city.name} events`);
        } else {
          console.error(`Error fetching ${city.name} events:`, error);
        }
        return [];
      }
    });

    const allCityEvents = await Promise.all(cityEventPromises);
    const allEvents = allCityEvents.flat();

    console.log(`Total local events found: ${allEvents.length}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(allEvents)
    };

  } catch (error) {
    console.error('Local meetings API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch local meetings',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

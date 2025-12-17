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
    
    // Special handling: Louisiana cities with custom scrapers (not in Legistar)
    const isLouisiana = (lat >= 28.9 && lat <= 33.0) && (lng >= -94.0 && lng <= -88.8);
    console.log(`🔍 Louisiana check: lat=${lat}, lng=${lng}, isLouisiana=${isLouisiana}`);
    
    const hasBaronRouge = nearbyCities.some(c => c.client === 'batonrouge');
    
    if (isLouisiana) {
      console.log('✅ Louisiana coordinates detected! Adding custom city scrapers...');
      if (!hasBaronRouge) {
        console.log('🏛️ Adding Baton Rouge to nearby cities');
        nearbyCities.push({
          name: 'Baton Rouge',
          client: 'batonrouge',
          state: 'LA',
          lat: 30.4515,
          lng: -91.1871,
          population: 227470
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Louisiana cities)`);
    }
    
    // Special handling: Kentucky cities with custom scrapers (Puppeteer for dynamic site)
    const isKentucky = (lat >= 36.5 && lat <= 39.1) && (lng >= -89.6 && lng <= -81.9);
    console.log(`🔍 Kentucky check: lat=${lat}, lng=${lng}, isKentucky=${isKentucky}`);
    
    const hasLexington = nearbyCities.some(c => c.client === 'lexington');
    
    if (isKentucky) {
      console.log('✅ Kentucky coordinates detected! Adding custom city scrapers...');
      if (!hasLexington) {
        console.log('🐴 Adding Lexington to nearby cities');
        nearbyCities.push({
          name: 'Lexington',
          client: 'lexington',
          state: 'KY',
          lat: 38.0406,
          lng: -84.5037,
          population: 323152
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Kentucky cities)`);
    }
    
    // Special handling: Oregon cities with custom scrapers (Puppeteer for paginated site)
    const isOregon = (lat >= 42.0 && lat <= 46.3) && (lng >= -124.6 && lng <= -116.5);
    console.log(`🔍 Oregon check: lat=${lat}, lng=${lng}, isOregon=${isOregon}`);
    
    const hasPortland = nearbyCities.some(c => c.client === 'portland');
    
    if (isOregon) {
      console.log('✅ Oregon coordinates detected! Adding custom city scrapers...');
      if (!hasPortland) {
        console.log('🌹 Adding Portland to nearby cities');
        nearbyCities.push({
          name: 'Portland',
          client: 'portland',
          state: 'OR',
          lat: 45.5152,
          lng: -122.6784,
          population: 652503
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Oregon cities)`);
    }
    
    // Special handling: Oklahoma cities with custom scrapers (PrimeGov portal)
    const isOklahoma = (lat >= 34.5 && lat <= 37.0) && (lng >= -103.0 && lng <= -94.4);
    console.log(`🔍 Oklahoma check: lat=${lat}, lng=${lng}, isOklahoma=${isOklahoma}`);
    
    const hasOklahomaCity = nearbyCities.some(c => c.client === 'oklahomacity');
    
    if (isOklahoma) {
      console.log('✅ Oklahoma coordinates detected! Adding custom city scrapers...');
      if (!hasOklahomaCity) {
        console.log('🏛️ Adding Oklahoma City to nearby cities');
        nearbyCities.push({
          name: 'Oklahoma City',
          client: 'oklahomacity',
          state: 'OK',
          lat: 35.4676,
          lng: -97.5164,
          population: 649821
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Oklahoma cities)`);
    }
    
    // Special handling: Connecticut cities with custom scrapers (static HTML)
    const isConnecticut = (lat >= 40.9 && lat <= 42.1) && (lng >= -73.8 && lng <= -71.8);
    console.log(`🔍 Connecticut check: lat=${lat}, lng=${lng}, isConnecticut=${isConnecticut}`);
    
    const hasBridgeport = nearbyCities.some(c => c.client === 'bridgeport');
    
    if (isConnecticut) {
      console.log('✅ Connecticut coordinates detected! Adding custom city scrapers...');
      if (!hasBridgeport) {
        console.log('🌉 Adding Bridgeport to nearby cities');
        nearbyCities.push({
          name: 'Bridgeport',
          client: 'bridgeport',
          state: 'CT',
          lat: 41.1865,
          lng: -73.1952,
          population: 148654
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Connecticut cities)`);
    }
    
    // Special handling: Nevada cities with custom scrapers (PrimeGov portal API)
    const isNevada = (lat >= 35.0 && lat <= 42.0) && (lng >= -120.0 && lng <= -114.0);
    console.log(`🔍 Nevada check: lat=${lat}, lng=${lng}, isNevada=${isNevada}`);
    
    const hasLasVegas = nearbyCities.some(c => c.client === 'lasvegas');
    
    if (isNevada) {
      console.log('✅ Nevada coordinates detected! Adding custom city scrapers...');
      if (!hasLasVegas) {
        console.log('🎰 Adding Las Vegas to nearby cities');
        nearbyCities.push({
          name: 'Las Vegas',
          client: 'lasvegas',
          state: 'NV',
          lat: 36.1699,
          lng: -115.1398,
          population: 641903
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Nevada cities)`);
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
    
    // Prioritize custom cities (Alabama, Louisiana, Kentucky, Oregon, Oklahoma, Connecticut, Nevada) - move them to the front if present
    const customCities = nearbyCities.filter(c => 
      c.client === 'birmingham' || 
      c.client === 'montgomery' ||
      c.client === 'batonrouge' ||
      c.client === 'lexington' ||
      c.client === 'portland' ||
      c.client === 'oklahomacity' ||
      c.client === 'bridgeport' ||
      c.client === 'lasvegas'
    );
    const otherCities = nearbyCities.filter(c => 
      c.client !== 'birmingham' && 
      c.client !== 'montgomery' &&
      c.client !== 'batonrouge' &&
      c.client !== 'lexington' &&
      c.client !== 'portland' &&
      c.client !== 'oklahomacity' &&
      c.client !== 'bridgeport' &&
      c.client !== 'lasvegas'
    );
    const prioritizedCities = [...customCities, ...otherCities];
    
    console.log(`🎯 Processing cities (custom scrapers prioritized):`, prioritizedCities.map(c => c.name));
    
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
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
        
        // Baton Rouge, LA - custom scraper (CivicPlus AgendaCenter)
        if (city.client === 'batonrouge') {
          console.log(`🏛️ BATON ROUGE SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:batonrouge:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Baton Rouge events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Baton Rouge AgendaCenter scrape...`);
          const { scrapeBaronRougeMeetings } = await import('./utils/scrapers/local/baton-rouge');
          const rawEvents = await scrapeBaronRougeMeetings();
          console.log(`✅ Baton Rouge scraper returned ${rawEvents.length} raw events`);
          
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Baton Rouge events for 24 hours`);
          
          return events.slice(0, 10);
        }
        
        // Lexington, KY - custom scraper (Puppeteer for dynamic calendar)
        if (city.client === 'lexington') {
          console.log(`🐴 LEXINGTON SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:lexington:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Lexington events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Lexington Puppeteer scrape...`);
          const { scrapeLexingtonMeetings } = await import('./utils/scrapers/local/lexington');
          const rawEvents = await scrapeLexingtonMeetings();
          console.log(`✅ Lexington scraper returned ${rawEvents.length} raw events`);
          
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Lexington events for 24 hours`);
          
          return events.slice(0, 10);
        }
        
        // Portland, OR uses custom CMS with pagination - use Puppeteer with cache
        if (city.client === 'portland') {
          const cacheKey = 'local:portland:events';
          console.log(`🌹 PORTLAND DETECTED - Checking cache for events...`);
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Portland events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Portland Puppeteer scrape...`);
          const { scrapePortlandMeetings } = await import('./utils/scrapers/local/portland');
          const rawEvents = await scrapePortlandMeetings();
          console.log(`✅ Portland scraper returned ${rawEvents.length} raw events`);
          
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Portland events for 24 hours`);
          
          return events.slice(0, 10);
        }
        
        // Oklahoma City, OK - custom scraper (PrimeGov portal API)
        if (city.client === 'oklahomacity') {
          console.log(`🏛️ OKLAHOMA CITY SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:oklahomacity:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Oklahoma City events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Oklahoma City PrimeGov scrape...`);
          const { scrapeOklahomaCityMeetings } = await import('./utils/scrapers/local/oklahoma-city');
          const rawEvents = await scrapeOklahomaCityMeetings();
          console.log(`✅ Oklahoma City scraper returned ${rawEvents.length} raw events`);
          
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Oklahoma City events for 24 hours`);
          
          return events.slice(0, 10);
        }
        
        // Bridgeport, CT - custom scraper (static HTML events page)
        if (city.client === 'bridgeport') {
          console.log(`🌉 BRIDGEPORT SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:bridgeport:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Bridgeport events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Bridgeport static HTML scrape...`);
          const { scrapeBridgeportMeetings } = await import('./utils/scrapers/local/bridgeport');
          const rawEvents = await scrapeBridgeportMeetings();
          console.log(`✅ Bridgeport scraper returned ${rawEvents.length} raw events`);
          
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Bridgeport events for 24 hours`);
          
          return events.slice(0, 10);
        }
        
        // Las Vegas, NV - custom scraper (PrimeGov portal API)
        if (city.client === 'lasvegas') {
          console.log(`🎰 LAS VEGAS SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:lasvegas:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Las Vegas events (${cachedEvents.length} events)`);
            return cachedEvents.slice(0, 10);
          }
          
          console.log(`🕷️ CACHE MISS - Starting Las Vegas PrimeGov scrape...`);
          const { scrapeLasVegasMeetings } = await import('./utils/scrapers/local/las-vegas');
          const rawEvents = await scrapeLasVegasMeetings();
          console.log(`✅ Las Vegas scraper returned ${rawEvents.length} raw events`);
          
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
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Las Vegas events for 24 hours`);
          
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

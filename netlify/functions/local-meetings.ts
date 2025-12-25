import type { Handler } from '@netlify/functions';
import { loadEnvFile } from './utils/env-loader';
import { findNearbyCities } from './utils/legistar-cities';
import { sanitizeEvent } from './utils/security';
import { rateLimit } from './utils/rate-limit';
import { scrapeNYCCouncil } from './utils/scrapers/local/nyc-council';
import { scrapeBirminghamMeetings } from './utils/scrapers/local/birmingham';
import { scrapeMontgomeryMeetings } from './utils/scrapers/local/montgomery';
import { getJuneauCalendarSources } from './utils/scrapers/local/juneau';
import { scrapeBoiseMeetings } from './utils/scrapers/local/boise';
import { scrapeSantaFeMeetings, getSantaFeCalendarSources } from './utils/scrapers/local/santa-fe';
import { scrapeJacksonMeetings, getJacksonCalendarSources } from './utils/scrapers/local/jackson';
import { scrapeSaltLakeCityMeetings } from './utils/scrapers/local/salt-lake-city';
import { scrapeMontpelierMeetings, getMontpelierCalendarSources } from './utils/scrapers/local/montpelier';
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

export const handler: Handler = rateLimit(
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute per IP
  },
  async (event) => {
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
    
    // Special handling: New Mexico cities with custom scrapers (CivicClerk portal)
    // NM bounds: lat 31.3-37.0, lng -109.1 (west) to -103.0 (east)
    const isNewMexico = (lat >= 31.3 && lat <= 37.0) && (lng <= -103.0 && lng >= -109.1);
    console.log(`🔍 New Mexico check: lat=${lat}, lng=${lng}, isNewMexico=${isNewMexico}`);
    
    const hasSantaFe = nearbyCities.some(c => c.client === 'santafe');
    
    if (isNewMexico) {
      console.log('✅ New Mexico coordinates detected! Adding custom city scrapers...');
      if (!hasSantaFe) {
        console.log('🏛️ Adding Santa Fe to nearby cities');
        nearbyCities.push({
          name: 'Santa Fe',
          client: 'santafe',
          state: 'NM',
          lat: 35.6870,
          lng: -105.9378,
          population: 87505
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including New Mexico cities)`);
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
    
    // Special handling: Iowa cities with custom scrapers (Puppeteer for Revize calendar)
    const isIowa = (lat >= 40.4 && lat <= 43.5) && (lng >= -96.7 && lng <= -90.1);
    console.log(`🔍 Iowa check: lat=${lat}, lng=${lng}, isIowa=${isIowa}`);
    
    const hasDesMoines = nearbyCities.some(c => c.client === 'desmoines');
    
    if (isIowa) {
      console.log('✅ Iowa coordinates detected! Adding custom city scrapers...');
      if (!hasDesMoines) {
        console.log('🌽 Adding Des Moines to nearby cities');
        nearbyCities.push({
          name: 'Des Moines',
          client: 'desmoines',
          state: 'IA',
          lat: 41.5868,
          lng: -93.6250,
          population: 214133
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Iowa cities)`);
    }
    
    // Special handling: Arkansas cities with custom scrapers
    const isArkansas = (lat >= 33.0 && lat <= 36.5) && (lng >= -94.6 && lng <= -89.6);
    console.log(`🔍 Arkansas check: lat=${lat}, lng=${lng}, isArkansas=${isArkansas}`);
    
    const hasLittleRock = nearbyCities.some(c => c.client === 'littlerock');
    
    if (isArkansas) {
      console.log('✅ Arkansas coordinates detected! Adding custom city scrapers...');
      if (!hasLittleRock) {
        console.log('🏛️ Adding Little Rock to nearby cities');
        nearbyCities.push({
          name: 'Little Rock',
          client: 'littlerock',
          state: 'AR',
          lat: 34.7465,
          lng: -92.2896,
          population: 202591
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Arkansas cities)`);
    }
    
    // Special handling: Alaska cities with custom scrapers (Trumba calendar)
    const isAlaska = (lat >= 54.0 && lat <= 72.0) && (lng >= -170.0 && lng <= -130.0);
    console.log(`🔍 Alaska check: lat=${lat}, lng=${lng}, isAlaska=${isAlaska}`);
    
    const hasJuneau = nearbyCities.some(c => c.client === 'juneau');
    
    if (isAlaska) {
      console.log('✅ Alaska coordinates detected! Adding custom city scrapers...');
      if (!hasJuneau) {
        console.log('🏔️ Adding Juneau to nearby cities');
        nearbyCities.push({
          name: 'Juneau',
          client: 'juneau',
          state: 'AK',
          lat: 58.3019,
          lng: -134.4197,
          population: 32255
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Alaska cities)`);
    }
    
    // Special handling: Idaho cities with custom scrapers (Puppeteer for Vue.js pagination)
    const isIdaho = (lat >= 42.0 && lat <= 49.0) && (lng >= -117.3 && lng <= -111.0);
    console.log(`🔍 Idaho check: lat=${lat}, lng=${lng}, isIdaho=${isIdaho}`);
    
    const hasBoise = nearbyCities.some(c => c.client === 'boise');
    
    if (isIdaho) {
      console.log('✅ Idaho coordinates detected! Adding custom city scrapers...');
      if (!hasBoise) {
        console.log('🏛️ Adding Boise to nearby cities');
        nearbyCities.push({
          name: 'Boise',
          client: 'boise',
          state: 'ID',
          lat: 43.6187,
          lng: -116.1995,
          population: 235684
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Idaho cities)`);
    }

    // Mississippi geo-detection (Jackson area)
    const isMississippi = (lat >= 30.0 && lat <= 35.0) && (lng >= -91.5 && lng <= -88.0);
    console.log(`🔍 Mississippi check: lat=${lat}, lng=${lng}, isMississippi=${isMississippi}`);
    
    if (isMississippi) {
      console.log('✅ Mississippi coordinates detected!');
      console.log('🏛️ Adding Jackson to nearby cities');
      
      // Filter out non-Mississippi Legistar cities (keep only MS cities)
      nearbyCities = nearbyCities.filter(c => c.state === 'MS');
      console.log(`🗑️ Filtered to Mississippi cities only: ${nearbyCities.length} cities`);
      
      if (!nearbyCities.some(c => c.client === 'jackson-ms')) {
        nearbyCities.push({
          name: 'Jackson',
          client: 'jackson-ms',
          state: 'MS',
          lat: 32.2988,
          lng: -90.1848,
          population: 153701
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (Mississippi cities only)`);
    }

    // Montana geo-detection (Helena area)
    const isMontana = (lat >= 44.0 && lat <= 49.0) && (lng >= -116.0 && lng <= -104.0);
    console.log(`🔍 Montana check: lat=${lat}, lng=${lng}, isMontana=${isMontana}`);
    
    if (isMontana) {
      console.log('✅ Montana coordinates detected!');
      console.log('🏛️ Adding Helena to nearby cities');
      
      // Filter out non-Montana Legistar cities (keep only MT cities)
      nearbyCities = nearbyCities.filter(c => c.state === 'MT');
      console.log(`🗑️ Filtered to Montana cities only: ${nearbyCities.length} cities`);
      
      if (!nearbyCities.some(c => c.client === 'helena')) {
        nearbyCities.push({
          name: 'Helena',
          client: 'helena',
          state: 'MT',
          lat: 46.5891,
          lng: -112.0391,
          population: 32091
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (Montana cities only)`);
    }
    
    // Special handling: Utah - Salt Lake City with custom scraper (not in Legistar)
    const isUtah = (lat >= 37.0 && lat <= 42.0) && (lng >= -114.0 && lng <= -109.0);
    console.log(`🔍 Utah check: lat=${lat}, lng=${lng}, isUtah=${isUtah}`);
    
    if (isUtah) {
      console.log('✅ Utah coordinates detected! Adding Salt Lake City custom scraper...');
      const hasSaltLakeCity = nearbyCities.some(c => c.client === 'saltlakecity');
      if (!hasSaltLakeCity) {
        console.log('🏛️ Adding Salt Lake City to nearby cities');
        nearbyCities.push({
          name: 'Salt Lake City',
          client: 'saltlakecity',
          state: 'UT',
          lat: 40.7608,
          lng: -111.8910,
          population: 200567
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Salt Lake City)`);
    }
    
    // Special handling: Vermont - Montpelier with custom scraper (not in Legistar)
    const isVermont = (lat >= 42.7 && lat <= 45.0) && (lng >= -73.5 && lng <= -71.5);
    console.log(`🔍 Vermont check: lat=${lat}, lng=${lng}, isVermont=${isVermont}`);
    
    if (isVermont) {
      console.log('✅ Vermont coordinates detected! Adding Montpelier custom scraper...');
      const hasMontpelier = nearbyCities.some(c => c.client === 'montpelier');
      if (!hasMontpelier) {
        console.log('🏛️ Adding Montpelier to nearby cities');
        nearbyCities.push({
          name: 'Montpelier',
          client: 'montpelier',
          state: 'VT',
          lat: 44.2601,
          lng: -72.5754,
          population: 7855
        });
      }
      console.log(`📋 Total cities to scrape: ${nearbyCities.length} (including Montpelier)`);
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
    
    // Prioritize custom cities (Alabama, Louisiana, Kentucky, Oregon, Oklahoma, Connecticut, Nevada, Iowa, Arkansas, Alaska, Mississippi, Montana, Utah, Vermont) - move them to the front if present
    const customCities = nearbyCities.filter(c => 
      c.client === 'birmingham' || 
      c.client === 'montgomery' ||
      c.client === 'batonrouge' ||
      c.client === 'santafe' ||
      c.client === 'lexington' ||
      c.client === 'portland' ||
      c.client === 'oklahomacity' ||
      c.client === 'bridgeport' ||
      c.client === 'lasvegas' ||
      c.client === 'desmoines' ||
      c.client === 'littlerock' ||
      c.client === 'juneau' ||
      c.client === 'jackson-ms' ||
      c.client === 'helena' ||
      c.client === 'saltlakecity' ||
      c.client === 'montpelier'
    );
    const otherCities = nearbyCities.filter(c => 
      c.client !== 'birmingham' && 
      c.client !== 'montgomery' &&
      c.client !== 'batonrouge' &&
      c.client !== 'santafe' &&
      c.client !== 'lexington' &&
      c.client !== 'portland' &&
      c.client !== 'oklahomacity' &&
      c.client !== 'bridgeport' &&
      c.client !== 'lasvegas' &&
      c.client !== 'desmoines' &&
      c.client !== 'littlerock' &&
      c.client !== 'juneau' &&
      c.client !== 'jackson-ms' &&
      c.client !== 'helena' &&
      c.client !== 'saltlakecity' &&
      c.client !== 'montpelier'
    );
    const prioritizedCities = [...customCities, ...otherCities];
    
    console.log(`🎯 Processing cities (custom scrapers prioritized):`, prioritizedCities.map(c => c.name));
    
    // Collect calendar sources from scraped cities
    const calendarSources: { name: string; url: string; description: string }[] = [];
    
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
            return cachedEvents;
          }
          
          // Cache miss - scrape fresh data
          console.log(`🕷️ Cache miss - scraping NYC Council website...`);
          const nycEvents = await scrapeNYCCouncil();
          
          // Cache for 24 hours (86400 seconds)
          CacheManager.set(cacheKey, nycEvents, 86400);
          console.log(`💾 Cached ${nycEvents.length} NYC events for 24 hours`);
          
          return nycEvents; // Limit to 10 events
        }
        
        // Birmingham, AL - custom Next.js calendar scraper
        if (city.client === 'birmingham') {
          console.log(`🏛️ BIRMINGHAM SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:birmingham:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Birmingham events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        // Montgomery, AL - custom scraper (Akamai bypass with Puppeteer)
        if (city.client === 'montgomery') {
          console.log(`🏛️ MONTGOMERY SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:montgomery:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Montgomery events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Montgomery Puppeteer scrape...`);
          const rawEvents = await scrapeMontgomeryMeetings();
          console.log(`✅ Montgomery scraper returned ${rawEvents.length} raw events`);
          
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
          
          CacheManager.set(cacheKey, events, 86400);
          console.log(`💾 Cached ${events.length} Montgomery events for 24 hours`);
          
          return events;
        }
        
        // Santa Fe, NM - custom scraper (CivicClerk React SPA with Puppeteer)
        if (city.client === 'santafe') {
          console.log(`🏛️ SANTA FE SCRAPER INVOKED for ${city.name}`);
          
          // Collect calendar sources
          calendarSources.push(...getSantaFeCalendarSources());
          
          const cacheKey = 'local:santafe:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Santa Fe events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Santa Fe Puppeteer scrape...`);
          const rawEvents = await scrapeSantaFeMeetings();
          console.log(`✅ Santa Fe scraper returned ${rawEvents.length} raw events`);
          
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
          
          CacheManager.set(cacheKey, events, 86400);
          console.log(`💾 Cached ${events.length} Santa Fe events for 24 hours`);
          
          return events;
        }
        
        // Baton Rouge, LA - custom scraper (CivicPlus AgendaCenter)
        if (city.client === 'batonrouge') {
          console.log(`🏛️ BATON ROUGE SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:batonrouge:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Baton Rouge events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        // Lexington, KY - custom scraper (Puppeteer for dynamic calendar)
        if (city.client === 'lexington') {
          console.log(`🐴 LEXINGTON SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:lexington:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Lexington events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        // Portland, OR uses custom CMS with pagination - use Puppeteer with cache
        if (city.client === 'portland') {
          const cacheKey = 'local:portland:events';
          console.log(`🌹 PORTLAND DETECTED - Checking cache for events...`);
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Portland events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        // Oklahoma City, OK - custom scraper (PrimeGov portal API)
        if (city.client === 'oklahomacity') {
          console.log(`🏛️ OKLAHOMA CITY SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:oklahomacity:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Oklahoma City events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        // Helena, MT - custom scraper (PrimeGov portal API, same as Oklahoma City)
        if (city.client === 'helena') {
          console.log(`🏛️ HELENA SCRAPER INVOKED for ${city.name}`);
          
          // Always add Helena calendar sources
          const { getHelenaCalendarSources } = await import('./utils/scrapers/local/helena');
          calendarSources.push(...getHelenaCalendarSources());
          
          const cacheKey = 'local:helena:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Helena events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Helena PrimeGov scrape...`);
          const { scrapeHelenaMeetings } = await import('./utils/scrapers/local/helena');
          const rawEvents = await scrapeHelenaMeetings();
          console.log(`✅ Helena scraper returned ${rawEvents.length} raw events`);
          
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
            zipCode: evt.zipCode,
            city: city.name,
            state: city.state,
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Helena events for 24 hours`);
          
          return events;
        }
        
        // Salt Lake City, UT - custom scraper (WordPress calendar with JavaScript rendering)
        if (city.client === 'saltlakecity') {
          console.log(`🏛️ SALT LAKE CITY SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:saltlakecity:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Salt Lake City events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Salt Lake City Puppeteer scrape...`);
          const rawEvents = await scrapeSaltLakeCityMeetings();
          console.log(`✅ Salt Lake City scraper returned ${rawEvents.length} raw events`);
          
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
          console.log(`💾 Cached ${events.length} Salt Lake City events for 24 hours`);
          
          return events;
        }
        
        // Montpelier, VT - custom scraper (Material-UI calendar with date range and infinite scroll)
        if (city.client === 'montpelier') {
          console.log(`🏛️ MONTPELIER SCRAPER INVOKED for ${city.name}`);
          
          // Always add Montpelier calendar sources
          calendarSources.push(...getMontpelierCalendarSources());
          
          const cacheKey = 'local:montpelier:events:v3'; // v3 = extract civicclerk URLs and PDF links directly
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Montpelier events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Montpelier Puppeteer scrape (date range + infinite scroll)...`);
          const rawEvents = await scrapeMontpelierMeetings();
          console.log(`✅ Montpelier scraper returned ${rawEvents.length} raw events`);
          
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
          console.log(`💾 Cached ${events.length} Montpelier events for 24 hours`);
          
          return events;
        }
        
        // Bridgeport, CT - custom scraper (static HTML events page)
        if (city.client === 'bridgeport') {
          console.log(`🌉 BRIDGEPORT SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:bridgeport:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Bridgeport events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        // Las Vegas, NV - custom scraper (PrimeGov portal API)
        if (city.client === 'lasvegas') {
          console.log(`🎰 LAS VEGAS SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:lasvegas:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Las Vegas events (${cachedEvents.length} events)`);
            return cachedEvents;
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
          
          return events;
        }
        
        if (city.client === 'desmoines') {
          console.log(`🌽 DES MOINES SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:desmoines:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Des Moines events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Des Moines Revize calendar scrape...`);
          const { scrapeDesMoinesMeetings } = await import('./utils/scrapers/local/des-moines');
          const rawEvents = await scrapeDesMoinesMeetings();
          console.log(`✅ Des Moines scraper returned ${rawEvents.length} raw events`);
          
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
          console.log(`💾 Cached ${events.length} Des Moines events for 24 hours`);
          
          return events;
        }
        
        if (city.client === 'littlerock') {
          console.log(`🏛️ LITTLE ROCK SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:littlerock:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Little Rock events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Little Rock Board calendar scrape...`);
          const { scrapeLittleRockMeetings } = await import('./utils/scrapers/local/little-rock');
          const rawEvents = await scrapeLittleRockMeetings();
          console.log(`✅ Little Rock scraper returned ${rawEvents.length} raw events`);
          
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
          console.log(`💾 Cached ${events.length} Little Rock events for 24 hours`);
          
          return events;
        }
        
        // Juneau, AK - custom scraper (Trumba RSS calendar)
        if (city.client === 'juneau') {
          console.log(`🏔️ JUNEAU SCRAPER INVOKED for ${city.name}`);
          
          // Always add Juneau calendar sources (whether cached or not)
          calendarSources.push(...getJuneauCalendarSources());
          
          const cacheKey = 'local:juneau:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Juneau events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Juneau Trumba RSS scrape...`);
          const { scrapeJuneauMeetings } = await import('./utils/scrapers/local/juneau');
          const rawEvents = await scrapeJuneauMeetings();
          console.log(`✅ Juneau scraper returned ${rawEvents.length} raw events`);
          
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
          console.log(`💾 Cached ${events.length} Juneau events for 24 hours`);
          
          calendarSources.push(...getJuneauCalendarSources());
          
          return events;
        }

        // Jackson, MS - custom scraper (HTML parsing with PDF links)
        if (city.client === 'jackson-ms') {
          console.log(`🏛️ JACKSON MS SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:jackson-ms:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Jackson events (${cachedEvents.length} events)`);
            calendarSources.push(...getJacksonCalendarSources());
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Jackson MS scrape...`);
          const rawEvents = await scrapeJacksonMeetings();
          console.log(`✅ Jackson MS scraper returned ${rawEvents.length} raw events`);
          
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
          console.log(`💾 Cached ${events.length} Jackson events for 24 hours`);
          
          calendarSources.push(...getJacksonCalendarSources());
          
          return events;
        }
        
        // Boise, ID - custom scraper (Puppeteer for Vue.js pagination)
        if (city.client === 'boise') {
          console.log(`🏛️ BOISE SCRAPER INVOKED for ${city.name}`);
          
          const cacheKey = 'local:boise:events';
          const cachedEvents = CacheManager.get(cacheKey);
          
          if (cachedEvents) {
            console.log(`✅ CACHE HIT: Returning cached Boise events (${cachedEvents.length} events)`);
            return cachedEvents;
          }
          
          console.log(`🕷️ CACHE MISS - Starting Boise Puppeteer scrape...`);
          const rawEvents = await scrapeBoiseMeetings();
          console.log(`✅ Boise scraper returned ${rawEvents.length} raw events`);
          
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
            zipCode: evt.zipCode || null,
            city: city.name,
            state: city.state,
            url: evt.sourceUrl || null,
            docketUrl: evt.docketUrl || null,
            virtualMeetingUrl: evt.virtualMeetingUrl || null,
            description: evt.description || null
          }));
          
          CacheManager.set(cacheKey, events, 86400); // 24-hour cache
          console.log(`💾 Cached ${events.length} Boise events for 24 hours`);
          
          return events;
        }
        
        // Legistar public API endpoint with date filter - CHECK CACHE FIRST
        const cacheKey = `local:legistar:${city.client}:events`;
        const cachedEvents = CacheManager.get(cacheKey);
        
        if (cachedEvents) {
          console.log(`✅ CACHE HIT: Returning cached ${city.name} events (${cachedEvents.length} events)`);
          // Add calendar source for cached results
          calendarSources.push({
            name: `${city.name} Legistar Calendar`,
            url: `https://${city.client}.legistar.com/Calendar.aspx`,
            description: `${city.name} city meetings calendar`
          });
          return cachedEvents;
        }
        
        // $filter parameter uses OData query syntax
        const startDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const url = `https://webapi.legistar.com/v1/${city.client}/events?$filter=EventDate ge datetime'${startDateStr}'`;
        console.log(`🕷️ CACHE MISS - Fetching from: ${url}`);
        
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
        
        // Add Legistar calendar source for this city (always add, even if 0 events)
        calendarSources.push({
          name: `${city.name} Legistar Calendar`,
          url: `https://${city.client}.legistar.com/Calendar.aspx`,
          description: `${city.name} city meetings calendar`
        });
        
        // Filter upcoming events (within 90 days)
        const upcomingEvents = events
          .filter(evt => {
            const eventDate = new Date(evt.EventDate);
            return eventDate >= today && eventDate <= futureDate;
          })
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
        
        // Cache for 24 hours
        CacheManager.set(cacheKey, upcomingEvents, 86400);
        console.log(`💾 Cached ${upcomingEvents.length} ${city.name} events for 24 hours`);

        return upcomingEvents;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.warn(`Timeout fetching ${city.name} events`);
        } else {
          console.error(`Error fetching ${city.name} events:`, error);
        }
        // Add calendar source even on error so users can check manually
        calendarSources.push({
          name: `${city.name} Legistar Calendar`,
          url: `https://${city.client}.legistar.com/Calendar.aspx`,
          description: `${city.name} city meetings calendar`
        });
        return [];
      }
    });

    const allCityEvents = await Promise.all(cityEventPromises);
    const allEvents = allCityEvents.flat();

    console.log(`Total local events found: ${allEvents.length}`);
    console.log(`Calendar sources collected: ${calendarSources.length}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'X-Calendar-Sources': JSON.stringify(calendarSources)
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
});

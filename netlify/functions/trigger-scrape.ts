import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { ScraperRegistry, initializeScrapers } from './utils/scrapers/index.js';

// In-memory storage for local development
const localCache = new Map<string, any>();

/**
 * Manual trigger for daily scraper
 * Call this endpoint to manually trigger the scraping job
 * 
 * Usage: GET /.netlify/functions/trigger-scrape
 * 
 * Optional params:
 * - ?state=NH - Scrape only specific state
 * - ?force=true - Force scrape even if recent data exists
 */
export const handler: Handler = async (event) => {
  const timestamp = new Date().toISOString();
  const targetState = event.queryStringParameters?.state?.toUpperCase();
  const force = event.queryStringParameters?.force === 'true';
  const isLocal = !process.env.NETLIFY_DEV;
  
  console.log(`🚀 Manual scrape triggered at ${timestamp}`);
  if (targetState) console.log(`🎯 Target state: ${targetState}`);
  if (isLocal) console.log(`💻 Running in local development mode (using memory cache)`);
  
  // Only get store if not in local mode
  let store: any = null;
  if (!isLocal) {
    try {
      store = getStore('events');
    } catch (err) {
      console.warn('⚠️  Blob storage not available, using local cache');
    }
  }
  await initializeScrapers();
  
  const results: any = {
    timestamp,
    scraped: [],
    skipped: [],
    errors: []
  };
  
  try {
    const allStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ];
    
    const statesToScrape = targetState ? [targetState] : allStates;
    
    for (const state of statesToScrape) {
      const scraper = ScraperRegistry.get(state);
      
      if (!scraper) {
        results.skipped.push({ state, reason: 'No scraper available' });
        continue;
      }
      
      // Check if recent data exists
      if (!force) {
        try {
          const existing = (isLocal || !store)
            ? localCache.get(`state-${state}`)
            : await store.get(`state-${state}`, { type: 'json' });
          if (existing) {
            const age = Date.now() - new Date(existing.lastUpdated).getTime();
            const ageHours = age / (1000 * 60 * 60);
            
            if (ageHours < 6) {
              results.skipped.push({ 
                state, 
                reason: `Recent data exists (${ageHours.toFixed(1)}h old)`,
                count: existing.count
              });
              continue;
            }
          }
        } catch (err) {
          // No existing data, proceed with scrape
        }
      }
      
      try {
        console.log(`🔄 ${state}: Scraping...`);
        const startTime = Date.now();
        
        // Use the public scrape() method which returns transformed events
        const events = await scraper.scrape();
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        const dataToStore = {
          state,
          events: events,
          count: events.length,
          source: 'manual-trigger',
          lastUpdated: timestamp,
          scrapeDuration: `${duration}s`
        };
        
        // Store in blob or local cache
        if (isLocal || !store) {
          localCache.set(`state-${state}`, dataToStore);
        } else {
          await store.set(`state-${state}`, JSON.stringify(dataToStore), {
            metadata: {
              state,
              count: String(events.length),
              timestamp,
              duration
            }
          });
        }
        
        results.scraped.push({ 
          state, 
          count: events.length,
          duration: `${duration}s`
        });
        
        console.log(`✅ ${state}: ${events.length} events (${duration}s)`);
        
      } catch (error: any) {
        console.error(`❌ ${state}: ${error.message}`);
        results.errors.push({ 
          state, 
          error: error.message 
        });
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        timestamp,
        summary: {
          scraped: results.scraped.length,
          skipped: results.skipped.length,
          errors: results.errors.length
        },
        details: results
      }, null, 2)
    };
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp
      })
    };
  }
};

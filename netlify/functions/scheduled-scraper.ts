import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { ScraperRegistry, initializeScrapers } from './utils/scrapers/index.js';
import { insertEvent, insertBills, insertTags, logScraperHealth, getTop100EventsToday } from './utils/db/events.js';
import { checkDatabaseConnection } from './utils/db/connection.js';

/**
 * Scheduled function that runs daily to pre-scrape all state data
 * Stores enriched events in Netlify Blobs for instant frontend access
 * 
 * Schedule: Every day at 3 AM UTC (10 PM EST / 7 PM PST)
 * This runs during low-traffic hours to minimize rate limit issues
 * 
 * Cost: FREE - Within Netlify free tier limits
 * - ~33 hours compute/month for all 50 states
 * - ~10MB blob storage
 * - Serves 500K+ requests/month on free bandwidth
 */
const scheduledScraper = async () => {
  const timestamp = new Date().toISOString();
  console.log(`🕐 [${timestamp}] Starting scheduled scrape...`);
  
  const store = getStore('events');
  await initializeScrapers();
  
  // Check if PostgreSQL is enabled and available
  const usePostgres = process.env.USE_POSTGRESQL === 'true';
  let dbAvailable = false;
  
  if (usePostgres) {
    dbAvailable = await checkDatabaseConnection();
    console.log(dbAvailable ? '✅ PostgreSQL available' : '⚠️  PostgreSQL unavailable, using Blobs only');
    
    // Clean up events older than 24 hours to keep database fresh
    if (dbAvailable) {
      try {
        const { getPool } = await import('./utils/db/connection');
        const pool = getPool();
        const cleanupResult = await pool.query(
          `DELETE FROM events WHERE scraped_at < NOW() - INTERVAL '24 hours'`
        );
        console.log(`🧹 Cleaned up ${cleanupResult.rowCount} old events (>24h)`);
      } catch (cleanupError) {
        console.error('⚠️  Failed to clean up old events:', cleanupError);
      }
    }
  }
  
  const results: any = {
    lastUpdated: timestamp,
    states: {},
    successCount: 0,
    errorCount: 0,
    errors: [],
    dbWrites: 0,
    dbErrors: 0
  };

  try {
    // Scrape all 50 states + DC with scrapers we have
    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ];

    console.log(`📋 Scraping ${states.length} states...`);
    
    // Process states in batches to avoid rate limits
    const batchSize = 3;
    
    for (let i = 0; i < states.length; i += batchSize) {
      const batch = states.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (state) => {
        const scraper = ScraperRegistry.get(state);
        if (!scraper) {
          console.log(`⚠️  ${state}: No scraper available`);
          results.errors.push({ state, error: 'No scraper available' });
          results.errorCount++;
          
          await store.set(`state-${state}`, JSON.stringify({
            state,
            events: [],
            count: 0,
            source: 'error',
            error: 'No scraper available',
            lastUpdated: timestamp
          }));
          return;
        }

        try {
          console.log(`🔄 ${state}: Starting scrape...`);
          const scrapeStart = Date.now();
          
          const events = await scraper.scrape();
          const scrapeDuration = Date.now() - scrapeStart;
          
          // Store in blob (PRIMARY)
          await store.set(`state-${state}`, JSON.stringify({
            state,
            events: events,
            count: events.length,
            source: 'scheduled-scraper',
            lastUpdated: timestamp
          }), {
            metadata: {
              state,
              count: String(events.length),
              timestamp
            }
          });
          
          results.states[state] = { count: events.length };
          results.successCount++;
          console.log(`✅ ${state}: ${events.length} events stored in Blobs`);
          
          // Write to PostgreSQL (SECONDARY - non-blocking)
          if (usePostgres && dbAvailable) {
            try {
              console.log(`📊 ${state}: Writing to PostgreSQL...`);
              let dbEventCount = 0;
              
              for (const event of events) {
                try {
                  const eventId = await insertEvent(event, `scraper-${state.toLowerCase()}`);
                  dbEventCount++;
                  
                  if (event.bills && event.bills.length > 0) {
                    await insertBills(eventId, event.bills, state);
                  }
                  
                  if (event.tags && event.tags.length > 0) {
                    await insertTags(eventId, event.tags);
                  }
                } catch (eventErr: any) {
                  console.error(`❌ ${state}: Error inserting event "${event.name}":`, eventErr.message);
                }
              }
              
              await logScraperHealth(state, state, 'success', dbEventCount, undefined, scrapeDuration);
              results.dbWrites += dbEventCount;
              console.log(`✅ ${state}: ${dbEventCount} events written to PostgreSQL`);
            } catch (dbErr: any) {
              results.dbErrors++;
              console.error(`❌ ${state}: PostgreSQL write failed:`, dbErr.message);
              await logScraperHealth(state, state, 'failure', 0, dbErr.message, scrapeDuration);
            }
          }
          
        } catch (error: any) {
          console.error(`❌ ${state}: Scrape failed:`, error.message);
          results.errors.push({ state, error: error.message });
          results.errorCount++;
          
          await store.set(`state-${state}`, JSON.stringify({
            state,
            events: [],
            count: 0,
            source: 'error',
            error: error.message,
            lastUpdated: timestamp
          }));
        }
      }));
      
      // Delay between batches
      if (i + batchSize < states.length) {
        console.log(`⏸️  Waiting 5s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Save summary metadata
    await store.set('scrape-metadata', JSON.stringify({
      lastUpdated: timestamp,
      successCount: results.successCount,
      errorCount: results.errorCount,
      errors: results.errors,
      availableStates: Object.keys(results.states)
    }, null, 2));

    // Cache top 100 prioritized events from PostgreSQL if available
    if (usePostgres && dbAvailable) {
      try {
        console.log('📊 Caching top 100 prioritized events...');
        const top100Events = await getTop100EventsToday();
        
        await store.set('top-100-events', JSON.stringify({
          events: top100Events,
          count: top100Events.length,
          lastUpdated: timestamp,
          prioritization: 'bills > public_participation > tags > date/time'
        }));
        
        console.log(`✅ Cached ${top100Events.length} prioritized events`);
      } catch (cacheError: any) {
        console.error('⚠️  Failed to cache top 100 events:', cacheError.message);
      }
    }

    console.log(`
✅ Scheduled scrape complete!
   Success: ${results.successCount}
   Errors: ${results.errorCount}
   DB Writes: ${results.dbWrites}
   DB Errors: ${results.dbErrors}
   Timestamp: ${timestamp}
    `);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        timestamp,
        successCount: results.successCount,
        errorCount: results.errorCount,
        dbWrites: results.dbWrites,
        dbErrors: results.dbErrors
      })
    };

  } catch (error: any) {
    console.error('❌ Fatal error in scheduled scrape:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp
      })
    };
  }
};

// Schedule to run daily at 3 AM UTC
export const handler = schedule('0 3 * * *', scheduledScraper);

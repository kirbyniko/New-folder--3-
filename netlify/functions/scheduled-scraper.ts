import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { ScraperRegistry, initializeScrapers } from './utils/scrapers/index.js';
import { 
  insertEvent, 
  insertBills, 
  logScraperHealth, 
  getTop100EventsToday, 
  getAllStateEventsForExport,
  markStateEventsAsUnseen,
  incrementUnseenEventsCycleCount,
  archiveRemovedEvents,
  cleanupOldArchivedEvents,
  cleanupOldRemovedEvents
} from './utils/db/events.js';
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
    
    // Clean up old archived/removed events to keep database fresh
    if (dbAvailable) {
      try {
        const archivedCleaned = await cleanupOldArchivedEvents();
        const removedCleaned = await cleanupOldRemovedEvents();
        console.log(`🧹 Cleaned up ${archivedCleaned} old archived events and ${removedCleaned} old removed events`);
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
    
    // Process states in batches to avoid overwhelming the system
    // Increased from 3 to 10 for faster execution
    const batchSize = 10;
    
    for (let i = 0; i < states.length; i += batchSize) {
      const batch = states.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(states.length/batchSize)}: ${batch.join(', ')}`);
      
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
          
          // SMART SCRAPING: Mark all existing events as "not seen yet"
          if (usePostgres && dbAvailable) {
            try {
              await markStateEventsAsUnseen(state);
            } catch (markError) {
              console.error(`⚠️  ${state}: Failed to mark events as unseen:`, markError);
            }
          }
          
          const events = await scraper.scrape();
          const scrapeDuration = Date.now() - scrapeStart;
          
          // Handle case where scraper returns 0 events (out of session or temporary failure)
          if (events.length === 0) {
            console.log(`⚠️  ${state}: 0 events scraped - preserving existing data`);
            
            if (usePostgres && dbAvailable) {
              try {
                // Increment cycle count for unseen events (they weren't in this scrape)
                const unseenCount = await incrementUnseenEventsCycleCount(state);
                console.log(`📊 ${state}: ${unseenCount} existing events not found in this scrape`);
                
                // Still export existing data to blobs
                const dbEvents = await getAllStateEventsForExport(state);
                
                await store.set(`state-${state}`, JSON.stringify({
                  state,
                  events: dbEvents,
                  count: dbEvents.length,
                  source: 'postgresql-preserved',
                  lastUpdated: timestamp,
                  note: 'Scraper returned 0 events - existing data preserved'
                }), {
                  metadata: {
                    state,
                    count: String(dbEvents.length),
                    timestamp,
                    source: 'preserved'
                  }
                });
                
                results.states[state] = { count: dbEvents.length, preserved: true };
                results.successCount++;
                await logScraperHealth(state, state, 'success', 0, 'No new events, data preserved', scrapeDuration);
                
              } catch (preserveErr: any) {
                console.error(`❌ ${state}: Failed to preserve data:`, preserveErr.message);
                results.errors.push({ state, error: preserveErr.message });
                results.errorCount++;
              }
            } else {
              // No DB available - just store empty result
              await store.set(`state-${state}`, JSON.stringify({
                state,
                events: [],
                count: 0,
                source: 'scraper-empty',
                lastUpdated: timestamp
              }));
              
              results.states[state] = { count: 0 };
              results.successCount++;
            }
            
            return; // Skip to next state
          }
          
          // Write to PostgreSQL FIRST (PRIMARY - Source of Truth)
          if (usePostgres && dbAvailable) {
            try {
              console.log(`📊 ${state}: Writing to PostgreSQL...`);
              let dbEventCount = 0;
              
              for (const event of events) {
                try {
                  // insertEvent now auto-generates and inserts tags
                  const eventId = await insertEvent(event, `scraper-${state.toLowerCase()}`);
                  dbEventCount++;
                  
                  if (event.bills && event.bills.length > 0) {
                    await insertBills(eventId, event.bills, state);
                  }
                } catch (eventErr: any) {
                  console.error(`❌ ${state}: Error inserting event "${event.name}":`, eventErr.message);
                }
              }
              
              await logScraperHealth(state, state, 'success', dbEventCount, undefined, scrapeDuration);
              results.dbWrites += dbEventCount;
              console.log(`✅ ${state}: ${dbEventCount} events written to PostgreSQL`);
              
              // SMART SCRAPING: Archive events that weren't seen (removed from source)
              try {
                const archivedCount = await archiveRemovedEvents(state, 2); // Archive after 2 missed cycles
                if (archivedCount > 0) {
                  console.log(`🗑️  ${state}: Archived ${archivedCount} removed events`);
                }
              } catch (archiveErr) {
                console.error(`⚠️  ${state}: Failed to archive removed events:`, archiveErr);
              }
              
              // Now export FROM database to blobs (SECONDARY - Frontend Cache)
              console.log(`📦 ${state}: Exporting from DB to Blobs...`);
              const dbEvents = await getAllStateEventsForExport(state);
              
              await store.set(`state-${state}`, JSON.stringify({
                state,
                events: dbEvents,
                count: dbEvents.length,
                source: 'postgresql-export',
                lastUpdated: timestamp
              }), {
                metadata: {
                  state,
                  count: String(dbEvents.length),
                  timestamp,
                  source: 'postgresql'
                }
              });
              
              results.states[state] = { count: dbEvents.length };
              results.successCount++;
              console.log(`✅ ${state}: ${dbEvents.length} events exported to Blobs from PostgreSQL`);
              
            } catch (dbErr: any) {
              results.dbErrors++;
              console.error(`❌ ${state}: PostgreSQL write/export failed:`, dbErr.message);
              await logScraperHealth(state, state, 'failure', 0, dbErr.message, scrapeDuration);
              
              // Fallback: Store scraped data directly if DB fails
              await store.set(`state-${state}`, JSON.stringify({
                state,
                events: events,
                count: events.length,
                source: 'scraper-fallback',
                lastUpdated: timestamp,
                error: 'Database unavailable, using direct scrape'
              }), {
                metadata: {
                  state,
                  count: String(events.length),
                  timestamp,
                  source: 'fallback'
                }
              });
              
              results.states[state] = { count: events.length };
              results.successCount++;
              console.log(`⚠️  ${state}: ${events.length} events stored via fallback`);
            }
          } else {
            // No database - fallback to direct blob storage
            await store.set(`state-${state}`, JSON.stringify({
              state,
              events: events,
              count: events.length,
              source: 'scraper-no-db',
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
            console.log(`✅ ${state}: ${events.length} events stored in Blobs (no DB)`);
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

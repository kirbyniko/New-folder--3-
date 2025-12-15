import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { ScraperRegistry, initializeScrapers } from './utils/scrapers/index.js';

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
  
  const results: any = {
    lastUpdated: timestamp,
    states: {},
    successCount: 0,
    errorCount: 0,
    errors: []
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
    const batchSize = 3; // Conservative to avoid overwhelming targets
    for (let i = 0; i < states.length; i += batchSize) {
      const batch = states.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (state) => {
        const scraper = ScraperRegistry.get(state);
        
        if (!scraper) {
          console.log(`⏭️  ${state}: No scraper available yet`);
          return;
        }
        
        try {
          console.log(`🔄 ${state}: Starting scrape...`);
          // Use the public scrape() method which returns transformed events
          const events = await scraper.scrape();
          
          // Store in blob
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
          console.log(`✅ ${state}: ${events.length} events stored`);
          
        } catch (error: any) {
          console.error(`❌ ${state} scrape failed:`, error.message);
          results.errorCount++;
          results.errors.push({ source: state, error: error.message });
          
          // Store empty result so API doesn't retry immediately
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
      }, null, 2)
    );

    console.log(`
✅ Scheduled scrape complete!
   Success: ${results.successCount}
   Errors: ${results.errorCount}
   Timestamp: ${timestamp}
    `);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        timestamp,
        successCount: results.successCount,
        errorCount: results.errorCount
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

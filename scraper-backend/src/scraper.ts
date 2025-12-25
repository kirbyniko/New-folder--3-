/**
 * Scraper Orchestrator
 * 
 * Manages the scraping process for all 50 states + DC
 * Imports scraper utilities from main project and runs them
 */

import { initializeScrapers, ScraperRegistry } from '../../netlify/functions/utils/scrapers/index.js';
import { insertEvent, insertBills, logScraperHealth } from './db/events.js';
import { cleanupOldEvents } from './db/maintenance.js';

const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

interface ScraperResult {
  state: string;
  success: boolean;
  eventsFound: number;
  eventsInserted: number;
  duration: number;
  error?: string;
}

export async function runAllScrapers(): Promise<void> {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SCRAPER RUN STARTED: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // Initialize scraper system
  await initializeScrapers();
  
  // Clean up events older than 24 hours
  console.log('🧹 Cleaning up old events...');
  await cleanupOldEvents(24);
  
  const results: ScraperResult[] = [];
  const batchSize = 5; // Process 5 states at a time

  // Process states in batches
  for (let i = 0; i < ALL_STATES.length; i += batchSize) {
    const batch = ALL_STATES.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(ALL_STATES.length / batchSize);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);
    
    const batchResults = await Promise.all(
      batch.map(state => scrapeState(state))
    );
    
    results.push(...batchResults);
    
    // Brief pause between batches to avoid overwhelming servers
    if (i + batchSize < ALL_STATES.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = results.filter(r => r.success).length;
  const totalEvents = results.reduce((sum, r) => sum + r.eventsInserted, 0);
  const errors = results.filter(r => !r.success);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCRAPER RUN COMPLETED`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Duration: ${totalTime}s`);
  console.log(`   States Processed: ${results.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errors.length}`);
  console.log(`   Total Events Inserted: ${totalEvents}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Failed States:`);
    errors.forEach(e => {
      console.log(`   - ${e.state}: ${e.error}`);
    });
  }
  
  console.log(`${'='.repeat(60)}\n`);
}

async function scrapeState(state: string): Promise<ScraperResult> {
  const startTime = Date.now();
  const result: ScraperResult = {
    state,
    success: false,
    eventsFound: 0,
    eventsInserted: 0,
    duration: 0
  };

  try {
    const scraper = ScraperRegistry.get(state);
    
    if (!scraper) {
      result.error = 'No scraper available';
      console.log(`⚠️  ${state}: No scraper`);
      await logScraperHealth(state, false, 0, 'No scraper available');
      return result;
    }

    console.log(`🔄 ${state}: Scraping...`);
    const events = await scraper.scrape();
    result.eventsFound = events.length;

    if (events.length === 0) {
      console.log(`ℹ️  ${state}: No events found`);
      await logScraperHealth(state, true, 0, null);
      result.success = true;
      result.duration = Date.now() - startTime;
      return result;
    }

    // Insert events into database
    let insertCount = 0;
    for (const event of events) {
      try {
        const eventId = await insertEvent(event);
        
        // Insert associated bills if any
        if (event.bills && event.bills.length > 0) {
          await insertBills(eventId, event.bills);
        }
        
        insertCount++;
      } catch (insertError: any) {
        // Skip duplicate events (fingerprint constraint)
        if (!insertError.message?.includes('duplicate key') && 
            !insertError.message?.includes('fingerprint')) {
          console.error(`   ⚠️  ${state}: Failed to insert event:`, insertError.message);
        }
      }
    }

    result.eventsInserted = insertCount;
    result.success = true;
    result.duration = Date.now() - startTime;

    console.log(`✅ ${state}: ${insertCount} events inserted (${result.duration}ms)`);
    await logScraperHealth(state, true, insertCount, null);

  } catch (error: any) {
    result.error = error.message || 'Unknown error';
    result.duration = Date.now() - startTime;
    console.error(`❌ ${state}: ${result.error}`);
    await logScraperHealth(state, false, 0, result.error);
  }

  return result;
}

// Allow running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllScrapers().catch(console.error);
}

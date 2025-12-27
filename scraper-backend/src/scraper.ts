/**
 * Scraper Orchestrator
 * 
 * Manages the scraping process for all 50 states + DC
 * Imports scraper utilities from main project and runs them
 */

import { initializeScrapers, ScraperRegistry } from '../../lib/functions/utils/scrapers/index.js';
import { insertEvent, insertBills, logScraperHealth, generateInsertSQL, batchInsertEvents } from './db/events.js';
import { cleanupOldEvents } from './db/maintenance.js';
import { execSync } from 'child_process';

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

/**
 * Check which states need scraping (no events or failed last scrape)
 */
async function getStatesNeedingScrape(): Promise<string[]> {
  try {
    // Query D1 to see which states have events
    const result = execSync(
      'wrangler d1 execute civitracker-db --remote --command "SELECT DISTINCT state_code FROM events WHERE date >= date(\'now\')" --json',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const data = JSON.parse(result);
    const statesWithData = data[0]?.results?.map((row: any) => row.state_code) || [];
    
    // Return states that don't have data
    const statesNeedingScrape = ALL_STATES.filter(state => !statesWithData.includes(state));
    
    return statesNeedingScrape;
  } catch (error) {
    console.error('⚠️  Could not query existing data, will scrape all states:', error);
    return ALL_STATES; // Fallback to scraping everything if query fails
  }
}

export async function runAllScrapers(forceRescrape: boolean = false): Promise<void> {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SCRAPER RUN STARTED: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // Initialize scraper system
  await initializeScrapers();
  
  // Clean up events older than 24 hours
  console.log('🧹 Cleaning up old events...');
  await cleanupOldEvents(24);
  
  // Determine which states need scraping
  let statesToScrape = ALL_STATES;
  
  if (!forceRescrape) {
    console.log('🔍 Checking which states need updates...');
    // Only scrape states with no data or failed last run
    const statesNeedingScrape = await getStatesNeedingScrape();
    statesToScrape = ALL_STATES.filter(state => statesNeedingScrape.includes(state));
    
    if (statesToScrape.length === 0) {
      console.log('✅ All states have recent data, nothing to scrape!');
      return;
    }
    
    console.log(`📋 Need to scrape ${statesToScrape.length} states: ${statesToScrape.join(', ')}`);
    console.log(`⏭️  Skipping ${ALL_STATES.length - statesToScrape.length} states with recent data\n`);
  } else {
    console.log('⚠️  Force rescrape mode - scraping all 51 states\n');
  }
  
  const results: ScraperResult[] = [];
  const batchSize = 5; // Process 5 states at a time

  // Process states in batches
  for (let i = 0; i < statesToScrape.length; i += batchSize) {
    const batch = statesToScrape.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(statesToScrape.length / batchSize);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);
    
    const batchResults = await Promise.all(
      batch.map(state => scrapeState(state))
    );
    
    results.push(...batchResults);
    
    // Brief pause between batches to avoid overwhelming servers
    if (i + batchSize < statesToScrape.length) {
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
    const sqlStatements: string[] = [];
    
    for (const event of events) {
      try {
        const sql = generateInsertSQL(event);
        sqlStatements.push(sql);
        insertCount++;
      } catch (insertError: any) {
        console.error(`   ⚠️  ${state}: Failed to generate SQL:`, insertError.message);
      }
    }
    
    // Batch insert all events at once
    if (sqlStatements.length > 0) {
      try {
        await batchInsertEvents(sqlStatements, state);
      } catch (batchError: any) {
        console.error(`   ❌ ${state}: Batch insert failed:`, batchError.message);
        result.error = batchError.message;
        result.duration = Date.now() - startTime;
        return result;
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

// Run the scraper
console.log('🎬 Starting scraper script...');
runAllScrapers()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

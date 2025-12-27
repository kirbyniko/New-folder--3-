/**
 * Scrape specific states (useful after fixing scrapers)
 */

import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';
import { generateInsertSQL, batchInsertEvents, logScraperHealth } from './src/db/events.js';

const STATES_TO_SCRAPE = ['CO', 'NY', 'UT'];

async function scrapeSpecificStates() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 TARGETED SCRAPE: ${STATES_TO_SCRAPE.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  await initializeScrapers();

  for (const state of STATES_TO_SCRAPE) {
    console.log(`\n🔄 ${state}: Scraping...`);
    const startTime = Date.now();

    try {
      const scraper = ScraperRegistry.get(state);
      
      if (!scraper) {
        console.log(`⚠️  ${state}: No scraper available`);
        continue;
      }

      const events = await scraper.scrape();
      console.log(`✅ ${state}: Found ${events.length} events`);

      if (events.length === 0) {
        await logScraperHealth(state, true, 0, null);
        continue;
      }

      // Generate SQL for batch insert
      const sqlStatements: string[] = [];
      for (const event of events) {
        try {
          const sql = generateInsertSQL(event);
          sqlStatements.push(sql);
        } catch (error: any) {
          console.error(`   ⚠️  ${state}: Failed to generate SQL:`, error.message);
        }
      }

      // Batch insert
      if (sqlStatements.length > 0) {
        batchInsertEvents(sqlStatements, state);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ ${state}: ${sqlStatements.length} events inserted (${duration}s)`);
        await logScraperHealth(state, true, sqlStatements.length, null);
      }

    } catch (error: any) {
      console.error(`❌ ${state}: ${error.message}`);
      await logScraperHealth(state, false, 0, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ TARGETED SCRAPE COMPLETED`);
  console.log(`${'='.repeat(60)}\n`);
  process.exit(0);
}

scrapeSpecificStates();

import 'dotenv/config';
import { initializeScrapers, ScraperRegistry } from './netlify/functions/utils/scrapers/index';
import { insertEvent, insertBills, insertTags } from './netlify/functions/utils/db/events';

const STATES_TO_SCRAPE = ['NY', 'TX', 'IL', 'PA', 'OH', 'FL']; // States that might have data

async function scrapeMultipleStates() {
  console.log('🚀 Multi-State Scraper');
  console.log(`📋 Scraping: ${STATES_TO_SCRAPE.join(', ')}\n`);

  await initializeScrapers();

  const results: Record<string, { success: number; errors: number }> = {};

  for (const stateCode of STATES_TO_SCRAPE) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📍 Scraping ${stateCode}...`);
    console.log('='.repeat(50));

    const scraper = ScraperRegistry.get(stateCode);
    
    if (!scraper) {
      console.log(`❌ No scraper found for ${stateCode}`);
      continue;
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
      );

      const events = await Promise.race([
        scraper.scrape(),
        timeoutPromise
      ]);

      console.log(`✅ Scraped ${events.length} events`);

      if (events.length === 0) {
        console.log(`⚠️  No events found for ${stateCode} (may not be in session)`);
        results[stateCode] = { success: 0, errors: 0 };
        continue;
      }

      let successCount = 0;
      let errorCount = 0;

      // Insert events
      for (const event of events) {
        try {
          const eventId = await insertEvent(event, scraper.name);
          
          // Insert bills
          if (event.bills && event.bills.length > 0) {
            await insertBills(eventId, event.bills, stateCode);
          }

          // Insert tags
          if (event.tags && event.tags.length > 0) {
            await insertTags(eventId, event.tags);
          }

          successCount++;
        } catch (error: any) {
          console.error(`  ❌ Error inserting event: ${error.message}`);
          errorCount++;
        }
      }

      results[stateCode] = { success: successCount, errors: errorCount };
      console.log(`✅ ${stateCode}: ${successCount} events inserted, ${errorCount} errors`);

    } catch (error: any) {
      console.error(`❌ ${stateCode} scrape failed: ${error.message}`);
      results[stateCode] = { success: 0, errors: 1 };
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));

  const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

  for (const [state, result] of Object.entries(results)) {
    const status = result.success > 0 ? '✅' : '⚠️ ';
    console.log(`${status} ${state}: ${result.success} events`);
  }

  console.log(`\n📈 Total: ${totalSuccess} events inserted, ${totalErrors} errors`);
}

scrapeMultipleStates().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

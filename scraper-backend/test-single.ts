import { initializeScrapers, ScraperRegistry } from '../lib/functions/utils/scrapers/index.js';
import { generateInsertSQL, batchInsertEvents } from './src/db/events.js';

async function testScraper() {
  try {
    console.log('Initializing scrapers...');
    await initializeScrapers();
    
    console.log('Getting Pennsylvania scraper...');
    const scraper = ScraperRegistry.get('PA');
    
    if (!scraper) {
      console.error('❌ No scraper found for CT');
      return;
    }
    
    console.log('Running scraper...');
    const events = await scraper.scrape();
    console.log(`✅ Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nFirst event:', JSON.stringify(events[0], null, 2));
      
      console.log('\nGenerating SQL...');
      const sqlStatements: string[] = [];
      for (const event of events) {
        const sql = generateInsertSQL(event);
        sqlStatements.push(sql);
      }
      console.log(`✅ Generated ${sqlStatements.length} SQL statements`);
      
      console.log('\nExecuting batch insert...');
      batchInsertEvents(sqlStatements, 'CT');
      console.log('✅ Batch insert complete');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testScraper();

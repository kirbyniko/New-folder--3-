import 'dotenv/config';
import { initializeScrapers, ScraperRegistry } from './netlify/functions/utils/scrapers/index.ts';

async function testScraper() {
  await initializeScrapers();
  const scraper = ScraperRegistry.get('CA');
  const events = await scraper.scrape();
  
  console.log('Total events:', events.length);
  console.log('\n=== Sample Event ===');
  console.log(JSON.stringify(events[0], null, 2));
  
  console.log('\n=== Field Check ===');
  const sample = events[0];
  console.log('Has state:', sample.state);
  console.log('Has committee:', sample.committee);
  console.log('Has bills:', sample.bills?.length || 0);
  console.log('Has tags:', sample.tags?.length || 0);
  console.log('Has detailsUrl:', !!sample.detailsUrl);
  console.log('Has docketUrl:', !!sample.docketUrl);
  console.log('Has agendaUrl:', !!(sample as any).agendaUrl);
}

testScraper();

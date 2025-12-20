// Arkansas scraper - uses the actual scraper class with PDF parsing
import { ArkansasScraper } from './netlify/functions/utils/scrapers/states/arkansas';
import * as fs from 'fs';

async function scrapeArkansas() {
  console.log('[SCRAPER] 🚀 Starting Arkansas scraper with PDF parsing\n');
  
  const scraper = new ArkansasScraper();
  const events = await scraper.scrapeCalendar();

  console.log(`\n[SCRAPER] ✅ Found ${events.length} total events`);

  // Count enriched events
  const withTags = events.filter(e => e.tags && e.tags.length > 0).length;
  const withBills = events.filter(e => e.bills && e.bills.length > 0).length;
  const withPDFs = events.filter(e => e.docketUrl).length;
  const totalBills = events.reduce((sum, e) => sum + (e.bills?.length || 0), 0);

  console.log(`[SCRAPER] 📊 Statistics:`);
  console.log(`  - Events with agendas: ${withPDFs}`);
  console.log(`  - Events with tags: ${withTags}`);
  console.log(`  - Events with bills: ${withBills}`);
  console.log(`  - Total bills: ${totalBills}`);

  // Write to JSON file
  const outputPath = './public/data/arkansas-events.json';
  const output = {
    count: events.length,
    billsCount: totalBills,
    lastUpdated: new Date().toISOString(),
    events
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n[SCRAPER] 💾 Wrote ${events.length} events to ${outputPath}`);

  // Display sample enriched event
  const enriched = events.find(e => e.tags && e.tags.length > 0);
  if (enriched) {
    console.log('\n[SCRAPER] 📋 Sample enriched event:');
    console.log(JSON.stringify(enriched, null, 2));
  }
}

scrapeArkansas()
  .then(() => {
    console.log('\n✅ Arkansas scrape complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Scrape failed:', error);
    process.exit(1);
  });

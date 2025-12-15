import { PennsylvaniaScraper } from './netlify/functions/utils/scrapers/states/pennsylvania';

async function test() {
  console.log('🧪 Testing Pennsylvania Scraper...\n');
  
  const scraper = new PennsylvaniaScraper();
  const results = await scraper.scrape();
  
  console.log(`\n✅ Total events scraped: ${results.length}`);
  console.log(`\n📅 Unique dates found:`);
  
  const dates = [...new Set(results.map(r => r.date))].sort();
  dates.forEach(date => {
    const eventsOnDate = results.filter(r => r.date === date);
    const billsOnDate = eventsOnDate.reduce((sum, e) => sum + (e.bills?.length || 0), 0);
    console.log(`  - ${date}: ${eventsOnDate.length} events, ${billsOnDate} bills`);
  });
  
  console.log(`\n📋 Sample events (first 5):`);
  results.slice(0, 5).forEach((event, i) => {
    console.log(`\n${i + 1}. ${event.committee}`);
    console.log(`   Date: ${event.date}`);
    console.log(`   Time: ${event.time}`);
    console.log(`   Bills: ${event.bills?.length || 0}`);
    if (event.bills && event.bills.length > 0) {
      console.log(`   First bill: ${event.bills[0].id} - ${event.bills[0].url}`);
    }
  });
  
  const totalBills = results.reduce((sum, e) => sum + (e.bills?.length || 0), 0);
  console.log(`\n📊 Total bills extracted: ${totalBills}`);
}

test().catch(console.error);

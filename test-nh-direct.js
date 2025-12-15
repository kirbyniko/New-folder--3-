// Quick test of NH scraper
import { NewHampshireScraper } from './netlify/functions/utils/scrapers/states/new-hampshire';

const scraper = new NewHampshireScraper();

console.log('Testing NH scraper with bill enrichment...');

scraper.scrape()
  .then(events => {
    console.log(`✅ Success! Got ${events.length} events`);
    
    // Check for bills
    const withBills = events.filter(e => e.bills && e.bills.length > 0);
    console.log(`\n📋 Events with bills: ${withBills.length}`);
    
    if (withBills.length > 0) {
      console.log('\n🎯 First event with bills:');
      const first = withBills[0];
      console.log(`  Name: ${first.name}`);
      console.log(`  Committee: ${first.committee}`);
      console.log(`  Docket: ${first.docketUrl}`);
      console.log(`  Bills (${first.bills.length}):`);
      first.bills.forEach(b => {
        console.log(`    - ${b.id}: ${b.title}`);
      });
    } else {
      console.log('\n⚠️ No events with bills found');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

// Timeout after 30 seconds
setTimeout(() => {
  console.error('⏱️ Timeout after 30 seconds');
  process.exit(1);
}, 30000);

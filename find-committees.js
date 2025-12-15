// Find all unique committees in NH events
import { NewHampshireScraper } from './netlify/functions/utils/scrapers/states/new-hampshire.ts';

console.log('🔍 Finding all NH committees...\n');

const scraper = new NewHampshireScraper();

// Temporarily disable enrichment to get raw committee names faster
const originalEnrich = scraper.enrichEventWithRegex;
scraper.enrichEventWithRegex = async (event) => event;

scraper.scrapeCalendar()
  .then(events => {
    // Extract all unique committees
    const committees = new Map();
    
    events.forEach(event => {
      const committee = event.committee
        ?.replace(/^NH (House|Senate) - /, '')
        .trim()
        .toUpperCase();
      
      if (committee) {
        committees.set(committee, (committees.get(committee) || 0) + 1);
      }
    });
    
    // Sort by frequency
    const sorted = Array.from(committees.entries())
      .sort((a, b) => b[1] - a[1]);
    
    console.log(`📊 Found ${sorted.length} unique committees:\n`);
    sorted.forEach(([name, count]) => {
      console.log(`  ${count.toString().padStart(2)} events: ${name}`);
    });
    
    console.log('\n💡 Now manually look these up at:');
    console.log('   https://www.gencourt.state.nh.us/statstudcomm/\n');
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });

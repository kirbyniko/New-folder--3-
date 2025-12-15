// Helper to find committee docket IDs for mapping
// This script visits event pages, clicks "See Docket" mentally, and shows what to add

import { NewHampshireScraper } from './netlify/functions/utils/scrapers/states/new-hampshire.ts';

console.log('🔍 NH Committee Mapping Helper\n');
console.log('This tool helps find docket IDs for statutory/study committees.\n');

const scraper = new NewHampshireScraper();

// Get raw events without enrichment
const originalEnrich = scraper.enrichEventWithRegex;
scraper.enrichEventWithRegex = async (event) => event;

scraper.scrapeCalendar()
  .then(async (events) => {
    // Group by committee
    const byCommittee = new Map();
    
    events.forEach(event => {
      const committee = event.committee
        ?.replace(/^NH (House|Senate) - /, '')
        .trim()
        .toUpperCase();
      
      if (committee) {
        if (!byCommittee.has(committee)) {
          byCommittee.set(committee, []);
        }
        byCommittee.get(committee).push(event);
      }
    });
    
    // Sort by frequency (most events first)
    const sorted = Array.from(byCommittee.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log('📊 Top 15 committees by event count:\n');
    console.log('To find docket IDs, visit these URLs and click "See Docket":\n');
    
    for (let i = 0; i < Math.min(15, sorted.length); i++) {
      const [committee, committeeEvents] = sorted[i];
      const firstEvent = committeeEvents[0];
      
      console.log(`${(i + 1).toString().padStart(2)}. ${committee} (${committeeEvents.length} events)`);
      console.log(`    Visit: ${firstEvent.detailsUrl}`);
      console.log(`    Then add: '${committee}': { id: 'XXX', chapter: 'YY-Z:N' },\n`);
    }
    
    console.log('\n💡 Instructions:');
    console.log('1. Open each URL above in your browser');
    console.log('2. Look for a "See Docket" button');
    console.log('3. If NO button exists, skip it (regular committees don\'t have dockets)');
    console.log('4. If button exists, click it and copy the URL');
    console.log('5. Extract the "id" and "txtchapternumber" parameters');
    console.log('6. Add the mapping to new-hampshire.ts buildCommitteeMapping()');
    console.log('\nExample:');
    console.log('  URL: details.aspx?id=1451&txtchapternumber=19-P:1');
    console.log('  Mapping: \'STATE COMMISSION ON AGING\': { id: \'1451\', chapter: \'19-P:1\' }');
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });

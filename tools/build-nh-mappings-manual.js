/**
 * NH COMMITTEE MAPPING BUILDER - MANUAL MODE
 * 
 * This generates a list of URLs for you to visit manually.
 * Since the NH statstudcomm page uses JavaScript, we can't easily scrape it.
 * 
 * USAGE:
 *   1. Run: npx tsx tools/build-nh-mappings-manual.js
 *   2. Visit each URL it outputs
 *   3. Click "See Docket" button (if it exists)
 *   4. Copy the resulting URL's id and txtchapternumber parameters
 *   5. Paste into the mapping
 * 
 * This only needs to be run ONCE (or when IDs break - rare!)
 */

import { NewHampshireScraper } from '../lib/functions/utils/scrapers/states/new-hampshire.ts';

console.log('🔧 NH COMMITTEE MAPPING BUILDER - MANUAL MODE');
console.log('=' .repeat(70));
console.log();
console.log('Generating list of committees that need mapping...\n');

const scraper = new NewHampshireScraper();

// Disable enrichment to get raw data fast
const originalEnrich = scraper.enrichEventWithRegex;
scraper.enrichEventWithRegex = async (event) => event;

scraper.scrapeCalendar()
  .then(events => {
    // Find unique committees
    const committees = new Map();
    
    events.forEach(event => {
      const rawName = event.committee || event.name;
      const normalizedName = rawName
        ?.replace(/^NH (House|Senate) - /, '')
        .trim()
        .toUpperCase();
      
      if (normalizedName && !committees.has(normalizedName)) {
        committees.set(normalizedName, {
          name: normalizedName,
          rawName: rawName,
          eventUrl: event.detailsUrl,
          count: 1
        });
      } else if (normalizedName) {
        committees.get(normalizedName).count++;
      }
    });
    
    // Sort by frequency
    const sorted = Array.from(committees.values())
      .sort((a, b) => b.count - a.count);
    
    console.log(`Found ${sorted.length} unique committees\n`);
    console.log('=' .repeat(70));
    console.log('INSTRUCTIONS:');
    console.log('=' .repeat(70));
    console.log();
    console.log('For each committee below:');
    console.log('  1. Visit the URL');
    console.log('  2. Look for "See Docket" button');
    console.log('  3. If NO button → skip (regular committees don\'t have dockets)');
    console.log('  4. If YES button → click it');
    console.log('  5. Copy the resulting URL');
    console.log('  6. Extract id=XXX and txtchapternumber=YY-Z:N');
    console.log('  7. Add to mapping below\n');
    console.log('=' .repeat(70));
    console.log();
    
    sorted.forEach((comm, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${comm.name} (${comm.count} events)`);
      console.log(`    Visit: ${comm.eventUrl}`);
      console.log(`    Add:   '${comm.name}': { id: 'XXX', chapter: 'YY-Z:N' },`);
      console.log();
    });
    
    console.log('=' .repeat(70));
    console.log('TEMPLATE - Copy this into new-hampshire.ts:');
    console.log('=' .repeat(70));
    console.log();
    console.log('const knownCommittees: Record<string, { id: string; chapter: string }> = {');
    console.log('  // Add your mappings here:');
    sorted.slice(0, 5).forEach(comm => {
      console.log(`  // '${comm.name}': { id: '???', chapter: '??-?:?' },`);
    });
    console.log('  // ... add more as you find them');
    console.log('};');
    console.log(`// Last updated: ${new Date().toLocaleDateString()}`);
    console.log();
    console.log('=' .repeat(70));
    console.log();
    console.log('💡 TIP: Focus on the top 5-10 committees (highest event counts)');
    console.log('   That will give you 70-80% coverage!');
    console.log();
  })
  .catch(error => {
    console.error('Error:', error);
  });

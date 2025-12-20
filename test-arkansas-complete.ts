import { ArkansasScraper } from './netlify/functions/utils/scrapers/states/arkansas';
import { scrapeLittleRockMeetings } from './netlify/functions/utils/scrapers/local/little-rock';

async function testArkansas() {
  console.log('='.repeat(60));
  console.log('ARKANSAS COMPLETE TEST - State + Local');
  console.log('='.repeat(60));
  
  try {
    // Test state scraper
    console.log('\n📍 PART 1: Arkansas State Legislature');
    console.log('-'.repeat(60));
    const stateScraper = new ArkansasScraper();
    const stateEvents = await stateScraper.scrape();
    
    console.log(`\n✅ Found ${stateEvents.length} state legislative events`);
    
    // Count enriched events
    const enrichedCount = stateEvents.filter(e => 
      e.bills && e.bills.length > 0 || 
      e.tags && e.tags.length > 0 || 
      e.docketUrl
    ).length;
    
    console.log(`📊 ${enrichedCount} events with PDF enrichment (bills/tags/agendas)`);
    
    // Show sample state event
    const sampleState = stateEvents[0];
    console.log('\nSample state event:');
    console.log(`  Name: ${sampleState.name}`);
    console.log(`  Date: ${sampleState.date} at ${sampleState.time}`);
    console.log(`  Location: ${sampleState.location}`);
    console.log(`  Committee: ${sampleState.committee}`);
    if (sampleState.docketUrl) {
      console.log(`  Agenda PDF: ${sampleState.docketUrl.substring(0, 80)}...`);
    }
    if (sampleState.tags && sampleState.tags.length > 0) {
      console.log(`  Tags: ${sampleState.tags.join(', ')}`);
    }
    if (sampleState.bills && sampleState.bills.length > 0) {
      console.log(`  Bills: ${sampleState.bills.slice(0, 3).join(', ')}${sampleState.bills.length > 3 ? '...' : ''}`);
    }
    
    // Test local scraper
    console.log('\n\n📍 PART 2: Little Rock City Board');
    console.log('-'.repeat(60));
    const localEvents = await scrapeLittleRockMeetings();
    
    console.log(`\n✅ Found ${localEvents.length} Little Rock Board meetings`);
    
    // Show sample local event
    const sampleLocal = localEvents[0];
    console.log('\nSample local event:');
    console.log(`  Name: ${sampleLocal.name}`);
    console.log(`  Date: ${sampleLocal.date} at ${sampleLocal.time}`);
    console.log(`  Location: ${sampleLocal.location}`);
    console.log(`  Committee: ${sampleLocal.committee}`);
    console.log(`  Source: ${sampleLocal.sourceUrl}`);
    
    // Summary
    console.log('\n\n📊 ARKANSAS SUMMARY');
    console.log('='.repeat(60));
    console.log(`State Level: ${stateEvents.length} events (${enrichedCount} with PDF data)`);
    console.log(`Local Level: ${localEvents.length} events`);
    console.log(`Total: ${stateEvents.length + localEvents.length} events`);
    
    // Check for deduplication needs
    console.log('\n🔍 Deduplication Check:');
    const stateNames = stateEvents.map(e => e.name.toLowerCase());
    const localNames = localEvents.map(e => e.name.toLowerCase());
    const duplicates = localNames.filter(name => 
      stateNames.some(stateName => stateName.includes('board') || name.includes(stateName.split(' ')[0]))
    );
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} potential duplicates to handle`);
    } else {
      console.log('✅ No obvious duplicates detected');
    }
    
    console.log('\n✅ Arkansas implementation complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error during Arkansas test:', error);
    process.exit(1);
  }
}

testArkansas();

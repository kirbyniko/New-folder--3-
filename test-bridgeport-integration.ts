import { scrapeBridgeportMeetings } from './netlify/functions/utils/scrapers/local/bridgeport';
import { sanitizeEvent } from './netlify/functions/utils/security';

async function test() {
  console.log('🧪 Testing Bridgeport Integration (as seen by frontend)\n');
  
  try {
    // Scrape raw events
    const rawEvents = await scrapeBridgeportMeetings();
    
    // Convert to local-meetings format (same as in local-meetings.ts)
    const events = rawEvents.map(evt => sanitizeEvent({
      id: evt.id,
      name: evt.name,
      date: evt.date,
      time: evt.time,
      location: evt.location,
      committee: evt.committee,
      type: evt.type,
      level: 'local' as const,
      lat: 41.1865,
      lng: -73.1952,
      zipCode: null,
      city: 'Bridgeport',
      state: 'CT',
      url: evt.sourceUrl || null,  // KEY: sourceUrl → url
      docketUrl: evt.docketUrl || null,
      virtualMeetingUrl: evt.virtualMeetingUrl || null,
      description: evt.description || null
    }));
    
    console.log(`✅ Successfully converted ${events.length} events\n`);
    
    // Show what frontend will see
    events.forEach((event, i) => {
      console.log(`\n--- Event ${i + 1} (Frontend View) ---`);
      console.log(`Name: ${event.name}`);
      console.log(`Date: ${event.date}`);
      console.log(`Time: ${event.time}`);
      console.log(`Location: ${event.location}`);
      console.log(`Committee: ${event.committee}`);
      console.log(`\n🔗 Links:`);
      console.log(`  url: ${event.url || 'null'} ${event.url ? '✅' : '❌'}`);
      console.log(`  docketUrl: ${event.docketUrl || 'null'} ${event.docketUrl ? '✅' : '❌'}`);
      console.log(`  sourceUrl: ${(event as any).sourceUrl || 'null'}`);
      
      console.log(`\n🎯 Frontend Buttons:`);
      console.log(`  "View Docket": ${event.docketUrl || event.url || 'MISSING'} ${event.docketUrl || event.url ? '✅ WILL SHOW' : '❌ WON\'T SHOW'}`);
      console.log(`  "Source": ${(event as any).sourceUrl || event.url || 'MISSING'} ${(event as any).sourceUrl || event.url ? '✅ WILL SHOW' : '❌ WON\'T SHOW'}`);
    });
    
    // Summary
    console.log('\n\n📊 Summary:');
    console.log(`Total events: ${events.length}`);
    console.log(`Events with url field: ${events.filter(e => e.url).length} ✅`);
    console.log(`Events with docketUrl: ${events.filter(e => e.docketUrl).length}`);
    console.log(`Events with "View Docket" button: ${events.filter(e => e.docketUrl || e.url).length} ✅`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();

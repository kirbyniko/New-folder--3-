/**
 * Test bill extraction from NH docket page
 * Event 638 has 9 bills
 */

import { NewHampshireScraper } from './utils/scrapers/states/new-hampshire';

async function testBillExtraction() {
  console.log('🧪 Testing NH Bill Extraction\n');
  
  const scraper = new NewHampshireScraper();
  
  // Fetch events (use internal method for testing)
  console.log('📡 Fetching NH events...');
  const rawEvents = await (scraper as any).scrapeCalendar();
  const events = rawEvents.map((e: any) => (scraper as any).transformEvent(e));
  console.log(`✅ Fetched ${events.length} events\n`);
  
  // Find events with bills
  const eventsWithBills = events.filter(e => e.bills && e.bills.length > 0);
  
  console.log(`📋 Events with bills: ${eventsWithBills.length}/${events.length}\n`);
  
  if (eventsWithBills.length > 0) {
    eventsWithBills.forEach(event => {
      console.log(`\n🎯 Event: ${event.name}`);
      console.log(`   URL: ${event.url}`);
      console.log(`   Bills: ${event.bills!.length}`);
      
      event.bills!.forEach((bill, idx) => {
        console.log(`   ${idx + 1}. ${bill.id} - ${bill.title.substring(0, 60)}...`);
        console.log(`      URL: ${bill.url}`);
      });
    });
  } else {
    console.log('⚠️ No events with bills found. This is expected if:');
    console.log('   - Legislature is not in session');
    console.log('   - Only committee meetings (no hearings) scheduled');
    console.log('   - Bills have not been assigned yet');
  }
  
  // Summary
  const totalBills = events.reduce((sum, e) => sum + (e.bills?.length || 0), 0);
  console.log(`\n📊 Summary:`);
  console.log(`   Total events: ${events.length}`);
  console.log(`   Events with bills: ${eventsWithBills.length}`);
  console.log(`   Total bills: ${totalBills}`);
  console.log(`   Events with Zoom: ${events.filter(e => e.virtualMeetingUrl).length}`);
  console.log(`   Events with docket: ${events.filter(e => e.docketUrl).length}`);
}

testBillExtraction().catch(console.error);

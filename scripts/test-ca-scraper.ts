import { CaliforniaScraper } from '../lib/functions/utils/scrapers/states/california';

async function testScraper() {
  console.log('🔍 Testing California scraper with description extraction...\n');
  
  const scraper = new CaliforniaScraper();
  
  try {
    const events = await scraper.scrapeCalendar();
    
    console.log(`✅ Scraped ${events.length} events\n`);
    
    // Show first event with bills
    const eventWithBills = events.find(e => e.bills && e.bills.length > 0);
    
    if (eventWithBills) {
      console.log('📋 Sample event with bills:');
      console.log(`   Committee: ${eventWithBills.committee}`);
      console.log(`   Date: ${eventWithBills.date}`);
      console.log(`   Bills (${eventWithBills.bills?.length}):`);
      
      eventWithBills.bills?.slice(0, 3).forEach(bill => {
        console.log(`\n   📄 ${bill.id}`);
        console.log(`      Title: ${bill.title?.substring(0, 80)}${bill.title && bill.title.length > 80 ? '...' : ''}`);
        console.log(`      Description: ${bill.description ? bill.description.substring(0, 80) + (bill.description.length > 80 ? '...' : '') : '❌ None'}`);
        console.log(`      URL: ${bill.url}`);
      });
    } else {
      console.log('ℹ️  No events with bills found');
    }
    
    // Count bills with descriptions
    let totalBills = 0;
    let billsWithDesc = 0;
    
    for (const event of events) {
      if (event.bills) {
        totalBills += event.bills.length;
        billsWithDesc += event.bills.filter(b => b.description).length;
      }
    }
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Total events: ${events.length}`);
    console.log(`   Events with bills: ${events.filter(e => e.bills && e.bills.length > 0).length}`);
    console.log(`   Total bills: ${totalBills}`);
    console.log(`   Bills with descriptions: ${billsWithDesc} (${totalBills > 0 ? Math.round(billsWithDesc/totalBills*100) : 0}%)`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testScraper();

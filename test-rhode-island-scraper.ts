import { RhodeIslandScraper } from './lib/functions/utils/scrapers/states/rhode-island';

async function testRhodeIsland() {
  console.log('🧪 Testing Rhode Island Scraper\n');
  
  const scraper = new RhodeIslandScraper();
  
  console.log('📊 Configuration:');
  console.log(`   State: ${scraper.config.stateName}`);
  console.log(`   Website: ${scraper.config.websiteUrl}`);
  
  console.log('\n📅 Calendar Sources:');
  const sources = scraper.getCalendarSources();
  sources.forEach(source => {
    console.log(`   - ${source.name}`);
    console.log(`     URL: ${source.url}`);
    console.log(`     Type: ${source.type}`);
  });
  
  console.log('\n🔍 Scraping events...');
  const startTime = Date.now();
  
  try {
    const events = await scraper.scrapeCalendar();
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Found ${events.length} events (${duration}ms)\n`);
    
    if (events.length > 0) {
      console.log('📋 Sample Events:\n');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`${i + 1}. ${event.name}`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Date: ${new Date(event.date).toLocaleDateString()}`);
        console.log(`   Time: ${event.time}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   Type: ${event.type}`);
        if (event.docketUrl) console.log(`   Docket: ${event.docketUrl}`);
        if (event.virtualMeetingUrl) console.log(`   HTML: ${event.virtualMeetingUrl}`);
        console.log('');
      });
    }
    
    // Save to JSON
    const fs = await import('fs/promises');
    await fs.mkdir('public/data', { recursive: true });
    await fs.writeFile(
      'public/data/rhode-island-events.json',
      JSON.stringify(events, null, 2)
    );
    console.log('💾 Saved to public/data/rhode-island-events.json');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

testRhodeIsland();

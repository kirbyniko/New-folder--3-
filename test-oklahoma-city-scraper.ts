/**
 * Test Oklahoma City PrimeGov Scraper
 * 
 * Tests the Oklahoma City local events scraper that uses PrimeGov API.
 */

import { scrapeOklahomaCityMeetings } from './netlify/functions/utils/scrapers/local/oklahoma-city';

async function testScraper() {
  console.log('🧪 Testing Oklahoma City PrimeGov Scraper...\n');
  
  try {
    const events = await scrapeOklahomaCityMeetings();
    
    console.log(`\n✅ Scraped ${events.length} Oklahoma City events\n`);
    
    // Show first 5 events
    console.log('📋 Sample Events:\n');
    events.slice(0, 5).forEach((event, index) => {
      console.log(`${index + 1}. ${event.name}`);
      console.log(`   Date: ${new Date(event.date).toLocaleDateString()}`);
      console.log(`   Time: ${event.time}`);
      console.log(`   Location: ${event.location}`);
      console.log(`   URL: ${event.sourceUrl}`);
      if (event.description) {
        console.log(`   Description: ${event.description.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Stats
    const withVirtualMeeting = events.filter(e => e.virtualMeetingUrl).length;
    const withDocuments = events.filter(e => e.description?.includes('Documents:')).length;
    
    console.log('\n📊 Statistics:');
    console.log(`   Total events: ${events.length}`);
    console.log(`   With virtual meeting links: ${withVirtualMeeting}`);
    console.log(`   With document links: ${withDocuments}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testScraper();

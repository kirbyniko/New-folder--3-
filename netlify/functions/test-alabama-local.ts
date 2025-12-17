/**
 * Test script for Alabama local scrapers (Birmingham & Montgomery)
 * 
 * Run with: npx ts-node netlify/functions/test-alabama-local.ts
 */

import { scrapeBirminghamMeetings } from './utils/scrapers/local/birmingham';
import { scrapeMontgomeryMeetings } from './utils/scrapers/local/montgomery';
import { closeBrowser } from './utils/scrapers/puppeteer-helper';

async function testBirmingham() {
  console.log('\n========================================');
  console.log('Testing Birmingham City Council Scraper');
  console.log('========================================\n');

  try {
    const events = await scrapeBirminghamMeetings();
    
    console.log(`\n✅ Birmingham: Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
      console.log('\nAll events:');
      events.forEach((event, i) => {
        console.log(`${i + 1}. ${event.name} - ${event.date} at ${event.time}`);
      });
    } else {
      console.log('\n⚠️  No events found - may need selector adjustment');
    }
  } catch (error) {
    console.error('\n❌ Birmingham scraper failed:', error);
  }
}

async function testMontgomery() {
  console.log('\n========================================');
  console.log('Testing Montgomery City Council Scraper');
  console.log('========================================\n');

  try {
    const events = await scrapeMontgomeryMeetings();
    
    console.log(`\n✅ Montgomery: Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
      console.log('\nAll events:');
      events.forEach((event, i) => {
        console.log(`${i + 1}. ${event.name} - ${event.date} at ${event.time}`);
      });
    } else {
      console.log('\n⚠️  No events found - may still be blocked or need selector adjustment');
    }
  } catch (error) {
    console.error('\n❌ Montgomery scraper failed:', error);
  }
}

async function main() {
  console.log('🏛️  Testing Alabama Local Event Scrapers');
  console.log('Using Puppeteer for JavaScript-rendered calendars\n');

  try {
    // Test Birmingham
    await testBirmingham();
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test Montgomery
    await testMontgomery();
    
    console.log('\n========================================');
    console.log('Testing Complete');
    console.log('========================================\n');
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    // Close browser to free resources
    await closeBrowser();
    console.log('Browser closed. Exiting...\n');
  }
}

main();

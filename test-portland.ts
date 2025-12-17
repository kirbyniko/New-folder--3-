import { scrapePortlandMeetings } from './netlify/functions/utils/scrapers/local/portland';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🧪 Testing Portland event scraper...\n');
  
  const events = await scrapePortlandMeetings();
  
  console.log(`\n✅ Found ${events.length} Portland events\n`);
  
  if (events.length > 0) {
    console.log('Sample events (first 10):');
    events.slice(0, 10).forEach((event, idx) => {
      console.log(`\n${idx + 1}. ${event.title}`);
      console.log(`   Date: ${new Date(event.date).toLocaleDateString()}`);
      console.log(`   Time: ${event.time}`);
      console.log(`   Location: ${event.location}`);
      console.log(`   Type: ${event.type}`);
      console.log(`   URL: ${event.sourceUrl}`);
    });
    
    console.log(`\n📊 Event breakdown:`);
    const types = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(types).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  } else {
    console.log('⚠️ No events found - check scraper logic');
  }
}

main().catch(console.error);

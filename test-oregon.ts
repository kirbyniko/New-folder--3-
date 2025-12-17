import { scrapeOregonEvents } from './netlify/functions/utils/scrapers/states/oregon';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🧪 Testing Oregon event scraper...\n');
  console.log(`API Key loaded: ${process.env.OPENSTATES_API_KEY ? 'Yes' : 'No'}`);
  
  const events = await scrapeOregonEvents();
  
  console.log(`\n✅ Found ${events.length} Oregon events\n`);
  
  if (events.length > 0) {
    console.log('Sample events:');
    events.slice(0, 5).forEach((event, idx) => {
      console.log(`\n${idx + 1}. ${event.title}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Time: ${event.time || 'TBD'}`);
      console.log(`   Location: ${event.location || 'TBD'}`);
      if (event.description) {
        console.log(`   Description: ${event.description.substring(0, 100)}...`);
      }
      if (event.agendaUrl) {
        console.log(`   Agenda: ${event.agendaUrl}`);
      }
    });
    
    // Generate static JSON file
    const outputData = {
      count: events.length,
      billsCount: 0,
      lastUpdated: new Date().toISOString(),
      events: events
    };
    
    const outputPath = path.join(process.cwd(), 'public', 'data', 'oregon-events.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    
    console.log(`\n✅ Generated ${outputPath} with ${events.length} events`);
  } else {
    console.log('⚠️ No events found (legislature may be in interim period)');
    console.log('Note: Oregon legislature meets biennially in odd years');
    
    // Create empty static file
    const outputData = {
      count: 0,
      billsCount: 0,
      lastUpdated: new Date().toISOString(),
      events: []
    };
    
    const outputPath = path.join(process.cwd(), 'public', 'data', 'oregon-events.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    
    console.log(`\n✅ Generated ${outputPath} with 0 events (interim period)`);
  }
}

main().catch(console.error);

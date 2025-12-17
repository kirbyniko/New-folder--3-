#!/usr/bin/env tsx
/**
 * Manual script to scrape Virginia data and save to static JSON
 * Run: npx tsx scripts/scrape-virginia.ts
 * 
 * This bypasses serverless timeout issues by running locally
 */

import { writeFileSync } from 'fs';
import { VirginiaScraper } from '../netlify/functions/utils/scrapers/states/virginia';

async function main() {
  console.log('🏛️ Virginia Scraper - Manual Run');
  console.log('================================\n');
  
  const scraper = new VirginiaScraper();
  
  try {
    console.log('🚀 Starting scrape...');
    const events = await scraper.scrape();
    
    console.log(`\n✅ Scrape completed successfully!`);
    console.log(`📊 Total events: ${events.length}`);
    
    const eventsWithBills = events.filter(e => e.bills && e.bills.length > 0);
    const totalBills = events.reduce((sum, e) => sum + (e.bills?.length || 0), 0);
    
    console.log(`📋 Events with bills: ${eventsWithBills.length}`);
    console.log(`📋 Total bills: ${totalBills}`);
    
    // Save to public folder for static serving
    const output = {
      state: 'VA',
      events,
      count: events.length,
      billsCount: totalBills,
      source: 'manual-scrape',
      lastUpdated: new Date().toISOString()
    };
    
    const outputPath = './public/data/virginia-events.json';
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\n💾 Data saved to: ${outputPath}`);
    console.log(`\n🎉 Done! Virginia events are now available statically.`);
    
  } catch (error) {
    console.error('\n❌ Scrape failed:', error);
    process.exit(1);
  }
}

main();

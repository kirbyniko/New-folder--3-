#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { db } from '../db/client';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run export <scraper-id-or-name> [output-file]');
    console.log('Example: npm run export 1 ./honolulu-export.json');
    console.log('Example: npm run export "Honolulu City Council Calendar"');
    process.exit(1);
  }
  
  const scraperIdOrName = args[0];
  const outputFile = args[1] || `./scraper-${scraperIdOrName}.json`;
  
  try {
    console.log(`📤 Exporting scraper: ${scraperIdOrName}`);
    
    // Try to find scraper by ID or name
    let scraperId: number;
    
    if (/^\d+$/.test(scraperIdOrName)) {
      // It's an ID
      scraperId = parseInt(scraperIdOrName);
    } else {
      // It's a name, look it up
      const scrapers = await db.listScrapers();
      const scraper = scrapers.find(s => s.name === scraperIdOrName);
      
      if (!scraper) {
        console.error(`❌ Scraper not found: ${scraperIdOrName}`);
        console.log('\nAvailable scrapers:');
        scrapers.forEach(s => console.log(`  - ${s.name} (ID: ${s.id})`));
        process.exit(1);
      }
      
      scraperId = scraper.id;
    }
    
    // Export configuration
    const config = await db.exportScraper(scraperId);
    
    // Write to file
    const json = JSON.stringify(config, null, 2);
    await writeFile(outputFile, json, 'utf-8');
    
    console.log(`✅ Successfully exported scraper: ${config.name}`);
    console.log(`   Output file: ${outputFile}`);
    console.log(`   Page Structures: ${config.pageStructures?.length || 0}`);
    console.log(`   Total Fields: ${config.pageStructures?.reduce((sum, ps) => sum + (ps.fields?.length || 0), 0) || 0}`);
    
  } catch (error) {
    console.error('❌ Error exporting scraper:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();

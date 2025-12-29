#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { db } from '../db/client';
import { ScraperConfig } from '../types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { join } from 'path';

const ajv = new Ajv();
addFormats(ajv); // Add format validation

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run import <json-file>');
    console.log('Example: npm run import ./examples/honolulu-calendar.json');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  try {
    console.log(`📥 Importing scraper from: ${filePath}`);
    
    // Read and parse JSON file
    const fileContent = await readFile(filePath, 'utf-8');
    const config: ScraperConfig = JSON.parse(fileContent);
    
    // Validate against schema (optional but recommended)
    const schemaPath = join(__dirname, '../../scraper-schema.json');
    const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
    const validate = ajv.compile(schema);
    const valid = validate(config);
    
    if (!valid) {
      console.error('❌ Invalid scraper configuration:');
      console.error(validate.errors);
      process.exit(1);
    }
    
    // Import to database
    const scraperId = await db.importScraper(config);
    
    console.log(`✅ Successfully imported scraper: ${config.name}`);
    console.log(`   ID: ${scraperId}`);
    console.log(`   Start URL: ${config.startUrl}`);
    console.log(`   Page Structures: ${config.pageStructures?.length || 0}`);
    console.log(`   Total Fields: ${config.pageStructures?.reduce((sum, ps) => sum + (ps.fields?.length || 0), 0) || 0}`);
    
  } catch (error) {
    console.error('❌ Error importing scraper:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();

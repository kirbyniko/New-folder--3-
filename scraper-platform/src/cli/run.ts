#!/usr/bin/env node
import { Command } from 'commander';
import { ScraperEngine } from '../engine/scraper-engine.js';
import { db } from '../db/client.js';

const program = new Command();

program
  .name('run-scraper')
  .description('Run a scraper by ID or name')
  .argument('<scraper>', 'Scraper ID or name')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-headless', 'Run browser in visible mode')
  .option('--max-pages <number>', 'Maximum pages to scrape', '10')
  .option('--no-save', 'Do not save to database (dry run)')
  .action(async (scraperId: string, options) => {
    try {
      console.log(`📥 Loading scraper: ${scraperId}`);
      
      // Load scraper config
      const config = await db.exportScraper(scraperId);
      
      if (!config) {
        console.error(`❌ Scraper not found: ${scraperId}`);
        process.exit(1);
      }

      console.log(`✅ Loaded: ${config.name}`);
      console.log(`   Start URL: ${config.startUrl}`);
      console.log(`   Requires Puppeteer: ${config.requiresPuppeteer}`);
      console.log();

      // Create engine
      const engine = new ScraperEngine(config, {
        headless: options.headless,
        maxPages: parseInt(options.maxPages),
        saveToDatabase: options.save,
        verbose: options.verbose
      });

      // Run scraper
      console.log('🚀 Starting scraper...\n');
      const startTime = Date.now();
      
      const items = await engine.run();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n✅ Scraper completed in ${duration}s`);
      console.log(`   Items found: ${items.length}`);
      
      if (options.verbose && items.length > 0) {
        console.log('\n📊 Sample items:');
        console.log(JSON.stringify(items.slice(0, 3), null, 2));
      }

      process.exit(0);

    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();

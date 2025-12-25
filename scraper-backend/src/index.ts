#!/usr/bin/env node
/**
 * Scraper Backend Entry Point
 * 
 * This service runs on your local PC and handles:
 * 1. Scheduled scraping of all state legislative websites (every 24 hours)
 * 2. Data enrichment and validation
 * 3. Database population via PostgreSQL connection
 * 
 * Architecture:
 * - Scraper Backend (this) → PostgreSQL (cloud) ← API Backend (Netlify Functions)
 * - Frontend talks ONLY to API Backend
 * - API Backend is read-only (no scraping, just serves data)
 */

import dotenv from 'dotenv';
import cron from 'node-cron';
import { runAllScrapers } from './scraper.js';
import { testDatabaseConnection } from './db/connection.js';

// Load environment variables
dotenv.config();

const SCRAPE_INTERVAL = process.env.SCRAPE_INTERVAL_HOURS || '24';

async function main() {
  console.log('🚀 Civitron Scraper Backend Starting...\n');
  console.log('📊 Configuration:');
  console.log(`   - Database: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`);
  console.log(`   - Scrape Interval: Every ${SCRAPE_INTERVAL} hours`);
  console.log(`   - Log Level: ${process.env.LOG_LEVEL || 'info'}\n`);

  // Test database connection
  console.log('🔌 Testing database connection...');
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.error('❌ FATAL: Cannot connect to PostgreSQL database');
    console.error('   Check your .env file configuration');
    process.exit(1);
  }
  
  console.log('✅ Database connection successful\n');

  // Run scrapers immediately on startup
  console.log('🏃 Running initial scrape...');
  await runAllScrapers();

  // Schedule scrapers to run every 24 hours (or configured interval)
  // Default: 3:00 AM daily
  const cronSchedule = `0 3 */${SCRAPE_INTERVAL} * *`;
  
  console.log(`\n⏰ Scheduling scrapers: ${cronSchedule}`);
  console.log('   (Next run at 3:00 AM)\n');
  
  cron.schedule(cronSchedule, async () => {
    console.log(`\n🕐 [${new Date().toISOString()}] Scheduled scrape starting...`);
    await runAllScrapers();
  });

  console.log('✅ Scraper backend is running');
  console.log('   Press Ctrl+C to stop\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down scraper backend...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down scraper backend...');
  process.exit(0);
});

// Start the service
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

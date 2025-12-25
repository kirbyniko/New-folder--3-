/**
 * Test database connection
 * 
 * Run this to verify your PostgreSQL configuration is correct
 */

import dotenv from 'dotenv';
import { testDatabaseConnection, closeDatabaseConnection } from './db/connection.js';
import { getDatabaseStats } from './db/maintenance.js';

dotenv.config();

async function test() {
  console.log('🔌 Testing PostgreSQL connection...\n');
  
  console.log('Configuration:');
  console.log(`  Host: ${process.env.POSTGRES_HOST}`);
  console.log(`  Port: ${process.env.POSTGRES_PORT}`);
  console.log(`  Database: ${process.env.POSTGRES_DB}`);
  console.log(`  User: ${process.env.POSTGRES_USER}\n`);

  const connected = await testDatabaseConnection();
  
  if (!connected) {
    console.error('\n❌ Connection failed!');
    console.error('   Check your .env file settings');
    process.exit(1);
  }

  console.log('\n📊 Database Statistics:');
  const stats = await getDatabaseStats();
  console.log(`  Total Events: ${stats.total_events}`);
  console.log(`  Upcoming Events: ${stats.upcoming_events}`);
  console.log(`  States with Events: ${stats.states_with_events}`);
  console.log(`  Recent Scrapes (24h): ${stats.recent_scrapes}`);

  await closeDatabaseConnection();
  console.log('\n✅ Test completed successfully!');
}

test().catch(console.error);

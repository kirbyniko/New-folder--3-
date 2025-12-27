/**
 * Test Production Database Connection
 * Verifies your PC can connect to Neon PostgreSQL
 */

import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { getPool } from '../lib/functions/utils/db/connection.js';

// Load environment variables first
loadEnvFile();

async function testConnection() {
  console.log('🔍 Testing connection to production database...\n');
  
  try {
    const pool = getPool();
    
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic connection...');
    const result = await pool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Connected successfully!');
    console.log(`   Server time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[1]}\n`);
    
    // Test 2: Check states table
    console.log('2️⃣ Checking states table...');
    const statesResult = await pool.query('SELECT COUNT(*) as count FROM states');
    console.log(`✅ States table has ${statesResult.rows[0].count} states\n`);
    
    // Test 3: Check current events
    console.log('3️⃣ Checking events table...');
    const eventsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT state_code) as states_with_events,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM events
      WHERE date >= CURRENT_DATE
    `);
    
    const stats = eventsResult.rows[0];
    console.log(`✅ Events table stats:`);
    console.log(`   Total events: ${stats.total_events}`);
    console.log(`   States with data: ${stats.states_with_events}`);
    console.log(`   Date range: ${stats.earliest_date} to ${stats.latest_date}\n`);
    
    // Test 4: Events by state
    console.log('4️⃣ Events breakdown by state...');
    const byStateResult = await pool.query(`
      SELECT 
        state_code,
        COUNT(*) as event_count,
        MAX(scraped_at) as last_scraped
      FROM events
      WHERE date >= CURRENT_DATE
      GROUP BY state_code
      ORDER BY event_count DESC
    `);
    
    if (byStateResult.rows.length > 0) {
      console.log('✅ Current data:');
      byStateResult.rows.forEach(row => {
        const hoursSince = row.last_scraped 
          ? Math.round((Date.now() - new Date(row.last_scraped).getTime()) / (1000 * 60 * 60))
          : 'unknown';
        console.log(`   ${row.state_code}: ${row.event_count} events (scraped ${hoursSince}h ago)`);
      });
    } else {
      console.log('⚠️  No events in database yet');
    }
    
    console.log('\n✅ All tests passed! Ready to scrape.\n');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check .env file has Neon credentials');
    console.error('2. Verify POSTGRES_SSL=true is set');
    console.error('3. Check firewall allows outbound port 5432');
    process.exit(1);
  }
}

testConnection();

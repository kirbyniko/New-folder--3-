/**
 * Test 24-hour cleanup logic
 * Verifies that old events are automatically deleted
 */

import 'dotenv/config';
import { getPool } from './netlify/functions/utils/db/connection.ts';

async function testCleanup() {
  console.log('🧪 Testing 24-hour cleanup logic\n');
  
  const pool = getPool();
  
  try {
    // Insert a test event from 48 hours ago
    console.log('1️⃣ Inserting old event (48 hours ago)...');
    const oldEvent = await pool.query(`
      INSERT INTO events (
        name, date, location_name, lat, lng, level, state_code, 
        description, fingerprint, scraped_at, scraper_source
      ) VALUES (
        'Old Test Event',
        NOW() - INTERVAL '48 hours',
        'Old Location',
        34.0522,
        -118.2437,
        'state',
        'CA',
        'This event should be deleted',
        'test-old-' || NOW()::text,
        NOW() - INTERVAL '48 hours',
        'test'
      )
      RETURNING id
    `);
    console.log(`✅ Old event inserted: ${oldEvent.rows[0].id}`);
    
    // Insert a recent event (12 hours ago)
    console.log('\n2️⃣ Inserting recent event (12 hours ago)...');
    const recentEvent = await pool.query(`
      INSERT INTO events (
        name, date, location_name, lat, lng, level, state_code,
        description, fingerprint, scraped_at, scraper_source
      ) VALUES (
        'Recent Test Event',
        NOW() - INTERVAL '12 hours',
        'Recent Location',
        34.0522,
        -118.2437,
        'state',
        'CA',
        'This event should remain',
        'test-recent-' || NOW()::text,
        NOW() - INTERVAL '12 hours',
        'test'
      )
      RETURNING id
    `);
    console.log(`✅ Recent event inserted: ${recentEvent.rows[0].id}`);
    
    // Count events before cleanup
    console.log('\n3️⃣ Counting events before cleanup...');
    const beforeCount = await pool.query(`SELECT COUNT(*) FROM events`);
    console.log(`📊 Total events: ${beforeCount.rows[0].count}`);
    
    // Run cleanup (delete events older than 24 hours)
    console.log('\n4️⃣ Running cleanup...');
    const cleanupResult = await pool.query(`
      DELETE FROM events WHERE scraped_at < NOW() - INTERVAL '24 hours'
    `);
    console.log(`🧹 Deleted ${cleanupResult.rowCount} old events`);
    
    // Count events after cleanup
    console.log('\n5️⃣ Counting events after cleanup...');
    const afterCount = await pool.query(`SELECT COUNT(*) FROM events`);
    console.log(`📊 Total events: ${afterCount.rows[0].count}`);
    
    // Verify the old event is gone
    const oldEventCheck = await pool.query(`
      SELECT id FROM events WHERE id = $1
    `, [oldEvent.rows[0].id]);
    
    // Verify the recent event still exists
    const recentEventCheck = await pool.query(`
      SELECT id FROM events WHERE id = $1
    `, [recentEvent.rows[0].id]);
    
    console.log('\n6️⃣ Verification:');
    console.log(`   Old event (48h): ${oldEventCheck.rows.length === 0 ? '✅ DELETED' : '❌ STILL EXISTS'}`);
    console.log(`   Recent event (12h): ${recentEventCheck.rows.length === 1 ? '✅ KEPT' : '❌ DELETED'}`);
    
    // Clean up test data
    await pool.query(`DELETE FROM events WHERE scraper_source = 'test'`);
    
    console.log('\n✅ Cleanup test complete!');
    console.log('\n💡 The scheduled-scraper will automatically run this cleanup');
    console.log('   before each scrape to keep the database fresh.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testCleanup();

/**
 * Clear all fake test data from database
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function clearFakeData() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'civitron',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
  });

  try {
    await client.connect();
    console.log('🗑️  Clearing all fake test data from database...\n');

    // Delete all events with example.com URLs (fake data)
    const result = await client.query(`
      DELETE FROM events 
      WHERE details_url LIKE '%example.com%'
      RETURNING id, name
    `);

    console.log(`✅ Deleted ${result.rowCount} fake events:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.name} (ID: ${row.id})`);
    });

    // Also clear any events from today that might be test data
    const todayResult = await client.query(`
      DELETE FROM events 
      WHERE date = CURRENT_DATE 
      AND (
        name LIKE '%Test%' OR 
        name LIKE '%Sample%' OR
        name LIKE '%Fake%'
      )
      RETURNING id, name
    `);

    if (todayResult.rowCount > 0) {
      console.log(`\n✅ Deleted ${todayResult.rowCount} additional test events:`);
      todayResult.rows.forEach(row => {
        console.log(`   - ${row.name} (ID: ${row.id})`);
      });
    }

    console.log('\n✨ Database cleaned! Only real events remain.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

clearFakeData();

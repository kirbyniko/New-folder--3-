import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { getPool } from '../lib/functions/utils/db/connection.js';

loadEnvFile();

async function checkDatabase() {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT state_code, COUNT(*) as event_count
      FROM events
      WHERE date >= CURRENT_DATE
      GROUP BY state_code
      ORDER BY state_code
    `);
    
    console.log('\n📊 Events in Database:\n' + '='.repeat(50));
    let total = 0;
    for (const row of result.rows) {
      console.log(`${row.state_code}: ${row.event_count} events`);
      total += parseInt(row.event_count);
    }
    console.log('='.repeat(50));
    console.log(`Total: ${total} events across ${result.rows.length} states\n`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();

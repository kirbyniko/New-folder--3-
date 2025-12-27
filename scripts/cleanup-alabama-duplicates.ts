import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { getPool } from '../lib/functions/utils/db/connection.js';

loadEnvFile();

const pool = getPool();

console.log('🧹 Cleaning up duplicate Alabama state events...\n');

// First, check how many we have
const countResult = await pool.query(`
  SELECT COUNT(*) as count
  FROM events
  WHERE state_code = 'AL' AND level = 'state'
`);

console.log(`Found ${countResult.rows[0].count} Alabama state events to delete.\n`);

// Delete all Alabama state events
const deleteResult = await pool.query(`
  DELETE FROM events
  WHERE state_code = 'AL' AND level = 'state'
  RETURNING id, name
`);

console.log(`✅ Deleted ${deleteResult.rows.length} Alabama state events:\n`);
deleteResult.rows.forEach((row, i) => {
  console.log(`${i + 1}. ${row.name} (ID: ${row.id})`);
});

await pool.end();
console.log('\n✅ Cleanup complete! Ready to re-scrape with proper external IDs.');

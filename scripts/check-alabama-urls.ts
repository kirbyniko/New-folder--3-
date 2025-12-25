import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { getPool } from '../netlify/functions/utils/db/connection.js';

loadEnvFile();

const pool = getPool();

console.log('Checking Alabama event URLs in database...\n');

const result = await pool.query(`
  SELECT id, name, source_url, level, scraped_at, last_updated
  FROM events
  WHERE state_code = 'AL' AND level = 'state'
  ORDER BY date
`);

console.log(`Found ${result.rows.length} Alabama state events:\n`);

result.rows.forEach((row, i) => {
  console.log(`${i + 1}. ${row.name}`);
  console.log(`   URL: ${row.source_url}`);
  console.log(`   Level: ${row.level}`);
  console.log(`   Last Updated: ${row.last_updated}`);
  console.log('');
});

await pool.end();

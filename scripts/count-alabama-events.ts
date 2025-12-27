import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { getPool } from '../lib/functions/utils/db/connection.js';

loadEnvFile();

const pool = getPool();

const result = await pool.query(`
  SELECT COUNT(*) as count, level 
  FROM events 
  WHERE state_code = 'AL' 
  GROUP BY level
  ORDER BY level
`);

console.log('Alabama events by level in database:');
result.rows.forEach(r => console.log(`  ${r.level}: ${r.count} events`));

await pool.end();

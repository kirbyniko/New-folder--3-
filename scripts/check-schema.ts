import { loadEnvFile } from '../lib/functions/utils/env-loader.js';
import { getPool } from '../lib/functions/utils/db/connection.js';

loadEnvFile();

const pool = getPool();

// Check constraints
const constraints = await pool.query(`
  SELECT conname, contype 
  FROM pg_constraint 
  WHERE conrelid = 'events'::regclass
`);

console.log('\n📋 Constraints on events table:');
constraints.rows.forEach(r => {
  const type = r.contype === 'p' ? 'PRIMARY KEY' :
               r.contype === 'f' ? 'FOREIGN KEY' :
               r.contype === 'u' ? 'UNIQUE' :
               r.contype === 'c' ? 'CHECK' : r.contype;
  console.log(`   - ${r.conname} (${type})`);
});

// Check indexes
const indexes = await pool.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'events'
`);

console.log('\n📑 Indexes on events table:');
indexes.rows.forEach(r => {
  console.log(`   - ${r.indexname}`);
});

// Check if fingerprint column exists
const columns = await pool.query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'events'
  ORDER BY ordinal_position
`);

console.log('\n📊 Columns in events table:');
columns.rows.forEach(r => {
  console.log(`   - ${r.column_name} (${r.data_type}${r.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
});

await pool.end();

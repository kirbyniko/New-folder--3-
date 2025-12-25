/**
 * Check events with docket_url in Neon database
 */

import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  console.log('📊 Events with docket_url in Neon PostgreSQL:\n');
  
  const stateCount = await client.query(`
    SELECT state_code, COUNT(*) as count 
    FROM events 
    WHERE docket_url IS NOT NULL 
    GROUP BY state_code 
    ORDER BY state_code
  `);
  
  let total = 0;
  stateCount.rows.forEach(row => {
    console.log(`  ${row.state_code}: ${row.count} events`);
    total += parseInt(row.count);
  });
  
  console.log(`\n  TOTAL: ${total} events with docket_url\n`);
  
  // Sample events
  const sample = await client.query(`
    SELECT id, name, state_code, date, docket_url
    FROM events 
    WHERE docket_url IS NOT NULL 
    LIMIT 5
  `);
  
  console.log('📄 Sample events:\n');
  sample.rows.forEach(event => {
    console.log(`  ${event.state_code} - ${event.name.substring(0, 50)}...`);
    console.log(`     URL: ${event.docket_url.substring(0, 80)}...\n`);
  });
  
  await client.end();
}

main();

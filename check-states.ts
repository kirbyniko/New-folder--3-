import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function checkStates() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  await client.connect();
  
  const result = await client.query(`
    SELECT DISTINCT state_code, COUNT(*) as count 
    FROM events 
    GROUP BY state_code 
    ORDER BY count DESC
  `);
  
  console.log('States in database:');
  result.rows.forEach(row => {
    console.log(`  ${row.state_code}: ${row.count} events`);
  });
  
  await client.end();
}

checkStates();

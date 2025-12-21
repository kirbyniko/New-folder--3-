import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function clearOldEvents() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Delete all events (they'll be re-scraped with correct data)
    const deleteResult = await client.query('DELETE FROM events');
    console.log(`✅ Deleted ${deleteResult.rowCount} events`);

    // Delete orphaned bills (cascade should handle this, but just in case)
    const deleteBills = await client.query('DELETE FROM bills WHERE id NOT IN (SELECT bill_id FROM event_bills)');
    console.log(`✅ Deleted ${deleteBills.rowCount} orphaned bills`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

clearOldEvents();

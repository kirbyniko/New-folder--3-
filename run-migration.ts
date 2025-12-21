import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const sql = readFileSync('database/migrations/001_add_missing_fields.sql', 'utf8');
    await client.query(sql);
    
    console.log('✅ Migration complete - added missing fields to events table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();

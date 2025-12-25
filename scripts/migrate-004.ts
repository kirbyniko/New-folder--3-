import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import 'dotenv/config';

const db = neon(process.env.DATABASE_URL!);

async function migrate() {
  const migration = readFileSync('database/migrations/004_add_bill_description.sql', 'utf-8');
  
  try {
    await db.unsafe(migration);
    console.log('✅ Migration 004 applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

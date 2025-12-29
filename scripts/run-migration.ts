#!/usr/bin/env tsx
/**
 * Run database migration for unified events table
 * Adds metadata JSONB column and type VARCHAR column to events table
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use Neon database from root .env
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    // Read migration file
    const migrationPath = join(__dirname, '../database/migrations/005_add_metadata_column.sql');
    const migration = readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Running migration: 005_add_metadata_column.sql\n');
    await client.query(migration);
    console.log('✅ Migration executed successfully!\n');
    
    // Verify changes
    console.log('🔍 Verifying new columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events'
      AND column_name IN ('metadata', 'type')
      ORDER BY column_name;
    `);
    
    if (columnsResult.rows.length >= 1) {
      console.log('✅ Columns found:');
      columnsResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }
    
    // Check indexes
    console.log('\n🔍 Verifying indexes...');
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'events'
      AND (indexname = 'idx_events_metadata' OR indexname = 'idx_events_type')
      ORDER BY indexname;
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ Indexes found:');
      indexResult.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
    }
    
    console.log('\n🎉 Migration complete! Events table now supports:');
    console.log('   - type VARCHAR(50) for event classification');
    console.log('   - metadata JSONB for scraper-specific fields');
    console.log('   - GIN index on metadata for fast queries\n');
    
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Columns already exist - migration previously completed');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

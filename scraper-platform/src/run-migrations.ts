-- Run migrations script for scraper-platform
import { db } from './db/client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');
  
  try {
    // Run the metadata column migration
    const migration005 = readFileSync(
      join(__dirname, '../../../database/migrations/005_add_metadata_column.sql'),
      'utf-8'
    );
    
    console.log('📝 Running migration: 005_add_metadata_column.sql');
    await db.pool.query(migration005);
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the changes
    console.log('🔍 Verifying new columns...');
    const result = await db.pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events'
      AND column_name IN ('metadata', 'type')
      ORDER BY column_name;
    `);
    
    if (result.rows.length === 2) {
      console.log('✅ Columns verified:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️  Expected 2 columns, found:', result.rows.length);
    }
    
    // Check indexes
    console.log('\n🔍 Verifying indexes...');
    const indexes = await db.pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'events'
      AND indexname IN ('idx_events_metadata', 'idx_events_type')
      ORDER BY indexname;
    `);
    
    if (indexes.rows.length === 2) {
      console.log('✅ Indexes verified:');
      indexes.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
    } else {
      console.log('⚠️  Expected 2 indexes, found:', indexes.rows.length);
    }
    
    console.log('\n🎉 Database migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.pool.end();
  }
}

runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

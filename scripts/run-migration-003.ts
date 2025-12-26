/**
 * Run migration 003 - Smart Scraping System
 * Adds tracking columns and archived_events table
 */

import { getPool } from '../netlify/functions/utils/db/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🚀 Running migration 003: Smart Scraping System');
  
  const pool = getPool();
  
  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', '003_smart_scraping.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration 003 completed successfully');
    console.log('📊 Database now supports:');
    console.log('   - Event lifecycle tracking (last_seen_at, scrape_cycle_count)');
    console.log('   - Soft deletion (removed_at)');
    console.log('   - Historical archive (archived_events table)');
    console.log('   - Smart scraping with data preservation');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);

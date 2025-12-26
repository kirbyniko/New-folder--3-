// Create data_sources table in PostgreSQL
import { loadEnvFile } from '../netlify/functions/utils/env-loader.js';
import { getPool } from '../netlify/functions/utils/db/connection.js';

loadEnvFile();

const pool = getPool();

async function createTable() {
  try {
    console.log('📊 Creating data_sources table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_sources (
        id TEXT PRIMARY KEY,
        state_code TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        last_checked TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        update_frequency_hours INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_data_sources_state ON data_sources(state_code)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status)');

    console.log('✅ Table created successfully');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTable();

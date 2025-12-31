// Run database migration for scraper_configs table
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read migration file
    const migrationPath = join(__dirname, 'database', 'migrations', '007_scraper_configs.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Verify table exists
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scraper_configs'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📊 Table 'scraper_configs' created with ${result.rows.length} columns:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

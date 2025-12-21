import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function addFingerprintConstraint() {
  console.log('\n🔧 ADDING FINGERPRINT CONSTRAINT\n');
  
  try {
    // Add unique constraint on fingerprint
    console.log('1. Adding UNIQUE constraint on fingerprint...');
    await pool.query(`
      ALTER TABLE events 
      ADD CONSTRAINT events_fingerprint_key 
      UNIQUE (fingerprint)
    `);
    console.log('✅ UNIQUE constraint added');
    
    // Set NOT NULL on fingerprint
    console.log('\n2. Setting NOT NULL on fingerprint...');
    await pool.query(`
      ALTER TABLE events 
      ALTER COLUMN fingerprint SET NOT NULL
    `);
    console.log('✅ NOT NULL constraint added on fingerprint');
    
    // Set NOT NULL on scraper_source
    console.log('\n3. Setting NOT NULL on scraper_source...');
    await pool.query(`
      ALTER TABLE events 
      ALTER COLUMN scraper_source SET NOT NULL
    `);
    console.log('✅ NOT NULL constraint added on scraper_source');
    
    // Drop old constraint
    console.log('\n4. Dropping old composite constraint...');
    await pool.query(`
      ALTER TABLE events 
      DROP CONSTRAINT IF EXISTS events_scraper_source_external_id_key
    `);
    console.log('✅ Old constraint dropped');
    
    // Add index on scraper_source
    console.log('\n5. Adding index on scraper_source...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_scraper_source 
      ON events(scraper_source)
    `);
    console.log('✅ Index added');
    
    console.log('\n✅ All constraints applied successfully!');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addFingerprintConstraint();

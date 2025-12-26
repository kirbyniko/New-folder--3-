import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function fix() {
  try {
    await pool.query(`
      ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_fingerprint;
      ALTER TABLE events ADD CONSTRAINT unique_fingerprint UNIQUE (fingerprint);
    `);
    console.log('✅ Added fingerprint UNIQUE constraint');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

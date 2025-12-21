import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected:', result.rows[0].now);
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tables:');
    tablesResult.rows.forEach(r => console.log('  -', r.table_name));
    
    const eventsResult = await pool.query('SELECT COUNT(*) FROM events WHERE date >= CURRENT_DATE');
    console.log('\n📊 Events (future):', eventsResult.rows[0].count);
    
    await pool.end();
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

test();

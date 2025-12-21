import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function backupDatabase() {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupTable = `events_backup_${timestamp}`;
  
  console.log('\n📦 DATABASE BACKUP\n');
  
  try {
    // Create backup table
    console.log(`Creating backup table: ${backupTable}...`);
    await pool.query(`
      CREATE TABLE ${backupTable} AS 
      SELECT * FROM events
    `);
    
    // Verify backup
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${backupTable}`);
    const backupCount = parseInt(countResult.rows[0].count);
    
    const originalCount = await pool.query(`SELECT COUNT(*) as count FROM events`);
    const origCount = parseInt(originalCount.rows[0].count);
    
    console.log(`✅ Backup created successfully`);
    console.log(`   Original table: ${origCount} rows`);
    console.log(`   Backup table: ${backupCount} rows`);
    
    if (backupCount !== origCount) {
      throw new Error(`Backup verification failed: counts don't match!`);
    }
    
    // Show duplicate stats
    const dupes = await pool.query(`
      SELECT 
        fingerprint,
        COUNT(*) as count
      FROM ${backupTable}
      GROUP BY fingerprint
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 5
    `);
    
    if (dupes.rows.length > 0) {
      console.log(`\n📊 Duplicate fingerprints found: ${dupes.rows.length}`);
      dupes.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.fingerprint.substring(0, 16)}... (${row.count} duplicates)`);
      });
    }
    
    console.log(`\n💾 Backup table: ${backupTable}`);
    console.log(`   To restore: DROP TABLE events; ALTER TABLE ${backupTable} RENAME TO events;`);
    
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backupDatabase();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function checkDuplicates() {
  console.log('\n🔍 DUPLICATE DETECTION\n');
  
  try {
    // Check for duplicate fingerprints
    const fingerprintDupes = await pool.query(`
      SELECT 
        fingerprint,
        COUNT(*) as count,
        array_agg(id) as event_ids,
        array_agg(name) as names
      FROM events
      GROUP BY fingerprint
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (fingerprintDupes.rows.length > 0) {
      console.error(`❌ ALERT: ${fingerprintDupes.rows.length} duplicate fingerprints detected!\n`);
      
      fingerprintDupes.rows.slice(0, 10).forEach((row, i) => {
        console.error(`${i + 1}. Fingerprint: ${row.fingerprint.substring(0, 20)}...`);
        console.error(`   Event: "${row.names[0]}"`);
        console.error(`   Count: ${row.count} duplicates`);
        console.error(`   IDs: ${row.event_ids.slice(0, 3).join(', ')}${row.event_ids.length > 3 ? '...' : ''}`);
      });
      
      if (fingerprintDupes.rows.length > 10) {
        console.error(`   ... and ${fingerprintDupes.rows.length - 10} more duplicate groups`);
      }
      
      console.error(`\n⚠️  Run: npx tsx scripts/cleanup-duplicates.ts --execute`);
      process.exit(1);
    }
    
    // Check for NULL scraper_source
    const nullSources = await pool.query(`
      SELECT COUNT(*) as count
      FROM events
      WHERE scraper_source IS NULL
    `);
    
    const nullCount = parseInt(nullSources.rows[0].count);
    if (nullCount > 0) {
      console.error(`❌ ALERT: ${nullCount} events have NULL scraper_source!\n`);
      console.error(`   This will cause duplicate insertions.`);
      console.error(`   Run: npx tsx scripts/cleanup-duplicates.ts --execute`);
      process.exit(1);
    }
    
    // Check for NULL fingerprints
    const nullFingerprints = await pool.query(`
      SELECT COUNT(*) as count
      FROM events
      WHERE fingerprint IS NULL
    `);
    
    const nullFpCount = parseInt(nullFingerprints.rows[0].count);
    if (nullFpCount > 0) {
      console.error(`❌ ALERT: ${nullFpCount} events have NULL fingerprint!\n`);
      console.error(`   This breaks deduplication logic.`);
      process.exit(1);
    }
    
    // Get total event count
    const totalCount = await pool.query(`SELECT COUNT(*) as count FROM events`);
    const total = parseInt(totalCount.rows[0].count);
    
    // Success
    console.log(`✅ No duplicates detected`);
    console.log(`✅ No NULL scraper_source values`);
    console.log(`✅ No NULL fingerprints`);
    console.log(`\n📊 Total events: ${total}`);
    
  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDuplicates();

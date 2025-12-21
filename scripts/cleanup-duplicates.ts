import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function cleanupDuplicates(dryRun: boolean = true) {
  console.log(`\n🧹 DUPLICATE CLEANUP ${dryRun ? '(DRY RUN)' : '(EXECUTING)'}\n`);
  
  try {
    // Get duplicate statistics
    const dupeStats = await pool.query(`
      SELECT 
        fingerprint,
        COUNT(*) as count,
        (array_agg(id ORDER BY scraped_at ASC))[1] as keep_id,
        array_agg(id ORDER BY scraped_at ASC) as all_ids,
        array_agg(name) as names
      FROM events
      GROUP BY fingerprint
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (dupeStats.rows.length === 0) {
      console.log('✅ No duplicates found! Database is clean.');
      await pool.end();
      return;
    }
    
    console.log(`Found ${dupeStats.rows.length} fingerprints with duplicates:\n`);
    
    let totalToDelete = 0;
    dupeStats.rows.forEach((row, i) => {
      const deleteCount = row.count - 1;
      totalToDelete += deleteCount;
      if (i < 5) { // Show first 5
        console.log(`${i + 1}. "${row.names[0]}" (${row.count} duplicates)`);
        console.log(`   Keep: ${row.keep_id}`);
        console.log(`   Delete: ${deleteCount} rows`);
      }
    });
    
    if (dupeStats.rows.length > 5) {
      console.log(`   ... and ${dupeStats.rows.length - 5} more`);
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Duplicate groups: ${dupeStats.rows.length}`);
    console.log(`   Total events: ${dupeStats.rows.reduce((sum, r) => sum + r.count, 0)}`);
    console.log(`   Will delete: ${totalToDelete} rows`);
    console.log(`   Will keep: ${dupeStats.rows.length} rows`);
    
    if (dryRun) {
      console.log(`\n⚠️  DRY RUN MODE - No changes made`);
      console.log(`   Run with --execute to perform cleanup`);
      return;
    }
    
    // Confirm before proceeding
    console.log(`\n⚠️  ABOUT TO DELETE ${totalToDelete} DUPLICATE EVENTS!`);
    console.log(`   This action cannot be undone (unless you have a backup).`);
    
    // Proceed with deletion
    console.log(`\n🗑️  Deleting duplicates...`);
    
    const deleteResult = await pool.query(`
      DELETE FROM events e1
      WHERE EXISTS (
        SELECT 1 FROM events e2
        WHERE e2.fingerprint = e1.fingerprint
          AND e2.id < e1.id
      )
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} duplicate events`);
    
    // Update NULL scraper_source values
    console.log(`\n🔄 Updating NULL scraper_source values...`);
    const updateResult = await pool.query(`
      UPDATE events 
      SET scraper_source = 'migration-unknown'
      WHERE scraper_source IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} events with NULL scraper_source`);
    
    // Verify cleanup
    const remainingDupes = await pool.query(`
      SELECT fingerprint, COUNT(*) as count
      FROM events
      GROUP BY fingerprint
      HAVING COUNT(*) > 1
    `);
    
    if (remainingDupes.rows.length > 0) {
      console.log(`\n⚠️  Warning: ${remainingDupes.rows.length} duplicate fingerprints still remain!`);
    } else {
      console.log(`\n✅ Verification: No duplicates remaining`);
    }
    
    // Final stats
    const finalCount = await pool.query(`SELECT COUNT(*) as count FROM events`);
    console.log(`\n📊 Final statistics:`);
    console.log(`   Total events: ${finalCount.rows[0].count}`);
    console.log(`   Duplicates removed: ${totalToDelete}`);
    console.log(`   Unique events: ${finalCount.rows[0].count}`);
    
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

cleanupDuplicates(isDryRun);

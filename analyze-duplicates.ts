import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function analyzeDuplicates() {
  console.log('\n🔍 DUPLICATE ANALYSIS\n');
  
  // 1. Check for exact duplicates in database
  const exactDupes = await pool.query(`
    SELECT 
      name, 
      date::text, 
      time, 
      location_name,
      state_code,
      COUNT(*) as duplicate_count,
      array_agg(id) as event_ids,
      array_agg(scraper_source) as sources,
      array_agg(external_id) as external_ids,
      array_agg(fingerprint) as fingerprints
    FROM events 
    WHERE name = 'Privacy And Consumer Protection'
    GROUP BY name, date, time, location_name, state_code
    HAVING COUNT(*) > 1
  `);
  
  console.log('1️⃣ EXACT DUPLICATES (same name, date, time, location):');
  console.log(`   Found: ${exactDupes.rows.length} duplicate groups\n`);
  
  exactDupes.rows.forEach((row, i) => {
    console.log(`   Group ${i + 1}: ${row.duplicate_count} duplicates`);
    console.log(`   Name: ${row.name}`);
    console.log(`   Date: ${row.date}, Time: ${row.time}`);
    console.log(`   Location: ${row.location_name}`);
    console.log(`   Event IDs: ${row.event_ids.join(', ')}`);
    console.log(`   Sources: ${row.sources.join(', ')}`);
    console.log(`   External IDs: ${row.external_ids.slice(0, 2).map(id => id.substring(0, 8)).join(', ')}...`);
    console.log(`   Fingerprints unique?: ${new Set(row.fingerprints).size === row.fingerprints.length ? 'YES' : 'NO (PROBLEM!)'}`);
    console.log('');
  });
  
  // 2. Check for similar events (potential dupes)
  const allPrivacyEvents = await pool.query(`
    SELECT 
      id,
      name,
      date::text,
      time,
      location_name,
      scraper_source,
      external_id,
      fingerprint,
      scraped_at::text
    FROM events 
    WHERE name LIKE '%Privacy%Consumer%Protection%'
    ORDER BY date, time, id
    LIMIT 20
  `);
  
  console.log('2️⃣ ALL PRIVACY & CONSUMER PROTECTION EVENTS:');
  console.log(`   Total found: ${allPrivacyEvents.rows.length}\n`);
  
  allPrivacyEvents.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. ID: ${row.id}, Date: ${row.date}, Time: ${row.time}`);
    console.log(`      Source: ${row.scraper_source}`);
    console.log(`      External ID: ${row.external_id.substring(0, 16)}...`);
    console.log(`      Fingerprint: ${row.fingerprint.substring(0, 16)}...`);
    console.log(`      Scraped: ${row.scraped_at}`);
  });
  
  // 3. Check fingerprint uniqueness
  const fingerprintDupes = await pool.query(`
    SELECT 
      fingerprint,
      COUNT(*) as count,
      array_agg(id) as event_ids,
      array_agg(scraper_source) as sources
    FROM events
    WHERE fingerprint IN (
      SELECT fingerprint 
      FROM events 
      GROUP BY fingerprint 
      HAVING COUNT(*) > 1
    )
    GROUP BY fingerprint
    LIMIT 10
  `);
  
  console.log('\n\n3️⃣ FINGERPRINT COLLISIONS (same fingerprint, different events):');
  console.log(`   Found: ${fingerprintDupes.rows.length} fingerprints with duplicates\n`);
  
  fingerprintDupes.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. Fingerprint: ${row.fingerprint.substring(0, 20)}...`);
    console.log(`      Count: ${row.count}`);
    console.log(`      Event IDs: ${row.event_ids.join(', ')}`);
    console.log(`      Sources: ${row.sources.join(', ')}`);
  });
  
  // 4. Check external_id uniqueness per source
  const externalIdDupes = await pool.query(`
    SELECT 
      scraper_source,
      external_id,
      COUNT(*) as count,
      array_agg(id) as event_ids
    FROM events
    GROUP BY scraper_source, external_id
    HAVING COUNT(*) > 1
    LIMIT 10
  `);
  
  console.log('\n\n4️⃣ EXTERNAL_ID DUPLICATES (same source + external_id):');
  console.log(`   Found: ${externalIdDupes.rows.length} duplicate external_ids\n`);
  
  externalIdDupes.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. Source: ${row.scraper_source}`);
    console.log(`      External ID: ${row.external_id.substring(0, 20)}...`);
    console.log(`      Count: ${row.count}`);
    console.log(`      Event IDs: ${row.event_ids.join(', ')}`);
  });
  
  // 5. Check ON CONFLICT behavior
  const onConflictTest = await pool.query(`
    SELECT 
      scraper_source,
      COUNT(*) as total_events,
      COUNT(DISTINCT external_id) as unique_external_ids,
      COUNT(*) - COUNT(DISTINCT external_id) as duplicate_external_ids
    FROM events
    GROUP BY scraper_source
    HAVING COUNT(*) > COUNT(DISTINCT external_id)
  `);
  
  console.log('\n\n5️⃣ ON CONFLICT VIOLATION (source with non-unique external_ids):');
  console.log(`   Found: ${onConflictTest.rows.length} sources with duplicate external_ids\n`);
  
  onConflictTest.rows.forEach(row => {
    console.log(`   Source: ${row.scraper_source}`);
    console.log(`   Total events: ${row.total_events}`);
    console.log(`   Unique external_ids: ${row.unique_external_ids}`);
    console.log(`   Duplicates: ${row.duplicate_external_ids}`);
    console.log('');
  });
  
  await pool.end();
}

analyzeDuplicates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

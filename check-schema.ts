import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function checkSchema() {
  console.log('\n🔍 SCHEMA ANALYSIS\n');
  
  // 1. Check table schema
  const columns = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name IN ('scraper_source', 'external_id', 'fingerprint')
    ORDER BY ordinal_position
  `);
  
  console.log('1️⃣ EVENTS TABLE COLUMNS:');
  columns.rows.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
  });
  
  // 2. Check constraints
  const constraints = await pool.query(`
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'events'
      AND (kcu.column_name IN ('scraper_source', 'external_id', 'fingerprint')
           OR tc.constraint_type = 'UNIQUE')
    ORDER BY tc.constraint_type, kcu.ordinal_position
  `);
  
  console.log('\n2️⃣ CONSTRAINTS ON EVENTS TABLE:');
  constraints.rows.forEach(c => {
    console.log(`   ${c.constraint_type}: ${c.constraint_name} (${c.column_name})`);
  });
  
  // 3. Check indexes
  const indexes = await pool.query(`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'events'
      AND (indexdef LIKE '%scraper_source%' 
           OR indexdef LIKE '%external_id%'
           OR indexdef LIKE '%fingerprint%')
  `);
  
  console.log('\n3️⃣ RELEVANT INDEXES:');
  indexes.rows.forEach(idx => {
    console.log(`   ${idx.indexname}:`);
    console.log(`     ${idx.indexdef}`);
  });
  
  // 4. Sample NULL scraper_source entries
  const nullSources = await pool.query(`
    SELECT 
      id,
      name,
      scraper_source,
      external_id,
      fingerprint,
      scraped_at::text
    FROM events
    WHERE scraper_source IS NULL
    LIMIT 5
  `);
  
  console.log('\n4️⃣ SAMPLE EVENTS WITH NULL scraper_source:');
  console.log(`   Found ${nullSources.rows.length} events with NULL scraper_source\n`);
  nullSources.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. ID: ${row.id}`);
    console.log(`      Name: ${row.name}`);
    console.log(`      Scraper Source: ${row.scraper_source}`);
    console.log(`      External ID: ${row.external_id.substring(0, 20)}...`);
    console.log(`      Scraped: ${row.scraped_at}`);
  });
  
  // 5. Count by scraper_source
  const sourceCounts = await pool.query(`
    SELECT 
      COALESCE(scraper_source, 'NULL') as source,
      COUNT(*) as count
    FROM events
    GROUP BY scraper_source
    ORDER BY count DESC
  `);
  
  console.log('\n5️⃣ EVENT COUNT BY SCRAPER SOURCE:');
  sourceCounts.rows.forEach(row => {
    console.log(`   ${row.source}: ${row.count} events`);
  });
  
  await pool.end();
}

checkSchema().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function testTop100() {
  // Test the updated query
  const result = await pool.query(`
    SELECT 
      e.id, e.name, e.date, e.time,
      (
        CASE WHEN EXISTS (SELECT 1 FROM event_bills eb WHERE eb.event_id = e.id) THEN 100 ELSE 0 END +
        CASE WHEN e.allows_public_participation = true THEN 50 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM event_tags et2 WHERE et2.event_id = e.id) THEN 25 ELSE 0 END
      ) as priority_score
    FROM events e
    WHERE e.date >= CURRENT_DATE
      AND e.date <= CURRENT_DATE + INTERVAL '90 days'
    ORDER BY 
      priority_score DESC,
      e.date ASC,
      e.time NULLS LAST
    LIMIT 10
  `);
  
  console.log(`\n📊 Top 10 upcoming events:`);
  console.log(`   Found: ${result.rows.length} events\n`);
  
  result.rows.forEach((row, i) => {
    console.log(`${i + 1}. ${row.name}`);
    console.log(`   Date: ${row.date} ${row.time || 'TBD'}`);
    console.log(`   Priority Score: ${row.priority_score}`);
    console.log('');
  });
  
  await pool.end();
}

testTop100().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

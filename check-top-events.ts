import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function checkEvents() {
  // Check events by date
  const dateResult = await pool.query(`
    SELECT date::text, COUNT(*) as count 
    FROM events 
    WHERE date >= CURRENT_DATE 
    GROUP BY date 
    ORDER BY date 
    LIMIT 10
  `);
  
  console.log('\n📅 Events by date:');
  dateResult.rows.forEach(row => {
    console.log(`   ${row.date}: ${row.count} events`);
  });
  
  // Check if getTop100EventsToday query works
  const top100Result = await pool.query(`
    SELECT 
      e.id, e.name, e.date, e.time
    FROM events e
    WHERE e.date = CURRENT_DATE
    ORDER BY e.date ASC
    LIMIT 5
  `);
  
  console.log(`\n📊 Events TODAY (${new Date().toISOString().split('T')[0]}):`);
  console.log(`   Count: ${top100Result.rows.length}`);
  if (top100Result.rows.length > 0) {
    top100Result.rows.forEach(row => {
      console.log(`   - ${row.name} at ${row.time || 'TBD'}`);
    });
  } else {
    console.log('   ⚠️ No events found for today!');
  }
  
  // Check future events
  const futureResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM events
    WHERE date >= CURRENT_DATE
  `);
  
  console.log(`\n📈 Future events (>= today): ${futureResult.rows[0].count}`);
  
  await pool.end();
}

checkEvents().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

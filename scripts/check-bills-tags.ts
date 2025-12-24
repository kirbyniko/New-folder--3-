import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civitron',
  user: 'postgres',
  password: 'password'
});

async function checkBillsAndTags() {
  console.log('\n🔍 CHECKING BILLS AND TAGS\n');
  
  try {
    // Check events with bills
    const eventsWithBills = await pool.query(`
      SELECT 
        e.id,
        e.name,
        COUNT(DISTINCT b.id) as bill_count
      FROM events e
      LEFT JOIN event_bills eb ON e.id = eb.event_id
      LEFT JOIN bills b ON eb.bill_id = b.id
      GROUP BY e.id, e.name
      HAVING COUNT(DISTINCT b.id) > 0
      ORDER BY bill_count DESC
      LIMIT 10
    `);
    
    console.log(`📄 Events with bills: ${eventsWithBills.rows.length}`);
    eventsWithBills.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.bill_count} bills`);
    });
    
    // Check events with tags
    const eventsWithTags = await pool.query(`
      SELECT 
        e.id,
        e.name,
        array_agg(et.tag) as tags
      FROM events e
      LEFT JOIN event_tags et ON e.id = et.event_id
      GROUP BY e.id, e.name
      HAVING COUNT(et.tag) > 0
      ORDER BY COUNT(et.tag) DESC
      LIMIT 10
    `);
    
    console.log(`\n🏷️  Events with tags: ${eventsWithTags.rows.length}`);
    eventsWithTags.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.tags.join(', ')}`);
    });
    
    // Check events with public participation
    const eventsWithParticipation = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.allows_public_participation
      FROM events e
      WHERE e.allows_public_participation = true
      LIMIT 10
    `);
    
    console.log(`\n👥 Events with public participation: ${eventsWithParticipation.rows.length}`);
    eventsWithParticipation.rows.forEach(row => {
      console.log(`   - ${row.name}`);
    });
    
    // Check sample event with full data
    const sampleEvent = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.allows_public_participation,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'number', b.bill_number,
              'title', b.title
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) as bills,
        COALESCE(
          array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM events e
      LEFT JOIN event_bills eb ON e.id = eb.event_id
      LEFT JOIN bills b ON eb.bill_id = b.id
      LEFT JOIN event_tags et ON e.id = et.event_id
      GROUP BY e.id
      LIMIT 3
    `);
    
    console.log(`\n📊 Sample events with full data:`);
    sampleEvent.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.name}`);
      console.log(`   Date: ${row.date}`);
      console.log(`   Bills: ${JSON.stringify(row.bills)}`);
      console.log(`   Tags: ${JSON.stringify(row.tags)}`);
      console.log(`   Public Participation: ${row.allows_public_participation}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkBillsAndTags();

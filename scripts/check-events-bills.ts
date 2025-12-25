import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function checkData() {
  console.log('🔍 Checking database for upcoming events with bills...\n');
  
  const events = await sql`
    SELECT COUNT(*) as count 
    FROM events 
    WHERE date >= CURRENT_DATE
  `;
  console.log(`📅 Events with future dates: ${events[0].count}`);
  
  const bills = await sql`
    SELECT COUNT(DISTINCT b.id) as count 
    FROM bills b
    JOIN event_bills eb ON b.id = eb.bill_id
    JOIN events e ON eb.event_id = e.id
    WHERE e.date >= CURRENT_DATE
  `;
  console.log(`📄 Bills linked to upcoming events: ${bills[0].count}`);
  
  // Check a sample event with bills
  const sample = await sql`
    SELECT e.name, e.state_code, e.date, COUNT(b.id) as bill_count
    FROM events e
    JOIN event_bills eb ON e.id = eb.event_id
    JOIN bills b ON eb.bill_id = b.id
    WHERE e.date >= CURRENT_DATE
    AND e.state_code = 'CA'
    GROUP BY e.id, e.name, e.state_code, e.date
    LIMIT 1
  `;
  
  if (sample.length > 0) {
    console.log(`\n✅ Sample CA event:`);
    console.log(`   Name: ${sample[0].name}`);
    console.log(`   Date: ${sample[0].date}`);
    console.log(`   Bills: ${sample[0].bill_count}`);
  } else {
    console.log(`\n❌ No CA events with bills found`);
  }
}

checkData();

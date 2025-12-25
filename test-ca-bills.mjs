import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const db = neon(process.env.DATABASE_URL);

console.log('🔍 Checking CA events and bills...\n');

// Check events
const events = await db`
  SELECT 
    e.id, 
    e.name, 
    e.date,
    (SELECT COUNT(*) FROM event_bills eb WHERE eb.event_id = e.id) as bill_count
  FROM events e
  WHERE e.state_code = 'CA' 
    AND e.date >= CURRENT_DATE
  ORDER BY e.date
  LIMIT 10
`;

console.log(`📅 CA Events (upcoming): ${events.length}`);
events.forEach(e => {
  console.log(`  - ${e.name} (${e.date}): ${e.bill_count} bills`);
});

// Check bills with summaries
const billsWithSummaries = await db`
  SELECT 
    b.bill_number,
    b.title,
    LEFT(b.summary, 50) as summary_preview,
    b.state_code,
    (SELECT COUNT(*) FROM event_bills eb WHERE eb.bill_id = b.id) as event_count
  FROM bills b
  WHERE b.state_code = 'CA'
    AND b.summary IS NOT NULL
`;

console.log(`\n📋 CA Bills with summaries: ${billsWithSummaries.length}`);
billsWithSummaries.forEach(b => {
  console.log(`  - ${b.bill_number}: ${b.summary_preview}... (${b.event_count} events)`);
});

// Check which events have bills with summaries
const eventsWithSummarizedBills = await db`
  SELECT 
    e.name as event_name,
    e.date,
    b.bill_number,
    LEFT(b.summary, 40) as summary_preview
  FROM events e
  JOIN event_bills eb ON e.id = eb.event_id
  JOIN bills b ON eb.bill_id = b.id
  WHERE e.state_code = 'CA'
    AND e.date >= CURRENT_DATE
    AND b.summary IS NOT NULL
  ORDER BY e.date
  LIMIT 20
`;

console.log(`\n🎯 Events with summarized bills: ${eventsWithSummarizedBills.length}`);
eventsWithSummarizedBills.forEach(e => {
  console.log(`  - ${e.event_name} (${e.date})`);
  console.log(`    ${e.bill_number}: ${e.summary_preview}...`);
});

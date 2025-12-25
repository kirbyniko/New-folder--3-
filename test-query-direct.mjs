import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const db = neon(process.env.DATABASE_URL);
const stateAbbr = 'CA';

console.log('🔍 Testing SQL query directly...\n');

const events = await db`
  SELECT 
    e.id,
    e.name,
    e.date,
    COALESCE(
      json_agg(
        DISTINCT jsonb_build_object(
          'id', b.bill_number,
          'number', b.bill_number,
          'title', b.title,
          'url', b.url,
          'status', b.status,
          'summary', b.summary
        )
      ) FILTER (WHERE b.id IS NOT NULL),
      '[]'::json
    ) as bills
  FROM events e
  LEFT JOIN event_bills eb ON e.id = eb.event_id
  LEFT JOIN bills b ON eb.bill_id = b.id
  WHERE e.state_code = ${stateAbbr}
    AND e.date >= CURRENT_DATE
    AND e.name IN ('Privacy And Consumer Protection', 'Education', 'Transportation', 'Public Safety')
  GROUP BY e.id
  ORDER BY e.date ASC
`;

console.log(`Found ${events.length} events\n`);

events.forEach(event => {
  console.log(`📅 ${event.name} (${event.date})`);
  console.log(`   Bills: ${event.bills.length}`);
  
  event.bills.forEach(bill => {
    console.log(`     - ${bill.number}: ${bill.title}`);
    console.log(`       Summary present: ${bill.summary ? 'YES' : 'NO'}`);
    if (bill.summary) {
      console.log(`       Summary: ${bill.summary.substring(0, 60)}...`);
    }
  });
  console.log('');
});

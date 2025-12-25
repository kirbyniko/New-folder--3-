import { neon } from '@neondatabase/serverless';

const dbUrl = 'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function check() {
  const sql = neon(dbUrl);
  
  console.log('🔍 Checking which events have summarized bills...\n');
  
  const result = await sql`
    SELECT DISTINCT e.id, e.name, e.state_code, b.bill_number, b.summary
    FROM events e
    JOIN event_bills eb ON e.id = eb.event_id
    JOIN bills b ON eb.bill_id = b.id
    WHERE b.summary IS NOT NULL
    LIMIT 10
  `;
  
  console.log(`📊 Found ${result.length} events with summarized bills\n`);
  
  result.forEach((row, i) => {
    console.log(`${i + 1}. ${row.name.substring(0, 50)}...`);
    console.log(`   State: ${row.state_code}, Bill: ${row.bill_number}`);
    console.log(`   Summary: ${row.summary.substring(0, 80)}...`);
    console.log('');
  });
}

check();

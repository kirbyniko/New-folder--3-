import { neon } from '@neondatabase/serverless';

const dbUrl = 'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function test() {
  console.log('🧪 Testing bill summarization query...\n');
  
  const sql = neon(dbUrl);
  
  const bills = await sql`
    SELECT 
      id,
      bill_number,
      title,
      state_code,
      url,
      summary,
      content_hash,
      last_summarized_at
    FROM bills
    WHERE summary IS NULL OR content_hash IS NULL OR last_summarized_at IS NULL
    ORDER BY state_code, bill_number 
    LIMIT 5
  `;
  
  console.log('📋 Bills needing summarization:', bills.length);
  
  if (bills.length > 0) {
    console.log('\n📝 First few bills:');
    bills.forEach((bill, i) => {
      console.log(`${i + 1}. ${bill.state_code} ${bill.bill_number} - ${bill.title.substring(0, 50)}...`);
    });
  } else {
    console.log('✅ All bills already have summaries!');
  }
}

test();

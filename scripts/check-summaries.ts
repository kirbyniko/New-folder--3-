import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function checkSummaries() {
  console.log('🔍 Checking new summaries...\n');
  
  const bills = await sql`
    SELECT bill_number, title, description, summary 
    FROM bills 
    WHERE state_code = 'CA' 
    AND summary IS NOT NULL 
    ORDER BY bill_number 
    LIMIT 5
  `;
  
  for (const bill of bills) {
    console.log(`\n📄 ${bill.bill_number}`);
    console.log(`Title: ${bill.title}`);
    console.log(`Description: ${bill.description?.substring(0, 80)}...`);
    console.log(`\n✨ NEW SUMMARY:`);
    console.log(bill.summary);
    console.log('\n' + '─'.repeat(80));
  }
}

checkSummaries();

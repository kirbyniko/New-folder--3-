import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function checkBills() {
  console.log('🔍 Checking California bills for descriptions...\n');
  
  const bills = await sql`
    SELECT bill_number, title, description, summary 
    FROM bills 
    WHERE state_code = 'CA' 
    ORDER BY bill_number 
    LIMIT 10
  `;
  
  for (const bill of bills) {
    console.log(`📄 ${bill.bill_number}`);
    console.log(`   Title: ${bill.title?.substring(0, 80)}${bill.title?.length > 80 ? '...' : ''}`);
    console.log(`   Description: ${bill.description || '❌ None'}`);
    console.log(`   Summary: ${bill.summary ? '✅ Present' : '❌ None'}\n`);
  }
  
  const counts = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(description) as with_desc,
      COUNT(summary) as with_summary
    FROM bills 
    WHERE state_code = 'CA'
  `;
  
  console.log('📊 Statistics:');
  console.log(`   Total CA bills: ${counts[0].total}`);
  console.log(`   With description: ${counts[0].with_desc}`);
  console.log(`   With summary: ${counts[0].with_summary}`);
}

checkBills().catch(console.error);

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function checkCABills() {
  console.log('🔍 Checking California bills linkage...\n');
  
  // Check total CA bills
  const totalBills = await sql`
    SELECT COUNT(*) as count 
    FROM bills 
    WHERE state_code = 'CA'
  `;
  console.log(`📄 Total CA bills in database: ${totalBills[0].count}`);
  
  // Check how many are linked to events
  const linkedBills = await sql`
    SELECT COUNT(DISTINCT b.id) as count
    FROM bills b
    JOIN event_bills eb ON b.id = eb.bill_id
    WHERE b.state_code = 'CA'
  `;
  console.log(`🔗 CA bills linked to events: ${linkedBills[0].count}`);
  
  // Check CA events
  const caEvents = await sql`
    SELECT COUNT(*) as count
    FROM events
    WHERE state_code = 'CA'
  `;
  console.log(`📅 Total CA events: ${caEvents[0].count}`);
  
  // Show sample unlinked bills
  const unlinked = await sql`
    SELECT bill_number, title
    FROM bills
    WHERE state_code = 'CA'
    AND id NOT IN (SELECT bill_id FROM event_bills)
    LIMIT 5
  `;
  
  console.log(`\n📋 Sample unlinked CA bills:`);
  unlinked.forEach(bill => {
    console.log(`   ${bill.bill_number}: ${bill.title.substring(0, 60)}...`);
  });
}

checkCABills();

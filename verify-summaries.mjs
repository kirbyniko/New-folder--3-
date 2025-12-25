import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const sql = neon(dbUrl);
  
  console.log('🔍 Verifying bill summaries...\n');
  
  const result = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(summary) as with_summary,
      COUNT(content_hash) as with_hash
    FROM bills
  `;
  
  console.log('📊 Total bills:', result[0].total);
  console.log('✅ Bills with summaries:', result[0].with_summary);
  console.log('🔐 Bills with content hash:', result[0].with_hash);
  
  const sample = await sql`
    SELECT bill_number, title, summary 
    FROM bills 
    WHERE summary IS NOT NULL 
    LIMIT 1
  `;
  
  if (sample.length > 0) {
    console.log('\n📝 Sample summary:');
    console.log('Bill:', sample[0].bill_number);
    console.log('Title:', sample[0].title.substring(0, 60) + '...');
    console.log('Summary:', sample[0].summary.substring(0, 200) + '...');
  }
}

verify();

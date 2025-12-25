import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  console.log('🔍 Testing database connection...\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }
  
  console.log('📡 Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Test query
    const result = await sql`SELECT COUNT(*) as count FROM bills`;
    console.log('✅ Connection successful!');
    console.log('📊 Bills in database:', result[0].count);
    
    // Check if summary columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
      AND column_name IN ('summary', 'content_hash', 'last_summarized_at')
      ORDER BY column_name
    `;
    
    console.log('\n📋 Summary columns:');
    if (columns.length === 0) {
      console.log('  ❌ No summary columns found (migration needed)');
    } else {
      columns.forEach(col => {
        console.log(`  ✅ ${col.column_name}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

test();

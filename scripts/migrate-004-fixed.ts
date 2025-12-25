import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🔄 Applying migration 004: Add bill description column\n');
  
  try {
    // Add description column
    console.log('1️⃣ Adding description column...');
    await sql`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS description TEXT
    `;
    console.log('   ✅ Column added');
    
    // Create full-text search index
    console.log('2️⃣ Creating full-text search index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bills_description 
      ON bills USING gin(to_tsvector('english', description))
      WHERE description IS NOT NULL
    `;
    console.log('   ✅ Index created');
    
    // Update comment
    console.log('3️⃣ Updating content_hash column comment...');
    await sql`
      COMMENT ON COLUMN bills.content_hash IS 'Hash of bill_number|title|description|url for change detection'
    `;
    console.log('   ✅ Comment updated');
    
    console.log('\n✅ Migration 004 applied successfully!');
    
    // Verify
    console.log('\n🔍 Verifying migration...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
      AND column_name = 'description'
    `;
    
    if (columns.length > 0) {
      console.log(`   ✅ Column exists: ${columns[0].column_name} (${columns[0].data_type})`);
    } else {
      console.log('   ❌ Column not found!');
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();

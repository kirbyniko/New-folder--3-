/**
 * Apply database migration for bill summaries
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔄 Applying bill summary migration...\n');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }
  
  const db = neon(process.env.DATABASE_URL);
  
  try {
    // Execute migrations one by one
    console.log('📝 Adding columns to bills table...');
    
    // Add summary column
    await db`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS summary TEXT
    `;
    
    // Add content_hash column
    await db`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64)
    `;
    
    // Add last_summarized_at column
    await db`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMP
    `;
    
    console.log('📊 Creating index...');
    
    // Create index
    await db`
      CREATE INDEX IF NOT EXISTS idx_bills_summary_status 
      ON bills (state_code, last_summarized_at) 
      WHERE summary IS NULL OR last_summarized_at IS NULL
    `;
    
    console.log('💬 Adding column comments...');
    
    // Add comments
    await db`
      COMMENT ON COLUMN bills.summary IS 'LLM-generated summary of the bill (max ~200 words)'
    `;
    
    await db`
      COMMENT ON COLUMN bills.content_hash IS 'SHA-256 hash of bill content to detect changes'
    `;
    
    await db`
      COMMENT ON COLUMN bills.last_summarized_at IS 'Timestamp of last LLM summarization'
    `;
    
    console.log('✅ Migration applied successfully');
    console.log('📋 Added columns:');
    console.log('  - summary (TEXT)');
    console.log('  - content_hash (VARCHAR(64))');
    console.log('  - last_summarized_at (TIMESTAMP)');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

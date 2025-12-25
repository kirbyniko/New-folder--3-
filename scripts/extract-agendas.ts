/**
 * Agenda Extraction Script
 * 
 * Extracts text from PDF agendas linked in events and stores them in D1 database.
 * Uses pdfjs-dist to parse PDF content.
 * 
 * Usage:
 * - npx tsx scripts/extract-agendas.ts
 * - npx tsx scripts/extract-agendas.ts --state=CA      (only process CA events)
 * - npx tsx scripts/extract-agendas.ts --limit=10      (process max 10 agendas)
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

interface Event {
  id: string;
  name: string;
  state_code: string;
  docket_url: string;
}

interface AgendaSummary {
  id: string;
  event_id: string;
  agenda_url: string;
  agenda_text: string | null;
  content_hash: string;
}

/**
 * Extract text from PDF URL using pdfjs-dist
 */
async function extractPDFText(pdfUrl: string): Promise<string | null> {
  try {
    console.log(`  📄 Fetching PDF: ${pdfUrl}`);
    
    // Lazy load pdfjs-dist to avoid Node.js compatibility issues
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.error(`  ❌ Failed to fetch PDF: ${response.status}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from ALL pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`  ✅ Extracted ${fullText.length} characters from ${pdf.numPages} pages`);
    return fullText.trim();
    
  } catch (error: any) {
    console.error(`  ❌ Error extracting PDF: ${error.message}`);
    return null;
  }
}

/**
 * Generate content hash for agenda text
 */
function generateContentHash(text: string, url: string): string {
  const content = `${url}|${text}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Main extraction function
 */
async function main() {
  const args = process.argv.slice(2);
  const stateFilter = args.find(arg => arg.startsWith('--state='))?.split('=')[1];
  const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;
  
  // Get database connection from env
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  const sql = neon(databaseUrl);
  
  console.log('🚀 Agenda Extraction Script\n');
  
  // Build query to get events with docket_urls
  let query = `
    SELECT 
      e.id,
      e.name,
      e.state_code,
      e.docket_url
    FROM events e
    WHERE e.docket_url IS NOT NULL
    AND e.docket_url != ''
    AND e.date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM agenda_summaries a 
      WHERE a.event_id = e.id
    )
  `;
  
  if (stateFilter) {
    query += ` AND e.state_code = '${stateFilter}'`;
  }
  
  query += ` ORDER BY e.date ASC`;
  
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  console.log(`📊 Fetching events with docket URLs...`);
  if (stateFilter) console.log(`   State filter: ${stateFilter}`);
  if (limit) console.log(`   Limit: ${limit}`);
  
  const events = await sql(query) as Event[];
  
  console.log(`\n✅ Found ${events.length} events with docket URLs to process\n`);
  
  if (events.length === 0) {
    console.log('✅ No new agendas to extract');
    return;
  }
  
  let extracted = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const event of events) {
    console.log(`\n📋 Processing: ${event.name} (${event.state_code})`);
    console.log(`   Event ID: ${event.id}`);
    console.log(`   Agenda URL: ${event.docket_url}`);
    
    // Extract PDF text
    const agendaText = await extractPDFText(event.docket_url);
    
    if (!agendaText || agendaText.length < 50) {
      console.log(`  ⚠️  Skipped: Not enough text extracted`);
      skipped++;
      continue;
    }
    
    // Generate content hash
    const contentHash = generateContentHash(agendaText, event.docket_url);
    
    // Insert into database
    try {
      const agendaId = uuidv4();
      await sql`
        INSERT INTO agenda_summaries (
          id,
          event_id,
          agenda_url,
          agenda_text,
          content_hash
        ) VALUES (
          ${agendaId},
          ${event.id},
          ${event.docket_url},
          ${agendaText},
          ${contentHash}
        )
      `;
      
      console.log(`  ✅ Saved agenda (${agendaText.length} chars)`);
      extracted++;
      
    } catch (error: any) {
      console.error(`  ❌ Failed to save: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Extracted: ${extracted}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n✅ Extraction complete!`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

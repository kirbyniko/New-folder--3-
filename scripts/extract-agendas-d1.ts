/**
 * Extract Agendas Script (D1 Version)
 * Extracts text from PDF agendas and stores in D1
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface Event {
  id: string;
  name: string;
  state_code: string;
  docket_url: string;
}

/**
 * Extract text from PDF URL
 */
async function extractPDFText(pdfUrl: string): Promise<string | null> {
  try {
    console.log(`  📄 Fetching PDF: ${pdfUrl}`);
    
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
 * Generate content hash
 */
function generateContentHash(text: string, url: string): string {
  const content = `${url}|${text}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Escape SQL string
 */
function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg, 10) : 10;
  
  console.log('🚀 Agenda Extraction Script (D1)\n');
  
  // Get events with docket URLs from D1
  console.log(`📊 Fetching events with docket URLs (limit: ${limit})...`);
  
  const query = `
    SELECT id, name, state_code, docket_url 
    FROM events 
    WHERE docket_url IS NOT NULL 
    AND docket_url != '' 
    AND date >= date('now')
    LIMIT ${limit}
  `;
  
  const result = execSync(
    `wrangler d1 execute civitracker-db --remote --json --command "${query}"`,
    { encoding: 'utf-8' }
  );
  
  const jsonResult = JSON.parse(result);
  const events = jsonResult[0].results as Event[];
  
  console.log(`✅ Found ${events.length} events\n`);
  
  if (events.length === 0) {
    console.log('⚠️  No events with docket URLs found');
    console.log('   Make sure scrapers have populated docket_url field');
    return;
  }
  
  let extracted = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const event of events) {
    console.log(`\n📋 Processing: ${event.name} (${event.state_code})`);
    console.log(`   Event ID: ${event.id}`);
    console.log(`   URL: ${event.docket_url}`);
    
    // Extract PDF text
    const agendaText = await extractPDFText(event.docket_url);
    
    if (!agendaText || agendaText.length < 50) {
      console.log(`  ⚠️  Skipped: Not enough text extracted`);
      skipped++;
      continue;
    }
    
    // Generate hash
    const contentHash = generateContentHash(agendaText, event.docket_url);
    const agendaId = uuidv4();
    
    // Truncate text if too long (SQLite limit)
    const truncatedText = agendaText.substring(0, 50000);
    
    // Insert into D1
    try {
      const insertQuery = `
        INSERT INTO agenda_summaries (id, event_id, agenda_url, agenda_text, content_hash)
        VALUES ('${agendaId}', '${event.id}', '${escapeSql(event.docket_url)}', '${escapeSql(truncatedText)}', '${contentHash}')
      `;
      
      execSync(
        `wrangler d1 execute civitracker-db --remote --command "${insertQuery}"`,
        { encoding: 'utf-8', stdio: 'inherit' }
      );
      
      console.log(`  ✅ Saved agenda (${truncatedText.length} chars)`);
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
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Agenda Summarization Script for Cloudflare D1
 * 
 * Uses Ollama to generate summaries for meeting agendas.
 * 
 * Usage:
 * npx tsx scripts/summarize-agendas-d1.ts
 * npx tsx scripts/summarize-agendas-d1.ts --limit 10
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { createRequire } from 'module';
import { Buffer } from 'buffer';

const require = createRequire(import.meta.url);
// pdf-parse exports an object with PDFParse property, not a function directly
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.PDFParse || pdfParseModule;

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const MODEL = 'gemma3:4b';

// Parse CLI args
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

console.log(`🚀 Starting agenda summarization (limit: ${limit})`);

/**
 * Check if Ollama is running
 */
async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate summary using Ollama
 */
async function generateSummary(eventName: string, agendaText: string): Promise<string> {
  const truncatedText = agendaText.length > 3000 
    ? agendaText.substring(0, 3000) + '...' 
    : agendaText;

  const prompt = `You are summarizing a government meeting agenda. Follow these rules strictly:

1. ONLY summarize information that is explicitly present in the agenda text below
2. If the agenda lacks specific details, state "Agenda details not available" or "No detailed agenda provided"
3. NEVER invent or assume meeting topics, project names, addresses, or other specific details
4. If you see generic text like "View the full agenda at [URL]", respond with "Detailed agenda not available"
5. Use 2-6 sentences only if there is actual content to summarize
6. Do not include preambles - provide the summary directly

Meeting: ${eventName}

Agenda Text:
${truncatedText}

Summary:`;

  const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.response.trim();
}

/**
 * Execute wrangler D1 command and parse JSON output
 */
function executeD1Query(query: string): any[] {
  try {
    const tempFile = 'temp-query.sql';
    writeFileSync(tempFile, query, 'utf-8');
    
    // Use --json with --command instead of --file for proper JSON output
    const escapedQuery = query.replace(/\n/g, ' ').replace(/"/g, '\\"');
    const result = execSync(
      `wrangler d1 execute civitracker-db --remote --json --command "${escapedQuery}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    unlinkSync(tempFile);
    
    // Find the JSON array in the output
    const lines = result.split('\n');
    const jsonStart = lines.findIndex(line => line.trim().startsWith('['));
    if (jsonStart === -1) return [];
    
    const jsonStr = lines.slice(jsonStart).join('\n');
    const parsed = JSON.parse(jsonStr);
    return parsed[0]?.results || [];
  } catch (error: any) {
    console.error('D1 query error:', error.message);
    return [];
  }
}

/**
 * Insert or update agenda summary
 */
function upsertSummary(eventId: string, agendaUrl: string, agendaText: string, summary: string, contentHash: string) {
  const id = `agenda-${eventId}`;
  const now = new Date().toISOString();
  
  // Escape single quotes in all text fields
  const escapedUrl = agendaUrl.replace(/'/g, "''");
  const escapedText = agendaText.replace(/'/g, "''");
  const escapedSummary = summary.replace(/'/g, "''");
  
  const query = `INSERT INTO agenda_summaries (id, event_id, agenda_url, agenda_text, summary, content_hash, last_summarized_at, created_at) VALUES ('${id}', '${eventId}', '${escapedUrl}', '${escapedText}', '${escapedSummary}', '${contentHash}', '${now}', '${now}') ON CONFLICT(id) DO UPDATE SET agenda_text = '${escapedText}', summary = '${escapedSummary}', content_hash = '${contentHash}', last_summarized_at = '${now}'`;
  
  const tempFile = 'temp-insert.sql';
  writeFileSync(tempFile, query, 'utf-8');
  
  execSync(
    `wrangler d1 execute civitracker-db --remote --file ${tempFile}`,
    { stdio: 'ignore' }
  );
  
  unlinkSync(tempFile);
}

/**
 * Simple hash function
 */
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function main() {
  // Check Ollama
  console.log('🔍 Checking Ollama...');
  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    console.error('❌ Ollama is not running. Start it with: ollama serve');
    process.exit(1);
  }
  console.log('✅ Ollama is ready');

  // Get events with PDFs that need summaries (only unsummarized ones)
  console.log('\n📥 Fetching events with PDF agendas that need summaries...');
  const events = executeD1Query(`
    SELECT e.id, e.name, e.state_code, e.docket_url
    FROM events e
    LEFT JOIN agenda_summaries a ON e.id = a.event_id
    WHERE e.docket_url IS NOT NULL 
      AND (a.summary IS NULL OR a.summary = '')
    ORDER BY e.state_code ASC, e.date ASC
    LIMIT ${limit}
  `);

  console.log(`📊 Found ${events.length} events needing summaries`);
  if (events.length > 0) {
    console.log('First event sample:', JSON.stringify(events[0], null, 2));
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of events) {
    try {
      console.log(`\n[${processed + skipped + errors + 1}/${events.length}] ${event.name} (${event.state_code})`);
      console.log(`   PDF: ${event.docket_url}`);

      // Download PDF and extract text
      console.log('   📄 Downloading PDF...');
      const pdfResponse = await fetch(event.docket_url);
      if (!pdfResponse.ok) {
        console.log(`   ⚠️  PDF download failed: ${pdfResponse.statusText}`);
        errors++;
        continue;
      }

      console.log('   📖 Extracting text from PDF...');
      
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      let agendaText: string;
      
      try {
        const pdfData = await pdfParse(pdfBuffer);
        agendaText = pdfData.text;
        
        if (!agendaText || agendaText.trim().length < 50) {
          console.log('   ⚠️  PDF has little/no extractable text, using fallback');
          agendaText = `${event.name} - View the full agenda at ${event.docket_url}`;
        } else {
          console.log(`   ✓ Extracted ${agendaText.length} characters`);
        }
      } catch (pdfError: any) {
        console.log(`   ⚠️  PDF parsing error: ${pdfError.message}, using fallback`);
        agendaText = `${event.name} - View the full agenda at ${event.docket_url}`;
      }
      
      const contentHash = simpleHash(agendaText);

      // Generate summary
      console.log('   🤖 Generating summary...');
      const summary = await generateSummary(event.name, agendaText);
      
      console.log(`   💾 Saving summary and source text...`);
      upsertSummary(event.id, event.docket_url, agendaText, summary, contentHash);
      
      console.log(`   ✅ Done`);
      processed++;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);

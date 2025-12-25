/**
 * Extract ALL agendas from D1 events with docket_url
 * 
 * This script:
 * 1. Fetches all events from D1 with non-null docket_url
 * 2. For each event, extracts PDF text (first 5 pages, max 5000 chars)
 * 3. Generates AI summary via Ollama (gemma3:4b)
 * 4. Saves to agenda_summaries table in D1
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, unlinkSync } from 'fs';

async function extractPDFText(pdfUrl: string): Promise<string | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const response = await fetch(pdfUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 5); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim().substring(0, 5000);
  } catch (error: any) {
    console.error(`    ❌ PDF extraction error: ${error.message}`);
    return null;
  }
}

async function generateSummary(text: string, eventName: string): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: `Write a concise summary of this meeting agenda. Use 2-6 sentences depending on what's needed to cover the key topics and items. Do not include preambles like "Here's a summary" - just provide the summary directly.\n\nMeeting: ${eventName}\n\nAgenda:\n${text.substring(0, 2000)}`,
        stream: false,
        options: { temperature: 0.3, num_predict: 300 }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.response.trim();
  } catch (error: any) {
    console.error(`    ❌ Summarization error: ${error.message}`);
    return null;
  }
}

async function getAllEventsWithAgendas(): Promise<Array<{id: string, name: string, state_code: string, docket_url: string}>> {
  try {
    const result = execSync('wrangler d1 execute civitracker-db --remote --command "SELECT id, name, state_code, docket_url FROM events WHERE docket_url IS NOT NULL" --json', {
      encoding: 'utf-8'
    });
    
    const parsed = JSON.parse(result);
    return parsed[0]?.results || [];
  } catch (error: any) {
    console.error('Failed to fetch events:', error.message);
    return [];
  }
}

async function saveAgendaSummary(eventId: string, agendaUrl: string, agendaText: string, summary: string) {
  const agendaId = uuidv4();
  const contentHash = crypto.createHash('sha256').update(`${agendaUrl}|${agendaText}`).digest('hex');
  
  const sql = `INSERT INTO agenda_summaries (id, event_id, agenda_url, agenda_text, summary, content_hash, last_summarized_at)
VALUES (
  '${agendaId}',
  '${eventId}',
  '${agendaUrl}',
  '${agendaText.replace(/'/g, "''")}',
  '${summary.replace(/'/g, "''")}',
  '${contentHash}',
  datetime('now')
);`;
  
  const tempFile = `temp-agenda-${eventId}.sql`;
  writeFileSync(tempFile, sql);
  
  try {
    execSync(`wrangler d1 execute civitracker-db --remote --file=${tempFile}`, { 
      stdio: 'pipe' 
    });
    unlinkSync(tempFile);
  } catch (error: any) {
    unlinkSync(tempFile);
    throw error;
  }
}

async function main() {
  console.log('🚀 Extracting ALL Agenda Summaries\n');
  
  // Check Ollama is running
  try {
    await fetch('http://localhost:11434/api/version');
    console.log('✅ Ollama is running\n');
  } catch {
    console.error('❌ Ollama is not running. Start it with: ollama serve');
    console.error('   Make sure gemma3:4b is installed: ollama pull gemma3:4b\n');
    return;
  }
  
  console.log('📊 Fetching events with docket_url from D1...\n');
  const events = await getAllEventsWithAgendas();
  
  if (events.length === 0) {
    console.log('⚠️  No events with docket_url found in D1.');
    console.log('   Run: npx tsx scripts/scrape-states-with-agendas.ts\n');
    return;
  }
  
  console.log(`Found ${events.length} events with agendas\n`);
  console.log('='.repeat(70));
  
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n[${i + 1}/${events.length}] ${event.state_code} - ${event.name.substring(0, 50)}...`);
    console.log(`    URL: ${event.docket_url.substring(0, 70)}...`);
    
    // Extract PDF
    console.log('    📄 Extracting PDF...');
    const text = await extractPDFText(event.docket_url);
    if (!text || text.length < 100) {
      console.log('    ⚠️  Skipped (extraction failed or too short)');
      skipped++;
      continue;
    }
    console.log(`    ✅ Extracted ${text.length} characters`);
    
    // Generate summary
    console.log('    🤖 Generating summary...');
    const summary = await generateSummary(text, event.name);
    if (!summary) {
      console.log('    ⚠️  Skipped (summarization failed)');
      skipped++;
      continue;
    }
    console.log(`    ✅ ${summary.substring(0, 80)}...`);
    
    // Save to D1
    console.log('    💾 Saving to D1...');
    try {
      await saveAgendaSummary(event.id, event.docket_url, text, summary);
      console.log('    ✅ Saved!');
      succeeded++;
    } catch (error: any) {
      console.log(`    ❌ Failed to save: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Succeeded: ${succeeded}`);
  console.log(`⚠️  Skipped:   ${skipped}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`\n🎉 View at: https://civitracker.pages.dev → Data Viewer → Agendas tab\n`);
}

main();

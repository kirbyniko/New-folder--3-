/**
 * Save agenda summary to D1 using SQL file
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync } from 'fs';

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
    
    return fullText.trim().substring(0, 5000); // Limit to 5000 chars
  } catch (error: any) {
    return null;
  }
}

async function generateSummary(text: string): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: `Summarize this legislative document in 2-3 sentences:\n\n${text.substring(0, 2000)}`,
        stream: false,
        options: { temperature: 0.3, num_predict: 200 }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.response.trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log('🚀 Save Agenda Summary to D1\n');
  
  const eventId = 'f405994d-773c-40f6-98c7-36c229491eda';
  const agendaUrl = 'https://www.congress.gov/118/bills/hr1/BILLS-118hr1ih.pdf';
  
  console.log('1️⃣  Extracting PDF...');
  const text = await extractPDFText(agendaUrl);
  if (!text) { console.log('Failed'); return; }
  console.log(`   ✅ ${text.length} characters\n`);
  
  console.log('2️⃣  Generating summary...');
  const summary = await generateSummary(text);
  if (!summary) { console.log('Failed'); return; }
  console.log(`   ✅ ${summary.substring(0, 80)}...\n`);
  
  console.log('3️⃣  Saving to D1...');
  const agendaId = uuidv4();
  const contentHash = crypto.createHash('sha256').update(`${agendaUrl}|${text}`).digest('hex');
  
  const sqlFile = `INSERT INTO agenda_summaries (id, event_id, agenda_url, agenda_text, summary, content_hash, last_summarized_at)
VALUES (
  '${agendaId}',
  '${eventId}',
  '${agendaUrl}',
  '${text.replace(/'/g, "''")}',
  '${summary.replace(/'/g, "''")}',
  '${contentHash}',
  datetime('now')
);`;
  
  writeFileSync('temp-agenda-insert.sql', sqlFile);
  
  try {
    execSync('wrangler d1 execute civitracker-db --remote --file=temp-agenda-insert.sql', { stdio: 'inherit' });
    console.log('   ✅ Saved!\n');
    console.log('✅ View at: https://civitracker.pages.dev → Data Viewer → Agendas tab');
  } catch (error) {
    console.error('   ❌ Failed to save');
  }
}

main();

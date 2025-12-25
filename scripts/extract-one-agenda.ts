/**
 * Extract and save one agenda to D1 for demo
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

async function extractPDFText(pdfUrl: string): Promise<string | null> {
  try {
    console.log(`📄 Fetching PDF...`);
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const response = await fetch(pdfUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`✅ Extracted ${fullText.length} characters from ${Math.min(pdf.numPages, 10)} pages`);
    return fullText.trim();
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function generateSummary(text: string, eventName: string): Promise<string | null> {
  const truncatedText = text.substring(0, 3000);
  const prompt = `Summarize this legislative document concisely:

Document: ${eventName}

Content:
${truncatedText}

Provide a 2-3 sentence summary covering:
- Main topics or bills discussed
- Key issues or actions
- Important points

Be factual and concise (under 150 words).`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 300 }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.response.trim();
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

async function main() {
  console.log('🚀 Extract and Save Agenda to D1\n');
  
  // Get event with docket_url from D1
  console.log('1️⃣  Getting event from D1...');
  const result = execSync(
    'wrangler d1 execute civitracker-db --remote --json --command "SELECT id, name, state_code, docket_url FROM events WHERE docket_url IS NOT NULL AND docket_url != \'\' LIMIT 1"',
    { encoding: 'utf-8' }
  );
  
  const jsonResult = JSON.parse(result);
  const events = jsonResult[0].results;
  
  if (!events || events.length === 0) {
    console.log('   ❌ No events with docket URLs found');
    return;
  }
  
  const event = events[0];
  console.log(`   ✅ Found: ${event.name} (${event.state_code})`);
  console.log(`   URL: ${event.docket_url}\n`);
  
  // Extract PDF
  console.log('2️⃣  Extracting PDF text...');
  const agendaText = await extractPDFText(event.docket_url);
  
  if (!agendaText) {
    console.log('   ❌ Failed to extract PDF');
    return;
  }
  console.log(`   ✅ Extracted ${agendaText.length} characters\n`);
  
  // Generate summary
  console.log('3️⃣  Generating AI summary...');
  const summary = await generateSummary(agendaText, event.name);
  
  if (!summary) {
    console.log('   ❌ Failed to generate summary');
    return;
  }
  console.log(`   ✅ Summary: ${summary.substring(0, 100)}...\n`);
  
  // Save to D1
  console.log('4️⃣  Saving to D1...');
  const agendaId = uuidv4();
  const contentHash = crypto.createHash('sha256')
    .update(`${event.docket_url}|${agendaText}`)
    .digest('hex');
  
  const truncatedText = agendaText.substring(0, 50000);
  const now = new Date().toISOString();
  
  const insertQuery = `INSERT INTO agenda_summaries (id, event_id, agenda_url, agenda_text, summary, content_hash, last_summarized_at) VALUES ('${agendaId}', '${event.id}', '${escapeSql(event.docket_url)}', '${escapeSql(truncatedText)}', '${escapeSql(summary)}', '${contentHash}', '${now}')`;
  
  try {
    execSync(
      `wrangler d1 execute civitracker-db --remote --command "${insertQuery}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    console.log('   ✅ Saved to D1\n');
  } catch (error: any) {
    console.error('   ❌ Failed to save:', error.message);
    return;
  }
  
  console.log('✅ Complete! View at: https://civitracker.pages.dev → Data Viewer → Agendas tab');
}

main();

/**
 * Complete Agenda Summarization Demo
 * Shows full workflow: PDF → Text → Summary
 */

// Check Ollama
async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

// Extract PDF text
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

// Generate summary
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
        options: {
          temperature: 0.3,
          num_predict: 300
        }
      })
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.response.trim();
  } catch (error: any) {
    console.error(`❌ Error generating summary: ${error.message}`);
    return null;
  }
}

// Main demo
async function main() {
  console.log('🚀 Agenda Summarization Demo\n');
  console.log('=' .repeat(80) + '\n');
  
  // Check Ollama
  console.log('1️⃣  Checking Ollama...');
  const ollamaRunning = await checkOllama();
  
  if (!ollamaRunning) {
    console.log('   ❌ Ollama not running');
    console.log('   Start Ollama and run: ollama pull llama2');
    process.exit(1);
  }
  console.log('   ✅ Ollama is running\n');
  
  // Test PDF
  const pdfUrl = 'https://www.congress.gov/118/bills/hr1/BILLS-118hr1ih.pdf';
  const eventName = 'H.R. 1 - Lower Energy Costs Act';
  
  console.log('2️⃣  Extracting PDF text...');
  console.log(`   URL: ${pdfUrl}`);
  const text = await extractPDFText(pdfUrl);
  
  if (!text) {
    console.log('   ❌ Failed to extract PDF');
    process.exit(1);
  }
  console.log(`   📝 Extracted ${text.length} characters\n`);
  
  // Generate summary
  console.log('3️⃣  Generating AI summary...');
  const summary = await generateSummary(text, eventName);
  
  if (!summary) {
    console.log('   ❌ Failed to generate summary');
    process.exit(1);
  }
  
  console.log('   ✅ Summary generated\n');
  console.log('=' .repeat(80));
  console.log('\n📋 RESULT:\n');
  console.log(`Event: ${eventName}`);
  console.log(`\nSummary:\n${summary}`);
  console.log('\n' + '='.repeat(80));
  
  console.log('\n✅ Demo complete! This is what users will see in the Agendas tab.');
}

main();

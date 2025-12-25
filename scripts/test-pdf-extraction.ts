/**
 * Simple Agenda Extraction Demo
 * Extracts text from one PDF and shows it working
 */

async function extractPDFText(pdfUrl: string): Promise<string | null> {
  try {
    console.log(`📄 Fetching PDF: ${pdfUrl}\n`);
    
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.error(`❌ Failed to fetch PDF: ${response.status}`);
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
    
    console.log(`✅ Extracted ${fullText.length} characters from ${pdf.numPages} pages\n`);
    console.log('📝 First 500 characters:');
    console.log('─'.repeat(80));
    console.log(fullText.substring(0, 500));
    console.log('─'.repeat(80));
    
    return fullText.trim();
    
  } catch (error: any) {
    console.error(`❌ Error extracting PDF: ${error.message}`);
    return null;
  }
}

// Test with a real publicly accessible legislative PDF
const testUrl = 'https://www.congress.gov/118/bills/hr1/BILLS-118hr1ih.pdf';

console.log('🚀 PDF Extraction Demo\n');
console.log('Testing Congressional Bill PDF (HR 1)\n');

const text = await extractPDFText(testUrl);

if (text) {
  console.log(`\n✅ SUCCESS! PDF extraction working`);
  console.log(`   Total text length: ${text.length} characters`);
} else {
  console.log(`\n❌ Failed to extract PDF`);
}

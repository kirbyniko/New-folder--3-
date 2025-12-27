import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
// pdf-parse is CommonJS, use require directly
const pdfParse = require('pdf-parse');

async function testPdfExtraction() {
  console.log('Reading temp-bpda.pdf...');
  const pdfBuffer = readFileSync('temp-bpda.pdf');
  
  console.log(`PDF size: ${pdfBuffer.length} bytes\n`);
  
  console.log('Extracting text with pdf-parse...');
  // Call it directly, not as .default
  const pdfData = await pdfParse(pdfBuffer);
  
  console.log(`\nPages: ${pdfData.numpages}`);
  console.log(`Extracted text length: ${pdfData.text.length} characters\n`);
  console.log('=== EXTRACTED TEXT ===');
  console.log(pdfData.text);
  console.log('\n=== END TEXT ===');
  
  if (pdfData.text.length < 50) {
    console.log('\n⚠️  This would trigger the fallback (< 50 chars)');
  }
  
  console.log('\n=== FIRST 3000 CHARS (what AI sees) ===');
  console.log(pdfData.text.substring(0, 3000));
}

testPdfExtraction().catch(console.error);

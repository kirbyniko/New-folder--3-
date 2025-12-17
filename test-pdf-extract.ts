import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractBillsFromPDF(pdfUrl: string) {
  console.log(`Fetching PDF: ${pdfUrl}\n`);
  
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded: ${pdf.numPages} pages\n`);
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('PDF Content:\n');
    console.log(fullText.substring(0, 2000));
    console.log('\n...\n');
    
    // Extract bill numbers (HB #### or SB ####)
    const billMatches = fullText.match(/[HS]B\s*\d{1,5}/gi);
    if (billMatches) {
      console.log('\nExtracted Bills:');
      const uniqueBills = [...new Set(billMatches.map(b => b.replace(/\s+/g, ' ').toUpperCase()))];
      uniqueBills.forEach(bill => console.log(`  - ${bill}`));
      return uniqueBills;
    }
    
    return [];
    
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Test with OK meeting notice
extractBillsFromPDF('http://webserver1.lsb.state.ok.us/2025-26HB/CMN-AP-NATUR-20251217-09000000.pdf')
  .catch(console.error);

async function testPDFParse() {
  const { PDFParse } = await import('pdf-parse');
  const pdfParse = new PDFParse();
  const pdfUrl = 'http://webserver1.lsb.state.ok.us/2025-26HB/CMN-AP-NATUR-20251217-09000000.pdf';
  
  console.log(`Fetching PDF: ${pdfUrl}\n`);
  
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`PDF size: ${buffer.length} bytes\n`);
    
    const data = await pdfParse(buffer);
    
    console.log('PDF Content:\n');
    console.log(data.text);
    
    // Extract bill numbers (HB #### or SB ####)
    const billMatches = data.text.match(/[HS]B\s*\d{1,5}/g);
    if (billMatches) {
      console.log('\n\nExtracted Bills:');
      const uniqueBills = [...new Set(billMatches)];
      uniqueBills.forEach(bill => console.log(`  - ${bill}`));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPDFParse().catch(console.error);

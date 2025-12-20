import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function analyzeIowaStructure() {
  const url = 'https://www.legis.iowa.gov/committees/meetings/meetingsListComm';
  
  console.log('Analyzing Iowa committee meetings page structure...\n');
  
  const html = await (await fetch(url)).text();
  const $ = cheerio.load(html);
  
  // Look for table structure
  console.log('Tables found:', $('table').length);
  
  $('table').each((idx, table) => {
    console.log(`\nTable ${idx + 1}:`);
    const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
    console.log(`  Headers: ${headers.join(' | ')}`);
    
    const firstRow = $(table).find('tbody tr').first();
    if (firstRow.length > 0) {
      console.log(`  First row cells: ${firstRow.find('td').length}`);
      firstRow.find('td').each((i, td) => {
        const text = $(td).text().trim().substring(0, 100);
        const links = $(td).find('a').length;
        console.log(`    Cell ${i + 1}: "${text}" (${links} links)`);
      });
    }
  });
  
  // Look for meeting entries
  console.log('\n\nSearching for meeting patterns...');
  const sampleText = $('body').text().substring(0, 2000);
  console.log(sampleText);
}

analyzeIowaStructure().catch(console.error);

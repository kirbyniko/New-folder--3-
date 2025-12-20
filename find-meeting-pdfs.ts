import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function findAgendaPDFs() {
  // Check a meeting detail page
  const meetingUrl = 'https://www.leg.state.nv.us/App/InterimCommittee/REL/Interim2025/Meeting/34833';
  const html = await (await fetch(meetingUrl)).text();
  const $ = cheerio.load(html);
  
  console.log('Looking for agenda PDFs and documents on meeting page...\n');
  
  // Find all PDF links
  const pdfs: Array<{text: string, url: string}> = [];
  $('a').each((_, link) => {
    const href = $(link).attr('href');
    const text = $(link).text().trim();
    if (href && (href.toLowerCase().includes('.pdf') || text.toLowerCase().includes('agenda') || text.toLowerCase().includes('notice'))) {
      const fullUrl = href.startsWith('http') ? href : `https://www.leg.state.nv.us${href}`;
      pdfs.push({ text, url: fullUrl });
    }
  });
  
  console.log('📄 Found documents:');
  pdfs.forEach(pdf => {
    console.log(`  ${pdf.text}`);
    console.log(`    ${pdf.url}\n`);
  });
  
  // Look for any structured agenda content
  console.log('\n📋 Page content sections:');
  $('h1, h2, h3, h4').each((_, heading) => {
    const text = $(heading).text().trim();
    if (text) console.log(`  ${text}`);
  });
}

findAgendaPDFs().catch(console.error);

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function checkAgendaPage() {
  const agendaUrl = 'https://www.leg.state.nv.us/App/InterimCommittee/REL/Interim2025/Meeting/34839';
  const html = await (await fetch(agendaUrl)).text();
  const $ = cheerio.load(html);
  
  console.log('Checking agenda page structure...\n');
  
  // Look for PDF links
  const pdfLinks: string[] = [];
  $('a[href*=".pdf"]').each((_, link) => {
    const href = $(link).attr('href');
    const text = $(link).text().trim();
    if (href) {
      pdfLinks.push(`${text}: ${href}`);
    }
  });
  
  if (pdfLinks.length > 0) {
    console.log('📄 PDF Documents found:');
    pdfLinks.forEach(pdf => console.log(`  ${pdf}`));
    console.log('');
  }
  
  // Look for agenda items
  console.log('📋 Agenda structure:');
  $('h3, h4, .agenda-item, li, p').each((idx, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10 && text.length < 200) {
      console.log(`  ${text.substring(0, 150)}`);
    }
    if (idx > 30) return false; // Limit output
  });
}

checkAgendaPage().catch(console.error);

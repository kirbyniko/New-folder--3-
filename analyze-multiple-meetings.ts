import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function analyzeMultipleMeetings() {
  const meetingUrls = [
    'https://www.leg.state.nv.us/App/InterimCommittee/REL/Interim2025/Meeting/34833', // Health and Human Services
    'https://www.leg.state.nv.us/App/InterimCommittee/REL/Interim2025/Meeting/34839', // First agenda link
    'https://www.leg.state.nv.us/App/InterimCommittee/REL/Interim2025/Meeting/34856', // Interim Finance Committee
  ];
  
  for (const url of meetingUrls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Analyzing: ${url}`);
    console.log('='.repeat(80));
    
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Get meeting title
      const title = $('h1, h2').first().text().trim();
      console.log(`\nTitle: ${title}\n`);
      
      // Look for any document links
      const docs: Array<{type: string, text: string, url: string}> = [];
      $('a').each((_, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        if (href && text) {
          const lower = text.toLowerCase();
          const hrefLower = href.toLowerCase();
          
          if (hrefLower.includes('.pdf') || lower.includes('agenda') || lower.includes('notice') || 
              lower.includes('minutes') || lower.includes('document') || lower.includes('exhibit')) {
            const fullUrl = href.startsWith('http') ? href : `https://www.leg.state.nv.us${href}`;
            let type = 'Other';
            if (hrefLower.includes('.pdf')) type = 'PDF';
            if (lower.includes('agenda')) type = 'Agenda';
            if (lower.includes('notice')) type = 'Notice';
            if (lower.includes('minutes')) type = 'Minutes';
            if (lower.includes('exhibit')) type = 'Exhibit';
            
            docs.push({ type, text, url: fullUrl });
          }
        }
      });
      
      if (docs.length > 0) {
        console.log('📄 Documents found:');
        docs.forEach(doc => {
          console.log(`  [${doc.type}] ${doc.text}`);
          console.log(`    → ${doc.url}`);
        });
      } else {
        console.log('❌ No agenda documents found');
      }
      
      // Look for any agenda content in the page itself
      console.log('\n📋 Checking for structured content...');
      const sections = $('h3, h4, h5').map((_, h) => $(h).text().trim()).get();
      if (sections.length > 0) {
        console.log(`  Found ${sections.length} section headings:`);
        sections.slice(0, 10).forEach(s => console.log(`    - ${s}`));
      }
      
      // Check for bill references
      const pageText = $('body').text();
      const billMatches = pageText.match(/\b(AB|SB|ACR|SCR|AJR|SJR)\s*\d+/gi);
      if (billMatches && billMatches.length > 0) {
        console.log(`\n📜 Found bill references: ${[...new Set(billMatches)].slice(0, 10).join(', ')}`);
      }
      
    } catch (error) {
      console.error(`Error analyzing ${url}:`, error);
    }
  }
}

analyzeMultipleMeetings().catch(console.error);

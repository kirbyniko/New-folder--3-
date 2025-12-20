import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function checkAgendaPDFs() {
  const html = await (await fetch('https://www.leg.state.nv.us/App/Calendar/A/')).text();
  const $ = cheerio.load(html);
  
  console.log('Checking for agenda PDFs in Nevada events...\n');
  
  $('.padTop.padBottom').each((idx, elem) => {
    const $section = $(elem);
    const name = $section.find('.BlueBold').first().text().trim();
    
    if (name) {
      console.log(`Event ${idx + 1}: ${name}`);
      
      // Check all links in this section
      $section.find('a').each((_, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        if (href) {
          if (href.toLowerCase().includes('.pdf')) {
            console.log(`  📄 PDF: ${text || 'Document'} - ${href}`);
          } else if (text.toLowerCase().includes('agenda') || text.toLowerCase().includes('notice')) {
            console.log(`  📋 Link: ${text} - ${href}`);
          }
        }
      });
      
      console.log('');
    }
  });
}

checkAgendaPDFs().catch(console.error);

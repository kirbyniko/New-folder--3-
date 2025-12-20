import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function checkSliqViewer() {
  const viewerUrl = 'https://sg001-harmony.sliq.net/00324/Harmony/en/PowerBrowser/PowerBrowserV2/20251217/-1/?fk=17785&viewmode=1';
  
  try {
    const response = await fetch(viewerUrl);
    const html = await response.text();
    
    // Check if there's an API endpoint or JSON data
    const apiMatches = html.match(/api[^"'\s]*/gi);
    const jsonMatches = html.match(/"[^"]*\.json[^"]*"/gi);
    const pdfMatches = html.match(/[^"'\s]*\.pdf[^"'\s]*/gi);
    
    console.log('Sliq Harmony Viewer Analysis:\n');
    
    if (apiMatches) {
      console.log('📡 API references:');
      apiMatches.slice(0, 5).forEach(m => console.log(`  ${m}`));
      console.log('');
    }
    
    if (jsonMatches) {
      console.log('📊 JSON endpoints:');
      jsonMatches.slice(0, 5).forEach(m => console.log(`  ${m}`));
      console.log('');
    }
    
    if (pdfMatches) {
      console.log('📄 PDF references:');
      pdfMatches.slice(0, 5).forEach(m => console.log(`  ${m}`));
      console.log('');
    }
    
    // Look for agenda items in the HTML
    const $ = cheerio.load(html);
    const agendaItems: string[] = [];
    
    $('[class*="agenda"], [id*="agenda"], .item, .topic').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 10 && text.length < 300) {
        agendaItems.push(text);
      }
    });
    
    if (agendaItems.length > 0) {
      console.log('📋 Found agenda items:');
      agendaItems.slice(0, 10).forEach(item => console.log(`  ${item.substring(0, 150)}`));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSliqViewer().catch(console.error);

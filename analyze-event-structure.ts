import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function analyzeEventStructure() {
  const html = await (await fetch('https://www.leg.state.nv.us/App/Calendar/A/')).text();
  const $ = cheerio.load(html);
  
  console.log('Analyzing first few events in detail...\n');
  
  $('.padTop.padBottom').slice(0, 5).each((idx, elem) => {
    const $section = $(elem);
    const name = $section.find('.BlueBold').first().text().trim() || $section.find('.BlackBold').first().text().trim();
    
    console.log(`\n=== Event ${idx + 1}: ${name} ===`);
    console.log('HTML snippet:');
    console.log($section.html()?.substring(0, 800));
    console.log('\n---');
  });
}

analyzeEventStructure().catch(console.error);

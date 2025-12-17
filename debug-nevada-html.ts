// Debug Nevada HTML structure
import * as cheerio from 'cheerio';

async function debug() {
  const url = 'https://www.leg.state.nv.us/App/Calendar/A/';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log('Looking for date headers with class BGazure.fBold...');
  $('.BGazure.fBold').each((i, el) => {
    console.log(`  ${i+1}. "${$(el).text().trim().substring(0, 50)}"`);
  });
  
  console.log('\nLooking for rows with classes row padTop padBottom...');
  $('.row.padTop.padBottom').each((i, el) => {
    console.log(`  ${i+1}. HTML: ${$(el).html()?.substring(0, 100)}...`);
  });
  
  console.log('\nLooking for divs with classes padTop padBottom...');
  $('div.padTop.padBottom').each((i, el) => {
    console.log(`  ${i+1}. HTML: ${$(el).html()?.substring(0, 100)}...`);
  });
  
  console.log('\nLooking for elements containing "Cannabis" or "Finance"...');
  $('*:contains("Cannabis")').filter((i, el) => {
    const text = $(el).text().trim();
    return text.includes('Cannabis') && text.length < 200;
  }).each((i, el) => {
    console.log(`  ${i+1}. <${el.tagName}> "${$(el).text().trim().substring(0, 60)}"`);
  });
}

debug();

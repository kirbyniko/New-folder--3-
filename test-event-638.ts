/**
 * Direct test of bill extraction from event 638
 */

async function testEvent638() {
  const cheerio = await import('cheerio');
  
  const response = await fetch('https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=638&et=2');
  const html = await response.text();
  
  const $ = cheerio.load(html);
  
  const bills: any[] = [];
  
  $('table#pageBody_gvDetails tr').each((i, row) => {
    const $row = $(row);
    const billLink = $row.find('a[href*="billinfo"]');
    
    if (billLink.length > 0) {
      bills.push({
        id: billLink.text().trim(),
        title: $row.find('td').eq(2).text().trim(),
        url: 'https://www.gencourt.state.nh.us' + billLink.attr('href')
      });
    }
  });
  
  console.log(`\n✅ Bills found: ${bills.length}`);
  bills.forEach((bill, idx) => {
    console.log(`\n${idx + 1}. ${bill.id}`);
    console.log(`   ${bill.title.substring(0, 80)}...`);
    console.log(`   ${bill.url}`);
  });
}

testEvent638().catch(console.error);

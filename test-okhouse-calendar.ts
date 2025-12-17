import * as cheerio from 'cheerio';

async function testCalendar() {
  const url = 'https://www.okhouse.gov/calendars?start=2025-12-17&end=2026-01-31';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log('Found events on calendar:\n');
  
  // Find all event entries
  $('article').each((_, article) => {
    const title = $(article).find('h4').first().text().trim();
    const dateTime = $(article).find('time').text().trim();
    const location = $(article).find('p').filter((_, el) => {
      return $(el).text().includes('ROOM');
    }).text().trim();
    
    // Find links
    const links: string[] = [];
    $(article).find('a').each((_, link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      if (href) {
        links.push(`${text}: ${href}`);
      }
    });
    
    if (title) {
      console.log(`\n${title}`);
      console.log(`Date/Time: ${dateTime}`);
      console.log(`Location: ${location}`);
      console.log('Links:');
      links.forEach(link => console.log(`  - ${link}`));
    }
  });
}

testCalendar().catch(console.error);

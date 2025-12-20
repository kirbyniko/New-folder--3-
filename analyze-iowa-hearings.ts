import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function analyzeIowaHearings() {
  const url = 'https://www.legis.iowa.gov/committees/publicHearings?ga=91';
  const html = await (await fetch(url)).text();
  const $ = cheerio.load(html);
  
  console.log('Analyzing Iowa Public Hearings Structure...\n');
  
  const hearings: any[] = [];
  
  $('table tr').each((idx, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 6) {
      const dateText = $(cells[0]).text().trim();
      const location = $(cells[1]).text().trim();
      const billSubject = $(cells[2]).text().trim();
      const agenda = $(cells[3]).text().trim();
      
      // Get links
      const agendaLink = $(cells[3]).find('a').attr('href');
      const noticesLink = $(cells[4]).find('a').attr('href');
      
      if (dateText && dateText !== 'Date') {
        hearings.push({
          dateText,
          location,
          billSubject,
          agenda,
          agendaLink,
          noticesLink
        });
      }
    }
  });
  
  console.log(`Found ${hearings.length} hearings\n`);
  
  if (hearings.length > 0) {
    console.log('Sample hearings:');
    hearings.slice(0, 5).forEach((h, i) => {
      console.log(`\n${i + 1}. ${h.dateText}`);
      console.log(`   Location: ${h.location}`);
      console.log(`   Bill: ${h.billSubject}`);
      console.log(`   Agenda: ${h.agenda}`);
      if (h.agendaLink) console.log(`   Agenda Link: ${h.agendaLink}`);
      if (h.noticesLink) console.log(`   Notices Link: ${h.noticesLink}`);
    });
    
    // Check date range
    console.log(`\n\nDate analysis:`);
    const dates = hearings.map(h => h.dateText).filter(d => d);
    console.log(`First hearing: ${dates[dates.length - 1]}`);
    console.log(`Last hearing: ${dates[0]}`);
    
    // Check if any are upcoming
    const now = new Date();
    const upcomingCount = hearings.filter(h => {
      try {
        const hearingDate = new Date(h.dateText);
        return hearingDate >= now;
      } catch {
        return false;
      }
    }).length;
    
    console.log(`\nUpcoming hearings: ${upcomingCount}`);
    console.log(`Past hearings: ${hearings.length - upcomingCount}`);
  }
}

analyzeIowaHearings().catch(console.error);

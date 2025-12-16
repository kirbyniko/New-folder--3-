// Minimal NC scraper test that directly returns events
import * as cheerio from 'cheerio';

async function testNC() {
  try {
    console.log('Fetching NC calendar...');
    const response = await fetch('https://www.ncleg.gov/LegislativeCalendar');
    const html = await response.text();
    console.log(`Fetched ${html.length} bytes`);
    
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Find all committee links
    $('a[href*="/Committees/CommitteeInfo/"]').each((_, element) => {
      const $link = $(element);
      const committeeText = $link.text().trim();
      
      // Find parent event row
      const $eventRow = $link.closest('.cal-event');
      if ($eventRow.length === 0) return;
      
      // Find parent day group
      const $dayGroup = $eventRow.closest('.cal-event-day');
      if ($dayGroup.length === 0) return;
      
      // Extract date
      const $datePill = $dayGroup.find('.date-pill .col-12');
      const dateTexts = $datePill.map((_, el) => $(el).text().trim()).get();
      const datePillText = dateTexts.join(' ');
      
      // Extract time
      const $timeLink = $eventRow.find('a[href*="/Committees/NoticeDocument/"]');
      const timeText = $timeLink.text().trim();
      
      // Extract location
      const $locationLink = $eventRow.find('a[href*="/LegislativeCalendarEvent/"]').first();
      const locationText = $locationLink.text().trim();
      
      events.push({
        date: datePillText,
        time: timeText,
        committee: committeeText,
        location: locationText
      });
    });
    
    console.log(`\nFound ${events.length} committee meetings:`);
    events.forEach((e, i) => {
      console.log(`\n${i+1}. ${e.committee}`);
      console.log(`   Date: ${e.date}`);
      console.log(`   Time: ${e.time}`);
      console.log(`   Location: ${e.location}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testNC();

import * as cheerio from 'cheerio';

interface KentuckyMeeting {
  date: string;
  time: string;
  location: string;
  committee: string;
  committeeUrl: string;
  agenda?: string;
  members?: string;
}

async function testKentuckyParser() {
  const url = 'https://apps.legislature.ky.gov/legislativecalendar';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== Parsing Kentucky Committee Meetings ===\n');

  const meetings: KentuckyMeeting[] = [];
  let currentDate = '';

  // Split content by date headings
  const content = $.html();
  const datePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+\s+\d+,\s+\d{4})/g;
  
  // Find all paragraph elements which seem to contain the meeting data
  $('p, div').each((_, el) => {
    const text = $(el).text().trim();
    
    // Check if this is a date header
    const dateMatch = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+\s+\d+,\s+\d{4})$/);
    if (dateMatch) {
      currentDate = text;
      return;
    }

    // Check if this is a "No Meetings Scheduled" notice
    if (text === 'No Meetings Scheduled') {
      console.log(`${currentDate}: No meetings scheduled`);
      return;
    }

    // Check for meeting time/location pattern
    const meetingMatch = text.match(/^(\d{1,2}:\d{2}\s+[ap]m),\s+(.+)/);
    if (meetingMatch && currentDate) {
      const time = meetingMatch[1];
      const location = meetingMatch[2];
      
      // Find the next committee link after this element
      let committee = '';
      let committeeUrl = '';
      let nextEl = $(el).next();
      
      while (nextEl.length > 0) {
        const link = nextEl.find('a[href*="Committee-Details"]').first();
        if (link.length > 0) {
          committee = link.text().trim();
          committeeUrl = 'https://legislature.ky.gov' + link.attr('href');
          break;
        }
        
        // Also check if the next element itself is the link
        if (nextEl.is('a[href*="Committee-Details"]')) {
          committee = nextEl.text().trim();
          committeeUrl = 'https://legislature.ky.gov' + nextEl.attr('href');
          break;
        }
        
        nextEl = nextEl.next();
        
        // Don't search too far
        if (nextEl.text().match(/^\d{1,2}:\d{2}\s+[ap]m/)) break;
      }

      // Find agenda content if available
      let agendaText = '';
      const parent = $(el).parent();
      const agendaSection = parent.find('*:contains("Agenda:")').first();
      if (agendaSection.length > 0) {
        const agendaContent = agendaSection.nextAll().slice(0, 5).map((_, el) => $(el).text().trim()).get().join(' ');
        agendaText = agendaContent.substring(0, 200);
      }

      meetings.push({
        date: currentDate,
        time,
        location,
        committee,
        committeeUrl,
        agenda: agendaText || undefined
      });
    }
  });

  console.log(`Found ${meetings.length} meetings:\n`);
  
  meetings.forEach((meeting, i) => {
    console.log(`${i + 1}. ${meeting.committee}`);
    console.log(`   Date: ${meeting.date}`);
    console.log(`   Time: ${meeting.time}`);
    console.log(`   Location: ${meeting.location}`);
    console.log(`   URL: ${meeting.committeeUrl}`);
    if (meeting.agenda) {
      console.log(`   Agenda: ${meeting.agenda}`);
    }
    console.log('');
  });
}

testKentuckyParser().catch(console.error);

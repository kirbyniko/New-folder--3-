// Direct Nevada scraper (bypass BaseScraper transformation)
import * as cheerio from 'cheerio';
import * as fs from 'fs';

interface RawEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  committee: string;
  type: string;
  level: string;
  state: string;
  city: string;
  lat: number;
  lng: number;
  zipCode: null;
  description: string;
  sourceUrl: string;
  virtualMeetingUrl: string | null;
  docketUrl: string | null;
}

async function scrapeNevada() {
  const url = 'https://www.leg.state.nv.us/App/Calendar/A/';
  console.log('Fetching Nevada calendar...\n');
  
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const events: RawEvent[] = [];
  let currentDate = '';
  
  // Find all children in the main content div and process them sequentially
  const $mainContent = $('.container-fluid');
  const children = $mainContent.children();
  
  children.each((_, el) => {
    const $el = $(el);
    
    // Check if this is a date header
    const dateHeader = $el.find('.BGazure.fBold').first();
    if (dateHeader.length > 0) {
      const dateText = dateHeader.text().trim().replace(/<br\s*\/?>/gi, ' ').split('\n')[0].trim();
      if (dateText) {
        currentDate = dateText;
      }
      return;
    }
    
    // Check if this is an event row
    if (!$el.hasClass('row') || !$el.hasClass('padTop') || !$el.hasClass('padBottom')) {
      return;
    }
    
    // Skip if no current date set
    if (!currentDate) return;
    
    // Extract event details
    const timeEl = $el.find('.col-md-2.ACenter.fBold');
    const time = timeEl.text().trim().split('\n')[0].trim();
    
    if (!time || time === 'Time') return;
    
    // Find committee name and detail link
    const blueBoldLinks = $el.find('.BlueBold');
    let finalName = '';
    let detailUrl = '';
    
    if (blueBoldLinks.length > 0) {
      const link = blueBoldLinks.first().find('a');
      if (link.length > 0) {
        finalName = link.text().trim();
        detailUrl = link.attr('href') || '';
      } else {
        finalName = blueBoldLinks.first().text().trim();
      }
    }
    
    // If no BlueBold, check for BlackBold
    if (!finalName) {
      const blackBold = $el.find('.BlackBold');
      if (blackBold.length > 0) {
        const link = blackBold.first().find('a');
        if (link.length > 0) {
          finalName = link.text().trim();
          detailUrl = link.attr('href') || '';
        } else {
          finalName = blackBold.first().text().trim();
        }
      }
    }
    
    if (!finalName) return;
    
    // Extract location
    const locationList = $el.find('.LocationMargin li');
    let location = '';
    let virtualMeetingUrl: string | null = null;
    
    locationList.each((_, li) => {
      const text = $(li).text().trim();
      if (text && !text.toLowerCase().includes('videoconference')) {
        if (!location) location = text;
      } else if (text.toLowerCase().includes('videoconference')) {
        virtualMeetingUrl = text;
      }
    });
    
    if (!location) location = 'Nevada Legislature';
    
    // Parse date
    const dateParts = currentDate.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d{4})/);
    if (!dateParts) return;
    
    const [, , month, day, year] = dateParts;
    const timeParts = time.match(/(\d+):(\d+)\s+(AM|PM)/i);
    if (!timeParts) return;
    
    let [, hour, minute, period] = timeParts;
    let hourNum = parseInt(hour);
    if (period.toUpperCase() === 'PM' && hourNum !== 12) {
      hourNum += 12;
    } else if (period.toUpperCase() === 'AM' && hourNum === 12) {
      hourNum = 0;
    }
    
    const monthMap: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const date = new Date(parseInt(year), monthMap[month], parseInt(day), hourNum, parseInt(minute));
    
    // Extract committee name
    let committee = finalName;
    const committeeMatch = finalName.match(/^(.*?)\s*(?:-|–)\s/);
    if (committeeMatch) {
      committee = committeeMatch[1].trim();
    }
    
    // Build full detail URL
    const fullDetailUrl = detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.leg.state.nv.us${detailUrl}`) : url;
    
    const event: RawEvent = {
      id: `nv-${date.getTime()}-${finalName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`,
      name: finalName,
      date: date.toISOString(),
      time,
      location,
      committee,
      type: 'committee-meeting',
      level: 'state',
      state: 'NV',
      city: location.includes('Carson City') ? 'Carson City' : 'Las Vegas',
      lat: location.includes('Carson City') ? 39.1638 : 36.1716,
      lng: location.includes('Carson City') ? -119.7674 : -115.1391,
      zipCode: null,
      description: `Nevada Legislature ${committee}`,
      sourceUrl: fullDetailUrl,
      virtualMeetingUrl,
      docketUrl: detailUrl ? fullDetailUrl : null
    };
    
    events.push(event);
  });
  
  console.log(`Found ${events.length} events\n`);
  
  // Filter to future events only
  const now = new Date();
  const futureEvents = events.filter(e => new Date(e.date) > now);
  
  console.log(`Future events: ${futureEvents.length}`);
  
  //Save to JSON
  fs.writeFileSync('public/data/nevada-events.json', JSON.stringify(futureEvents, null, 2));
  console.log('✅ Saved to public/data/nevada-events.json');
  
  if (futureEvents.length > 0) {
    console.log('\nFirst 3 events:');
    futureEvents.slice(0, 3).forEach((e, i) => {
      console.log(`\n${i+1}. ${e.name}`);
      console.log(`   📅 ${e.date}`);
      console.log(`   📍 ${e.city}`);
      console.log(`   🔗 ${e.sourceUrl}`);
    });
  }
}

scrapeNevada();

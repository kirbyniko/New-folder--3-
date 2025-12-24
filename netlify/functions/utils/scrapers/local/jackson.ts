import * as cheerio from 'cheerio';
import type { RawEvent, CalendarSource } from '../../../types';

interface JacksonMeeting {
  title: string;
  date: string;
  time?: string;
  location?: string;
  pdfUrl?: string;
  description?: string;
}

export async function scrapeJacksonMeetings(): Promise<RawEvent[]> {
  console.log('🏛️ JACKSON MS SCRAPER: Starting...');
  
  try {
    const url = 'https://jacksonms.gov/meeting-schedule/';
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const meetings: JacksonMeeting[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Look for meeting listings in the main content
    $('.entry-content, .content-area, article, .meeting-schedule').find('*').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      // Skip empty or very short text
      if (text.length < 20) return;

      // Look for date patterns
      const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
      
      if (dateMatch) {
        const parsedDate = parseDate(dateMatch[0]);
        if (!parsedDate) return;

        const eventDate = new Date(parsedDate);
        if (eventDate < today) return; // Skip past events

        // Extract title (look for meeting name/committee)
        let title = 'City Council Meeting';
        if (text.match(/city\s+council/i)) {
          title = 'City Council Meeting';
        } else if (text.match(/planning\s+board/i)) {
          title = 'Planning Board Meeting';
        } else if (text.match(/zoning/i)) {
          title = 'Zoning Board Meeting';
        } else if (text.match(/public\s+works/i)) {
          title = 'Public Works Committee';
        }

        // Look for PDF links
        const pdfLink = $elem.find('a[href*=".pdf"], a[href*="PDF"]').first();
        const pdfUrl = pdfLink.length ? pdfLink.attr('href') : undefined;

        // Extract time
        const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))|(\d{1,2}\s*(?:AM|PM|am|pm))/i);
        const time = timeMatch ? timeMatch[0] : undefined;

        // Extract location
        let location = 'Jackson City Hall';
        const locationMatch = text.match(/(?:at|location:?)\s+([^,\n]+)/i);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }

        meetings.push({
          title,
          date: parsedDate,
          time,
          location,
          pdfUrl: pdfUrl ? (pdfUrl.startsWith('http') ? pdfUrl : `https://jacksonms.gov${pdfUrl}`) : undefined,
          description: text.substring(0, 200)
        });
      }
    });

    // Also look for direct PDF links with dates in filenames
    $('a[href*=".pdf"], a[href*="PDF"]').each((_, link) => {
      const href = $(link).attr('href');
      const linkText = $(link).text().trim();
      
      if (!href) return;

      // Try to extract date from link text or nearby text
      const parent = $(link).parent();
      const nearbyText = parent.text();
      
      const dateMatch = nearbyText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(\d{1,2}\/\d{1,2}\/\d{4})/i);
      
      if (dateMatch) {
        const parsedDate = parseDate(dateMatch[0]);
        if (!parsedDate) return;

        const eventDate = new Date(parsedDate);
        if (eventDate < today) return;

        meetings.push({
          title: linkText || 'City Council Meeting',
          date: parsedDate,
          time: undefined,
          location: 'Jackson City Hall',
          pdfUrl: href.startsWith('http') ? href : `https://jacksonms.gov${href}`,
          description: `Agenda: ${linkText || 'Meeting agenda'}`
        });
      }
    });

    // Remove duplicates based on date + title
    const uniqueMeetings = Array.from(
      new Map(meetings.map(m => [`${m.date}-${m.title}`, m])).values()
    );

    console.log(`✅ JACKSON MS: Found ${uniqueMeetings.length} meetings`);

    // Convert to RawEvent format
    const rawEvents = uniqueMeetings.map(meeting => convertToRawEvent(meeting));
    
    return rawEvents;

  } catch (error) {
    console.error('❌ JACKSON MS SCRAPER ERROR:', error);
    return [];
  }
}

function parseDate(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

function convertToRawEvent(meeting: JacksonMeeting): RawEvent {
  const eventDate = new Date(meeting.date);
  const titleHash = hashString(meeting.title);
  
  return {
    id: `jackson-ms-${eventDate.getTime()}-${titleHash}`,
    name: meeting.title,
    date: meeting.date,
    time: meeting.time || 'Time TBD',
    location: meeting.location || 'Jackson City Hall',
    committee: meeting.title,
    type: 'city-council-meeting',
    level: 'local',
    state: 'MS',
    city: 'Jackson',
    lat: 32.2988,
    lng: -90.1848,
    zipCode: null,
    description: meeting.description || `${meeting.title} in Jackson, MS`,
    sourceUrl: 'https://jacksonms.gov/meeting-schedule/',
    docketUrl: meeting.pdfUrl,
    tags: ['city-council', 'local-government']
  };
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

export function getJacksonCalendarSources(): CalendarSource[] {
  return [
    {
      name: 'Jackson City Meeting Schedule',
      url: 'https://jacksonms.gov/meeting-schedule/',
      type: 'primary',
      lastChecked: new Date().toISOString(),
      status: 'active',
      notes: 'Official Jackson, MS city meetings'
    }
  ];
}

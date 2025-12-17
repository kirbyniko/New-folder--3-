import * as cheerio from 'cheerio';
import { RawEvent } from '../../types';

/**
 * Scraper for Bridgeport, CT city government meetings
 * URL: https://www.bridgeportct.gov/events
 * Method: Static HTML parsing with Cheerio
 */

const BASE_URL = 'https://www.bridgeportct.gov';

export async function scrapeBridgeportMeetings(): Promise<RawEvent[]> {
  console.log('[BRIDGEPORT] Starting scrape...');
  
  try {
    const response = await fetch(`${BASE_URL}/events`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const events: RawEvent[] = [];
    
    // Parse event cards
    $('.event-card').each((_, elem) => {
      try {
        const $elem = $(elem);
        
        // Extract date from .short-date div (has two <p> tags: month and day)
        const datePs = $elem.find('.short-date p');
        const month = $(datePs[0]).text().trim().toUpperCase();
        const day = $(datePs[1]).text().trim();
        const year = new Date().getFullYear().toString();
        
        // Extract title and link from h3 > a
        const linkElem = $elem.find('h3 a.heading-link').first();
        const title = linkElem.text().trim();
        const eventUrl = linkElem.attr('href');
        
        if (!title) return;
        
        // Skip if cancelled
        if (title.toLowerCase().includes('cancelled')) {
          console.log(`[BRIDGEPORT] Skipping cancelled event: ${title}`);
          return;
        }
        
        // Extract time and location from badge spans
        const badges = $elem.find('.badge span').toArray();
        let timeStr = '6:00pm'; // default
        let location = 'Bridgeport City Hall'; // default
        
        badges.forEach(badge => {
          const text = $(badge).text().trim();
          // Time badge: looks like "6:00pm"
          if (text.match(/^\d{1,2}:\d{2}[ap]m$/i)) {
            timeStr = text;
          }
          // Location badge: contains "City Hall" or room number
          if (text.includes('City Hall') || text.match(/Room \d+/i)) {
            location = text;
          }
        });
        
        // Convert month abbreviation to number
        const monthMap: Record<string, string> = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        
        const monthNum = monthMap[month];
        if (!monthNum || !day) return;
        
        // Create ISO date
        const dateStr = `${year}-${monthNum}-${day.padStart(2, '0')}`;
        
        // Parse time to get hour for ISO string
        const timeRegex = /(\d{1,2}):?(\d{2})?\s*([ap]m)/i;
        const timeMatched = timeStr.match(timeRegex);
        let hour = 18;
        let minute = 0;
        
        if (timeMatched) {
          hour = parseInt(timeMatched[1]);
          minute = timeMatched[2] ? parseInt(timeMatched[2]) : 0;
          if (timeMatched[3].toLowerCase() === 'pm' && hour !== 12) hour += 12;
          if (timeMatched[3].toLowerCase() === 'am' && hour === 12) hour = 0;
        }
        
        const date = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
        
        // Extract committee name (before " Committee" or full title)
        let committee = title;
        const committeeMatch = title.match(/^(.+?)\s+Committee/i);
        if (committeeMatch) {
          committee = committeeMatch[1] + ' Committee';
        }
        
        const event: RawEvent = {
          id: `bridgeport-${date.getTime()}-${sanitizeForId(title)}`,
          name: title,
          date: date.toISOString(),
          time: timeStr,
          location,
          committee,
          type: 'committee-meeting',
          level: 'local',
          state: 'CT',
          city: 'Bridgeport',
          lat: 41.1865,
          lng: -73.1952,
          zipCode: '06604',
          description: `City of Bridgeport ${committee}`,
          sourceUrl: eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${BASE_URL}${eventUrl}`) : `${BASE_URL}/events`,
          virtualMeetingUrl: null,
          docketUrl: null
        };
        
        events.push(event);
        console.log(`[BRIDGEPORT] ✓ ${title} - ${dateStr} ${timeStr}`);
        
      } catch (err) {
        console.error('[BRIDGEPORT] Error parsing event:', err);
      }
    });
    
    // Filter future events only
    const now = new Date();
    const futureEvents = events.filter(e => new Date(e.date) >= now);
    
    console.log(`[BRIDGEPORT] Found ${futureEvents.length} future events (${events.length} total)`);
    return futureEvents;
    
  } catch (error) {
    console.error('[BRIDGEPORT] Scrape failed:', error);
    throw error;
  }
}

function sanitizeForId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

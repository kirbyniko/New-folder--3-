import { RawEvent } from '../../../types';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

/**
 * Birmingham, Alabama City Council Scraper
 * 
 * Scrapes meetings from Birmingham's Next.js calendar using Puppeteer
 * URL: https://www.birminghamal.gov/events/calendar
 * 
 * The site uses client-side React rendering - events load dynamically via JavaScript.
 * We use Puppeteer to execute JavaScript and extract rendered calendar data.
 */

const BASE_URL = 'https://www.birminghamal.gov';
const CALENDAR_URL = `${BASE_URL}/events/calendar`;

interface CalendarEventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  categories: string[];
  departments: string[];
  url: string;
}

/**
 * Scrape Birmingham City Council meetings using Puppeteer
 * Waits for calendar to render, then extracts City Council meeting events
 */
export async function scrapeBirminghamMeetings(): Promise<RawEvent[]> {
  try {
    console.log(`[Birmingham] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
    
    const events = await scrapeWithPuppeteer<CalendarEventData[]>(CALENDAR_URL, {
      // Wait for calendar grid to render (skeleton loaders replaced with actual events)
      waitFor: '.grid.grid-cols-7',
      evaluate: async (page) => {
        // Wait a bit more for events to populate after skeleton
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract events from rendered calendar
        return await page.evaluate(() => {
          const events: CalendarEventData[] = [];
          
          // Look for calendar day cells with events
          const dayCells = document.querySelectorAll('.grid.grid-cols-7 > div');
          
          dayCells.forEach((cell, cellIndex) => {
            // Find event links in this day
            const eventLinks = cell.querySelectorAll('a[href*="/events/"]');
            
            eventLinks.forEach((link, linkIndex) => {
              const title = link.textContent?.trim() || '';
              const url = (link as HTMLAnchorElement).href || '';
              
              // Try multiple ways to extract date
              let dateText = '';
              
              // Method 1: aria-label on date element
              const dateEl = cell.querySelector('a[aria-label], button[aria-label], div[aria-label]');
              if (dateEl) {
                dateText = dateEl.getAttribute('aria-label') || '';
              }
              
              // Method 2: Look for visible date number in cell
              if (!dateText) {
                const dateNumberEl = cell.querySelector('a, button, div');
                const potentialDate = dateNumberEl?.textContent?.trim();
                if (potentialDate && /^\d{1,2}$/.test(potentialDate)) {
                  // Get current month/year from page or use current date
                  const now = new Date();
                  const month = now.getMonth() + 1;
                  const year = now.getFullYear();
                  dateText = `${year}-${month.toString().padStart(2, '0')}-${potentialDate.padStart(2, '0')}`;
                }
              }
              
              // Look for time info
              const timeEl = link.parentElement?.querySelector('[class*="time"], .pl-1, span');
              let time = timeEl?.textContent?.trim() || '';
              
              // Clean up time if it looks like a time
              if (time && !/^\d{1,2}:\d{2}/.test(time)) {
                time = 'Time TBD';
              }
              
              // Check if this looks like a City Council meeting
              const isCouncilMeeting = 
                title.toLowerCase().includes('city council') ||
                title.toLowerCase().includes('council meeting') ||
                title.toLowerCase().includes('committee') ||
                title.toLowerCase().includes('commission') ||
                title.toLowerCase().includes('board');
              
              if (isCouncilMeeting && title && url) {
                events.push({
                  id: `bham-${cellIndex}-${linkIndex}`,
                  title,
                  date: dateText || new Date().toISOString().split('T')[0],
                  time: time || 'Time TBD',
                  location: 'Birmingham City Hall',
                  categories: [],
                  departments: ['City Council'],
                  url,
                });
              }
            });
          });
          
          return events;
        });
      },
    });

    console.log(`[Birmingham] Found ${events.length} potential events via Puppeteer`);

    const rawEvents: RawEvent[] = [];

    for (const event of events) {
      // Parse date - could be in various formats
      let dateStr: string;
      try {
        const parsedDate = new Date(event.date);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        } else {
          console.warn(`[Birmingham] Could not parse date: ${event.date}`);
          continue;
        }
      } catch (e) {
        console.warn(`[Birmingham] Invalid date format: ${event.date}`);
        continue;
      }

      rawEvents.push({
        id: `birmingham-${event.id}`,
        name: event.title,
        date: dateStr,
        time: event.time,
        location: event.location || 'Birmingham City Hall',
        committee: 'City Council',
        type: 'city-council',
        level: 'local',
        state: 'AL',
        city: 'Birmingham',
        lat: 33.5186,
        lng: -86.8104,
        description: '',
        sourceUrl: event.url || CALENDAR_URL,
      });
    }

    console.log(`[Birmingham] Extracted ${rawEvents.length} City Council meetings`);
    return rawEvents;
  } catch (error) {
    console.error('[Birmingham] Scraping failed:', error);
    return [];
  }
}

/**
 * Main scraper function
 */
export async function scrapeCalendar(): Promise<RawEvent[]> {
  return scrapeBirminghamMeetings();
}

import { RawEvent } from '../../../types';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

/**
 * Montgomery, Alabama City Council Scraper
 * 
 * Scrapes meetings from Montgomery's calendar using Puppeteer
 * URL: https://www.montgomeryal.gov/work/advanced-components/list-detail-pages/calendar-meeting-list
 * 
 * The site is protected by Akamai edge security that blocks basic HTTP requests.
 * Puppeteer with a real browser instance can bypass these protections by:
 * - Executing JavaScript challenges
 * - Maintaining session cookies
 * - Appearing as a real browser
 */

const CALENDAR_URL = 'https://www.montgomeryal.gov/work/advanced-components/list-detail-pages/calendar-meeting-list';

interface MontgomeryEventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
}

/**
 * Scrape Montgomery City Council meetings using Puppeteer
 * Bypasses Akamai security by using real browser with JavaScript execution
 */
export async function scrapeMontgomeryMeetings(): Promise<RawEvent[]> {
  try {
    console.log(`[Montgomery] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
    console.log(`[Montgomery] Note: Using headless browser to bypass Akamai security`);
    
    const events = await scrapeWithPuppeteer<MontgomeryEventData[]>(CALENDAR_URL, {
      // Wait for calendar content to load
      waitFor: 5000, // Give extra time for Akamai checks and page load
      evaluate: async (page) => {
        // Check if we got an Akamai error page
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('Access Denied') || bodyText.includes('edgesuite.net')) {
          console.error('[Montgomery] Still blocked by Akamai even with Puppeteer');
          return [];
        }
        
        // Wait a bit more for dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract calendar events
        return await page.evaluate(() => {
          const events: MontgomeryEventData[] = [];
          
          // Log page title to confirm we're on the right page
          console.log('Page title:', document.title);
          console.log('Body text length:', document.body.innerText.length);
          
          // Look for common calendar event selectors with broader patterns
          const selectors = [
            '[class*="event"]',
            '[class*="meeting"]', 
            '[class*="calendar"]',
            '[class*="item"]',
            '.list-item',
            'article',
            'li',
            'tr',
            '[role="listitem"]'
          ];
          
          let eventContainers: Element[] = [];
          for (const selector of selectors) {
            const found = Array.from(document.querySelectorAll(selector));
            if (found.length > 0) {
              console.log(`Found ${found.length} elements with selector: ${selector}`);
              eventContainers = eventContainers.concat(found);
            }
          }
          
          // Deduplicate
          eventContainers = Array.from(new Set(eventContainers));
          console.log(`Total unique containers: ${eventContainers.length}`);
          
          eventContainers.forEach((container, index) => {
            // Extract title - try multiple approaches
            let title = '';
            const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', '[class*="title"]', 'strong', 'b', 'a'];
            for (const sel of titleSelectors) {
              const el = container.querySelector(sel);
              if (el && el.textContent?.trim()) {
                title = el.textContent.trim();
                break;
              }
            }
            
            // If no title, use container text (first 100 chars)
            if (!title) {
              title = container.textContent?.trim().substring(0, 100) || '';
            }
            
            // Extract date
            let date = '';
            const dateSelectors = ['[class*="date"]', 'time', '[datetime]', 'span', 'div'];
            for (const sel of dateSelectors) {
              const el = container.querySelector(sel);
              const dateText = el?.textContent?.trim() || el?.getAttribute('datetime') || '';
              // Check if looks like a date
              if (dateText && (dateText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || dateText.match(/\d{4}-\d{2}-\d{2}/) || dateText.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i))) {
                date = dateText;
                break;
              }
            }
            
            // Extract time
            const timeEl = container.querySelector('[class*="time"]');
            const time = timeEl?.textContent?.trim() || 'Time TBD';
            
            // Extract location
            const locationEl = container.querySelector('[class*="location"], [class*="venue"]');
            const location = locationEl?.textContent?.trim() || 'Montgomery City Hall';
            
            // Extract URL
            const linkEl = container.querySelector('a[href]');
            const url = (linkEl as HTMLAnchorElement)?.href || '';
            
            // Filter for government meetings with broader keywords
            const isGovernmentMeeting = 
              title.toLowerCase().includes('city council') ||
              title.toLowerCase().includes('council') ||
              title.toLowerCase().includes('commission') ||
              title.toLowerCase().includes('board') ||
              title.toLowerCase().includes('committee') ||
              title.toLowerCase().includes('meeting') ||
              title.toLowerCase().includes('agenda') ||
              title.toLowerCase().includes('public hearing');
            
            if (isGovernmentMeeting && title.length > 5) {
              events.push({
                id: `montgomery-${index + 1}`,
                title,
                date: date || new Date().toISOString().split('T')[0],
                time,
                location,
                url,
              });
            }
          });
          
          return events;
        });
      },
    });

    console.log(`[Montgomery] Found ${events.length} potential events via Puppeteer`);

    const rawEvents: RawEvent[] = [];

    for (const event of events) {
      // Parse date
      let dateStr: string;
      try {
        const parsedDate = new Date(event.date);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        } else {
          console.warn(`[Montgomery] Could not parse date: ${event.date}`);
          continue;
        }
      } catch (e) {
        console.warn(`[Montgomery] Invalid date format: ${event.date}`);
        continue;
      }

      rawEvents.push({
        id: event.id,
        name: event.title,
        date: dateStr,
        time: event.time,
        location: event.location,
        committee: 'City Council',
        type: 'city-council',
        level: 'local',
        state: 'AL',
        city: 'Montgomery',
        lat: 32.3792,
        lng: -86.3077,
        description: '',
        sourceUrl: event.url || CALENDAR_URL,
      });
    }

    console.log(`[Montgomery] Extracted ${rawEvents.length} City Council meetings`);
    return rawEvents;
  } catch (error) {
    console.error('[Montgomery] Puppeteer scraping failed:', error);
    // If Puppeteer fails, log detailed error
    if (error instanceof Error) {
      console.error(`[Montgomery] Error details: ${error.message}`);
      console.error(`[Montgomery] Stack: ${error.stack}`);
    }
    return [];
  }
}

/**
 * Main scraper function
 */
export async function scrapeCalendar(): Promise<RawEvent[]> {
  return scrapeMontgomeryMeetings();
}

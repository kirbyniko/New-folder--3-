import { RawEvent } from '../../interfaces';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

/**
 * Portland, OR City Council & Committee Meetings Scraper
 * 
 * Source: https://www.portland.gov/auditor/council-clerk/events
 * Method: Puppeteer (multi-page scraping with pagination)
 * 
 * Portland uses a custom CMS with paginated event listings.
 * The site has 48+ events across multiple pages that need to be scraped.
 * 
 * Features:
 * - Council meetings (Wed 9:30am/6pm, Thu 2pm)
 * - 8 committee meetings (Transportation, Finance, Governance, Arts, etc.)
 * - Work sessions and executive sessions
 * - Detailed agendas with links to individual event pages
 */

const BASE_URL = 'https://www.portland.gov/auditor/council-clerk/events';
const PORTLAND_COORDS = { lat: 45.5152, lng: -122.6784 }; // Portland City Hall

interface ScrapedEvent {
  title: string;
  url: string;
  dateStr: string;
  timeStr?: string;
  type?: string;
  location?: string;
}

/**
 * Parse Portland's date format: "December 17, 2025" or "December 22, 2025 –January 2, 2026"
 */
function parsePortlandDate(dateStr: string): Date | null {
  try {
    // Handle date ranges - take the start date
    const startDate = dateStr.split('–')[0].trim();
    const date = new Date(startDate);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Parse Portland's time format: "6:00 pm – 9:00 pm" or "2:00 pm – 5:00 pm"
 */
function parsePortlandTime(timeStr: string): string {
  try {
    // Extract start time from range
    const match = timeStr.match(/(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
    if (match) {
      return match[1].replace(/\./g, '').toUpperCase();
    }
    return 'TBD';
  } catch {
    return 'TBD';
  }
}

/**
 * Scrape a single page of Portland events
 */
async function scrapePortlandPage(pageNum: number = 0): Promise<ScrapedEvent[]> {
  const url = pageNum === 0 
    ? BASE_URL 
    : `${BASE_URL}?page=${pageNum}`;
  
  console.log(`Scraping Portland events page ${pageNum + 1}: ${url}`);
  
  try {
    const events = await scrapeWithPuppeteer(url, {
      waitFor: 3000,
      evaluate: async (page) => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return await page.evaluate(() => {
          // Portland lists events as h2 > a, followed by description and date/time
          const events: any[] = [];
          
          // Select all h2 headings that contain links to event pages
          const headings = Array.from(document.querySelectorAll('h2'));
          
          headings.forEach((heading) => {
            const link = heading.querySelector('a');
            if (!link) return;
            
            const href = (link as HTMLAnchorElement).href;
            // Only process event links (contain /events/ in URL)
            if (!href.includes('/events/')) return;
            
            const title = link.textContent?.trim() || '';
            const url = href;
            
            // Get all text content after this heading until the next heading
            let fullText = '';
            let nextSibling = heading.nextElementSibling;
            while (nextSibling && nextSibling.tagName !== 'H2' && nextSibling.tagName !== 'H3') {
              fullText += ' ' + (nextSibling.textContent || '');
              nextSibling = nextSibling.nextElementSibling;
            }
            
            // Extract date: "December 17, 2025" or date ranges "December 22, 2025 –January 2, 2026"
            let dateStr = '';
            const dateMatch = fullText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/);
            if (dateMatch) {
              dateStr = dateMatch[0];
            }
            
            // Extract time: "6:00 pm – 9:00 pm" format (take start time)
            let timeStr = '';
            const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
            if (timeMatch) {
              timeStr = timeMatch[1];
            }
            
            // Detect event type from text content
            let type = '';
            if (fullText.includes('Council Committee Meeting') || title.includes('Committee')) {
              type = 'Council Committee Meeting';
            } else if (fullText.includes('Council Work Session') || title.includes('Work Session')) {
              type = 'Work Session';
            } else if (fullText.includes('Council Executive Session') || title.includes('Executive Session')) {
              type = 'Executive Session';
            } else if (fullText.includes('Council Meeting') || title.includes('Council')) {
              type = 'Council Meeting';
            }
            
            // Extract location if present
            let location = '';
            const locationMatch = fullText.match(/Location:\s*([^\n]+)/i);
            if (locationMatch) {
              location = locationMatch[1].trim();
            }
            
            if (title && url && dateStr) {
              events.push({
                title,
                url,
                dateStr,
                timeStr: timeStr || undefined,
                type: type || undefined,
                location: location || undefined
              });
            }
          });
          
          return events;
        });
      }
    });
    
    console.log(`Found ${events.length} events on page ${pageNum + 1}`);
    return events;
  } catch (error) {
    console.error(`Error scraping Portland page ${pageNum + 1}:`, error);
    return [];
  }
}

/**
 * Scrape all pages of Portland events (handles pagination)
 */
export async function scrapePortlandMeetings(): Promise<RawEvent[]> {
  console.log('Starting Portland meetings scraper...');
  
  const allScrapedEvents: ScrapedEvent[] = [];
  
  // Scrape first 3 pages (should cover 48+ events)
  // Portland shows ~20 events per page
  for (let page = 0; page < 3; page++) {
    const pageEvents = await scrapePortlandPage(page);
    allScrapedEvents.push(...pageEvents);
    
    // Stop if we got fewer than 10 events (likely last page)
    if (pageEvents.length < 10) {
      break;
    }
    
    // Small delay between pages to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`Total Portland events scraped: ${allScrapedEvents.length}`);
  
  // Convert to RawEvent format
  const rawEvents: RawEvent[] = allScrapedEvents
    .map((event, index) => {
      const date = parsePortlandDate(event.dateStr);
      if (!date) {
        console.warn(`Could not parse date: ${event.dateStr}`);
        return null;
      }
      
      const time = event.timeStr ? parsePortlandTime(event.timeStr) : 'TBD';
      
      // Determine event type
      let eventType = 'City Council Meeting';
      if (event.title.includes('Committee')) {
        eventType = 'Committee Meeting';
      } else if (event.title.includes('Work Session')) {
        eventType = 'Work Session';
      } else if (event.title.includes('Executive Session')) {
        eventType = 'Executive Session';
      }
      
      return {
        id: `portland-${date.getTime()}-${index}`,
        name: event.title,
        title: event.title,
        date: date.toISOString(),
        time: time,
        location: event.location || 'City Council Chambers, City Hall',
        committee: event.title,
        type: eventType,
        level: 'local' as const,
        state: 'OR',
        city: 'Portland',
        lat: PORTLAND_COORDS.lat,
        lng: PORTLAND_COORDS.lng,
        zipCode: null,
        description: `Portland ${eventType}`,
        sourceUrl: event.url || BASE_URL,
        virtualMeetingUrl: null,
        bills: []
      };
    })
    .filter((event): event is RawEvent => event !== null);
  
  console.log(`Converted ${rawEvents.length} valid events`);
  return rawEvents;
}

export default scrapePortlandMeetings;

export const config = {
  city: 'Portland',
  state: 'OR',
  source: 'Portland Auditor Council Clerk',
  sourceUrl: BASE_URL,
  method: 'Puppeteer (multi-page scraping)',
  reliability: 'high' as const,
  updateFrequency: '24 hours',
  notes: [
    'Scrapes paginated event listings',
    'Covers Council meetings, committee meetings, work sessions',
    '48+ events available across multiple pages',
    'Uses Puppeteer for dynamic content'
  ]
};

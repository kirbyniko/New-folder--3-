import { RawEvent } from '../../../types';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

/**
 * Salt Lake City, Utah Calendar Scraper
 * 
 * Scrapes events from Salt Lake City's WordPress calendar using Puppeteer
 * URL: https://www.slc.gov/calendar/
 * 
 * The site uses JavaScript to dynamically load events via AJAX.
 * We use Puppeteer to execute JavaScript and extract rendered calendar data.
 */

const BASE_URL = 'https://www.slc.gov';
const CALENDAR_URL = `${BASE_URL}/calendar/`;

interface CalendarEventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
  department?: string;
  category?: string;
}

/**
 * Scrape Salt Lake City calendar events using Puppeteer
 * Waits for calendar events to load dynamically, then extracts meeting data
 */
export async function scrapeSaltLakeCityMeetings(): Promise<RawEvent[]> {
  try {
    console.log(`[Salt Lake City] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
    
    const events = await scrapeWithPuppeteer<CalendarEventData[]>(CALENDAR_URL, {
      // Wait for calendar events container to load
      waitFor: '.calevents',
      evaluate: async (page) => {
        // Wait longer for AJAX events to populate (5 seconds)
        console.log('[Salt Lake City] Waiting 5 seconds for AJAX events to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check what's on the page
        const containerExists = await page.$('.calevents');
        console.log(`[Salt Lake City] Container exists: ${!!containerExists}`);
        
        // Try to get the HTML to see what's there
        const html = await page.evaluate(() => {
          const container = document.querySelector('.calevents');
          return container ? container.innerHTML.substring(0, 500) : 'NO CONTAINER';
        });
        console.log(`[Salt Lake City] Container HTML preview: ${html}`);
        
        // Click "Load More" button if it exists to get more events
        try {
          const loadMoreBtn = await page.$('.loadmore[data-type="more"]');
          if (loadMoreBtn) {
            const isVisible = await page.evaluate(el => {
              const button = el as HTMLElement;
              return button && !button.classList.contains('hidden');
            }, loadMoreBtn);
            
            if (isVisible) {
              console.log('[Salt Lake City] Clicking "Load More" button...');
              await loadMoreBtn.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (e) {
          console.log('[Salt Lake City] No "Load More" button or error clicking:', e);
        }
        
        // Extract events from rendered calendar - try multiple selector strategies
        return await page.evaluate(() => {
          const events: CalendarEventData[] = [];
          
          // Look for .cal-item links (this is the actual structure from the HTML)
          const eventElements = document.querySelectorAll('.calevents a.cal-item');
          console.log(`[Salt Lake City] Found ${eventElements.length} event links`);
          
          eventElements.forEach((element, index) => {
            try {
              const link = element as HTMLAnchorElement;
              
              // Extract title from .cal-title
              const titleEl = element.querySelector('.cal-title');
              const title = titleEl?.textContent?.trim() || '';
              
              // Extract URL
              const url = link.href;
              
              // Extract date from .cal-month and .cal-day
              const monthEl = element.querySelector('.cal-month');
              const dayEl = element.querySelector('.cal-day');
              const month = monthEl?.textContent?.trim() || '';
              const day = dayEl?.textContent?.trim() || '';
              
              // Build date string (current year assumed)
              const currentYear = new Date().getFullYear();
              let dateText = '';
              if (month && day) {
                // Convert month name to month number
                const monthMap: { [key: string]: string } = {
                  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const monthNum = monthMap[month] || '01';
                dateText = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
              }
              
              // Extract description
              const descEl = element.querySelector('.cal-desc');
              const description = descEl?.textContent?.trim() || '';
              
              // Only add if we have at least title and URL
              if (title && url) {
                events.push({
                  id: `slc-${index}-${Date.now()}`,
                  title,
                  date: dateText,
                  time: '', // Time not visible in list view, would need to visit detail page
                  location: '', // Location not visible in list view
                  url,
                  department: '',
                  category: ''
                });
              }
            } catch (err) {
              console.error(`[Salt Lake City] Error parsing event ${index}:`, err);
            }
          });
          
          console.log(`[Salt Lake City] Extracted ${events.length} events from calendar`);
          return events;
        });
      },
      timeout: 30000
    });

    if (!events || events.length === 0) {
      console.warn('[Salt Lake City] No events found in calendar');
      return [];
    }

    console.log(`[Salt Lake City] Found ${events.length} events, converting to RawEvent format`);

    // Convert to RawEvent format
    const rawEvents: RawEvent[] = events
      .filter(event => event.title && event.url)
      .map(event => {
        // Parse date
        let eventDate = new Date();
        if (event.date) {
          const parsed = new Date(event.date);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed;
          }
        }

        // Determine committee from title or department
        let committee = 'Salt Lake City Event';
        if (event.title.toLowerCase().includes('city council')) {
          committee = 'City Council';
        } else if (event.title.toLowerCase().includes('planning commission')) {
          committee = 'Planning Commission';
        } else if (event.department) {
          committee = event.department;
        } else if (event.category) {
          committee = event.category;
        }

        return {
          id: `saltlakecity-${eventDate.getTime()}-${event.title.substring(0, 30).replace(/\s+/g, '-')}`,
          name: event.title,
          date: eventDate.toISOString().split('T')[0],
          time: event.time || eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          location: event.location || 'Salt Lake City, UT',
          committee,
          sourceUrl: event.url,
          tags: ['City Council', 'Public Meeting']
        };
      });

    console.log(`[Salt Lake City] Converted ${rawEvents.length} events to RawEvent format`);
    return rawEvents;

  } catch (error) {
    console.error('[Salt Lake City] Error scraping calendar:', error);
    return [];
  }
}

/**
 * Scrape details from individual event page
 * Extracts time, location, RSVP, parking, ADA info
 */
async function scrapeEventDetails(eventUrl: string): Promise<{
  time?: string;
  location?: string;
  address?: string;
  rsvp?: string;
  parking?: string;
  ada?: string;
}> {
  try {
    const details = await scrapeWithPuppeteer<any>(eventUrl, {
      waitFor: '.event-details, article, main',
      evaluate: async (page) => {
        return await page.evaluate(() => {
          const result: any = {};
          
          // Extract time
          const timeEl = document.querySelector('.event-time, [class*="time"]');
          if (timeEl) result.time = timeEl.textContent?.trim();
          
          // Extract location/venue
          const locationEl = document.querySelector('.event-location, .event-venue, [class*="location"], [class*="venue"]');
          if (locationEl) result.location = locationEl.textContent?.trim();
          
          // Extract address
          const addressEl = document.querySelector('.event-address, [class*="address"]');
          if (addressEl) result.address = addressEl.textContent?.trim();
          
          // Extract RSVP info
          const rsvpEl = document.querySelector('.event-rsvp, [class*="rsvp"]');
          if (rsvpEl) result.rsvp = rsvpEl.textContent?.trim();
          
          // Extract parking info
          const parkingEl = document.querySelector('[class*="parking"]');
          if (parkingEl) result.parking = parkingEl.textContent?.trim();
          
          // Extract ADA/accessibility info
          const adaEl = document.querySelector('[class*="accessibility"], [class*="ada"]');
          if (adaEl) result.ada = adaEl.textContent?.trim();
          
          return result;
        });
      },
      timeout: 15000
    });
    
    return details || {};
  } catch (error) {
    console.error(`[Salt Lake City] Error scraping event details from ${eventUrl}:`, error);
    return {};
  }
}

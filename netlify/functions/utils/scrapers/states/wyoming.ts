import { RawEvent } from '../../../../types';
import { scrapeWithPuppeteer } from '../puppeteer-helper';
import { Page } from 'puppeteer';

/**
 * Wyoming Legislature Scraper
 * 
 * Scrapes committee meetings from Wyoming Legislature calendar using Puppeteer
 * URL: https://www.wyoleg.gov/Calendar/
 * 
 * Complex JavaScript calendar that requires:
 * 1. Clicking event items to open detail popups
 * 2. Extracting agenda links from popup modals
 * 3. Parsing dates and times from event cards
 */

const BASE_URL = 'https://www.wyoleg.gov';
const CALENDAR_URL = `${BASE_URL}/Calendar/`;

interface WyomingEventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  committee: string;
  detailUrl?: string;
  agendaUrl?: string;
}

/**
 * Wyoming Legislature Scraper
 */
export class WyomingScraper {
  private readonly stateCode = 'WY';
  private readonly stateName = 'Wyoming';

  /**
   * Get calendar sources for Wyoming
   */
  getCalendarSources() {
    return [
      {
        name: 'Wyoming Legislature Calendar',
        url: CALENDAR_URL,
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Official legislative calendar with committee meetings and hearings'
      }
    ];
  }

  /**
   * Get scraper health status
   */
  getHealth() {
    return {
      stateCode: this.stateCode,
      enabled: true,
      lastAttempt: new Date(),
      lastSuccess: new Date(),
      consecutiveFailures: 0,
      lastError: null,
      eventsScraped: 0
    };
  }

  /**
   * Main scrape method for scheduled scraper compatibility
   */
  async scrape(): Promise<RawEvent[]> {
    return this.scrapeCalendar();
  }

  /**
   * Scrape Wyoming Legislature meetings using Puppeteer
   */
  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      console.log(`[Wyoming] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
      
      const events = await scrapeWithPuppeteer<WyomingEventData[]>(CALENDAR_URL, {
        waitFor: 3000, // Wait for calendar to load
        evaluate: async (page: Page) => {
          console.log('[Wyoming] Page loaded, waiting for calendar to render...');
          
          // Wait for calendar table to fully load
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Look for table rows with meeting data
          const tableRows = await page.$$('tr[_ngcontent-ng-c1714962930]');
          console.log(`[Wyoming] Found ${tableRows.length} table rows`);
          
          if (tableRows.length === 0) {
            console.log('[Wyoming] No table rows found, trying alternative selector');
            const altRows = await page.$$('table tr');
            console.log(`[Wyoming] Found ${altRows.length} rows with alternative selector`);
            
            if (altRows.length === 0) {
              return [];
            }
          }
          
          const events: WyomingEventData[] = [];
          
          // Process each table row
          for (let i = 0; i < Math.min(tableRows.length, 50); i++) {
            try {
              const row = tableRows[i];
              
              // Extract data from table cells
              const rowData = await row.evaluate((tr) => {
                const cells = tr.querySelectorAll('td');
                if (cells.length < 5) return null; // Not a data row
                
                // Extract type (Joint, House, Senate, etc.)
                const type = cells[0]?.textContent?.trim() || '';
                
                // Extract committee name from link
                const committeeLink = cells[1]?.querySelector('a');
                const committee = committeeLink?.textContent?.trim() || '';
                const committeeUrl = committeeLink ? (committeeLink as HTMLAnchorElement).href : '';
                
                // Extract date range
                const dateText = cells[2]?.textContent?.trim() || '';
                
                // Extract time
                const time = cells[3]?.textContent?.trim().replace(/&nbsp;/g, ' ').trim() || '';
                
                // Extract location
                const location = cells[4]?.textContent?.trim().replace(/&nbsp;/g, ' ').trim() || '';
                
                // Extract city
                const city = cells[5]?.textContent?.trim() || '';
                
                // Extract detail link
                const detailLink = cells[6]?.querySelector('a');
                const detailUrl = detailLink ? (detailLink as HTMLAnchorElement).href : '';
                
                return {
                  type,
                  committee,
                  committeeUrl,
                  dateText,
                  time,
                  location,
                  city,
                  detailUrl
                };
              });
              
              if (!rowData || !rowData.committee) {
                continue; // Skip invalid rows
              }
              
              console.log(`[Wyoming] Processing: ${rowData.type} ${rowData.committee}`);
              
              // Try to get agenda from detail page
              let agendaUrl = '';
              if (rowData.detailUrl) {
                try {
                  const detailPage = await page.browser().newPage();
                  await detailPage.goto(rowData.detailUrl, { 
                    waitUntil: 'networkidle2', 
                    timeout: 10000 
                  });
                  
                  // Wait a bit for any dynamic content
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Look for agenda link
                  agendaUrl = await detailPage.evaluate(() => {
                    const agendaLink = Array.from(document.querySelectorAll('a')).find(a => {
                      const text = a.textContent?.toLowerCase() || '';
                      const href = a.href?.toLowerCase() || '';
                      return text.includes('agenda') || href.includes('agenda') || 
                             text.includes('document') || href.includes('.pdf');
                    });
                    return agendaLink ? (agendaLink as HTMLAnchorElement).href : '';
                  });
                  
                  if (agendaUrl) {
                    console.log(`[Wyoming] Found agenda: ${agendaUrl}`);
                  }
                  
                  await detailPage.close();
                } catch (err) {
                  console.log(`[Wyoming] Could not load detail page: ${err}`);
                }
              }
              
              // Parse date - handle date ranges like "12/1/2025 - 12/5/2025"
              let dateStr = rowData.dateText;
              if (dateStr.includes(' - ')) {
                // Use start date from range
                dateStr = dateStr.split(' - ')[0].trim();
              }
              
              // Build full committee name with type
              const fullCommittee = rowData.type ? 
                `${rowData.type} ${rowData.committee}` : 
                rowData.committee;
              
              events.push({
                id: `wy-${i}-${Date.now()}`,
                title: `${fullCommittee} Meeting`,
                date: dateStr,
                time: rowData.time,
                location: `${rowData.location}, ${rowData.city}`,
                committee: fullCommittee,
                detailUrl: rowData.detailUrl,
                agendaUrl
              });
              
              console.log(`[Wyoming] Added event: ${fullCommittee}`);
              
            } catch (err) {
              console.error(`[Wyoming] Error processing row ${i + 1}:`, err);
            }
          }
          
          console.log(`[Wyoming] Extracted ${events.length} events`);
          return events;
        },
        timeout: 90000 // 90 second timeout for complex interactions
      });

      if (!events || events.length === 0) {
        console.warn('[Wyoming] No events found in calendar');
        return [];
      }

      console.log(`[Wyoming] Found ${events.length} events, converting to RawEvent format`);

      // Get today's date at midnight for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Convert to RawEvent format
      const rawEvents = events
        .map((event): RawEvent & { _parsedDate?: Date } => {
          // Parse date
          let eventDate = new Date();
          try {
            if (event.date) {
              // Handle YYYYMMDD format from URL
              if (event.date.length === 8 && !event.date.includes('/')) {
                const year = event.date.substring(0, 4);
                const month = event.date.substring(4, 6);
                const day = event.date.substring(6, 8);
                eventDate = new Date(`${year}-${month}-${day}`);
              } else {
                eventDate = new Date(event.date);
              }
            }
            
            if (isNaN(eventDate.getTime())) {
              eventDate = new Date();
            }
          } catch (e) {
            console.warn(`[Wyoming] Could not parse date: ${event.date}`);
          }

          return {
            id: `wy-${eventDate.getTime()}-${event.title.substring(0, 30).replace(/\s+/g, '-')}`,
            name: event.title,
            date: eventDate.toISOString().split('T')[0],
            time: event.time || eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            location: event.location || 'State Capitol, Cheyenne, WY',
            committee: event.committee,
            type: 'committee-meeting',
            level: 'state',
            state: this.stateCode,
            city: 'Cheyenne',
            lat: 41.1400,
            lng: -104.8202,
            zipCode: null,
            description: `${this.stateName} Legislature committee meeting`,
            sourceUrl: event.detailUrl || CALENDAR_URL,
            docketUrl: event.agendaUrl || undefined,
            virtualMeetingUrl: undefined,
            tags: ['Legislature', 'Committee Meeting'],
            _parsedDate: eventDate
          };
        })
        .filter(event => {
          // Filter out past events
          const eventDate = (event as any)._parsedDate || new Date(event.date);
          const isPastEvent = eventDate < today;
          if (isPastEvent) {
            console.log(`[Wyoming] Filtering out past event: ${event.name} (${event.date})`);
          }
          return !isPastEvent;
        })
        .map(event => {
          // Remove temporary field
          const { _parsedDate, ...cleanEvent } = event as any;
          return cleanEvent;
        });

      console.log(`[Wyoming] Converted ${rawEvents.length} events to RawEvent format`);
      return rawEvents;

    } catch (error) {
      console.error('[Wyoming] Error scraping calendar:', error);
      return [];
    }
  }
}

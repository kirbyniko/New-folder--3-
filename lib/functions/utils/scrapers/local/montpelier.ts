import { RawEvent } from '../../../types';
import { scrapeWithPuppeteer } from '../puppeteer-helper';
import { Page } from 'puppeteer';

/**
 * Montpelier, Vermont City Council Scraper
 * 
 * Scrapes meetings from Montpelier's Clerk system using Puppeteer
 * URL: https://www.montpelier-vt.org/129/Agendas-Minutes
 * 
 * This is a complex Material-UI calendar that requires:
 * 1. Setting date range (from today to 10 months ahead)
 * 2. Waiting for events to load
 * 3. Scrolling to load all events (infinite scroll)
 * 4. Extracting event details from loaded items
 * 5. Optionally downloading PDF agendas for additional details
 */

const BASE_URL = 'https://www.montpelier-vt.org';
const CALENDAR_URL = `${BASE_URL}/129/Agendas-Minutes`;

interface MontpelierEventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  detailUrl?: string;
  agendaPdfUrl?: string;
}

/**
 * Get calendar sources for Montpelier
 */
export function getMontpelierCalendarSources() {
  return [
    {
      name: 'Montpelier City Clerk - Agendas & Minutes',
      url: CALENDAR_URL,
      type: 'primary' as const,
      lastChecked: new Date().toISOString(),
      status: 'active' as const,
      notes: 'Official city calendar with City Council, DRB, and committee meetings'
    }
  ];
}

/**
 * Scrape Montpelier City Council meetings using Puppeteer
 * Handles date range setting, infinite scroll, and event extraction
 */
export async function scrapeMontpelierMeetings(): Promise<RawEvent[]> {
  try {
    console.log(`[Montpelier] Fetching calendar with Puppeteer from ${CALENDAR_URL}`);
    
    const events = await scrapeWithPuppeteer<MontpelierEventData[]>(CALENDAR_URL, {
      waitFor: 'input[aria-label="From Date"]',
      evaluate: async (page: Page) => {
        console.log('[Montpelier] Page loaded, waiting for React components to initialize...');
        
        // Wait longer for React/Material-UI to fully initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Calculate date range (today to 10 months ahead)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const futureDate = new Date(tomorrow);
        futureDate.setMonth(futureDate.getMonth() + 10);
        
        const formatDate = (date: Date) => {
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        };
        
        const fromDateStr = formatDate(tomorrow); // Start from tomorrow
        const toDateStr = formatDate(futureDate);
        
        console.log(`[Montpelier] Setting date range: ${fromDateStr} to ${toDateStr}`);
        
        // Set "From Date" field
        const fromDateInput = await page.$('input[aria-label="From Date"]');
        if (fromDateInput) {
          await fromDateInput.click({ clickCount: 3 }); // Select all
          await fromDateInput.type(fromDateStr);
          console.log('[Montpelier] Set From Date');
        }
        
        // Set "To Date" field
        const toDateInput = await page.$('input[aria-label="To Date"]');
        if (toDateInput) {
          await toDateInput.click({ clickCount: 3 }); // Select all
          await toDateInput.type(toDateStr);
          console.log('[Montpelier] Set To Date');
        }
        
        // Wait for calendar to update after date change
        console.log('[Montpelier] Waiting 3 seconds for calendar to load...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if event list table exists
        const eventListTable = await page.$('#event-list-table');
        if (!eventListTable) {
          console.log('[Montpelier] No event list table found');
          return [];
        }
        
        console.log('[Montpelier] Event list table found, scrolling to load all events...');
        
        // Scroll to load all events (infinite scroll)
        let previousHeight = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 20;
        
        while (scrollAttempts < maxScrollAttempts) {
          // Scroll to bottom of event list
          await page.evaluate(() => {
            const eventList = document.querySelector('#event-list-table');
            if (eventList) {
              eventList.scrollTop = eventList.scrollHeight;
            }
          });
          
          // Wait for new content to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if height changed (new content loaded)
          const currentHeight = await page.evaluate(() => {
            const eventList = document.querySelector('#event-list-table');
            return eventList ? eventList.scrollHeight : 0;
          });
          
          if (currentHeight === previousHeight) {
            console.log('[Montpelier] No more content to load, stopping scroll');
            break;
          }
          
          previousHeight = currentHeight;
          scrollAttempts++;
          console.log(`[Montpelier] Scroll attempt ${scrollAttempts}, height: ${currentHeight}`);
        }
        
        console.log('[Montpelier] Finished scrolling, extracting events...');
        
        // Try multiple selectors to find event elements
        // Each event is an <a> tag with role="button" and href to civicclerk
        let eventElements = await page.$$('#event-list-table a[role="button"][href*="civicclerk"]');
        
        console.log(`[Montpelier] Found ${eventElements.length} event link elements`);
        
        const events: MontpelierEventData[] = [];
        
        // Extract info from each event (no need to click, all data is in the list view)
        for (let i = 0; i < Math.min(eventElements.length, 50); i++) { // Limit to 50 events
          try {
            console.log(`[Montpelier] Processing event ${i + 1}/${eventElements.length}`);
            
            const eventElement = eventElements[i];
            const eventInfo = await eventElement.evaluate((el) => {
              // Get event ID from data-id attribute
              const eventId = el.getAttribute('data-id') || '';
              
              // Get detail page URL from href
              const detailUrl = (el as HTMLAnchorElement).href || '';
              
              // Get date from data-date attribute (ISO format)
              const dataDate = el.getAttribute('data-date') || '';
              
              // Extract title
              const titleEl = el.querySelector('h3[id*="eventListRow"][id*="title"]');
              const title = titleEl?.textContent?.trim() || '';
              
              // Extract date/time text
              const dateTimeEl = el.querySelector('p.MuiTypography-body2');
              const dateTimeText = dateTimeEl?.textContent?.trim() || '';
              
              // Extract location
              const locationEl = el.querySelector('h6[aria-label="Event Location"]');
              const location = locationEl?.textContent?.trim() || '';
              
              // Extract committee from chip/label
              const committeeEl = el.querySelector('.MuiChip-label');
              const committee = committeeEl?.textContent?.trim() || '';
              
              return {
                eventId,
                detailUrl,
                dataDate,
                title,
                dateTimeText,
                location,
                committee
              };
            });
            
            if (!eventInfo.title || eventInfo.title.length < 3) {
              console.log(`[Montpelier] Skipping event ${i + 1} - no valid title`);
              continue;
            }
            
            // Parse date from data-date attribute (ISO format is most reliable)
            let dateStr = '';
            let timeStr = '';
            
            if (eventInfo.dataDate) {
              const eventDate = new Date(eventInfo.dataDate);
              dateStr = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
              timeStr = eventDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            } else if (eventInfo.dateTimeText) {
              // Fallback to parsing text if data-date not available
              const dateMatch = eventInfo.dateTimeText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
              if (dateMatch) {
                dateStr = dateMatch[0];
              }
              const timeMatch = eventInfo.dateTimeText.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
              if (timeMatch) {
                timeStr = timeMatch[0];
              }
            }
            
            // Try to find PDF download button and extract file ID
            let agendaPdfUrl = '';
            
            if (eventInfo.eventId) {
              try {
                // Look for download button with matching event ID
                const downloadButtonId = `downloadFilesMenu-${eventInfo.eventId}`;
                const downloadBtn = await page.$(`#${downloadButtonId}`);
                
                if (downloadBtn) {
                  // Click to open menu
                  await downloadBtn.click();
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Look for menu item with "Agenda" text
                  const menuItem = await page.$(`#${downloadButtonId}-menuitem-0`);
                  
                  if (menuItem) {
                    // Click the menu item and intercept the API request
                    const [response] = await Promise.all([
                      page.waitForResponse(
                        (res) => res.url().includes('GetMeetingFileStream'),
                        { timeout: 3000 }
                      ).catch(() => null),
                      menuItem.click().catch(() => null)
                    ]);
                    
                    if (response) {
                      agendaPdfUrl = response.url();
                      console.log(`[Montpelier] Found PDF URL: ${agendaPdfUrl}`);
                    }
                    
                    // Close the menu by pressing Escape
                    await page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                }
              } catch (err) {
                console.log(`[Montpelier] Could not extract PDF for event ${i + 1}:`, err);
              }
            }
            
            // Add event
            events.push({
              id: `montpelier-${eventInfo.eventId}-${Date.now()}`,
              title: eventInfo.title,
              date: dateStr,
              time: timeStr,
              location: eventInfo.location || 'Montpelier City Hall',
              level: 'local',
              detailUrl: eventInfo.detailUrl,
              agendaPdfUrl
            });
            
            console.log(`[Montpelier] Added event: ${eventInfo.title} on ${dateStr}`);
            
          } catch (err) {
            console.error(`[Montpelier] Error processing event ${i + 1}:`, err);
          }
        }
        
        console.log(`[Montpelier] Extracted ${events.length} events`);
        return events;
      },
      timeout: 90000 // 90 second timeout for complex page load + scrolling
    });

    if (!events || events.length === 0) {
      console.warn('[Montpelier] No events found in calendar');
      return [];
    }

    console.log(`[Montpelier] Found ${events.length} events, converting to RawEvent format`);

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Convert to RawEvent format and filter out past events
    const rawEvents: RawEvent[] = events
      .filter(event => event.title && event.date)
      .map(event => {
        // Parse date
        let eventDate = new Date();
        try {
          const parsed = new Date(event.date);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed;
          }
        } catch (e) {
          console.warn(`[Montpelier] Could not parse date: ${event.date}`);
        }

        // Determine committee from title
        let committee = 'City Meeting';
        const lowerTitle = event.title.toLowerCase();
        
        if (lowerTitle.includes('city council')) {
          committee = 'City Council';
        } else if (lowerTitle.includes('drb') || lowerTitle.includes('design review')) {
          committee = 'Design Review Board';
        } else if (lowerTitle.includes('planning')) {
          committee = 'Planning Commission';
        } else if (lowerTitle.includes('select board')) {
          committee = 'Select Board';
        }

        return {
          id: `montpelier-${eventDate.getTime()}-${event.title.substring(0, 30).replace(/\s+/g, '-')}`,
          name: event.title,
          date: eventDate.toISOString().split('T')[0],
          time: event.time || eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          location: event.location || 'Montpelier City Hall, VT',
          committee,
          sourceUrl: event.detailUrl || CALENDAR_URL, // Use actual detail page URL
          docketUrl: event.agendaPdfUrl || undefined,
          tags: ['City Council', 'Public Meeting'],
          _parsedDate: eventDate // Include for filtering
        };
      })
      .filter(event => {
        // Filter out past events (keep today and future)
        const eventDate = (event as any)._parsedDate || new Date(event.date);
        const isPastEvent = eventDate < today;
        if (isPastEvent) {
          console.log(`[Montpelier] Filtering out past event: ${event.name} (${event.date})`);
        }
        return !isPastEvent;
      })
      .map(event => {
        // Remove temporary field
        const { _parsedDate, ...cleanEvent } = event as any;
        return cleanEvent;
      });

    console.log(`[Montpelier] Converted ${rawEvents.length} events to RawEvent format`);
    return rawEvents;

  } catch (error) {
    console.error('[Montpelier] Error scraping calendar:', error);
    return [];
  }
}

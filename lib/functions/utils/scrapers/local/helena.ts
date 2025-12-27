import { RawEvent } from '../../../types/events';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

interface HelenaMeeting {
  title: string;
  url?: string;
  dataItemId?: string;
  date: string;
  time: string;
}

export async function scrapeHelenaMeetings(): Promise<RawEvent[]> {
  const url = 'https://www.helenamt.gov/Meetings';
  
  console.log('🏛️ Scraping Helena, MT meetings calendar via Puppeteer...');
  
  try {
    const meetings = await scrapeWithPuppeteer<HelenaMeeting[]>(url, {
      waitFor: 8000, // Extra time for Granicus calendar to fully load
      screenshot: true, // Take screenshot for debugging
      evaluate: async (page) => {
        // Wait for calendar to render
        console.log('⏳ Waiting for calendar to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 Looking for next month button...');
        
        // Click "Next Month" to get to January 2026
        let clicked = false;
        try {
          // Use the exact selector from the Helena calendar
          const selectors = [
            'button.calendar-nav-next',
            '.calendar-nav-next',
            'button[aria-label="Select the next month"]',
            '.fc-next-button',
            'button.fc-next-button'
          ];
          
          for (const selector of selectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                console.log(`✅ Found button with selector: ${selector}`);
                await element.click();
                clicked = true;
                console.log('✅ Clicked next month button');
                break;
              }
            } catch (err) {
              console.log(`❌ Failed with ${selector}:`, err);
            }
          }
          
          if (!clicked) {
            // Try using page.click() which sometimes works better
            console.log('⚠️ Trying page.click() method...');
            try {
              await page.click('button.calendar-nav-next');
              clicked = true;
              console.log('✅ Clicked with page.click()');
            } catch (err) {
              console.log('❌ page.click() also failed:', err);
            }
          }
          
          if (clicked) {
            console.log('⏳ Waiting for calendar to update to January...');
            // Wait for calendar to refresh
            await new Promise(resolve => setTimeout(resolve, 6000));
            
            // Take another screenshot after clicking
            await page.screenshot({ path: 'debug-after-click.png', fullPage: true });
            console.log('📸 Saved screenshot after clicking next month');
          } else {
            console.log('⚠️ Could not find or click next month button');
          }
        } catch (err) {
          console.log('⚠️ Navigation error:', err);
        }
        
        console.log('🔍 Extracting meeting events from calendar...');
        
        // Extract meeting data - need to use page.evaluate for DOM access
        const meetings = await page.evaluate(() => {
          const meetingsData: any[] = [];
          
          // Helena calendar uses li.calendar-item elements
          const eventItems = document.querySelectorAll('li.calendar-item');
          console.log(`Found ${eventItems.length} calendar-item elements`);
          
          if (eventItems.length === 0) {
            // Fallback: try other selectors
            const altItems = document.querySelectorAll('.fc-event, a[href*="/Calendars/"]');
            console.log(`Fallback found ${altItems.length} alternative elements`);
            
            // Debug: show calendar HTML structure
            const calendar = document.querySelector('.calendar-container, #calendar, .calendar');
            if (calendar) {
              console.log('Calendar HTML (first 1000 chars):', calendar.innerHTML.substring(0, 1000));
            }
          }
          
          const seenIds = new Set<string>();
          
          eventItems.forEach((item, index) => {
            try {
              // Get the data-item-id
              const link = item.querySelector('a.item-dialog-trigger');
              const dataItemId = link?.getAttribute('data-item-id');
              
              console.log(`Item ${index}: dataItemId=${dataItemId}`);
              
              if (!dataItemId || seenIds.has(dataItemId)) return;
              seenIds.add(dataItemId);
              
              // Get title from span.calendar-item-title
              const titleElement = item.querySelector('span.calendar-item-title');
              const title = titleElement?.textContent?.trim() || item.getAttribute('title') || '';
              
              console.log(`Item ${index}: title="${title}"`);
              
              if (!title || title.length < 3) return;
              
              // Find the parent day container to get the date
              // Try multiple parent selectors
              let dayContainer = item.closest('.calendar-day');
              if (!dayContainer) dayContainer = item.closest('[data-date]');
              if (!dayContainer) dayContainer = item.closest('td');
              if (!dayContainer) {
                // Try going up the DOM tree manually
                const parent = item.parentElement?.parentElement;
                if (parent) dayContainer = parent;
              }
              
              let dateStr = '';
              
              if (dayContainer) {
                const dataDate = dayContainer.getAttribute('data-date');
                console.log(`Item ${index}: data-date attribute="${dataDate}"`);
                
                if (dataDate) {
                  // Check if dataDate is a full date (contains dashes or slashes) or just a day number
                  if (dataDate.includes('-') || dataDate.includes('/')) {
                    dateStr = dataDate; // Already formatted as full date
                  } else {
                    // Just a day number, format it
                    const day = dataDate.replace(/\D/g, ''); // Remove non-digits
                    if (day) {
                      dateStr = `2026-01-${day.padStart(2, '0')}`;
                    }
                  }
                } else {
                  // Try to find date from day number in parent
                  const dayNumber = dayContainer.querySelector('.calendar-day-number, .day-number, .date-number');
                  const dayText = dayNumber?.textContent?.trim();
                  console.log(`Item ${index}: day number text="${dayText}"`);
                  
                  if (dayText) {
                    const day = dayText.replace(/\D/g, ''); // Remove non-digits
                    if (day) {
                      dateStr = `2026-01-${day.padStart(2, '0')}`;
                    }
                  }
                }
              } else {
                console.log(`Item ${index}: NO day container found`);
              }
              
              console.log(`Item ${index}: final dateStr="${dateStr}"`);
              
              // Store the data-item-id for now - we'll get the real URL by clicking
              if (title && dateStr && dataItemId) {
                meetingsData.push({
                  title: title,
                  dataItemId: dataItemId,
                  date: dateStr,
                  time: 'TBD'
                });
                console.log(`📅 ADDED: ${title} on ${dateStr}`);
              } else {
                console.log(`❌ SKIPPED item ${index}: title="${title}" dateStr="${dateStr}"`);
              }
            } catch (err) {
              console.error(`Error processing calendar item ${index}:`, err);
            }
          });
          
          console.log(`Extracted ${meetingsData.length} unique meetings from calendar items`);
          return meetingsData;
        });
        
        console.log(`✅ Extracted ${meetings.length} meetings from calendar`);
        
        // Now click each meeting to get the real URL from the popup
        console.log(`🔍 Clicking meetings to extract real URLs from popups...`);
        
        for (let i = 0; i < meetings.length; i++) {
          const meeting = meetings[i];
          try {
            console.log(`  Clicking meeting ${i + 1}/${meetings.length}: ${meeting.title}`);
            
            // Find and click the calendar item
            const clicked = await page.evaluate((dataItemId) => {
              const link = document.querySelector(`a.item-dialog-trigger[data-item-id="${dataItemId}"]`);
              if (link) {
                (link as HTMLElement).click();
                return true;
              }
              return false;
            }, meeting.dataItemId);
            
            if (!clicked) {
              console.log(`  ⚠️ Could not find item to click`);
              continue;
            }
            
            // Wait for popup to appear
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Extract the real URL from the popup
            const realUrl = await page.evaluate(() => {
              const popupLink = document.querySelector('a.calendar-item-dialog-link');
              if (popupLink) {
                return popupLink.getAttribute('href');
              }
              return null;
            });
            
            if (realUrl) {
              meeting.url = realUrl;
              console.log(`  ✅ Got URL: ${realUrl}`);
            } else {
              console.log(`  ⚠️ No URL found in popup`);
              meeting.url = `https://www.helenamt.gov/Meetings`; // Fallback
            }
            
            // Close the popup by clicking outside or pressing Escape
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (err) {
            console.error(`  ❌ Error clicking meeting ${i + 1}:`, err);
            meeting.url = `https://www.helenamt.gov/Meetings`; // Fallback
          }
        }
        
        console.log(`✅ Extracted real URLs for all meetings`);
        return meetings;
      }
    });
    
    console.log(`📊 Puppeteer returned ${meetings.length} meetings`);
    
    // Now we have real URLs, visit each one to get agenda links and Zoom info
    console.log(`🔍 Will visit ${meetings.length} event detail pages for agenda & Zoom links`);
    
    // Convert to RawEvent format
    const events: RawEvent[] = [];
    const now = new Date();
    // Set to start of today in local time
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log(`📅 Today's date for comparison: ${today.toISOString().split('T')[0]}`);
    
    // Visit each event page to get detailed info
    for (const meeting of meetings) {
      try {
        // Log the raw date string
        console.log(`📅 Processing: ${meeting.title} with date string: "${meeting.date}"`);
        
        const eventDate = new Date(meeting.date);
        
        // Skip past events
        if (isNaN(eventDate.getTime())) {
          console.log(`❌ Invalid date for: ${meeting.title}`);
          continue;
        }
        
        if (eventDate < today) {
          console.log(`⏭️ Skipping past event: ${meeting.title}`);
          continue;
        }
        
        // Visit the event detail page to extract info
        let detailInfo = {
          time: 'TBD',
          location: 'Helena City Commission Chambers, 316 N Park Ave, Helena, MT 59623',
          agendaUrl: null as string | null,
          zoomLink: null as string | null,
          description: `Helena City meeting: ${meeting.title}`
        };
        
        if (meeting.url) {
          console.log(`🔗 Visiting: ${meeting.url}`);
          try {
            const scrapedData = await scrapeWithPuppeteer<typeof detailInfo>(meeting.url, {
              waitFor: 2000,
              evaluate: async (page) => {
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                return await page.evaluate(() => {
                  let time = 'TBD';
                  let location = 'Helena City Commission Chambers, 316 N Park Ave, Helena, MT 59623';
                  let agendaUrl: string | null = null;
                  let zoomLink: string | null = null;
                  let description = '';
                  
                  const bodyText = document.body.textContent || '';
                  
                  // Extract time (e.g., "04:00 PM - 06:00 PM")
                  const timeMatch = bodyText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                  if (timeMatch) {
                    time = `${timeMatch[1]} - ${timeMatch[2]}`;
                  } else {
                    const simpleTime = bodyText.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                    if (simpleTime) time = simpleTime[1];
                  }
                  
                  // Extract location from the page
                  const locationMatch = bodyText.match(/Location[:\s]+([^\n]+?)(?=\n|When|$)/i);
                  if (locationMatch && locationMatch[1].length > 10) {
                    location = locationMatch[1].trim();
                  }
                  
                  // Get description from the page content
                  const descElement = document.querySelector('.page-content, .event-description, article');
                  if (descElement) {
                    description = descElement.textContent?.trim().substring(0, 500) || '';
                  }
                  
                  // Find all links on the page
                  const allLinks = Array.from(document.querySelectorAll('a'));
                  
                  for (const link of allLinks) {
                    const href = link.getAttribute('href') || '';
                    const text = (link.textContent || '').toLowerCase();
                    
                    // Look for agenda/docket links
                    if (text.includes('agenda') || text.includes('docket') || href.includes('agenda') || href.includes('primegov.com')) {
                      if (href && !agendaUrl) {
                        agendaUrl = href.startsWith('http') ? href : `https://www.helenamt.gov${href}`;
                      }
                    }
                    
                    // Look for Zoom links
                    if (href.includes('zoom.us') || (text.includes('join') && text.includes('meeting'))) {
                      if (href && !zoomLink) {
                        zoomLink = href.startsWith('http') ? href : `https://www.helenamt.gov${href}`;
                      }
                    }
                  }
                  
                  return { time, location, agendaUrl, zoomLink, description };
                });
              }
            });
            
            if (scrapedData) {
              detailInfo = { ...detailInfo, ...scrapedData };
              console.log(`  ✅ Got: time=${detailInfo.time}, agenda=${detailInfo.agendaUrl ? 'Yes' : 'No'}, zoom=${detailInfo.zoomLink ? 'Yes' : 'No'}`);
            }
          } catch (err) {
            console.error(`  ⚠️ Failed to scrape details:`, err);
          }
        }
        
        // Use calendar data directly (no detail page scraping)
        events.push({
          name: meeting.title,
          date: meeting.date,
          time: detailInfo.time,
          location: detailInfo.location,
          level: 'local',
          description: detailInfo.description || `Helena City meeting: ${meeting.title}`,
          sourceUrl: meeting.url || 'https://www.helenamt.gov/Meetings',
          docketUrl: detailInfo.agendaUrl || undefined,
          virtualMeetingUrl: detailInfo.zoomLink || undefined,
          committee: 'City Commission',
          type: 'meeting',
          tags: ['city-commission'],
          bills: []
        });
        
        console.log(`✅ Added: ${meeting.title}`);
      } catch (err) {
        console.error('Error processing Helena meeting:', err, meeting);
      }
    }
    
    console.log(`✅ Processed ${events.length} upcoming Helena meetings`);
    return events;
    
    console.log(`✅ Processed ${events.length} upcoming Helena meetings with detailed info`);
    return events;
    
  } catch (error) {
    console.error('❌ Helena Puppeteer scraper failed:', error);
    return [];
  }
}

export function getHelenaCalendarSources() {
  return [{
    name: 'Helena City Meetings (Granicus)',
    url: 'https://www.helenamt.gov/Meetings',
    description: 'Helena, MT city meetings via Granicus calendar (Puppeteer)'
  }];
}

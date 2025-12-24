import { scrapeWithPuppeteer } from '../puppeteer-helper';
import type { RawEvent } from '../../../types';

interface BoiseEvent {
  DateHeading: string;
  StartDate: string; // "/Date(1767650400000)/"
  EndDate: string;
  RelevantDate: string;
  Location: string;
  Title: string;
  Url: string;
  Description: string;
  ImageUrl: string;
}

/**
 * Scrape Boise City government meetings
 * Source: https://www.cityofboise.org/events?playlist=Government
 * Uses Puppeteer to handle Vue.js pagination ("Load More" button)
 */
export async function scrapeBoiseMeetings(): Promise<RawEvent[]> {
  const url = 'https://www.cityofboise.org/events?playlist=Government';
  
  try {
    console.log('[SCRAPER:Boise] Starting Puppeteer scrape...');
    
    const events = await scrapeWithPuppeteer(url, {
      waitFor: 3000, // Wait for Vue.js to initialize
      evaluate: async (page) => {
        // Wait for initial content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Click "Load More" button until all events are loaded (up to 10 times)
        let clickCount = 0;
        const maxClicks = 10;
        
        while (clickCount < maxClicks) {
          try {
            // Check if "Load More" button exists and is visible
            const loadMoreButton = await page.$('button.btn-info');
            if (!loadMoreButton) {
              console.log('[SCRAPER:Boise] No more "Load More" button found');
              break;
            }
            
            const isVisible = await loadMoreButton.isVisible();
            if (!isVisible) {
              console.log('[SCRAPER:Boise] "Load More" button not visible');
              break;
            }
            
            console.log(`[SCRAPER:Boise] Clicking "Load More" (${clickCount + 1}/${maxClicks})...`);
            await loadMoreButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for content to load
            clickCount++;
          } catch (error) {
            console.log('[SCRAPER:Boise] Error clicking "Load More" or button no longer available');
            break;
          }
        }
        
        console.log(`[SCRAPER:Boise] Finished loading events (${clickCount} clicks)`);
        
        // Extract the Vue.js data from the page
        const rawEvents = await page.evaluate(() => {
          // Try to find the Vue instance and extract events data
          const scriptTags = Array.from(document.querySelectorAll('script'));
          for (const script of scriptTags) {
            const content = script.textContent || '';
            
            // Look for the events data structure
            const match = content.match(/\{"Events":\[.*?\],"Total":\d+/);
            if (match) {
              try {
                // Extract the full JSON object
                const jsonMatch = content.match(/\{"Events":\[.*?\],"Total":\d+,"PageHeaderImageUrl":"[^"]*"\}/);
                if (jsonMatch) {
                  const jsonStr = jsonMatch[0]
                    .replace(/&#34;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&amp;/g, '&')
                    .replace(/\\u0026/g, '&');
                  
                  const data = JSON.parse(jsonStr);
                  return data.Events || [];
                }
              } catch (e) {
                console.error('[SCRAPER:Boise] Error parsing JSON:', e);
              }
            }
          }
          
          // Fallback: try to extract from visible event cards
          const eventCards = Array.from(document.querySelectorAll('.card--event-teaser'));
          return eventCards.map(card => {
            const title = card.querySelector('h3')?.textContent?.trim() || '';
            const dateHeading = card.querySelector('time')?.textContent?.trim() || '';
            const location = card.querySelector('span')?.textContent?.trim() || '';
            const url = card.closest('a')?.getAttribute('href') || '';
            
            return {
              Title: title,
              DateHeading: dateHeading,
              Location: location,
              Url: url,
              StartDate: '',
              EndDate: '',
              RelevantDate: '',
              Description: '',
              ImageUrl: ''
            };
          });
        });
        
        console.log(`[SCRAPER:Boise] Extracted ${rawEvents.length} raw events`);
        return rawEvents;
      }
    });
    
    // Convert Boise events to RawEvent format
    const rawEvents: RawEvent[] = [];
    
    for (const event of events) {
      const boiseEvent = event as BoiseEvent;
      
      // Filter out cancelled events
      if (boiseEvent.Title.toLowerCase().includes('cancelled')) {
        console.log(`[SCRAPER:Boise] Skipping cancelled event: ${boiseEvent.Title}`);
        continue;
      }
      
      // Parse date from .NET JSON date format "/Date(1767650400000)/"
      const date = parseDotNetDate(boiseEvent.StartDate || boiseEvent.DateHeading);
      if (!date) {
        console.log(`[SCRAPER:Boise] Could not parse date for: ${boiseEvent.Title}`);
        continue;
      }
      
      // Extract committee/body from title
      const committee = extractCommittee(boiseEvent.Title);
      
      // Build full URL
      const fullUrl = boiseEvent.Url.startsWith('http') 
        ? boiseEvent.Url 
        : `https://www.cityofboise.org${boiseEvent.Url}`;
      
      const id = `boise-${date.getTime()}-${hashString(boiseEvent.Title)}`;
      
      rawEvents.push({
        id,
        name: boiseEvent.Title,
        date: date.toISOString(),
        time: formatTime(date),
        location: boiseEvent.Location || 'Boise City Hall',
        committee,
        type: 'local-meeting',
        level: 'local',
        state: 'ID',
        city: 'Boise',
        lat: 43.6187, // Boise City Hall coordinates
        lng: -116.1995,
        zipCode: '83702',
        description: boiseEvent.Description || `${committee} meeting`,
        sourceUrl: 'https://www.cityofboise.org/events?playlist=Government',
        docketUrl: fullUrl,
        virtualMeetingUrl: undefined,
        bills: []
      });
    }
    
    console.log(`[SCRAPER:Boise] Converted ${rawEvents.length} events (filtered out cancelled)`);
    return rawEvents;
    
  } catch (error) {
    console.error('[SCRAPER:Boise] Error scraping:', error);
    return [];
  }
}

/**
 * Parse .NET JSON date format "/Date(1767650400000)/"
 * or parse from date heading like "January 5, 2026 3:00 p.m."
 */
function parseDotNetDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // Try .NET JSON date format first
    const match = dateStr.match(/\/Date\((\d+)\)\//);
    if (match) {
      const timestamp = parseInt(match[1]);
      return new Date(timestamp);
    }
    
    // Try parsing date heading format: "January 5, 2026 3:00 p.m."
    const dateMatch = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)/i);
    if (dateMatch) {
      const monthMap: { [key: string]: number } = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      
      const month = monthMap[dateMatch[1].toLowerCase()];
      const day = parseInt(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      let hours = parseInt(dateMatch[4]);
      const minutes = parseInt(dateMatch[5]);
      const isPM = dateMatch[6].toLowerCase().startsWith('p');
      
      // Convert to 24-hour format
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (!isPM && hours === 12) {
        hours = 0;
      }
      
      return new Date(year, month, day, hours, minutes, 0);
    }
    
    // Fallback: try standard Date parsing
    return new Date(dateStr);
  } catch (error) {
    console.error('[SCRAPER:Boise] Error parsing date:', dateStr, error);
    return null;
  }
}

/**
 * Extract committee/body name from event title
 */
function extractCommittee(title: string): string {
  // Remove "Cancelled - " prefix if present
  title = title.replace(/^Cancelled\s+-\s+/i, '');
  
  // Common patterns
  if (title.includes('City Council')) return 'City Council';
  if (title.includes('Planning and Zoning')) return 'Planning and Zoning Commission';
  if (title.includes('Hearing Examiner')) return 'Hearing Examiner';
  if (title.includes('Historic Preservation')) return 'Historic Preservation Commission';
  if (title.includes('Board of')) return title;
  if (title.includes('Commission')) return title;
  
  return title;
}

/**
 * Format time as "HH:MM AM/PM"
 */
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

import { scrapeWithPuppeteer } from '../puppeteer-helper';
import type { RawEvent } from '../base-scraper';

interface LexingtonEventLink {
  title: string;
  url: string;
  dateStr: string;
  timeStr: string;
}

/**
 * Scrape Lexington-Fayette Urban County Government meetings
 * Source: https://www.lexingtonky.gov/calendar
 * 
 * Dynamic calendar built with JavaScript, requires Puppeteer
 */
export async function scrapeLexingtonMeetings(): Promise<RawEvent[]> {
  console.log('[SCRAPER:LEXINGTON] Fetching Lexington calendar...');
  
  const url = 'https://www.lexingtonky.gov/calendar';
  
  try {
    const events = await scrapeWithPuppeteer(url, {
      waitFor: 3000,
      evaluate: async (page) => {
        // Wait for calendar to fully render
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        //  Use page.evaluate to run code in browser context
        const eventLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/calendar/20"]'));
          const results: any[] = [];
          
          for (const link of links) {
            const href = (link as HTMLAnchorElement).href;
            
            // Filter to actual event pages (yyyy-mm-dd/event-slug format)
            if (!href.includes('/calendar/2') || href.split('/').length < 6) continue;
            
            const title = link.textContent?.trim() || '';
            if (!title || title.length < 3) continue;
            
            // Try to extract date and time from the parent context
            const parent = link.parentElement;
            const parentText = parent?.textContent || '';
            
            // Extract date from URL: /calendar/2025-12-01/event-name
            const urlMatch = href.match(/\/calendar\/(\d{4}-\d{2}-\d{2})\//);
            const dateStr = urlMatch ? urlMatch[1] : '';
            
            // Try to extract time from parent text (e.g., "– 4:30 p.m." or "– 11 a.m.")
            const timeMatch = parentText.match(/–\s*(\d{1,2}(?::\d{2})?\s*[ap]\.m\.)/);
            const timeStr = timeMatch ? timeMatch[1] : '';
            
            if (dateStr) {
              results.push({
                title,
                url: href,
                dateStr,
                timeStr
              });
            }
          }
          
          return results;
        });
        
        return eventLinks;
      }
    });
    
    console.log(`[SCRAPER:LEXINGTON] Returned ${events.length} Lexington events`);
    
    // Convert to RawEvent format
    return events.map(event => convertToRawEvent(event));
    
  } catch (error) {
    console.error('[SCRAPER:LEXINGTON] Error scraping calendar:', error);
    return [];
  }
}

function convertToRawEvent(event: LexingtonEventLink): RawEvent {
  // Parse time string
  let time = event.timeStr || '12:00 PM';
  
  // Standardize time format
  time = time.replace(/\./g, '').toUpperCase(); // "4:30 p.m." -> "4:30 PM"
  
  // Determine event type from title
  let type = 'Meeting';
  const lowerTitle = event.title.toLowerCase();
  if (lowerTitle.includes('council meeting')) {
    type = 'Council Meeting';
  } else if (lowerTitle.includes('committee')) {
    type = 'Committee Meeting';
  } else if (lowerTitle.includes('commission')) {
    type = 'Commission Meeting';
  } else if (lowerTitle.includes('board')) {
    type = 'Board Meeting';
  }
  
  // Generate unique ID from date + title hash
  const dateTimestamp = new Date(event.dateStr).getTime();
  const titleHash = Buffer.from(event.title).toString('base64').substring(0, 8);
  
  return {
    id: `lexington-${dateTimestamp}-${titleHash}`,
    name: event.title,
    date: event.dateStr,
    time,
    location: 'Lexington, KY',
    type,
    level: 'local',
    state: 'KY',
    city: 'Lexington',
    lat: 38.0406,
    lng: -84.5037,
    zipCode: '40507',
    sourceUrl: event.url,
    description: '',
    bills: []
  };
}

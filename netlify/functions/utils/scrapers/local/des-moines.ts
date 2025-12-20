import { scrapeWithPuppeteer } from '../puppeteer-helper';
import type { RawEvent } from '../base-scraper';

/**
 * Des Moines City Council Meetings Scraper
 * URL: https://www.dsm.city/calendar.php?view=list&calendar=5
 * Method: Puppeteer (JavaScript-rendered Revize calendar)
 * Calendar ID 5 = City Council Meetings
 */

export async function scrapeDesMoinesMeetings(): Promise<RawEvent[]> {
  console.log('[SCRAPER:DesMoines] 📅 Starting Des Moines meetings scrape');
  
  // Get current month and next month for URL
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Calculate next month
  const nextMonthDate = new Date(currentYear, now.getMonth() + 1, 1);
  const nextMonth = nextMonthDate.getMonth() + 1;
  const nextYear = nextMonthDate.getFullYear();
  
  const allMeetings: any[] = [];
  
  // Fetch current month
  const currentUrl = `https://www.dsm.city/calendar.php?view=list&calendar=5&month=${currentMonth.toString().padStart(2, '0')}&day=01&year=${currentYear}`;
  console.log(`[SCRAPER:DesMoines] Fetching current month: ${currentUrl}`);
  
  try {
    const currentMeetings = await scrapeWithPuppeteer(currentUrl, {
      waitFor: 3000, // Wait for calendar to load
      evaluate: async (page) => {
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract meeting information from the rendered page
        const events = await page.evaluate(() => {
          const meetingElements: any[] = [];
          
          // FullCalendar list view uses .fc-event class
          const elements = Array.from(document.querySelectorAll('.fc-event'));
          
          if (elements.length > 0) {
            elements.forEach((el: any) => {
              const text = el.textContent?.trim() || '';
              
              // Extract title (fc-list-event-title contains the event name)
              const titleEl = el.querySelector('.fc-list-event-title a, .fc-list-event-title');
              const title = titleEl?.textContent?.trim() || '';
              
              // Extract link
              const linkEl = el.querySelector('a');
              const href = linkEl?.getAttribute('href');
              
              // Extract time (fc-list-event-time contains the time range)
              const timeEl = el.querySelector('.fc-list-event-time');
              const timeStr = timeEl?.textContent?.trim() || '';
              
              // Extract date from parent row (fc-list-day contains the date)
              let dateStr = '';
              let currentEl = el.parentElement;
              while (currentEl && !dateStr) {
                const dayEl = currentEl.querySelector('.fc-list-day-text');
                if (dayEl) {
                  dateStr = dayEl.textContent?.trim() || '';
                  break;
                }
                currentEl = currentEl.previousElementSibling;
              }
              
              if (title && title.length > 5) {
                meetingElements.push({
                  title: title.substring(0, 200),
                  dateStr: dateStr || null,
                  timeStr: timeStr || null,
                  url: href,
                  fullText: text.substring(0, 300)
                });
              }
            });
          }
          
          return meetingElements;
        });
        
        return events;
      }
    });
    
    if (currentMeetings && currentMeetings.length > 0) {
      allMeetings.push(...currentMeetings);
    }
  } catch (error) {
    console.error('[SCRAPER:DesMoines] Error fetching current month:', error);
  }
  
  // Fetch next month
  const nextUrl = `https://www.dsm.city/calendar.php?view=list&calendar=5&month=${nextMonth.toString().padStart(2, '0')}&day=01&year=${nextYear}`;
  console.log(`[SCRAPER:DesMoines] Fetching next month: ${nextUrl}`);
  
  try {
    const nextMeetings = await scrapeWithPuppeteer(nextUrl, {
      waitFor: 3000,
      evaluate: async (page) => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const meetingElements: any[] = [];
        const events = await page.evaluate(() => {
          const meetingElements: any[] = [];
          
          const elements = Array.from(document.querySelectorAll('.fc-event'));
          
          if (elements.length > 0) {
            elements.forEach((el: any) => {
              const text = el.textContent?.trim() || '';
              
              const titleEl = el.querySelector('.fc-list-event-title a, .fc-list-event-title');
              const title = titleEl?.textContent?.trim() || '';
              
              const linkEl = el.querySelector('a');
              const href = linkEl?.getAttribute('href');
              
              const timeEl = el.querySelector('.fc-list-event-time');
              const timeStr = timeEl?.textContent?.trim() || '';
              
              let dateStr = '';
              let currentEl = el.parentElement;
              while (currentEl && !dateStr) {
                const dayEl = currentEl.querySelector('.fc-list-day-text');
                if (dayEl) {
                  dateStr = dayEl.textContent?.trim() || '';
                  break;
                }
                currentEl = currentEl.previousElementSibling;
              }
              
              if (title && title.length > 5) {
                meetingElements.push({
                  title: title.substring(0, 200),
                  dateStr: dateStr || null,
                  timeStr: timeStr || null,
                  url: href,
                  fullText: text.substring(0, 300)
                });
              }
            });
          }
          
          return meetingElements;
        });
        
        return events;
      }
    });
    
    if (nextMeetings && nextMeetings.length > 0) {
      allMeetings.push(...nextMeetings);
    }
  } catch (error) {
    console.error('[SCRAPER:DesMoines] Error fetching next month:', error);
  }
  
  if (allMeetings.length === 0) {
    console.log('[SCRAPER:DesMoines] ℹ️ No meetings found across both months');
    return [];
  }
  
  console.log(`[SCRAPER:DesMoines] Found ${allMeetings.length} potential meetings across both months`);
  
  try {
    // Convert to RawEvent format and filter out past events
    const nowTime = Date.now();
    const rawEvents: RawEvent[] = allMeetings
      .filter((m: any) => m.dateStr) // Only keep events with dates
      .map((meeting: any) => {
        // Parse date
        const dateStr = meeting.dateStr;
        const timeStr = meeting.timeStr || '12:00 PM';
        
        const date = parseDateString(dateStr, timeStr);
        if (!date) return null;
        
        // Source URL always points to the calendar
        const calendarUrl = 'https://migration.revize.com/revize/cityofdesmoines/calendar.php';
        
        return {
          id: `desmoines-${date.getTime()}-${sanitizeForId(meeting.title)}`,
          name: meeting.title,
          title: meeting.title,
          date: date.toISOString(),
          time: timeStr,
          location: 'Des Moines City Hall, 400 Robert D. Ray Drive, Des Moines, IA 50309',
          committee: extractCommittee(meeting.title),
          type: 'meeting',
          level: 'local',
          state: 'IA',
          city: 'Des Moines',
          lat: 41.5868,
          lng: -93.6250,
          zipCode: '50309',
          description: `Des Moines ${meeting.title}`,
          sourceUrl: calendarUrl,
          docketUrl: null // No docket available for Des Moines
        } as RawEvent;
      })
      .filter((e): e is RawEvent => e !== null)
      .filter(e => new Date(e.date).getTime() > nowTime); // Filter out past events
    
    // Deduplicate by ID (same event may appear in multiple months)
    const uniqueEvents = Array.from(
      new Map(rawEvents.map(e => [e.id, e])).values()
    );
    
    console.log(`[SCRAPER:DesMoines] ✓ Converted ${uniqueEvents.length} unique future events (${rawEvents.length - uniqueEvents.length} duplicates removed)`);
    return uniqueEvents;
    
  } catch (error) {
    console.error('[SCRAPER:DesMoines] Failed to scrape Des Moines', error);
    return [];
  }
}

function parseDateString(dateStr: string, timeStr: string): Date | null {
  try {
    // Parse: "December 8, 2025" or "Monday, December 16, 2024" or "December 8, 2025Monday"
    // Remove day of week if present
    const cleanedDateStr = dateStr.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b,?\s*/gi, '');
    const dateMatch = cleanedDateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (!dateMatch) return null;
    
    const [, monthName, day, year] = dateMatch;
    const months: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const month = months[monthName];
    if (month === undefined) return null;
    
    // Parse time - extract start time from range like "7:30am - 9:00am"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])/);
    if (!timeMatch) {
      // Try without minutes: "7am - 9am"
      const simpleTimeMatch = timeStr.match(/(\d{1,2})\s*([AaPp][Mm])/);
      if (!simpleTimeMatch) return new Date(parseInt(year), month, parseInt(day), 12, 0);
      
      let hour = parseInt(simpleTimeMatch[1]);
      const meridiem = simpleTimeMatch[2].toUpperCase();
      
      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      
      return new Date(parseInt(year), month, parseInt(day), hour, 0);
    }
    
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();
    
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    
    return new Date(parseInt(year), month, parseInt(day), hour, minute);
    
  } catch (err) {
    console.error('[SCRAPER:DesMoines] Date parse error:', err);
    return null;
  }
}

function extractCommittee(title: string): string {
  if (title.toLowerCase().includes('city council')) return 'City Council';
  if (title.toLowerCase().includes('planning')) return 'Planning Commission';
  if (title.toLowerCase().includes('zoning')) return 'Zoning Board';
  return 'City Council';
}

function sanitizeForId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

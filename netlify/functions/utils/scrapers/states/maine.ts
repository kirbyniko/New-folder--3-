import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';
import { scrapeWithPuppeteer } from '../puppeteer-helper';

interface MaineEvent {
  date: string; // ISO date string
  time: string; // e.g., "10:00 AM"
  committee: string;
  committeeName: string;
  eventType: string; // "Work Session", "Public Hearing", etc.
  detailUrl: string; // Link to committee page with full details
  bills: BillInfo[];
}

export class MaineScraper extends BaseScraper {
  private readonly calendarBaseUrl = 'https://legislature.maine.gov/calendar/#Weekly/';
  private readonly committeeBaseUrl = 'https://legislature.maine.gov/committee/';
  
  // Maine State House coordinates (Augusta)
  private readonly defaultLat = 44.3071;
  private readonly defaultLng = -69.7819;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'ME',
      stateName: 'Maine',
      websiteUrl: 'https://legislature.maine.gov/calendar',
      reliability: 'high',
      updateFrequency: 12,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🦞 ME Scraper initialized with Puppeteer');
  }

  getCalendarSources() {
    return [
      {
        name: 'Maine Legislature Calendar',
        url: 'https://legislature.maine.gov/calendar',
        type: 'primary' as const,
        description: 'Official Maine Legislature committee meetings and public hearings'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events = await scrapeWithPuppeteer('https://legislature.maine.gov/calendar', {
        waitFor: 3000,
        evaluate: async (page) => {
          const allEvents: MaineEvent[] = [];
          
          // Get today's date
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Generate URLs for the next 8 weeks
          const weekUrls: string[] = [];
          for (let i = 0; i < 8; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + (i * 7));
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            weekUrls.push(`https://legislature.maine.gov/calendar/#Weekly/${year}-${month}-${day}`);
          }
          
          console.log(`[Maine] Scraping ${weekUrls.length} weeks of calendar data...`);
          
          // Scrape each week
          for (const weekUrl of weekUrls) {
            try {
              await page.goto(weekUrl, { waitUntil: 'networkidle0', timeout: 45000 });
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Extract events from the weekly view
              const weekEvents = await page.evaluate(() => {
                const events: any[] = [];
                
                // Find all event links (they have committee URLs)
                const eventLinks = Array.from(document.querySelectorAll('a[href*="/committee/#Committees/"]'));
                
                for (const link of eventLinks) {
                  const href = (link as HTMLAnchorElement).href;
                  
                  // Extract date from nearby elements
                  let dateElement = link.closest('.day-cell, .calendar-day, [class*="day"]');
                  if (!dateElement) {
                    dateElement = link.closest('td, div');
                  }
                  
                  // Try to find date in various ways
                  let dateStr = '';
                  const dateHeaders = document.querySelectorAll('th.day-header, .date-header, [class*="date"]');
                  for (const header of Array.from(dateHeaders)) {
                    const headerText = header.textContent?.trim() || '';
                    if (headerText.match(/\d{1,2}\/\d{1,2}/)) {
                      dateStr = headerText;
                      break;
                    }
                  }
                  
                  // Extract committee code from URL
                  const committeeMatch = href.match(/\/committee\/#Committees\/([A-Z]+)/);
                  const committee = committeeMatch ? committeeMatch[1] : '';
                  
                  // Get event text
                  const eventText = link.textContent?.trim() || '';
                  
                  // Extract time if present
                  const timeMatch = eventText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
                  const time = timeMatch ? timeMatch[1] : '';
                  
                  if (committee && href) {
                    events.push({
                      committee,
                      detailUrl: href,
                      eventText,
                      time,
                      dateStr
                    });
                  }
                }
                
                return events;
              });
              
              console.log(`[Maine] Found ${weekEvents.length} events in week ${weekUrl}`);
              
              // Extract the week date from URL for fallback
              const weekMatch = weekUrl.match(/(\d{4})-(\d{2})-(\d{2})/);
              const weekDate = weekMatch ? `${weekMatch[1]}-${weekMatch[2]}-${weekMatch[3]}` : '';
              
              // Process all events
              const eventsToProcess = weekEvents;
              console.log(`[Maine]   Processing ${eventsToProcess.length} events from week ${weekDate}`);
              
              // Process events in batches to avoid memory issues
              const batchSize = 10;
              for (let batchStart = 0; batchStart < eventsToProcess.length; batchStart += batchSize) {
                const batch = eventsToProcess.slice(batchStart, batchStart + batchSize);
                console.log(`[Maine]   Batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(eventsToProcess.length / batchSize)}...`);
                
                for (const event of batch) {
                  try {
                    console.log(`[Maine]     ${event.committee}...`);
                    
                    // Navigate to committee detail page with retries
                    let navigationSuccess = false;
                    for (let attempt = 1; attempt <= 2; attempt++) {
                      try {
                        await page.goto(event.detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for page to load
                        navigationSuccess = true;
                        break;
                      } catch (navError) {
                        console.error(`[Maine]       Navigation attempt ${attempt} failed`);
                        if (attempt === 2) throw navError;
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                      }
                    }
                    
                    if (!navigationSuccess) {
                      // Add event with basic info if navigation fails
                      allEvents.push({
                        date: event.dateStr || weekDate,
                        time: event.time || 'TBD',
                        committee: event.committee,
                        committeeName: event.eventText || event.committee,
                        eventType: event.eventText.includes('Hearing') ? 'Public Hearing' : 'Committee Meeting',
                        detailUrl: event.detailUrl,
                        bills: []
                      });
                      continue;
                    }
                    
                    // Extract detailed event information including bills
                    const eventDetails = await page.evaluate(() => {
                      const details: any = {
                        date: '',
                        time: '',
                        eventType: '',
                        committeeName: '',
                        bills: []
                      };
                      
                      // Find event date and type (e.g., "January 6, 2026 Work Session, Public Hearing")
                      const headings = Array.from(document.querySelectorAll('h2, h3, h4, .event-date, .meeting-date'));
                      for (const heading of headings) {
                        const text = heading.textContent?.trim() || '';
                        
                        // Parse date like "January 6, 2026"
                        const dateMatch = text.match(/([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/);
                        if (dateMatch) {
                          details.date = dateMatch[1];
                        }
                        
                        // Parse event type
                        if (text.includes('Work Session') || text.includes('Public Hearing')) {
                          details.eventType = text.replace(details.date, '').trim();
                        }
                      }
                      
                      // Extract committee name from page title or header
                      const titleElement = document.querySelector('title, h1, .committee-name');
                      if (titleElement) {
                        details.committeeName = titleElement.textContent?.trim() || '';
                      }
                      
                      // Find time entries
                      const timeElements = Array.from(document.querySelectorAll('.time, .meeting-time, p, div'));
                      for (const el of timeElements) {
                        const text = el.textContent?.trim() || '';
                        const timeMatch = text.match(/^(\d{1,2}:\d{2}\s*(?:am|pm))/i);
                        if (timeMatch && !details.time) {
                          details.time = timeMatch[1];
                          break;
                        }
                      }
                      
                      // Extract bills (LD numbers with links)
                      const billLinks = Array.from(document.querySelectorAll('a[href*="/billtracker/"]'));
                      for (const billLink of billLinks) {
                        const href = (billLink as HTMLAnchorElement).href;
                        const billText = billLink.textContent?.trim() || '';
                        
                        // Extract LD number and paper number
                        const ldMatch = billText.match(/LD\s*(\d+)/i);
                        const paperMatch = href.match(/Paper\/([A-Z]+\d+)/);
                        
                        if (ldMatch) {
                          const ldNumber = ldMatch[1];
                          const paper = paperMatch ? paperMatch[1] : '';
                          
                          // Find bill title (usually in parent or sibling elements)
                          let billTitle = '';
                          const parent = billLink.closest('p, div, li');
                          if (parent) {
                            billTitle = parent.textContent?.replace(billText, '').trim() || '';
                            // Clean up common patterns
                            billTitle = billTitle.replace(/^[,\-–\s]+/, '').replace(/\s+Testimony:\s*$/, '');
                            billTitle = billTitle.substring(0, 200); // Truncate if too long
                          }
                          
                          details.bills.push({
                            id: `LD ${ldNumber}`,
                            number: `LD ${ldNumber}`,
                            paper: paper,
                            title: billTitle,
                            url: href
                          });
                        }
                      }
                      
                      return details;
                    });
                    
                    // Merge detail info with basic event info
                    // Merge detail info with basic event info
                    allEvents.push({
                      date: eventDetails.date || event.dateStr || weekDate,
                      time: eventDetails.time || event.time,
                      committee: event.committee,
                      committeeName: eventDetails.committeeName || event.eventText || event.committee,
                      eventType: eventDetails.eventType || (event.eventText.includes('Hearing') ? 'Public Hearing' : 'Committee Meeting'),
                      detailUrl: event.detailUrl,
                      bills: eventDetails.bills
                    });
                    
                    console.log(`[Maine]     ✓ ${event.committee}: ${eventDetails.bills.length} bills`);
                  } catch (detailError) {
                    console.error(`[Maine]     Error for ${event.committee}:`, detailError);
                    // Add event with basic info even if detail fetch fails
                    allEvents.push({
                      date: event.dateStr || weekDate,
                      time: event.time || 'TBD',
                      committee: event.committee,
                      committeeName: event.eventText || event.committee,
                      eventType: event.eventText.includes('Hearing') ? 'Public Hearing' : 'Committee Meeting',
                      detailUrl: event.detailUrl,
                      bills: []
                    });
                  }
                }
              }
              
            } catch (weekError) {
              console.error(`[Maine] Error scraping week ${weekUrl}:`, weekError);
            }
          }
          
          console.log(`[Maine] Total events collected: ${allEvents.length}`);
          return allEvents;
        }
      });
      
      // Convert to RawEvent format and filter past events
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const rawEvents = events
        .map(event => this.convertToRawEvent(event))
        .filter(event => {
          if (event) {
            const eventDate = new Date(event.date);
            return eventDate >= today;
          }
          return false;
        }) as RawEvent[];
      
      // Deduplicate events - use sourceUrl + time + bill count as unique identifier
      // (same committee page can have multiple time slots with different bills)
      const uniqueEvents: RawEvent[] = [];
      const seen = new Set<string>();
      
      for (const event of rawEvents) {
        const billCount = event.bills?.length || 0;
        const billIds = event.bills?.map(b => b.id).sort().join(',') || '';
        const key = `${event.sourceUrl}-${event.time}-${billIds}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEvents.push(event);
        } else {
          this.log(`Skipping duplicate: ${event.name} at ${event.time} (${billCount} bills)`);
        }
      }
      
      this.log(`✅ Found ${uniqueEvents.length} unique upcoming Maine events (${rawEvents.length - uniqueEvents.length} duplicates removed)`);
      return uniqueEvents;
      
    } catch (error) {
      console.error('Error scraping Maine events:', error);
      return [];
    }
  }

  private convertToRawEvent(event: MaineEvent): RawEvent | null {
    try {
      // Parse date from "January 6, 2026" format
      const dateObj = new Date(event.date);
      if (isNaN(dateObj.getTime())) {
        console.warn(`[Maine] Could not parse date: ${event.date}`);
        return null;
      }
      
      const isoDate = dateObj.toISOString();
      
      // Format time
      const time = event.time || 'TBD';
      
      // Build event name
      const name = event.eventType 
        ? `${event.committeeName || event.committee} - ${event.eventType}`
        : `${event.committeeName || event.committee} Committee Meeting`;
      
      // Build description from bills
      let description = '';
      if (event.bills && event.bills.length > 0) {
        const billSummary = event.bills
          .slice(0, 5)
          .map(b => `${b.id}: ${b.title}`)
          .join('; ');
        description = `Bills: ${billSummary}${event.bills.length > 5 ? ` (+ ${event.bills.length - 5} more)` : ''}`;
      }
      
      // Convert bills to BillInfo format
      const bills: BillInfo[] = event.bills.map(b => ({
        id: b.number || b.id,
        title: b.title,
        url: b.url
      }));
      
      const eventId = `me-${dateObj.getTime()}-${this.hashString(event.committee)}`;
      
      return {
        id: eventId,
        name,
        date: isoDate,
        time,
        location: 'Maine State House, Augusta',
        committee: event.committeeName || event.committee,
        type: event.eventType.toLowerCase().includes('hearing') ? 'public-hearing' : 'committee-meeting',
        level: 'state',
        state: 'ME',
        city: 'Augusta',
        lat: this.defaultLat,
        lng: this.defaultLng,
        zipCode: null,
        description,
        sourceUrl: event.detailUrl,
        docketUrl: undefined,
        virtualMeetingUrl: undefined,
        bills: bills.length > 0 ? bills : undefined
      };
    } catch (error) {
      console.error('[Maine] Error converting event:', error);
      return null;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }
}

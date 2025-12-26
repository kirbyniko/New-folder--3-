import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { parseHTML } from '../html-parser';

interface MassachusettsEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  status: string;
  detailUrl: string;
  archived?: boolean;
}

/**
 * Massachusetts General Court Scraper
 * Source: https://malegislature.gov/Events
 * 
 * Massachusetts legislative system:
 * - Calendar-based events page with monthly view
 * - Separate pages for Hearings and Sessions
 * - Detail pages contain bill lists and agendas
 * - Video archives available for some events
 * - Written testimony submission system
 */
export class MassachusettsScraper extends BaseScraper {
  private readonly baseUrl = 'https://malegislature.gov';
  private readonly eventsBase = '/Events';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MA',
      stateName: 'Massachusetts',
      websiteUrl: 'https://malegislature.gov/Events/Hearings/SearchResults',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🦞 MA Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Massachusetts Legislature Hearings',
        url: 'https://malegislature.gov/Events/Hearings/SearchResults',
        description: 'Joint committee public hearings and legislative events'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Boston, Worcester, Springfield, Cambridge, and other Massachusetts cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    // Get current and next 2 months of events
    const urls: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const dateStr = this.formatCalendarDate(date);
      urls.push(`${this.baseUrl}${this.eventsBase}/Calendar/${dateStr}`);
    }
    
    return urls;
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      const urls = await this.getPageUrls();
      
      // Fetch all calendar pages
      const allEvents: MassachusettsEvent[] = [];
      
      for (const url of urls) {
        const monthEvents = await this.fetchCalendarPage(url);
        allEvents.push(...monthEvents);
      }
      
      this.log(`Found ${allEvents.length} total events for Massachusetts`);

      // Get today's date for filtering
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Convert events and fetch bills (only for hearings, not sessions)
      for (const maEvent of allEvents) {
        if (maEvent.status === 'Confirmed' || maEvent.status === 'Underway') {
          const event = await this.convertEventToRaw(maEvent);
          if (event) {
            // Filter out past events
            const eventDate = new Date(event.date);
            if (eventDate >= today) {
              events.push(event);
            } else {
              this.log(`Skipping past event: ${event.name} on ${event.date}`);
            }
          }
        }
      }

      this.log(`Converted ${events.length} upcoming Massachusetts events`);
      
      return events;
    } catch (error) {
      const message = `Failed to scrape Massachusetts events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private formatCalendarDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  private async fetchCalendarPage(url: string): Promise<MassachusettsEvent[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.parseCalendarHTML(html);
    } catch (error) {
      this.log(`Error fetching calendar page ${url}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  private parseCalendarHTML(html: string): MassachusettsEvent[] {
    const events: MassachusettsEvent[] = [];
    const $ = parseHTML(html);

    // Find all event entries in the calendar
    // Events are in divs with class containing 'event' or similar
    const eventDivs = $('div.event-item, div[class*="event"]').toArray();
    
    // Alternative: Look for links to event detail pages
    const eventLinks = $('a[href*="/Events/Hearings/Detail/"], a[href*="/Events/Sessions/Detail/"]').toArray();
    
    for (const link of eventLinks) {
      const $link = $(link);
      const $parent = $link.closest('div, li, tr');
      
      const name = $link.find('strong').text().trim() || $link.text().trim();
      const href = $link.attr('href');
      
      if (!name || !href) continue;
      
      const isHearing = href.includes('/Hearings/');
      
      // Extract event ID from URL
      const idMatch = href.match(/Detail\/(\d+)/);
      if (!idMatch) continue;
      
      const eventId = idMatch[1];
      
      // Find time and date from parent context
      const timeText = $parent.find('strong:contains("M"), span:contains("M")').first().text();
      const dateText = $parent.prevAll('h3, h4').first().text();
      
      // Extract location
      const locationText = $parent.text();
      const location = this.extractLocation(locationText);
      
      // Determine status
      let status = 'Confirmed';
      if ($link.hasClass('completed') || locationText.includes('Completed')) {
        status = 'Completed';
      } else if ($link.hasClass('rescheduled') || locationText.includes('Rescheduled')) {
        status = 'Rescheduled';
      } else if (locationText.includes('Underway')) {
        status = 'Underway';
      }
      
      // Check for archived/video link
      const hasArchive = $parent.find('a[href*="Archived"]').length > 0;
      
      events.push({
        id: eventId,
        name,
        date: this.parseEventDate(dateText),
        time: timeText.trim(),
        location,
        status,
        detailUrl: `${this.baseUrl}${href}`,
        archived: hasArchive
      });
    }

    return events;
  }

  private extractLocation(text: string): string {
    // Extract location from text like "A-2 and Virtual" or "Senate Chamber"
    const locMatch = text.match(/(?:Location:|at)\s*([^|]+?)(?:\s*Status:|$)/i);
    if (locMatch) return locMatch[1].trim();
    
    // Look for common location patterns
    const patterns = [
      /\b([AB]-\d+(?:\s+and\s+Virtual)?)/i,
      /\b(Senate Chamber|House Chamber|Gardner Auditorium)/i,
      /\b(Virtual Hearing|Written Testimony Only)/i,
      /\b(Room\s+\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return 'State House';
  }

  private parseEventDate(dateStr: string): string {
    // Parse formats like "DEC17Wednesday" or "December 17, 2025"
    const monthMap: Record<string, number> = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11,
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    // Try "DEC17" format
    let match = dateStr.match(/([A-Z]{3})(\d+)/i);
    if (match) {
      const month = monthMap[match[1].toUpperCase()];
      const day = parseInt(match[2]);
      const year = new Date().getFullYear();
      return new Date(year, month, day).toISOString();
    }
    
    // Try "December 17, 2025" format
    match = dateStr.match(/(\w+)\s+(\d+),\s+(\d{4})/);
    if (match) {
      const month = monthMap[match[1]];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      return new Date(year, month, day).toISOString();
    }
    
    return new Date().toISOString();
  }

  private async fetchEventDetails(detailUrl: string): Promise<{ bills: BillInfo[], videoUrl?: string }> {
    try {
      const response = await fetch(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return { bills: [] };
      }

      const html = await response.text();
      const $ = parseHTML(html);

      const bills: BillInfo[] = [];
      
      // Find bill tables - bills are listed in tables with bill numbers
      const billRows = $('tr:has(td)').toArray();
      
      for (const row of billRows) {
        const $row = $(row);
        const cells = $row.find('td').toArray();
        
        if (cells.length >= 2) {
          const billNum = $(cells[0]).text().trim();
          const billTitle = $(cells[1]).text().trim();
          
          // Check if it's a valid bill number (H.#### or S.####)
          if (/^[HS]\.\d+$/.test(billNum)) {
            const billUrl = `${this.baseUrl}/Bills/194/${billNum}`;
            
            bills.push({
              id: billNum,
              title: billTitle,
              url: billUrl
            });
          }
        }
      }

      // Look for video/archive link
      const videoLink = $('a[href*="video"], a:contains("Archived")').first().attr('href');
      const videoUrl = videoLink ? (videoLink.startsWith('http') ? videoLink : `${this.baseUrl}${videoLink}`) : undefined;

      return { bills, videoUrl };
    } catch (error) {
      this.log(`Error fetching event details ${detailUrl}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { bills: [] };
    }
  }

  private async convertEventToRaw(maEvent: MassachusettsEvent): Promise<RawEvent | null> {
    try {
      // Parse the date and time
      const eventDate = new Date(maEvent.date);
      
      // Parse time like "3:00 PM"
      const timeMatch = maEvent.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        eventDate.setHours(hours, minutes, 0, 0);
      }

      // Fetch event details to get bills
      const { bills, videoUrl } = await this.fetchEventDetails(maEvent.detailUrl);
      
      this.log(`Event ${maEvent.name}: ${bills.length} bills found`);

      const event: RawEvent = {
        name: maEvent.name,
        date: eventDate.toISOString(),
        time: maEvent.time,
        location: maEvent.location,
        committee: maEvent.name,
        description: `Massachusetts legislative event`,
        sourceUrl: maEvent.detailUrl,
        virtualMeetingUrl: maEvent.archived ? videoUrl : undefined,
        bills: bills.length > 0 ? bills : undefined
      };

      return event;
    } catch (error) {
      this.log(`Error converting event ${maEvent.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }
}

import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';

/**
 * Wisconsin Legislature Scraper
 * Source: https://committeeschedule.legis.wisconsin.gov/
 * 
 * Scrapes committee meeting schedules from Wisconsin Legislature.
 * Data is embedded in HTML as JavaScript event objects (FullCalendar format).
 * 
 * Data sources:
 * - Committee Schedule: https://committeeschedule.legis.wisconsin.gov/
 * 
 * Notes:
 * - Events include Senate, Assembly, and Joint committees
 * - Bills are listed in eItems field (e.g., "SB328; SB502; AB109")
 * - Location format may include &#xA; (newline) characters
 * - Meeting notices are PDFs at docs.legis.wisconsin.gov
 */
export class WisconsinScraper extends BaseScraper {
  private readonly baseUrl = 'https://committeeschedule.legis.wisconsin.gov';
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'WI',
      stateName: 'Wisconsin',
      websiteUrl: 'https://docs.legis.wisconsin.gov/raw/committee',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🧀 WI Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Wisconsin Legislature Committee Notices',
        url: 'https://docs.legis.wisconsin.gov/raw/committee',
        description: 'Joint, Assembly, and Senate committee public notices'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Milwaukee, Madison, Green Bay, and other Wisconsin cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    return [`${this.baseUrl}/?StartDate=${dateStr}&ViewType=listDay`];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      // Fetch the schedule page
      this.log('Fetching Wisconsin committee schedule...');
      const url = `${this.baseUrl}/`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parsedEvents = this.parseSchedule(html);
      events.push(...parsedEvents);

      this.log(`Found ${events.length} events`);
      return events;
    } catch (error) {
      const message = `Failed to scrape WI: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private parseSchedule(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    
    try {
      // Extract event objects from JavaScript in HTML
      // Format: { title: '...', start: '...', description: '...', extendedProps: { ... } }
      const eventPattern = /\{\s*title:\s*'([^']+)',\s*start:\s*'([^']+)',\s*description:\s*'([^']+)',\s*classNames:\s*'([^']+)',\s*url:\s*'([^']+)',\s*extendedProps:\s*\{[^}]*type:\s*'([^']*)',\s*eItems:\s*'([^']*)',\s*topics:\s*'([^']*)',\s*mtgNoticeLink:\s*'([^']+)',\s*commLink:\s*'([^']+)',\s*location:\s*'([^']+)',\s*committeeID:\s*'([^']+)'/g;
      
      let match;
      while ((match = eventPattern.exec(html)) !== null) {
        const [, title, start, description, classNames, url, type, eItems, topics, mtgNoticeLink, commLink, location, committeeID] = match;
        
        // Parse date and time
        const dateObj = new Date(start);
        const time = this.formatTime(dateObj);
        
        // Clean location (remove HTML entities)
        const cleanLocation = location
          .replace(/&#xA;/g, ', ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        // Parse bills from eItems
        const bills = this.parseBills(eItems, title);
        
        // Determine chamber from classNames
        const chamber = classNames.trim() || 'Joint';
        
        events.push({
          name: title,
          date: dateObj.toISOString(),
          time,
          location: cleanLocation || 'State Capitol',
          committee: title,
          type: `${type || 'Meeting'} - ${description}`,
          level: 'state',
          state: 'WI',
          city: 'Madison',
          lat: 43.0747,
          lng: -89.3841,
          description: `${chamber} committee ${description.toLowerCase()}. Topics: ${topics || 'Not specified'}`,
          sourceUrl: mtgNoticeLink || url,
          virtualMeetingUrl: undefined, // Wisconsin uses electronic registration, not direct video links
          bills: bills.length > 0 ? bills : undefined
        });
      }
      
      // Filter out past events
      const now = new Date();
      const futureEvents = events.filter(e => new Date(e.date) >= now);
      
      this.log(`Parsed ${events.length} total events, ${futureEvents.length} future events`);
      return futureEvents;
    } catch (error) {
      this.log(`Error parsing schedule: ${error instanceof Error ? error.message : 'Unknown'}`);
      return events;
    }
  }

  private parseBills(eItems: string, committee: string): BillInfo[] {
    if (!eItems || eItems.trim() === '(None)' || eItems.trim() === '') {
      return [];
    }

    const bills: BillInfo[] = [];
    
    // Split by semicolon and parse each bill
    const items = eItems.split(';').map(s => s.trim());
    
    for (const item of items) {
      // Match bill patterns: SB123, AB456, etc.
      const billMatch = item.match(/^([AS]B)(\d+)$/i);
      if (billMatch) {
        const billType = billMatch[1].toUpperCase();
        const billNum = billMatch[2];
        const billId = `${billType}${billNum}`;
        
        bills.push({
          id: billId,
          title: `${committee} - ${billId}`,
          url: `https://docs.legis.wisconsin.gov/2025/proposals/${billId.toLowerCase()}`
        });
      }
    }
    
    return bills;
  }

  private formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  }
}

import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { parseHTML } from '../html-parser';

interface TennesseeEvent {
  time: string;
  type: string;
  committee: string;
  agendaUrl?: string;
  location: string;
  videoUrl?: string;
  date: string;
}

/**
 * Tennessee General Assembly Scraper
 * Source: https://wapp.capitol.tn.gov/apps/schedule/
 * 
 * Tennessee's legislative system:
 * - Three schedule types: Senate, House, Joint
 * - HTML-based schedule tables with weekly view
 * - PDF agendas containing bill numbers
 * - Video streaming links with CommID parameter
 * - Bill information via legislature.tn.gov
 */
export class TennesseeScraper extends BaseScraper {
  private readonly baseUrl = 'https://wapp.capitol.tn.gov';
  private readonly scheduleBase = '/apps/schedule';
  private readonly billBaseUrl = 'https://wapp.capitol.tn.gov/apps/BillInfo';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'TN',
      stateName: 'Tennessee',
      websiteUrl: 'https://capitol.tn.gov/pages/calendar-display',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🎸 TN Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Tennessee General Assembly Calendar',
        url: 'https://capitol.tn.gov/pages/calendar-display',
        description: 'Committee meetings and floor calendars for both chambers'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Nashville, Memphis, Knoxville, Chattanooga, and other Tennessee cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      `${this.baseUrl}${this.scheduleBase}/Default.aspx?type=senate`,
      `${this.baseUrl}${this.scheduleBase}/Default.aspx?type=house`,
      `${this.baseUrl}${this.scheduleBase}/Default.aspx?type=joint`
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const events: RawEvent[] = [];
      
      // Fetch schedules for Senate, House, and Joint committees
      const [senateEvents, houseEvents, jointEvents] = await Promise.all([
        this.fetchSchedule('senate'),
        this.fetchSchedule('house'),
        this.fetchSchedule('joint')
      ]);

      const allEvents = [...senateEvents, ...houseEvents, ...jointEvents];
      
      this.log(`Found ${allEvents.length} total events for Tennessee`);

      // Get today's date for filtering
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Convert events and fetch bills
      for (const tnEvent of allEvents) {
        const event = await this.convertEventToRaw(tnEvent);
        if (event) {
          const eventDate = new Date(event.date);
          if (eventDate >= today) {
            events.push(event);
          } else {
            this.log(`Skipping past event: ${event.name} on ${event.date}`);
          }
        }
      }

      this.log(`Converted ${events.length} upcoming Tennessee events`);
      
      return events;
    } catch (error) {
      const message = `Failed to scrape Tennessee events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private async fetchSchedule(type: string): Promise<TennesseeEvent[]> {
    const url = `${this.baseUrl}${this.scheduleBase}/Default.aspx?type=${type}`;
    
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
      return this.parseScheduleHTML(html, type);
    } catch (error) {
      this.log(`Error fetching ${type} schedule: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  private parseScheduleHTML(html: string, type: string): TennesseeEvent[] {
    const events: TennesseeEvent[] = [];
    const $ = parseHTML(html);

    // Find all day tables (Monday through Sunday)
    const dayTables = $('table.date-table').toArray();
    
    for (const table of dayTables) {
      const $table = $(table);
      
      // Get the date from the heading (look for h3 with date)
      const dateHeading = $table.closest('div').find('h3 span').text();
      const date = this.parseDate(dateHeading);
      
      if (!date) continue;

      // Parse each row in the table (skip header)
      const rows = $table.find('tr').toArray().slice(1);
      
      for (const row of rows) {
        const $row = $(row);
        const cells = $row.find('td').toArray();
        
        if (cells.length < 6) continue;

        const time = $(cells[0]).text().trim();
        const eventType = $(cells[1]).text().trim();
        const committee = $(cells[2]).text().trim();
        const location = $(cells[4]).text().trim();
        
        // Extract agenda URL
        const agendaLink = $(cells[3]).find('a[href*=".pdf"]');
        const agendaUrl = agendaLink.length > 0 ? agendaLink.attr('href') : undefined;
        
        // Extract video URL
        const videoLink = $(cells[5]).find('a[href*="videowrapper"]');
        const videoUrl = videoLink.length > 0 ? videoLink.attr('href') : undefined;

        if (committee && time) {
          events.push({
            time,
            type: eventType || type,
            committee,
            agendaUrl: agendaUrl ? this.normalizeUrl(agendaUrl) : undefined,
            location,
            videoUrl: videoUrl ? this.normalizeUrl(videoUrl) : undefined,
            date: date.toISOString()
          });
        }
      }
    }

    return events;
  }

  private parseDate(dateStr: string): Date | null {
    // Parse "Wednesday, December 17, 2025" format
    const match = dateStr.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/);
    if (!match) return null;

    const [, , month, day, year] = match;
    const monthMap: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };

    const monthNum = monthMap[month];
    if (monthNum === undefined) return null;

    return new Date(parseInt(year), monthNum, parseInt(day));
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return url;
  }

  private async extractBillsFromPdf(pdfUrl: string): Promise<string[]> {
    try {
      const response = await fetch(pdfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return [];
      }

      const buffer = await response.arrayBuffer();
      const text = Buffer.from(buffer).toString('utf8');
      
      // Extract bill numbers (SB or HB followed by digits)
      const billMatches = text.matchAll(/\b(SB|HB)\s*(\d+)\b/gi);
      const billNumbers = new Set<string>();
      
      for (const match of billMatches) {
        const billNum = `${match[1].toUpperCase()}${match[2]}`;
        billNumbers.add(billNum);
      }
      
      return Array.from(billNumbers);
    } catch (error) {
      this.log(`Error extracting bills from PDF: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  private async fetchBillInfo(billNumber: string): Promise<BillInfo | null> {
    try {
      // Tennessee bill URL format: https://wapp.capitol.tn.gov/apps/BillInfo/Default.aspx?BillNumber=SB1234
      const billUrl = `${this.billBaseUrl}/Default.aspx?BillNumber=${billNumber}`;
      
      const response = await fetch(billUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const $ = parseHTML(html);

      // Extract bill title
      const title = $('span[id*="lblBillTitle"]').text().trim() || 
                    $('span[id*="Caption"]').text().trim() ||
                    'Bill information';

      return {
        id: billNumber,
        title,
        url: billUrl
      };
    } catch (error) {
      this.log(`Error fetching bill ${billNumber}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  private async convertEventToRaw(tnEvent: TennesseeEvent): Promise<RawEvent | null> {
    try {
      // Parse the date and time
      const eventDate = new Date(tnEvent.date);
      const [timeStr, period] = tnEvent.time.split(/\s+(AM|PM)/i);
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      let hour = hours;
      if (period?.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period?.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }
      
      eventDate.setHours(hour, minutes || 0, 0, 0);

      // Extract bills from agenda PDF if available
      let bills: BillInfo[] = [];
      if (tnEvent.agendaUrl) {
        const billNumbers = await this.extractBillsFromPdf(tnEvent.agendaUrl);
        this.log(`Found ${billNumbers.length} bills in agenda for ${tnEvent.committee}`);
        
        // Fetch bill details (limit to first 20 to avoid rate limiting)
        const billPromises = billNumbers.slice(0, 20).map(bn => this.fetchBillInfo(bn));
        const billResults = await Promise.all(billPromises);
        bills = billResults.filter((b): b is BillInfo => b !== null);
      }

      const event: RawEvent = {
        name: tnEvent.committee,
        date: eventDate.toISOString(),
        time: tnEvent.time,
        location: tnEvent.location,
        committee: tnEvent.committee,
        description: `${tnEvent.type} committee meeting`,
        sourceUrl: tnEvent.agendaUrl,
        virtualMeetingUrl: tnEvent.videoUrl,
        bills: bills.length > 0 ? bills : undefined
      };

      return event;
    } catch (error) {
      this.log(`Error converting event ${tnEvent.committee}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }
}

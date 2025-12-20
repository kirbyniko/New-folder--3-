import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { parseHTML } from '../html-parser';

interface LouisianaEvent {
  committee: string;
  dateTime: string;
  room: string;
  status: string;
  agendaUrl: string;
}

/**
 * Louisiana Legislature Scraper
 * Source: https://legis.la.gov/legis/ByCmte.aspx
 * 
 * Louisiana's legislative system:
 * - Static HTML table with upcoming committee meetings
 * - Three sections: House, Senate, and Joint committees
 * - Status indicators: Scheduled (black), Cancelled (red), No meetings (gray)
 * - Agenda detail pages at Agenda.aspx?m=[meeting_id]
 * - Meeting format: "Day MM/DD HH:MM a.m./p.m."
 */
export class LouisianaScraper extends BaseScraper {
  private readonly baseUrl = 'https://legis.la.gov';
  private readonly calendarUrl = '/legis/ByCmte.aspx';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'LA',
      stateName: 'Louisiana',
      websiteUrl: 'https://legis.la.gov/legis/ByCmte.aspx',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    this.log('🎺 LA Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Louisiana Legislature Committee Calendar',
        url: 'https://legis.la.gov/legis/ByCmte.aspx',
        description: 'House, Senate, and Joint committee meeting schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'Baton Rouge and New Orleans city council meetings'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [`${this.baseUrl}${this.calendarUrl}`];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const agendaItems: LouisianaEvent[] = [];
      
      const url = `${this.baseUrl}${this.calendarUrl}`;
      this.log(`Fetching Louisiana calendar from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = parseHTML(html);

      // Find the main meetings table
      const meetingsTable = $('#ctl00_ctl00_PageBody_PageContent_Upcomingmeetings_TableUpcomingMeetings');
      
      if (meetingsTable.length === 0) {
        this.log('Warning: Could not find meetings table');
        return [];
      }

      // Parse table rows
      meetingsTable.find('tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length < 4) return; // Skip header rows

        const committeeCell = $(cells[0]);
        const dateTimeCell = $(cells[1]);
        const roomCell = $(cells[2]);
        const statusCell = $(cells[3]);

        // Extract committee name and agenda URL
        const committeeLink = committeeCell.find('a');
        if (committeeLink.length === 0) return; // Skip if no link

        const committee = committeeLink.text().trim();
        const agendaPath = committeeLink.attr('href');
        if (!agendaPath) return;

        const dateTime = dateTimeCell.text().trim();
        const room = roomCell.text().trim();
        const status = statusCell.text().trim();
        const statusColor = statusCell.attr('style') || '';

        // Skip cancelled meetings (red text)
        if (statusColor.includes('Red') || status.toLowerCase().includes('cancel')) {
          this.log(`Skipping cancelled meeting: ${committee}`);
          return;
        }

        // Skip "No meetings" entries (gray text)
        if (status.toLowerCase().includes('no meeting')) {
          return;
        }

        const laEvent: LouisianaEvent = {
          committee,
          dateTime,
          room,
          status,
          agendaUrl: agendaPath.startsWith('http') ? agendaPath : `${this.baseUrl}/legis/${agendaPath}`
        };

        agendaItems.push(laEvent);
      });

      this.log(`Found ${agendaItems.length} Louisiana meetings to process`);

      // Convert all events (with agenda parsing)
      const convertedEvents: RawEvent[] = [];
      for (const laEvent of agendaItems) {
        const rawEvent = await this.convertEventToRaw(laEvent);
        if (rawEvent) {
          convertedEvents.push(rawEvent);
        }
      }

      this.log(`Found ${convertedEvents.length} Louisiana events with agenda details`);
      return convertedEvents;
      
    } catch (error) {
      const message = `Failed to scrape Louisiana events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(`Error: ${message}`, true);
      throw new Error(message);
    }
  }

  private async convertEventToRaw(laEvent: LouisianaEvent): Promise<RawEvent | null> {
    try {
      // Parse date and time from format like "Fri 12/19 9:00 a.m."
      const parsedDate = this.parseDateTime(laEvent.dateTime);
      if (!parsedDate) {
        this.log(`Could not parse date: ${laEvent.dateTime}`, true);
        return null;
      }

      const { date, time } = parsedDate;

      // Louisiana coordinates (Baton Rouge state capitol)
      const lat = 30.4515;
      const lng = -91.1871;

      const location = laEvent.room 
        ? `Room ${laEvent.room}, Louisiana State Capitol`
        : 'Louisiana State Capitol';

      // Fetch and parse agenda to get meeting description
      let description = '';
      try {
        const agendaDetails = await this.parseAgenda(laEvent.agendaUrl);
        if (agendaDetails.items.length > 0) {
          description = `Agenda: ${agendaDetails.items.slice(0, 3).join('; ')}${agendaDetails.items.length > 3 ? '...' : ''}`;
        }
      } catch (error) {
        this.log(`Could not fetch agenda details: ${error instanceof Error ? error.message : 'Unknown'}`, true);
      }

      return {
        id: `la-${Buffer.from(laEvent.committee + date).toString('base64').substring(0, 12)}`,
        name: `${laEvent.committee} Committee Meeting`,
        date,
        time,
        location,
        committee: laEvent.committee,
        type: 'Committee Meeting',
        level: 'state',
        state: 'LA',
        city: 'Baton Rouge',
        lat,
        lng,
        zipCode: '70802',
        sourceUrl: laEvent.agendaUrl,
        description,
        bills: []
      };
    } catch (error) {
      this.log(`Error converting event: ${error instanceof Error ? error.message : 'Unknown'}`, true);
      return null;
    }
  }

  /**
   * Parse Louisiana agenda page to extract meeting items
   */
  private async parseAgenda(agendaUrl: string): Promise<{ items: string[] }> {
    try {
      const response = await fetch(agendaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        }
      });

      if (!response.ok) {
        return { items: [] };
      }

      const html = await response.text();
      const $ = parseHTML(html);

      const items: string[] = [];

      // Find the main agenda table
      $('#TableAgendaItems tr').each((_, row) => {
        const $row = $(row);
        const text = $row.text().trim();

        // Skip headers like "CALL TO ORDER", "ROLL CALL", etc.
        if (text.match(/^(CALL TO ORDER|ROLL CALL|ANNOUNCEMENTS|ADJOURNMENT|BUSINESS)$/i)) {
          return;
        }

        // Extract numbered items (e.g., "1. To receive an update...")
        const match = text.match(/^\d+\.\s+(.+)/);
        if (match && match[1]) {
          let itemText = match[1]
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/<br\/>/gi, ' ')  // Remove br tags
            .trim();
          
          // Truncate long items
          if (itemText.length > 150) {
            itemText = itemText.substring(0, 147) + '...';
          }
          
          items.push(itemText);
        }
      });

      return { items };
    } catch (error) {
      this.log(`Error parsing agenda: ${error instanceof Error ? error.message : 'Unknown'}`, true);
      return { items: [] };
    }
  }

  /**
   * Parse Louisiana date/time format: "Fri 12/19 9:00 a.m." or "Thu 1/08 10:00 a.m."
   */
  private parseDateTime(dateTimeStr: string): { date: string; time: string } | null {
    try {
      // Format: "Day MM/DD HH:MM a.m./p.m."
      const match = dateTimeStr.match(/\w+\s+(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(a\.m\.|p\.m\.)/i);
      
      if (!match) {
        return null;
      }

      const [, month, day, hour, minute, period] = match;
      
      // Determine year (assume current year if month >= current month, otherwise next year)
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const eventMonth = parseInt(month);
      
      let year = now.getFullYear();
      if (eventMonth < currentMonth) {
        year++; // Event is next year
      }

      // Convert to 24-hour format
      let hour24 = parseInt(hour);
      const isPM = period.toLowerCase().startsWith('p');
      
      if (isPM && hour24 !== 12) {
        hour24 += 12;
      } else if (!isPM && hour24 === 12) {
        hour24 = 0;
      }

      // Format: YYYY-MM-DD
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Format: HH:MM AM/PM
      const displayHour = parseInt(hour);
      const displayPeriod = isPM ? 'PM' : 'AM';
      const time = `${displayHour}:${minute} ${displayPeriod}`;

      return { date, time };
    } catch (error) {
      return null;
    }
  }
}

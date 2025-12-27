import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { parseHTML } from '../html-parser';

/**
 * Missouri General Assembly Scraper
 * Source: https://house.mo.gov/ and https://www.senate.mo.gov/
 * 
 * Scrapes committee hearing schedules from both House and Senate.
 * Uses traditional time-ordered view for reliable HTML parsing.
 * 
 * Data sources:
 * - House Hearings: https://house.mo.gov/HearingsTimeOrder.aspx
 * - Senate Hearings: https://www.senate.mo.gov/hearingsschedule/hrings.htm
 * 
 * Notes:
 * - Hearings often scheduled "upon adjournment"
 * - Bills are listed separately (not included in hearing notices)
 * - Both chambers use similar HTML table structure
 */
export class MissouriScraper extends BaseScraper {
  private readonly houseUrl = 'https://house.mo.gov';
  private readonly senateUrl = 'https://www.senate.mo.gov';
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MO',
      stateName: 'Missouri',
      websiteUrl: 'https://house.mo.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🍻 MO Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Missouri House Committee Hearings',
        url: 'https://house.mo.gov/HearingsTimeOrder.aspx',
        description: 'House committee hearing schedules'
      },
      {
        name: 'Missouri Senate Hearings',
        url: 'https://www.senate.mo.gov/hearingsschedule/hrings.htm',
        description: 'Senate committee hearing schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Kansas City, St. Louis, Springfield, and other Missouri cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      `${this.houseUrl}/HearingsTimeOrder.aspx`,
      `${this.senateUrl}/hearingsschedule/hrings.htm`
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const allEvents: RawEvent[] = [];

      // Fetch House hearings
      const houseEvents = await this.fetchHouseHearings();
      allEvents.push(...houseEvents);

      // Fetch Senate hearings
      const senateEvents = await this.fetchSenateHearings();
      allEvents.push(...senateEvents);

      this.log(`Found ${allEvents.length} events`);
      return allEvents;
    } catch (error) {
      const message = `Failed to scrape MO: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private async fetchHouseHearings(): Promise<RawEvent[]> {
    const url = `${this.houseUrl}/HearingsTimeOrder.aspx`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for House hearings`);
    }

    const html = await response.text();
    return this.parseHouseHearings(html);
  }

  private parseHouseHearings(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    const $ = parseHTML(html);

    // Find hearing date headers
    const datePattern = /Hearing Date (\\w+day,\\s+\\w+\\s+\\d+,\\s+\\d{4})/gi;
    const dateMatches = [...html.matchAll(datePattern)];

    if (dateMatches.length === 0) {
      this.log('No House hearings found');
      return events;
    }

    // Parse each hearing table
    const tables = $('table[border="0"]').toArray();
    
    for (const table of tables) {
      const $table = $(table);
      let committee = '';
      let dateStr = '';
      let time = '';
      let location = '';
      let note = '';

      // Extract data from table rows
      const rows = $table.find('tr').toArray();
      for (const row of rows) {
        const $row = $(row);
        const th = $row.find('th').first().text().trim();
        const td = $row.find('td').first();

        if (th === 'Committee:') {
          committee = td.find('a').text().trim() || td.text().trim();
        } else if (th === 'Date:') {
          dateStr = td.text().replace(/- Upcoming|- Past/g, '').trim();
        } else if (th === 'Time:') {
          time = td.text().trim();
        } else if (th === 'Location:') {
          location = td.text().trim();
        } else if (th === 'Note:') {
          note = td.text().trim();
        }
      }

      if (committee && dateStr) {
        // Parse date
        const date = new Date(dateStr);
        
        // Parse time if specific (not "upon adjournment")
        const timeMatch = time.match(/(\\d{1,2}):(\\d{2})\\s*([AP]M)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();

          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;

          date.setHours(hours, minutes, 0, 0);
        }

        events.push({
          name: committee,
          date: date.toISOString(),
          time,
          location: location || 'Missouri State Capitol',
          committee,
          description: note || 'House committee hearing',
          sourceUrl: `${this.houseUrl}/HearingsTimeOrder.aspx`
        });
      }
    }

    return events;
  }

  private async fetchSenateHearings(): Promise<RawEvent[]> {
    const url = `${this.senateUrl}/hearingsschedule/hrings.htm`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for Senate hearings`);
    }

    const html = await response.text();
    return this.parseSenateHearings(html);
  }

  private parseSenateHearings(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    
    // Check if there are no hearings scheduled
    if (html.includes('no hearings scheduled')) {
      this.log('No Senate hearings scheduled');
      return events;
    }

    const $ = parseHTML(html);

    // Senate uses similar table structure to House
    const tables = $('table[border="0"]').toArray();
    
    for (const table of tables) {
      const $table = $(table);
      let committee = '';
      let dateStr = '';
      let time = '';
      let location = '';
      let note = '';

      const rows = $table.find('tr').toArray();
      for (const row of rows) {
        const $row = $(row);
        const th = $row.find('th').first().text().trim();
        const td = $row.find('td').first();

        if (th.includes('Committee')) {
          committee = td.find('a').text().trim() || td.text().trim();
        } else if (th.includes('Date')) {
          dateStr = td.text().replace(/- Upcoming|- Past/g, '').trim();
        } else if (th.includes('Time')) {
          time = td.text().trim();
        } else if (th.includes('Location') || th.includes('Room')) {
          location = td.text().trim();
        } else if (th.includes('Note')) {
          note = td.text().trim();
        }
      }

      if (committee && dateStr) {
        const date = new Date(dateStr);
        
        const timeMatch = time.match(/(\\d{1,2}):(\\d{2})\\s*([AP]M)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();

          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;

          date.setHours(hours, minutes, 0, 0);
        }

        events.push({
          name: committee,
          date: date.toISOString(),
          time,
          location: location || 'Missouri State Capitol',
          committee,
          description: note || 'Senate committee hearing',
          sourceUrl: `${this.senateUrl}/hearingsschedule/hrings.htm`
        });
      }
    }

    return events;
  }
}

import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import * as cheerio from 'cheerio';
import { scrapeBoiseMeetings } from '../local/boise.js';

export class IdahoScraper extends BaseScraper {
  private readonly senateUrl = 'https://legislature.idaho.gov/sessioninfo/agenda/sagenda/';
  private readonly houseUrl = 'https://legislature.idaho.gov/sessioninfo/agenda/hagenda/';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'ID',
      stateName: 'Idaho',
      websiteUrl: 'https://legislature.idaho.gov/sessioninfo/agenda/',
      reliability: 'high',
      updateFrequency: 24,
      maxRequestsPerMinute: 20
    };
    super(config);
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Idaho Legislature Committee Agendas',
        url: 'https://legislature.idaho.gov/sessioninfo/agenda/',
        description: 'House and Senate committee meeting agendas'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Boise and other Idaho cities'
      }
    ];
  }

  protected async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      // Scrape both chambers in parallel
      const [senateEvents, houseEvents] = await Promise.all([
        this.scrapeCommitteeAgendas(this.senateUrl, 'Senate'),
        this.scrapeCommitteeAgendas(this.houseUrl, 'House')
      ]);

      return [...senateEvents, ...houseEvents];
    } catch (error) {
      console.error('[SCRAPER:ID] Error scraping calendar:', error);
      return [];
    }
  }

  private async scrapeCommitteeAgendas(url: string, chamber: string): Promise<RawEvent[]> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const events: RawEvent[] = [];

      // Check for "No meetings scheduled" message
      const noMeetingsMsg = $('body').text();
      if (noMeetingsMsg.includes('No meetings scheduled')) {
        console.log(`[SCRAPER:ID] ${chamber}: No meetings scheduled`);
        return [];
      }

      // Parse meeting entries
      // Structure: Date headers followed by committee meeting details
      $('.meeting-item, .agenda-item, tr').each((_, elem) => {
        try {
          const $elem = $(elem);
          
          // Skip if this is a header or empty row
          const text = $elem.text().trim();
          if (!text || text.length < 10) return;

          // Extract committee name
          const committeeMatch = text.match(/(?:Committee on |Senate |House )(.+?)(?:\s+\d|$)/);
          if (!committeeMatch) return;

          const committee = `${chamber} ${committeeMatch[1].trim()}`;

          // Extract date (various formats: "January 15, 2026", "01/15/2026", "1/15/26")
          const dateMatch = text.match(/(\w+\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (!dateMatch) return;

          // Extract time (formats: "10:00 AM", "10:00 a.m.", "10 AM")
          const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?|\d{1,2}\s*[AaPp]\.?[Mm]\.?)/);
          if (!timeMatch) return;

          // Extract location/room
          const locationMatch = text.match(/(?:Room|Rm\.?)\s+(\w+\d*\w*)/i);
          const location = locationMatch ? `Room ${locationMatch[1]}` : 'State Capitol';

          const date = this.parseDateTime(dateMatch[1], timeMatch[1]);
          if (!date) return;

          const id = `id-${date.getTime()}-${this.hashString(committee)}`;

          events.push({
            id,
            name: committee,
            date: date.toISOString(),
            time: this.formatTime(date),
            location,
            committee,
            type: 'committee-hearing',
            level: 'state',
            state: 'ID',
            city: 'Boise',
            lat: 43.6150, // Idaho State Capitol coordinates
            lng: -116.2023,
            zipCode: null,
            description: `${chamber} committee meeting`,
            sourceUrl: url,
            docketUrl: undefined,
            virtualMeetingUrl: undefined,
            bills: []
          });
        } catch (error) {
          console.error('[SCRAPER:ID] Error parsing meeting item:', error);
        }
      });

      console.log(`[SCRAPER:ID] ${chamber}: Found ${events.length} events`);

      // Add Boise local government meetings

      console.log('Fetching Boise local government meetings...');

      try {

        const boiseEvents = await scrapeBoiseMeetings();

        console.log(`Found ${boiseEvents.length} Boise local meetings`);

        allEvents.push(...boiseEvents);

      } catch (error) {

        console.error('Error fetching Boise meetings:', error);

      }


      console.log(`Found ${allEvents.length} total Idaho events (state + local)`);

      return events;
    } catch (error) {
      console.error(`[SCRAPER:ID] Error scraping ${chamber}:`, error);
      return [];
    }
  }

  private parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      // Handle different date formats
      let month: number, day: number, year: number;

      if (dateStr.includes('/')) {
        // Format: "1/15/26" or "01/15/2026"
        const parts = dateStr.split('/');
        month = parseInt(parts[0]) - 1;
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);
        
        // Handle 2-digit year
        if (year < 100) {
          year = year + 2000;
        }
      } else {
        // Format: "January 15, 2026"
        const monthMap: { [key: string]: number } = {
          january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
          july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
        };

        const parts = dateStr.split(/[\s,]+/);
        const monthName = parts[0].toLowerCase();
        month = monthMap[monthName];
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);

        if (month === undefined) return null;
      }

      // Parse time
      const timeClean = timeStr.toUpperCase().replace(/\s+/g, ' ').trim();
      const timeMatch = timeClean.match(/(\d{1,2})(?::(\d{2}))?\s*([AP])\.?M\.?/);
      
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const isPM = timeMatch[3] === 'P';

      // Convert to 24-hour format
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (!isPM && hours === 12) {
        hours = 0;
      }

      // Mountain Time (UTC-7 in summer, UTC-6 in winter)
      const date = new Date(year, month, day, hours, minutes, 0);
      
      // Adjust for timezone - Idaho is in Mountain Time
      const utcDate = new Date(date.getTime() - (7 * 60 * 60 * 1000));
      
      return date;
    } catch (error) {
      console.error('[SCRAPER:ID] Error parsing date/time:', error, dateStr, timeStr);
      return null;
    }
  }

  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

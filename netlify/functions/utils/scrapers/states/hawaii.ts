import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import * as cheerio from 'cheerio';

/**
 * Hawaii State Legislature Scraper
 * Source: https://www.capitol.hawaii.gov/session/upcominghearingsfiltered.aspx
 * 
 * Hawaii Legislature calendar system:
 * - ASP.NET based hearings table
 * - Senate and House committee hearings
 * - Hearing notices with PDF links
 * - Video streaming available for some hearings
 */
export class HawaiiScraper extends BaseScraper {
  private readonly hearingsUrl = 'https://www.capitol.hawaii.gov/session/upcominghearingsfiltered.aspx';
  private readonly baseUrl = 'https://www.capitol.hawaii.gov';
  private readonly capitol = { lat: 21.3099, lng: -157.8581 }; // Honolulu coordinates

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'HI',
      stateName: 'Hawaii',
      websiteUrl: 'https://www.capitol.hawaii.gov/session/upcominghearingsfiltered.aspx',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30
    };
    super(config);
  }

  protected async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const response = await fetch(this.hearingsUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      const events: RawEvent[] = [];
      const noticeLinks: string[] = [];

      // Parse the hearings table to find notice links
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 6) return;

        // Column 4: Notice (contains link to detailed hearing notice)
        const noticeCell = $(cells[4]);
        const noticeLink = noticeCell.find('a').first();
        const noticePath = noticeLink.attr('href');
        
        if (noticePath && noticePath.includes('HEARING')) {
          const fullUrl = noticePath.startsWith('http') 
            ? noticePath 
            : `${this.baseUrl}${noticePath}`;
          noticeLinks.push(fullUrl);
        }
      });

      this.log(`Found ${noticeLinks.length} hearing notices to parse`);

      // Parse each hearing notice page for detailed meeting schedule
      for (const noticeUrl of noticeLinks) {
        try {
          const noticeEvents = await this.parseHearingNotice(noticeUrl);
          events.push(...noticeEvents);
        } catch (error) {
          this.log(`⚠️ Failed to parse notice ${noticeUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return events;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse a hearing notice page to extract individual meeting events
   */
  private async parseHearingNotice(noticeUrl: string): Promise<RawEvent[]> {
    try {
      const response = await fetch(noticeUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      const events: RawEvent[] = [];

      // Extract committee name from the heading (e.g., "COMMITTEE ON WAYS AND MEANS")
      const committeeHeading = $('a[href*="committeepage"]').text().trim();
      const committeeMatch = committeeHeading.match(/COMMITTEE ON (.+)/i);
      const baseCommittee = committeeMatch ? committeeMatch[1] : 'Committee';

      // Determine chamber from text (Senate/House)
      const chamber = html.includes('THE SENATE') ? 'Senate' : 
                      html.includes('THE HOUSE') ? 'House' : '';

      // Parse the agenda table
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 5) return;

        const dateText = $(cells[0]).text().trim();
        const timeText = $(cells[1]).text().trim();
        const locationText = $(cells[2]).text().trim();
        const committeeText = $(cells[3]).text().trim();
        const subjectText = $(cells[4]).text().trim();

        // Skip header rows
        if (!dateText || dateText.toLowerCase().includes('date')) return;

        // Parse multiple times from the time cell (e.g., "10:00 a.m. – 11:30 a.m.\n12:00 p.m. – 2:00 p.m.")
        const timeLines = timeText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
        const subjectLines = subjectText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        const committeeLines = committeeText.split('\n').map(c => c.trim()).filter(c => c.length > 0);

        // Create an event for each time slot
        timeLines.forEach((timeLine, idx) => {
          // Extract start time (e.g., "10:00 a.m." from "10:00 a.m. – 11:30 a.m.")
          const timeMatch = timeLine.match(/(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
          if (!timeMatch) return;

          const timeStr = timeMatch[1];
          const subject = subjectLines[idx] || subjectLines[0] || 'Informational Briefing';
          const committeeCode = committeeLines[idx] || committeeLines[0] || baseCommittee;

          // Parse date
          const { date, time } = this.parseDateTime(dateText, timeStr);
          if (!date) return;

          // Build full committee name
          const fullCommittee = chamber && !committeeCode.includes(chamber) 
            ? `${chamber} ${baseCommittee}` 
            : baseCommittee;

          const event: RawEvent = {
            name: `${fullCommittee} - ${subject}`,
            date,
            time,
            location: locationText || 'Hawaii State Capitol',
            committee: fullCommittee,
            type: 'committee-hearing',
            description: `${committeeCode}: ${subject}`,
            sourceUrl: this.hearingsUrl,
            docketUrl: noticeUrl
          };

          events.push(event);
        });
      });

      this.log(`Parsed ${events.length} events from ${noticeUrl}`);
      return events;

    } catch (error) {
      this.log(`Error parsing notice: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  /**
   * Parse Hawaii's date format: "January 7, 2026" with time like "10:00 a.m."
   */
  private parseDateTime(dateStr: string, timeStr: string): { date: Date | null; time: string } {
    try {
      // Match format: "January DD, YYYY" or "Month DD, YYYY"
      const dateMatch = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
      if (!dateMatch) {
        return { date: null, time: '' };
      }

      const [, monthName, day, year] = dateMatch;

      // Convert month name to number
      const monthMap: Record<string, number> = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const month = monthMap[monthName.toLowerCase()];
      if (month === undefined) {
        return { date: null, time: '' };
      }

      // Parse time: "10:00 a.m." or "2:00 p.m."
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i);
      if (!timeMatch) {
        return { date: null, time: '' };
      }

      const [, hour, minute, ampm] = timeMatch;
      
      // Convert to 24-hour format
      let hour24 = parseInt(hour);
      if (ampm.toLowerCase() === 'p' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toLowerCase() === 'a' && hour24 === 12) {
        hour24 = 0;
      }

      const date = new Date(parseInt(year), month, parseInt(day), hour24, parseInt(minute));
      const time = `${hour}:${minute} ${ampm.toUpperCase()}M`;

      return { date: isNaN(date.getTime()) ? null : date, time };
    } catch (error) {
      return { date: null, time: '' };
    }
  }

  /**
   * Override transform to set capitol coordinates
   */
  protected override async transformEvent(raw: RawEvent) {
    const event = await super.transformEvent(raw);
    if (event) {
      event.lat = this.capitol.lat;
      event.lng = this.capitol.lng;
      event.city = 'Honolulu';
    }
    return event;
  }

  getCalendarSources() {
    return [
      {
        name: 'Hawaii State Legislature Hearings',
        url: this.hearingsUrl,
        description: 'Upcoming committee hearings for House and Senate'
      }
    ];
  }
}

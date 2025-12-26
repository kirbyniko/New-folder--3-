import { BaseScraper, RawEvent } from '../base-scraper';
import * as cheerio from 'cheerio';

interface RIEvent {
  date: string;
  committee: string;
  time: string;
  pdfUrl?: string;
  htmlUrl?: string;
  location: string;
}

export class RhodeIslandScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'RI',
      stateName: 'Rhode Island',
      websiteUrl: 'https://status.rilegislature.gov/commission_board_calendar.aspx',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  getCalendarSources() {
    return [
      {
        name: 'Rhode Island Commission & Board Calendar',
        url: 'https://status.rilegislature.gov/commission_board_calendar.aspx',
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Commissions, task forces, and special legislative bodies'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const response = await fetch(this.config.websiteUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const events: RawEvent[] = [];
    const now = new Date();

    // Parse events from table rows
    $('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 5) return;

      const dateCell = $(cells[0]).text().trim();
      const committee = $(cells[1]).text().trim();
      const timeText = $(cells[2]).text().trim();
      const location = $(cells[4]).text().trim();

      // Skip header rows
      if (!dateCell || dateCell.includes('Date') || !committee) return;

      // Extract date from format: "Thursday, January 8, 2026"
      const dateMatch = dateCell.match(/([A-Za-z]+,\s+[A-Za-z]+\s+\d+,\s+\d{4})/);
      if (!dateMatch) return;

      const dateStr = dateMatch[1];
      const eventDate = new Date(dateStr);
      
      // Skip past events
      if (eventDate < now) return;

      // Extract PDF and HTML links
      const viewCell = $(cells[3]);
      const pdfLink = viewCell.find('a[href*=".pdf"]').attr('href');
      const htmlLink = viewCell.find('a[href*=".html"]').attr('href');

      // Parse time (format: "01:30 PM" or "02:30 P.M.")
      const time = timeText.replace(/\./g, '').trim();

      // Create event ID
      const dateTimestamp = eventDate.getTime();
      const committeeSlug = committee.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
      const id = `ri-${dateTimestamp}-${committeeSlug}`;

      events.push({
        id,
        name: committee,
        date: eventDate.toISOString(),
        time,
        location: location || 'State House',
        committee,
        type: 'commission-meeting',
        level: 'state',
        state: 'RI',
        city: 'Providence',
        lat: 41.8299,
        lng: -71.4160,
        zipCode: null,
        description: `${committee} meeting`,
        sourceUrl: this.config.websiteUrl,
        docketUrl: pdfLink ? this.resolveUrl(pdfLink) : undefined,
        virtualMeetingUrl: htmlLink ? this.resolveUrl(htmlLink) : undefined
      });
    });

    return events;
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `https://status.rilegislature.gov${url}`;
    return `https://status.rilegislature.gov/${url}`;
  }
}

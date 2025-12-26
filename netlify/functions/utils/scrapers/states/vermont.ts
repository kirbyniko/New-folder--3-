import { BaseScraper, RawEvent } from '../base-scraper';
import * as cheerio from 'cheerio';

export class VermontScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'VT',
      stateName: 'Vermont',
      websiteUrl: 'https://legislature.vermont.gov/committee/meetings/2026',
      reliability: 'medium',
      updateFrequency: 24
    });
  }

  getCalendarSources() {
    return [
      {
        name: 'Vermont Legislature Committee Meetings',
        url: 'https://legislature.vermont.gov/committee/meetings/2026',
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'General Assembly reconvenes January 6, 2026 per J.R.S.28'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const response = await fetch(this.config.websiteUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const events: RawEvent[] = [];
    const now = new Date();

    // Check for "No meetings scheduled" message
    const noMeetings = $('body').text().includes('No meetings scheduled') || 
                       $('tbody tr').length === 0 ||
                       $('tbody tr td').first().text().trim() === '';

    if (noMeetings) {
      this.log('ℹ️ No committee meetings scheduled', { 
        note: 'Legislature may be in recess. Session starts January 6, 2026' 
      });
      return [];
    }

    // Parse meeting table rows
    $('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const dateText = $(cells[0]).text().trim();
      const committeeLink = $(cells[1]).find('a');
      const committeeName = committeeLink.text().trim();
      const committeeUrl = committeeLink.attr('href');

      // Skip empty rows
      if (!dateText || !committeeName) return;

      // Parse date - format varies
      const eventDate = new Date(dateText);
      if (isNaN(eventDate.getTime()) || eventDate < now) return;

      // Extract time and location if available
      const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : undefined;

      const locationMatch = $(cells[2])?.text().trim();
      const location = locationMatch || 'Vermont State House';

      // Generate event ID
      const dateTimestamp = eventDate.getTime();
      const committeeSlug = committeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
      const id = `vt-${dateTimestamp}-${committeeSlug}`;

      events.push({
        id,
        name: `${committeeName} Meeting`,
        date: eventDate.toISOString(),
        time,
        location,
        committee: committeeName,
        type: 'committee-meeting',
        level: 'state',
        state: 'VT',
        city: 'Montpelier',
        lat: 44.2601,
        lng: -72.5754,
        zipCode: null,
        description: `${committeeName} committee meeting`,
        sourceUrl: this.config.websiteUrl,
        detailsUrl: committeeUrl ? `https://legislature.vermont.gov${committeeUrl}` : undefined
      });
    });

    return events;
  }
}

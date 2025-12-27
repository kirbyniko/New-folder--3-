import { BaseScraper, RawEvent } from '../base-scraper';
import * as cheerio from 'cheerio';

export class NorthDakotaScraper extends BaseScraper {
  constructor() {
    super({
      stateCode: 'ND',
      stateName: 'North Dakota',
      websiteUrl: 'https://www.ndlegis.gov/calendar',
      reliability: 'high',
      updateFrequency: 24
    });
  }

  getCalendarSources() {
    return [
      {
        name: 'North Dakota Legislative Calendar',
        url: 'https://www.ndlegis.gov/calendar',
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Interim and session committee meetings'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplementary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'City council meetings from Fargo, Bismarck, and other North Dakota cities'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const response = await fetch(this.config.websiteUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const events: RawEvent[] = [];
    const now = new Date();

    // Parse event wrappers
    $('.event-wrapper').each((_, wrapper) => {
      const $wrapper = $(wrapper);
      
      // Skip holidays and agency rules hearings - only get committee meetings
      if (!$wrapper.hasClass('color-committee-meeting')) return;

      const titleLink = $wrapper.find('.event-title a, .fw-b a');
      const committeeName = titleLink.text().trim();
      const detailsUrl = titleLink.attr('href');
      
      if (!committeeName || committeeName.includes('Holiday')) return;

      // Extract datetime
      const timeElement = $wrapper.find('time[datetime]');
      const datetime = timeElement.attr('datetime');
      if (!datetime) return;

      const eventDate = new Date(datetime);
      if (eventDate < now) return;

      // Extract time and location
      const timeText = $wrapper.find('.fs-14').first().text().trim();
      const locationText = $wrapper.find('.fs-14').last().text().trim();

      // Generate event ID
      const dateTimestamp = eventDate.getTime();
      const committeeSlug = committeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
      const id = `nd-${dateTimestamp}-${committeeSlug}`;

      events.push({
        id,
        name: committeeName,
        date: eventDate.toISOString(),
        time: timeText || undefined,
        location: locationText || 'State Capitol, Bismarck',
        committee: committeeName,
        type: 'committee-meeting',
        level: 'state',
        state: 'ND',
        city: 'Bismarck',
        lat: 46.8083,
        lng: -100.7837,
        zipCode: null,
        description: `${committeeName} meeting`,
        sourceUrl: this.config.websiteUrl,
        detailsUrl: detailsUrl ? `https://www.ndlegis.gov${detailsUrl}` : undefined
      });
    });

    return events;
  }
}

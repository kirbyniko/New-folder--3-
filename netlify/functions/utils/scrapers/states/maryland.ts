import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { parseHTML } from '../html-parser';

/**
 * Maryland General Assembly Scraper
 * Source: https://mgaleg.maryland.gov/mgawebsite/Meetings/
 * 
 * Scrapes committee meeting schedules from Maryland's meeting calendar.
 * Uses the Day and Week endpoints to find upcoming meetings.
 * 
 * Data sources:
 * - Day view: https://mgaleg.maryland.gov/mgawebsite/Meetings/Day
 * - Week view: https://mgaleg.maryland.gov/mgawebsite/Meetings/Week
 * - Month view: https://mgaleg.maryland.gov/mgawebsite/Meetings/Month
 * 
 * Notes:
 * - Meetings are organized by chamber (Senate/House/Other)
 * - Some meetings are virtual, some in-person
 * - Location information provided via Google Maps links
 * - Meeting details include time, location, and committee name
 */
export class MarylandScraper extends BaseScraper {
  private readonly baseUrl = 'https://mgaleg.maryland.gov';
  
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MD',
      stateName: 'Maryland',
      websiteUrl: 'https://mgaleg.maryland.gov/mgawebsite/Meetings/Day',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🦀 MD Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Maryland General Assembly Meetings',
        url: 'https://mgaleg.maryland.gov/mgawebsite/Meetings/Day',
        description: 'Daily committee meeting schedules for both chambers'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Baltimore, Rockville, Frederick, and other Maryland cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    // Fetch both Day and Week views for comprehensive coverage
    return [
      `${this.baseUrl}/mgawebsite/Meetings/Day`,
      `${this.baseUrl}/mgawebsite/Meetings/Week`
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      const allEvents: RawEvent[] = [];

      // Fetch the Day view first (most detailed)
      const dayEvents = await this.fetchDayView();
      allEvents.push(...dayEvents);

      // Fetch the Week view for additional context
      const weekEvents = await this.fetchWeekView();
      allEvents.push(...weekEvents);

      // Remove duplicates based on committee name and date
      const uniqueEvents = this.deduplicateEvents(allEvents);

      this.log(`Found ${uniqueEvents.length} unique events`);
      return uniqueEvents;
    } catch (error) {
      const message = `Failed to scrape MD: ${error instanceof Error ? error.message : 'Unknown'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private async fetchDayView(): Promise<RawEvent[]> {
    const url = `${this.baseUrl}/mgawebsite/Meetings/Day`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for Day view`);
    }

    const html = await response.text();
    return this.parseDayView(html);
  }

  private parseDayView(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    const $ = parseHTML(html);

    // Find the date from the page
    const dateText = $('h4:contains("20")').first().text().trim();
    const dateMatch = dateText.match(/(\w+day),\s+(\w+)\s+(\d+),\s+(\d{4})/);
    
    if (!dateMatch) {
      this.log('Could not parse date from Day view');
      return events;
    }

    const [, , monthStr, dayStr, yearStr] = dateMatch;
    const eventDate = new Date(`${monthStr} ${dayStr}, ${yearStr}`);
    
    // Skip if date is in the past
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (eventDate < today) {
      this.log(`Skipping past date: ${monthStr} ${dayStr}, ${yearStr}`);
      return events;
    }

    // Parse Senate meetings
    const senateSection = $('h5:contains("Senate")').parent();
    this.parseMeetingSection(senateSection, eventDate, 'Senate', events, $);

    // Parse House meetings
    const houseSection = $('h5:contains("House")').parent();
    this.parseMeetingSection(houseSection, eventDate, 'House', events, $);

    // Parse Other meetings (boards, commissions, etc.)
    const otherSection = $('h5:contains("Other")').parent();
    this.parseMeetingSection(otherSection, eventDate, 'Other', events, $);

    return events;
  }

  private parseMeetingSection(
    section: any,
    eventDate: Date,
    chamber: string,
    events: RawEvent[],
    $: any
  ): void {
    // Maryland structure: committee names are in .hearsched-committee-banner divs
    const committeeBanners = $(section).find('.hearsched-committee-banner').toArray();

    for (const banner of committeeBanners) {
      const $banner = $(banner);
      const committeeName = $banner.text().trim();

      if (!committeeName) continue;

      // Find the next hearing header after this committee banner
      const hearingHeader = $banner.parent().parent().next('.hearsched-hearing-header');
      if (!hearingHeader.length) continue;

      // Extract time from the hearing header
      const timeText = hearingHeader.find('.font-weight-bold.text-center').first().text().trim();
      const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : 'TBD';

      // Extract location from Google Maps link
      const locationLink = hearingHeader.find('a[href*="google.com/maps"]').attr('href');
      let location = 'State House, Annapolis';
      if (locationLink) {
        const locMatch = locationLink.match(/query=([^&]+)/);
        if (locMatch) {
          location = decodeURIComponent(locMatch[1].replace(/\+/g, ' '));
        }
      }

      // Extract livestream link - look for text containing "livestream" followed by a link
      let virtualMeetingUrl: string | undefined;
      const allText = hearingHeader.text();
      
      if (allText.toLowerCase().includes('livestream')) {
        // Find the link after "livestream"
        const links = hearingHeader.find('a[href^="http"]').toArray();
        for (const link of links) {
          const href = $(link).attr('href');
          const linkText = $(link).text().toLowerCase();
          
          // Check if this link is near "livestream" text or is labeled "here"
          if (linkText === 'here' || href?.includes('video') || href?.includes('stream') || href?.includes('meeting')) {
            virtualMeetingUrl = href;
            break;
          }
        }
      }

      // Parse time into date
      const meetingDate = new Date(eventDate);
      if (timeMatch) {
        const timeParts = timeMatch[1].match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3].toUpperCase();

          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;

          meetingDate.setHours(hours, minutes, 0, 0);
        }
      }

      events.push({
        name: committeeName,
        date: meetingDate.toISOString(),
        time,
        location,
        committee: committeeName,
        description: `${chamber} committee meeting`,
        sourceUrl: `${this.baseUrl}/mgawebsite/Meetings/Day`,
        virtualMeetingUrl
      });
    }
  }

  private async fetchWeekView(): Promise<RawEvent[]> {
    const url = `${this.baseUrl}/mgawebsite/Meetings/Week`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for Week view`);
    }

    const html = await response.text();
    return this.parseWeekView(html);
  }

  private parseWeekView(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    const $ = parseHTML(html);

    // Find the calendar table
    const table = $('table').first();
    if (!table.length) {
      this.log('No calendar table found in Week view');
      return events;
    }

    // Get the week date range from the heading
    const weekHeading = $('h4, h5').filter((_, el) => {
      return $(el).text().includes('December') || $(el).text().includes('2025');
    }).first().text();

    const dateRangeMatch = weekHeading.match(/(\w+day),\s+(\w+)\s+(\d+),\s+(\d{4})\s*-\s*(\w+day),\s+(\w+)\s+(\d+),\s+(\d{4})/);
    
    if (!dateRangeMatch) {
      this.log('Could not parse week date range');
      return events;
    }

    // Parse table rows
    const rows = table.find('tr').toArray();
    const headerRow = $(rows[0]);
    const dateHeaders = headerRow.find('th, td').toArray().slice(1); // Skip first column (time)

    // Extract dates from headers (e.g., "Monday 15", "Tuesday 16")
    const columnDates: Date[] = [];
    dateHeaders.forEach(header => {
      const headerText = $(header).text().trim();
      const dayMatch = headerText.match(/(\w+day)\s+(\d+)/);
      if (dayMatch) {
        const [, , dayNum] = dayMatch;
        // Use the month/year from the week heading
        const [, , monthStr, , yearStr] = dateRangeMatch;
        const date = new Date(`${monthStr} ${dayNum}, ${yearStr}`);
        columnDates.push(date);
      } else {
        columnDates.push(new Date()); // Fallback
      }
    });

    // Process each row (each row is a time slot)
    for (let i = 1; i < rows.length; i++) {
      const row = $(rows[i]);
      const cells = row.find('td').toArray();
      
      if (cells.length === 0) continue;

      // First cell is the time
      const timeText = $(cells[0]).text().trim();
      const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : timeText;

      // Process each day column
      for (let j = 1; j < cells.length; j++) {
        const cell = $(cells[j]);
        const committeeName = cell.text().trim();

        if (!committeeName || committeeName === '') continue;

        // Determine chamber from committee name
        let chamber = 'Other';
        if (committeeName.includes('Senate')) chamber = 'Senate';
        else if (committeeName.includes('House')) chamber = 'House';

        // Parse time into the date
        const eventDate = new Date(columnDates[j - 1]);
        if (timeMatch) {
          const timeParts = time.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
          if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            const period = timeParts[3].toUpperCase();

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            eventDate.setHours(hours, minutes, 0, 0);
          }
        }

        events.push({
          name: committeeName,
          date: eventDate.toISOString(),
          time,
          location: 'State House',
          committee: committeeName,
          description: `${chamber} committee meeting`,
          sourceUrl: `${this.baseUrl}/mgawebsite/Meetings/Week`
        });
      }
    }

    return events;
  }

  private deduplicateEvents(events: RawEvent[]): RawEvent[] {
    const seen = new Set<string>();
    const unique: RawEvent[] = [];

    for (const event of events) {
      // Create a key based on committee name and date (rounded to the hour)
      const eventDate = new Date(event.date);
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}-${eventDate.getHours()}`;
      const key = `${event.committee}-${dateKey}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    }

    return unique;
  }
}

/**
 * New Hampshire Legislature Scraper
 * 
 * Fetches legislative events from JSON endpoints:
 * - House calendar: http://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents
 * - Senate calendar: http://www.gencourt.state.nh.us/senate/schedule/CalendarWS.asmx/GetEvents
 * 
 * These endpoints return FullCalendar.js-compatible JSON data with all upcoming events.
 */

import { BaseScraper, ScraperConfig, RawEvent } from '../base-scraper';

interface NHCalendarEvent {
  title: string;
  start: string; // ISO date string
  end: string;
  backgroundColor: string;
  url: string;
  allDay: boolean;
}

interface NHCalendarResponse {
  d: string; // JSON string that needs to be parsed
}

export class NewHampshireScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NH',
      stateName: 'New Hampshire',
      websiteUrl: 'https://www.gencourt.state.nh.us/house/schedule/dailyschedule.aspx',
      reliability: 'high', // JSON endpoint is very reliable
      updateFrequency: 6, // Check every 6 hours
      maxRequestsPerMinute: 20,
      requestDelay: 500 // 500ms between requests
    };

    super(config);
    this.log('🏛️ NH Scraper initialized');
  }

  /**
   * Get JSON endpoint URLs for both House and Senate calendars
   */
  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.gencourt.state.nh.us/house/schedule/CalendarWS.asmx/GetEvents', // House JSON
      'https://www.gencourt.state.nh.us/senate/schedule/CalendarWS.asmx/GetEvents' // Senate JSON
    ];
  }

  /**
   * Main scraping method - fetches from JSON endpoints
   */
  protected async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting NH calendar scrape (JSON endpoints)');

    const urls = await this.getPageUrls();
    const allEvents: RawEvent[] = [];

    // Fetch House calendar (JSON)
    try {
      const houseEvents = await this.scrapeCalendarJSON(urls[0], 'House');
      this.log('🏛️ House calendar scraped', { events: houseEvents.length });
      allEvents.push(...houseEvents);
    } catch (error) {
      this.logError('❌ Failed to scrape House calendar', error);
      // Continue to Senate even if House fails
    }

    // Fetch Senate calendar (JSON)
    try {
      const senateEvents = await this.scrapeCalendarJSON(urls[1], 'Senate');
      this.log('🏛️ Senate calendar scraped', { events: senateEvents.length });
      allEvents.push(...senateEvents);
    } catch (error) {
      this.logError('❌ Failed to scrape Senate calendar', error);
    }

    this.log('✅ NH scrape complete', {
      totalEvents: allEvents.length,
      house: allEvents.filter(e => e.committee?.includes('House')).length,
      senate: allEvents.filter(e => e.committee?.includes('Senate')).length
    });

    return allEvents;
  }

  /**
   * Scrape calendar from JSON endpoint (ASMX Web Service - requires GET with JSON content-type)
   */
  private async scrapeCalendarJSON(url: string, chamber: string): Promise<RawEvent[]> {
    this.log(`📡 Fetching ${chamber} calendar JSON via GET`, { url });

    try {
      // ASMX Web Services can accept GET with proper content-type header
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/javascript, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      
      this.log(`📄 Response received`, { 
        chamber,
        length: text.length,
        preview: text.substring(0, 100)
      });

      // Try to parse as JSON directly first
      try {
        const directJson = JSON.parse(text);
        if (directJson && directJson.d) {
          this.log(`✅ Direct JSON parse successful`, { chamber });
          const events = JSON.parse(directJson.d);
          this.log(`✅ Parsed ${chamber} events from .d property`, { count: events.length });
          return this.processCalendarEvents(events, chamber);
        }
      } catch (e) {
        this.log(`ℹ️ Not direct JSON, trying regex parse`, { chamber });
      }

      // Parse the response - it comes as { d: "JSON_STRING" }
      const jsonMatch = text.match(/"d"\s*:\s*"([^"]+)"/);
      if (!jsonMatch) {
        this.logError(`❌ Failed to parse JSON response for ${chamber}`, { 
          textPreview: text.substring(0, 500),
          textLength: text.length
        });
        return [];
      }

      // Unescape the JSON string
      const jsonString = jsonMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');

      const calendarEvents: NHCalendarEvent[] = JSON.parse(jsonString);
      this.log(`✅ Parsed ${chamber} JSON via regex`, { count: calendarEvents.length });

      return this.processCalendarEvents(calendarEvents, chamber);

    } catch (error) {
      this.logError(`❌ Failed to scrape ${chamber} calendar JSON`, error, {
        chamber,
        url,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      return [];
    }
  }

  /**
   * Process calendar events array into RawEvents
   */
  private processCalendarEvents(calendarEvents: NHCalendarEvent[], chamber: string): RawEvent[] {
    this.log(`🔄 Processing ${chamber} calendar events`, { count: calendarEvents.length });

    // Convert to RawEvent format
    const events: RawEvent[] = calendarEvents
      .map(event => this.convertNHEventToRaw(event, chamber))
      .filter(event => event !== null) as RawEvent[];

    this.log(`✅ Converted ${chamber} events`, { 
      count: events.length,
      sample: events[0] ? {
        name: events[0].name,
        date: events[0].date instanceof Date ? events[0].date.toISOString() : events[0].date,
        rawDate: events[0].date
      } : 'none'
    });

    // Filter to only future events
    const now = new Date();
    this.log(`⏰ Current time for filtering`, {
      now: now.toISOString(),
      nowTimestamp: now.getTime()
    });

    const futureEvents = events.filter(event => {
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
      const isFuture = eventDate >= now;
      if (!isFuture && events.indexOf(event) < 3) {
        // Log first few filtered events for debugging
        this.log(`🗑️ Filtered out past event`, {
          name: event.name,
          eventDate: eventDate.toISOString(),
          eventTimestamp: eventDate.getTime(),
          isPast: !isFuture
        });
      }
      return isFuture;
    });

    this.log(`📅 ${chamber} future events`, {
      total: events.length,
      future: futureEvents.length,
      sample: futureEvents[0] ? { 
        name: futureEvents[0].name, 
        date: futureEvents[0].date instanceof Date ? futureEvents[0].date.toISOString() : futureEvents[0].date
      } : 'none'
    });

    return futureEvents;
  }

  /**
   * Convert NH calendar event to RawEvent format
   */
  private convertNHEventToRaw(nhEvent: NHCalendarEvent, chamber: string): RawEvent | null {
    try {
      const date = new Date(nhEvent.start);
      
      // Extract time from ISO string
      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Parse location from title (format: "COMMITTEE : Location")
      const [committee, ...locationParts] = nhEvent.title.split(' : ');
      const location = locationParts.join(' : ').trim() || 'TBD';

      // Build details URL
      const baseUrl = chamber === 'House' 
        ? 'https://www.gencourt.state.nh.us/house/schedule/'
        : 'https://www.gencourt.state.nh.us/senate/schedule/';
      const detailsUrl = nhEvent.url ? `${baseUrl}${nhEvent.url}` : undefined;

      return {
        name: committee.trim(),
        date: date,
        time: time,
        location: location,
        committee: `NH ${chamber} - ${committee.trim()}`,
        type: this.determineEventType(nhEvent.backgroundColor),
        detailsUrl: detailsUrl
      };

    } catch (error) {
      this.logError('⚠️ Failed to convert NH event', { event: nhEvent, error });
      return null;
    }
  }

  /**
   * Determine event type from color code
   * BLUE = Hearing | GREEN = Meeting | ORANGE = Executive Session | RED = Committee of Conference
   */
  private determineEventType(backgroundColor: string): string {
    const color = backgroundColor.toLowerCase();
    if (color.includes('2980b9') || color.includes('blue')) return 'hearing';
    if (color.includes('66a362') || color.includes('green')) return 'meeting';
    if (color.includes('d68100') || color.includes('orange')) return 'executive-session';
    if (color.includes('b74545') || color.includes('ff3333') || color.includes('red')) return 'committee-of-conference';
    return 'meeting'; // Default
  }

  /**
   * Helper: Check if text looks like a date (kept for potential future use)
   * @param _text unused parameter
   * @returns always false
   */
  private looksLikeDate(_text: string): boolean {
    // Placeholder method - kept for potential future HTML parsing
    return false;
    // Check for common date patterns
    // const patterns = [
    //   /\d{1,2}\/\d{1,2}\/\d{2,4}/, // 1/15/2025
    //   /\d{4}-\d{2}-\d{2}/, // 2025-01-15
    //   /[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}/, // January 15, 2025
    //   /[A-Z][a-z]+\s+\d{1,2}/ // January 15
    // ];
    // return patterns.some(pattern => pattern.test(text));
  }
}

import { BaseScraper } from '../base-scraper.js';
import type { RawEvent, LegislativeEvent, CalendarSource } from '../../../types/events.js';
import { scrapeSaltLakeCityMeetings } from '../local/salt-lake-city.js';

interface UtahDay {
  day: number;
  month: number;
  year: number;
  dayofweek: number;
  events: string[]; // PowerShell shows these as strings, but they're actually objects
  today: boolean;
}

interface UtahEvent {
  itemType: string; // I=interim/committee, S=senate floor, H=house floor, D=deadline/note
  itemtime: string; // ISO timestamp
  time: string; // Human readable time
  endTime: string;
  status: string;
  description: string;
  mtgID: number;
  docType: string;
  wasStarted: boolean;
  sortOrder: number;
  electronic: boolean;
  elecMtgLink: string;
  mediaUrl: string;
  type: string; // meeting, senatefloor, housefloor, note
  itemUrl: string;
  agenda: string;
  minutes: string;
  location: string;
  mapurl: string;
  ics: string;
  onSite: boolean;
  embedURL: string;
  streamID: number;
  dayOfSession: number;
  live: boolean;
}

interface UtahWeek {
  days: UtahDay[];
}

interface UtahCalendarResponse {
  month: number;
  year: number;
  refresh: boolean;
  days: UtahDay[];
}

export class UtahScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.utleg.gov/Calendar/month';
  private readonly siteUrl = 'https://le.utah.gov';

  constructor() {
    const config = {
      stateCode: 'UT',
      stateName: 'Utah',
      websiteUrl: 'https://le.utah.gov/calendar.html',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch current month and next 2 months to get upcoming meetings
    for (let i = 0; i < 3; i++) {
      const month = ((currentMonth + i - 1) % 12) + 1;
      const year = currentYear + Math.floor((currentMonth + i - 1) / 12);

      const url = `${this.baseUrl}?month=${month}&year=${year}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch Utah calendar for ${month}/${year}: ${response.status}`);
          continue;
        }

        const data: UtahCalendarResponse = await response.json();
        
        if (!data.days || data.days.length === 0) {
          continue;
        }

        // Process each day
        for (const day of data.days) {
          if (!day.events || day.events.length === 0) continue;

          for (const eventData of day.events) {
            // Parse the event (it comes as object in proper API responses)
            const event = eventData as unknown as UtahEvent;

            // Skip notes/deadlines (type=note) and only get committee meetings
            if (event.type === 'note' || event.type === 'deadline') continue;

            // Skip floor sessions (we want committee meetings)
            if (event.type === 'senatefloor' || event.type === 'housefloor') continue;

            // Only process actual committee meetings
            if (event.type !== 'meeting') continue;

            // Parse date from itemtime (ISO format)
            const eventDate = new Date(event.itemtime);
            
            // Skip past events
            if (eventDate < now) continue;

            // Extract committee name from description
            const committeeName = event.description || 'Utah Legislature Meeting';

            // Build event URLs
            const committeeUrl = event.itemUrl 
              ? `${this.siteUrl}${event.itemUrl}`
              : 'https://le.utah.gov/calendar.html';

            const agendaUrl = event.agenda 
              ? `${this.siteUrl}${event.agenda}`
              : undefined;

            events.push({
              id: `ut-${event.mtgID || eventDate.getTime()}-${this.sanitizeForId(committeeName)}`,
              name: committeeName,
              date: eventDate.toISOString(),
              time: event.time || this.formatTime(eventDate),
              location: event.location || 'Utah State Capitol',
              committee: committeeName,
              type: 'committee-meeting',
              description: `Utah Legislature committee meeting${event.location ? ` at ${event.location}` : ''}`,
              sourceUrl: committeeUrl,
              docketUrl: agendaUrl,
              virtualMeetingUrl: event.mediaUrl || undefined
            });
          }
        }
      } catch (error) {
        console.error(`Error scraping Utah calendar for ${month}/${year}:`, error);
      }
    }

    const allEvents: RawEvent[] = [...events];

    // Add Salt Lake City local government meetings


    console.log('Fetching Salt Lake City local government meetings...');


    try {


      const saltlakecityEvents = await scrapeSaltLakeCityMeetings();


      console.log(`Found ${saltlakecityEvents.length} Salt Lake City local meetings`);


      allEvents.push(...saltlakecityEvents);


    } catch (error) {


      console.error('Error fetching Salt Lake City meetings:', error);


    }



    console.log(`Found ${allEvents.length} total Utah events (state + local)`);


    return events;
  }

  async scrape(): Promise<LegislativeEvent[]> {
    const rawEvents = await this.scrapeCalendar();
    return rawEvents.map(event => ({
      ...event,
      level: 'state' as const,
      state: 'UT',
      city: 'Salt Lake City',
      lat: 40.7608,
      lng: -111.8910,
      zipCode: null
    }));
  }

  getCalendarSources(): CalendarSource[] {
    return [
      {
        name: 'Utah Legislature Calendar',
        url: 'https://le.utah.gov/calendar.html',
        type: 'primary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'Official legislative calendar with committee meetings and floor sessions'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplementary',
        lastChecked: new Date().toISOString(),
        status: 'active',
        notes: 'City council meetings from Salt Lake City, Provo, and other Utah cities'
      }
    ];
  }

  private sanitizeForId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
}

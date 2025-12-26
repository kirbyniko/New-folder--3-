import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';

interface OpenStatesEvent {
  id: string;
  name: string;
  description: string;
  classification: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  status: string;
  location: {
    name: string;
    coordinates: { latitude: number; longitude: number } | null;
  } | null;
  sources: Array<{ url: string; note?: string }>;
  participants: Array<{
    name: string;
    type: string;
    note?: string;
  }>;
  agenda: Array<{
    description: string;
    subjects: string[];
    notes: Array<{ description: string }>;
    related_entities: Array<{
      name: string;
      entity_type: string;
      bill?: { identifier: string; title: string };
    }>;
  }>;
  media: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

interface OpenStatesResponse {
  pagination: {
    per_page: number;
    page: number;
    max_page: number;
    total_items: number;
  };
  results: OpenStatesEvent[];
}

export class KansasScraper extends BaseScraper {
  // OpenStates jurisdiction ID for Kansas
  private readonly jurisdictionId = 'ocd-jurisdiction/country:us/state:ks/government';
  private readonly calendarUrl = 'http://www.kslegislature.org/li/b2025_26/committees/';
  
  // Kansas State Capitol coordinates (Topeka)
  private readonly defaultLat = 39.0473;
  private readonly defaultLng = -95.6776;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'KS',
      stateName: 'Kansas',
      websiteUrl: 'http://www.kslegislature.org/li/b2025_26/committees/',
      reliability: 'medium',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    
    if (!process.env.OPENSTATES_API_KEY) {
      this.log('⚠️  KS Scraper: No OpenStates API key found');
      this.log('   Set OPENSTATES_API_KEY environment variable');
    } else {
      this.log('🏛️  KS Scraper initialized with OpenStates');
    }
  }

  getCalendarSources() {
    return [
      {
        name: 'Kansas Legislature Committee Schedule',
        url: this.calendarUrl,
        type: 'primary' as const,
        description: 'Official Kansas Legislature committee meetings and hearings'
      },
      {
        name: 'OpenStates Kansas Events',
        url: `https://openstates.org/ks/`,
        type: 'supplemental' as const,
        description: 'Legislative event data from OpenStates API'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplemental' as const,
        description: 'City council meetings from Wichita, Kansas City, Overland Park, and other Kansas cities'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const apiKey = process.env.OPENSTATES_API_KEY;
    if (!apiKey) {
      console.warn('OPENSTATES_API_KEY not set, returning empty results for Kansas');
      return [];
    }

    try {
      // Get events for the next 30 days
      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);

      const url = `https://v3.openstates.org/events?jurisdiction=${this.jurisdictionId}&per_page=100`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        console.error(`OpenStates API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: OpenStatesResponse = await response.json();
      
      return data.results
        .filter(event => {
          // Filter for upcoming events only
          const eventDate = new Date(event.start_date);
          return eventDate >= today && eventDate <= thirtyDaysLater;
        })
        .map(event => this.parseOpenStatesEvent(event));
    } catch (error) {
      console.error('Error scraping Kansas events from OpenStates:', error);
      return [];
    }
  }

  private parseOpenStatesEvent(event: OpenStatesEvent): RawEvent {
    const startDate = new Date(event.start_date);
    
    // Extract time in local format
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago' // Kansas is in Central Time
    });

    // Extract location
    const location = event.location?.name || 'TBD';

    // Extract committee name from participants
    const committee = event.participants
      .find(p => p.type === 'committee')?.name || 'Committee';

    // Build description from agenda
    let description = event.description || '';
    if (event.agenda && event.agenda.length > 0) {
      const agendaItems = event.agenda
        .filter(item => item.description)
        .map(item => item.description)
        .slice(0, 3);
      
      if (agendaItems.length > 0) {
        description = `Agenda: ${agendaItems.join('; ')}${event.agenda.length > 3 ? '...' : ''}`;
      }
    }

    // Extract bills from agenda
    const bills: Array<{ number: string; title: string }> = [];
    if (event.agenda) {
      for (const agendaItem of event.agenda) {
        for (const entity of agendaItem.related_entities || []) {
          if (entity.entity_type === 'bill' && entity.bill) {
            bills.push({
              number: entity.bill.identifier,
              title: entity.bill.title
            });
          }
        }
      }
    }

    // Find video URL from media
    const virtualMeetingUrl = event.media?.find(m => 
      m.type === 'video' || m.name.toLowerCase().includes('video')
    )?.url;

    // Use source URL or generate committee page URL
    const sourceUrl = event.sources?.[0]?.url || this.calendarUrl;

    // Generate unique ID
    const eventId = `ks-${startDate.getTime()}-${this.hashString(committee)}`;

    return {
      id: eventId,
      name: event.name,
      date: startDate.toISOString(),
      time: timeStr,
      location,
      committee,
      type: 'committee-meeting',
      level: 'state',
      state: 'KS',
      city: 'Topeka',
      lat: event.location?.coordinates?.latitude || this.defaultLat,
      lng: event.location?.coordinates?.longitude || this.defaultLng,
      zipCode: null,
      description,
      sourceUrl,
      docketUrl: undefined,
      virtualMeetingUrl,
      bills: bills.length > 0 ? bills : undefined
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }
}

import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillReference, ScraperConfig } from '../base-scraper';

interface OpenStatesEvent {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: {
    name: string;
    url?: string;
  };
  sources: Array<{ url: string }>;
  participants: Array<{
    name: string;
    type: string;
  }>;
  agenda?: Array<{
    description: string;
    subjects?: string[];
    related_entities?: Array<{
      entity_type: string;
      entity_id?: string;
      note?: string;
    }>;
  }>;
}

export class NewMexicoScraper extends BaseScraper {
  private readonly apiBase = 'https://v3.openstates.org';
  private readonly jurisdictionId = 'ocd-jurisdiction/country:us/state:nm/government';

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NM',
      stateName: 'New Mexico',
      websiteUrl: 'https://www.nmlegis.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🏛️ NM Scraper initialized (OpenStates API)');
  }

  getCalendarSources() {
    return [
      {
        name: 'New Mexico Legislature - What\'s Happening',
        url: 'https://www.nmlegis.gov/Calendar/Whats_Happening',
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Official legislative calendar (data via OpenStates API)'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplementary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'City council meetings from Albuquerque, Santa Fe, and other New Mexico cities'
      }
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    const apiKey = process.env.OPENSTATES_API_KEY;
    if (!apiKey) {
      this.log('⚠️ No OpenStates API key configured');
      return [];
    }

    try {
      this.log('📡 Fetching New Mexico events from OpenStates API...');
      
      const url = `${this.apiBase}/events?jurisdiction=${this.jurisdictionId}`;
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.log(`📊 API returned ${data.results?.length || 0} events`);

      const allEvents: RawEvent[] = [];

      if (data.results && Array.isArray(data.results)) {
        // Filter out past events
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        for (const event of data.results) {
          const eventDate = new Date(event.start_date);
          if (eventDate >= today) {
            const parsedEvent = this.parseOpenStatesEvent(event);
            if (parsedEvent) {
              allEvents.push(parsedEvent);
            }
          } else {
            this.log(`Skipping past event: ${event.name} on ${event.start_date}`);
          }
        }
      }

      this.log(`✅ Scraped ${allEvents.length} upcoming NM events from OpenStates`);
      return allEvents;

    } catch (error) {
      this.log(`❌ Error fetching from OpenStates: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  private parseOpenStatesEvent(event: OpenStatesEvent): RawEvent | null {
    try {
      const startDate = new Date(event.start_date);
      const dateStr = startDate.toISOString();
      
      // Extract time in "HH:MM AM/PM" format
      let timeStr: string | undefined;
      const hours = startDate.getHours();
      const minutes = startDate.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

      // Extract committee name from participants
      const committee = event.participants?.find(p => p.type === 'committee')?.name 
        || event.name.split(' - ')[0]
        || 'New Mexico Legislature';

      // Build description from agenda items
      let description = event.description || '';
      if (event.agenda && event.agenda.length > 0) {
        const agendaItems = event.agenda
          .filter(item => item.description && item.description.trim())
          .map(item => item.description.trim())
          .slice(0, 3);
        
        if (agendaItems.length > 0) {
          description = description 
            ? `${description}\n\nAgenda: ${agendaItems.join('; ')}${event.agenda.length > 3 ? '...' : ''}`
            : `Agenda: ${agendaItems.join('; ')}${event.agenda.length > 3 ? '...' : ''}`;
        }
      }

      // Extract bills from agenda
      const bills: BillReference[] = [];
      if (event.agenda) {
        for (const item of event.agenda) {
          if (item.related_entities) {
            for (const entity of item.related_entities) {
              if (entity.entity_type === 'bill' && entity.note) {
                // Extract bill number (e.g., "HB 123", "SB 456")
                const billMatch = entity.note.match(/([HS][BJ]R?)\s*(\d+)/i);
                if (billMatch) {
                  const billType = billMatch[1].toUpperCase();
                  const billNumber = billMatch[2];
                  const billId = `${billType}${billNumber}`;
                  
                  bills.push({
                    id: billId,
                    title: item.description || billId,
                    url: `https://www.nmlegis.gov/Legislation/Legislation?chamber=${billType[0]}&legtype=${billType.substring(1)}&legno=${billNumber}`
                  });
                }
              }
            }
          }
        }
      }

      // Get source URL
      const sourceUrl = event.sources?.[0]?.url || 'https://www.nmlegis.gov/Calendar/Whats_Happening';

      // Generate unique ID
      const id = `nm-${startDate.getTime()}-${this.hashString(committee + event.name)}`;

      return {
        id,
        name: event.name,
        date: dateStr,
        time: timeStr,
        location: event.location?.name || 'New Mexico State Capitol',
        committee,
        type: 'committee-meeting',
        level: 'state',
        state: 'NM',
        city: 'Santa Fe',
        lat: 35.6870,
        lng: -105.9378,
        zipCode: null,
        description: description || undefined,
        sourceUrl,
        docketUrl: event.location?.url || undefined,
        virtualMeetingUrl: undefined,
        bills: bills.length > 0 ? bills : undefined
      };
    } catch (error) {
      this.log(`Error parsing event: ${error instanceof Error ? error.message : error}`);
      return null;
    }
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

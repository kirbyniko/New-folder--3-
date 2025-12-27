import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';

/**
 * Indiana General Assembly Scraper
 * Source: https://iga.in.gov/ (requires API key) / OpenStates fallback
 * 
 * Indiana's legislative system:
 * - Modern React SPA with API backend
 * - API endpoint: https://api.iga.in.gov/ (requires authentication)
 * - Fallback: OpenStates API (free, no registration)
 * 
 * Current implementation uses OpenStates due to authentication requirements.
 * OpenStates data source: https://v3.openstates.org/
 */
export class IndianaScraper extends BaseScraper {
  private readonly baseUrl = 'https://iga.in.gov';
  private readonly openStatesBase = 'https://v3.openstates.org';
  private readonly jurisdictionId = 'ocd-jurisdiction/country:us/state:in/government';
  private readonly openStatesKey: string | undefined;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'IN',
      stateName: 'Indiana',
      websiteUrl: 'https://iga.in.gov/information/committee_daily',
      reliability: 'medium',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    
    this.openStatesKey = process.env.OPENSTATES_API_KEY;
    
    if (!this.openStatesKey) {
      this.log('⚠️  IN Scraper: No OpenStates API key found');
      this.log('   Set OPENSTATES_API_KEY environment variable');
    } else {
      this.log('🏛️  IN Scraper initialized with OpenStates');
    }
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Indiana General Assembly Committee Calendar',
        url: 'https://iga.in.gov/information/committee_daily',
        description: 'Daily meeting schedules for House and Senate committees'
      },
      {
        name: 'OpenStates Indiana Events',
        url: 'https://openstates.org/in/committees/',
        description: 'Committee meetings and legislative events'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Indianapolis, Fort Wayne, and other Indiana cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      `${this.openStatesBase}/events?jurisdiction=${this.jurisdictionId}&per_page=100`
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    if (!this.openStatesKey) {
      this.log('Cannot scrape without OpenStates API key');
      return []; // Return empty array instead of throwing
    }

    try {
      const url = `${this.openStatesBase}/events?jurisdiction=${this.jurisdictionId}&per_page=100`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': this.openStatesKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const events: RawEvent[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const event of data.results) {
          const parsed = this.parseOpenStatesEvent(event);
          if (parsed) {
            events.push(parsed);
          }
        }
      }

      this.log(`Found ${events.length} Indiana committee meetings via OpenStates`);
      return events;
    } catch (error) {
      const message = `Failed to scrape Indiana events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(message);
      return []; // Return empty array on error
    }
  }

  private parseOpenStatesEvent(event: any): RawEvent | null {
    try {
      if (!event.name || !event.start_date) {
        return null;
      }

      // Parse date
      const eventDate = new Date(event.start_date);
      if (isNaN(eventDate.getTime())) {
        return null;
      }

      // Extract time
      let timeStr = 'TBD';
      if (event.start_date) {
        const date = new Date(event.start_date);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }

      // Parse bills
      let bills: BillInfo[] = [];
      if (event.agenda && Array.isArray(event.agenda)) {
        for (const item of event.agenda) {
          if (item.related_entities && Array.isArray(item.related_entities)) {
            for (const entity of item.related_entities) {
              if (entity.entity_type === 'bill' && entity.bill) {
                bills.push({
                  id: entity.bill.identifier || entity.bill.bill_id,
                  title: entity.bill.title || item.description || '',
                  url: `${this.baseUrl}/legislative/2026/bills/${entity.bill.identifier || entity.bill.bill_id}`
                });
              }
            }
          }
        }
      }

      const rawEvent: RawEvent = {
        name: event.name,
        date: eventDate.toISOString(),
        time: timeStr,
        location: event.location?.name || event.location || 'State House',
        committee: event.name,
        description: event.description || `Indiana ${event.classification?.[0] || 'committee'} meeting`,
        sourceUrl: 'https://iga.in.gov/information/committee_daily',
        virtualMeetingUrl: event.media_url || undefined,
        bills: bills.length > 0 ? bills : undefined
      };

      return rawEvent;
    } catch (error) {
      this.log(`Error parsing event: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }
}

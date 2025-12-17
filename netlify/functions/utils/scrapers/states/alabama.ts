import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig, BillInfo } from '../base-scraper';

/**
 * Alabama Legislature Scraper
 * Source: OpenStates API v3 (https://v3.openstates.org/)
 * 
 * NOTE: Alabama Legislature's official site (alison.legislature.state.al.us) is a React SPA
 * with a GraphQL API that requires complex queries. OpenStates provides a simpler interface.
 * 
 * OpenStates aggregates legislative data from all 50 states including:
 * - Committee meetings and events
 * - Bills, sponsors, and status
 * - Legislators and committees
 * 
 * API Key required: Set OPENSTATES_API_KEY in .env
 * Register at: https://open.pluralpolicy.com/accounts/profile/
 * 
 * Alabama sessions typically run February-May annually (Regular Session).
 * Special Sessions may occur throughout the year.
 */
export class AlabamaScraper extends BaseScraper {
  private readonly OPENSTATES_API = 'https://v3.openstates.org';
  private readonly JURISDICTION_ID = 'ocd-jurisdiction/country:us/state:al/government';
  private readonly API_KEY = process.env.OPENSTATES_API_KEY;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'AL',
      stateName: 'Alabama',
      websiteUrl: 'https://alison.legislature.state.al.us',
      reliability: 'high', // Using OpenStates API
      updateFrequency: 6, // Check every 6 hours
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🏛️ AL Scraper initialized (OpenStates API)');
    
    if (!this.API_KEY) {
      this.log('⚠️ OPENSTATES_API_KEY not found in environment');
    }
  }

  protected async getPageUrls(): Promise<string[]> {
    return [`${this.OPENSTATES_API}/events?jurisdiction=${this.JURISDICTION_ID}`];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Alabama calendar scrape via OpenStates API');

    if (!this.API_KEY) {
      this.log('❌ OpenStates API key not configured');
      this.log('Set OPENSTATES_API_KEY in .env - register at https://open.pluralpolicy.com/accounts/profile/');
      return [];
    }

    const allEvents: RawEvent[] = [];

    try {
      // Fetch events from OpenStates API
      const encodedJurisdiction = encodeURIComponent(this.JURISDICTION_ID);
      const url = `${this.OPENSTATES_API}/events?jurisdiction=${encodedJurisdiction}&per_page=20`;
      this.log(`🔍 Fetching from OpenStates API`);
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': this.API_KEY!,
          'User-Agent': 'Civitron/1.0 (Legislative Events Aggregator)'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.log('❌ Invalid OpenStates API key');
          return [];
        }
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.log(`📊 API returned ${data.results?.length || 0} events`);

      if (data.results && Array.isArray(data.results)) {
        for (const event of data.results) {
          const parsedEvent = this.parseOpenStatesEvent(event);
          if (parsedEvent) {
            allEvents.push(parsedEvent);
          }
        }
      }

      this.log(`✅ Scraped ${allEvents.length} AL events from OpenStates`);
      return allEvents;

    } catch (error) {
      this.log(`❌ Error fetching from OpenStates: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * Parse event from OpenStates API v3 response
   */
  private parseOpenStatesEvent(event: any): RawEvent | null {
    try {
      // Event must have a name and date
      if (!event.name || !event.start_date) {
        return null;
      }

      // Parse date and time
      const startDate = new Date(event.start_date);
      const timeString = startDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Extract committee name from event
      const committeeName = this.extractCommitteeName(event);

      // Extract bills from related_bills
      const bills = this.extractBillsFromEvent(event);

      // Build location string
      const location = event.location?.name || 
                      event.location?.address || 
                      'Alabama State House';

      return {
        name: event.name,
        date: startDate.toISOString(),
        time: timeString,
        location,
        committee: committeeName,
        type: 'hearing',
        bills: bills.length > 0 ? bills : undefined,
        sourceUrl: event.sources?.[0]?.url || 'https://alison.legislature.state.al.us',
        description: event.description || undefined
      };
    } catch (error) {
      this.log(`⚠️ Failed to parse event: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Extract committee name from event data
   */
  private extractCommitteeName(event: any): string {
    // Try multiple fields where committee info might be
    if (event.participants) {
      for (const participant of event.participants) {
        if (participant.entity_type === 'organization' && participant.name) {
          return participant.name;
        }
      }
    }

    // Check if name includes committee or commission
    if (event.name.toLowerCase().includes('committee') || 
        event.name.toLowerCase().includes('commission')) {
      return event.name;
    }

    return 'Alabama Legislature';
  }

  /**
   * Extract bills from OpenStates event
   */
  private extractBillsFromEvent(event: any): BillInfo[] {
    const bills: BillInfo[] = [];

    // OpenStates includes related_bills array
    if (event.related_bills && Array.isArray(event.related_bills)) {
      for (const bill of event.related_bills) {
        const billId = bill.identifier || bill.bill_id;
        if (billId) {
          bills.push({
            id: billId,
            title: bill.title || billId,
            url: this.buildBillUrl(billId),
            status: bill.classification || 'In Committee',
            sponsors: bill.sponsorships?.map((s: any) => s.name || s.entity_name) || []
          });
        }
      }
    }

    // Also parse from agenda if available
    if (event.agenda) {
      const billPattern = /(HB|SB|HR|SR)\s*(\d+)/gi;
      const matches = event.agenda.matchAll(billPattern);
      
      for (const match of matches) {
        const billId = `${match[1]} ${match[2]}`;
        if (!bills.find(b => b.id === billId)) {
          bills.push({
            id: billId,
            title: billId,
            url: this.buildBillUrl(billId),
            status: 'Scheduled',
            sponsors: []
          });
        }
      }
    }

    return bills;
  }

  /**
   * Build Alabama Legislature bill URL
   */
  private buildBillUrl(billId: string): string {
    // billId format: "HB 123" or "SB 456"
    const normalized = billId.toLowerCase().replace(/\s+/g, '');
    // Alabama ALISON system uses /bill/{session}/{billid} format
    return `https://alison.legislature.state.al.us/bill/2025rs/${normalized}`;
  }
}

import { BaseScraper } from '../base-scraper';
import type { RawEvent, BillInfo, ScraperConfig } from '../base-scraper';

/**
 * Indiana General Assembly Scraper
 * Source: https://iga.in.gov/
 * 
 * Indiana's legislative system:
 * - Modern React SPA with API backend
 * - API endpoint: https://api.iga.in.gov/
 * - Free API with registration required
 * - Daily committee meetings: /2026/committees/daily
 * - Committee details and bills available via API
 * 
 * API SETUP:
 * 1. Visit https://docs.api.iga.in.gov/ to register for free API access
 * 2. Get your API key (token)
 * 3. Set environment variables:
 *    - INDIANA_API_KEY=your_token_here
 *    - Required headers: x-api-key and User-Agent: iga-api-client-{token}
 * 
 * API Documentation: https://docs.api.iga.in.gov/
 * 
 * NOTE: Without API key, this scraper will fall back to OpenStates data.
 * The API provides real-time committee schedules and bill details.
 */
export class IndianaScraper extends BaseScraper {
  private readonly baseUrl = 'https://iga.in.gov';
  private readonly apiBase = 'https://api.iga.in.gov';
  private readonly session = '2026'; // Current session
  private readonly apiKey: string | undefined;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'IN',
      stateName: 'Indiana',
      websiteUrl: 'https://iga.in.gov/2026/committees/daily',
      reliability: 'medium',
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    
    // Try to get API key from environment
    this.apiKey = process.env.INDIANA_API_KEY;
    
    if (!this.apiKey) {
      this.log('⚠️  IN Scraper: No API key found. Indiana requires authentication.');
      this.log('   Set INDIANA_API_KEY environment variable or use OpenStates fallback.');
    } else {
      this.log('🏛️  IN Scraper initialized with API key');
    }
  }

  protected async getPageUrls(): Promise<string[]> {
    // API endpoints for committee data
    return [
      `${this.apiBase}/${this.session}/committees/daily`,
      `${this.apiBase}/${this.session}/committees`
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    if (!this.apiKey) {
      this.log('Cannot scrape without API key. Use OpenStates as data source.');
      throw new Error('Indiana API key required. Set INDIANA_API_KEY environment variable.');
    }

    try {
      const events: RawEvent[] = [];
      
      // Fetch committee meetings for today and upcoming days
      const dates = this.getUpcomingDates(14); // Next 2 weeks
      
      for (const date of dates) {
        const dailyEvents = await this.fetchDailyCommittees(date);
        events.push(...dailyEvents);
      }

      this.log(`Found ${events.length} Indiana committee meetings`);
      return events;
    } catch (error) {
      const message = `Failed to scrape Indiana events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(message);
      throw new Error(message);
    }
  }

  private getUpcomingDates(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(this.formatDate(date));
    }
    
    return dates;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async fetchDailyCommittees(date: string): Promise<RawEvent[]> {
    const url = `${this.apiBase}/${this.session}/committees?date=${date}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': `iga-api-client-${this.apiKey}`,
          'x-api-key': this.apiKey!,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Invalid API key');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.parseCommittees(data, date);
    } catch (error) {
      this.log(`Error fetching committees for ${date}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }

  private async parseCommittees(data: any, date: string): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    
    if (!Array.isArray(data)) {
      this.log('Unexpected API response format');
      return events;
    }

    for (const meeting of data) {
      try {
        const event = await this.convertMeetingToEvent(meeting, date);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        this.log(`Error parsing meeting: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return events;
  }

  private async convertMeetingToEvent(meeting: any, date: string): Promise<RawEvent | null> {
    try {
      // Expected API structure (adjust based on actual API response):
      // {
      //   "committee": { "name": "...", "id": "...", "chamber": "..." },
      //   "time": "...",
      //   "location": "...",
      //   "agenda": [...],
      //   "bills": [...]
      // }
      
      const committeeName = meeting.committee?.name || meeting.name;
      const time = meeting.time || meeting.startTime;
      const location = meeting.location || meeting.room;
      
      if (!committeeName) {
        return null;
      }

      // Parse date and time
      const eventDate = new Date(date);
      if (time) {
        const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          eventDate.setHours(hours, minutes, 0, 0);
        }
      }

      // Fetch bills for this meeting
      let bills: BillInfo[] = [];
      if (meeting.bills && Array.isArray(meeting.bills)) {
        bills = meeting.bills.map((bill: any) => ({
          id: bill.billName || bill.number,
          title: bill.title || bill.description,
          url: bill.url || `${this.baseUrl}/legislative/${this.session}/bills/${bill.billName || bill.number}`
        }));
      } else if (meeting.committeeId || meeting.id) {
        // Fetch bills from committee agenda endpoint
        bills = await this.fetchCommitteeBills(meeting.committeeId || meeting.id, date);
      }

      const event: RawEvent = {
        name: committeeName,
        date: eventDate.toISOString(),
        time: time || 'TBD',
        location: location || 'State House',
        committee: committeeName,
        description: `${meeting.committee?.chamber || 'Indiana'} committee meeting`,
        sourceUrl: meeting.url || `${this.baseUrl}/${this.session}/committees/${meeting.committeeId || ''}`,
        bills: bills.length > 0 ? bills : undefined
      };

      return event;
    } catch (error) {
      this.log(`Error converting meeting: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  private async fetchCommitteeBills(committeeId: string, date: string): Promise<BillInfo[]> {
    const url = `${this.apiBase}/${this.session}/committees/${committeeId}/agenda?date=${date}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': `iga-api-client-${this.apiKey}`,
          'x-api-key': this.apiKey!,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((bill: any) => ({
        id: bill.billName || bill.number,
        title: bill.title || bill.description,
        url: bill.url || `${this.baseUrl}/legislative/${this.session}/bills/${bill.billName || bill.number}`
      }));
    } catch (error) {
      this.log(`Error fetching committee bills: ${error instanceof Error ? error.message : 'Unknown'}`);
      return [];
    }
  }
}

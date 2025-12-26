import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';

/**
 * Oregon Legislature Event Scraper (OpenStates)
 * 
 * Note: Oregon legislature is bicameral (Senate + House) and meets biennially (odd years)
 * in regular session starting in January. During interim periods, the official calendar
 * (olis.oregonlegislature.gov/LIZ/Committees/Meeting/List) shows no upcoming meetings.
 * 
 * Data Source: OpenStates API
 * Jurisdiction: ocd-jurisdiction/country:us/state:or/government
 * Fallback: When legislature is in session, consider migrating to direct OLIS scraping
 * 
 * Session Pattern:
 * - Regular Session: Odd-numbered years (e.g., 2025, 2027), ~160 days starting in January
 * - Special Sessions: Called by Governor or Legislature as needed
 * - Interim: Even-numbered years with limited committee activity
 */

const JURISDICTION = 'ocd-jurisdiction/country:us/state:or/government';
const OR_CAPITOL = { lat: 44.9429, lng: -123.0307 }; // Salem, OR

interface OpenstatesEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: {
    name?: string;
    url?: string;
  };
  media?: Array<{
    name?: string;
    url?: string;
  }>;
  documents?: Array<{
    note?: string;
    url?: string;
  }>;
  sources?: Array<{
    url?: string;
  }>;
  participants?: Array<{
    name?: string;
    type?: string;
  }>;
}

interface OpenstatesResponse {
  results: OpenstatesEvent[];
  pagination?: {
    per_page?: number;
    page?: number;
    total_items?: number;
  };
}

export class OregonScraper extends BaseScraper {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'OR',
      stateName: 'Oregon',
      websiteUrl: 'https://olis.oregonlegislature.gov/liz/2025I1/Committees/Meeting/List',
      reliability: 'medium', // Medium since using third-party API
      updateFrequency: 6,
      maxRequestsPerMinute: 30,
      requestDelay: 300
    };
    super(config);
    
    this.apiKey = process.env.OPENSTATES_API_KEY || process.env.VITE_OPENSTATES_API_KEY || '';
    const encodedJurisdiction = encodeURIComponent(JURISDICTION);
    this.apiUrl = `https://v3.openstates.org/events?jurisdiction=${encodedJurisdiction}&per_page=20`;
    
    this.log('🌲 OR Scraper initialized (OpenStates API)');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Oregon Legislature Calendar',
        url: 'https://olis.oregonlegislature.gov/liz/2025I1/Committees/Meeting/List',
        description: 'House and Senate committee meetings (via OpenStates API)'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from Portland, Salem, Eugene, and other Oregon cities'
      }
    ];
  }

  protected async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      this.log('📅 Fetching Oregon events from OpenStates API...');
      
      if (!this.apiKey) {
        this.log('⚠️ No OpenStates API key configured');
        return [];
      }

      const response = await fetch(this.apiUrl, {
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        this.log(`❌ OpenStates API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: OpenstatesResponse = await response.json();
      
      if (!data.results || data.results.length === 0) {
        this.log('ℹ️ No upcoming Oregon events found (legislature may be in interim)');
        return [];
      }

      this.log(`✅ Found ${data.results.length} Oregon events from OpenStates`);

      // Parse OpenStates data to RawEvent format
      const events = data.results.map(osEvent => this.parseOpenstatesEvent(osEvent));

      return events;
    } catch (error) {
      this.log(`❌ Error fetching Oregon events: ${error}`);
      return [];
    }
  }

  /**
   * Parse OpenStates event to RawEvent format
   */
  private parseOpenstatesEvent(osEvent: OpenstatesEvent): RawEvent {
    const startDate = new Date(osEvent.start_date);
    
    // Extract committee name from participants or event name
    let committeeName = osEvent.name;
    const committeeParticipant = osEvent.participants?.find(p => p.type === 'committee');
    if (committeeParticipant?.name) {
      committeeName = committeeParticipant.name;
    }

    // Get description from event description or first document
    let description = osEvent.description || '';
    if (!description && osEvent.documents && osEvent.documents.length > 0) {
      description = osEvent.documents[0].note || '';
    }

    // Get agenda URL from documents or media
    const agendaUrl = osEvent.documents?.[0]?.url || osEvent.media?.[0]?.url;

    // Get source URL (primary event page)
    const sourceUrl = osEvent.sources?.[0]?.url || osEvent.location?.url;

    return {
      id: osEvent.id || `or-${Date.now()}-${Math.random()}`,
      name: committeeName,
      date: startDate,
      location: osEvent.location?.name || 'Oregon State Capitol',
      chamber: this.determineChamber(committeeName),
      description: description || undefined,
      sourceUrl: sourceUrl || undefined,
      agendaUrl: agendaUrl || undefined,
      coordinates: OR_CAPITOL,
      bills: [] // Bills would need to be extracted if available
    };
  }

  /**
   * Determine chamber from committee name
   */
  private determineChamber(name: string): 'upper' | 'lower' | 'joint' | 'legislature' {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('senate')) return 'upper';
    if (nameLower.includes('house')) return 'lower';
    if (nameLower.includes('joint')) return 'joint';
    return 'legislature';
  }
}

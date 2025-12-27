import { RawEvent } from '../../../../types';
import { parseDate } from '../date-parser';

/**
 * West Virginia Legislature Scraper
 * 
 * Scrapes committee meetings from West Virginia Legislature
 * URL: https://www.wvlegislature.gov/committees/main.cfm
 * 
 * Strategy:
 * 1. Fetch committee meetings from daily schedule
 * 2. Parse meeting times, locations, and agendas
 */

const BASE_URL = 'https://www.wvlegislature.gov';
const SCHEDULE_URL = `${BASE_URL}/committees/interims/intcomsched.cfm`;

interface WVMeeting {
  committee: string;
  date: string;
  time: string;
  location: string;
  agendaUrl?: string;
}

/**
 * West Virginia Legislature Scraper
 */
export class WestVirginiaScraper {
  private readonly stateCode = 'WV';
  private readonly stateName = 'West Virginia';
  
  readonly config = {
    updateFrequency: 24,
    reliability: 'high' as const,
    requiresPuppeteer: false
  };

  /**
   * Get calendar sources for West Virginia
   */
  getCalendarSources() {
    return [
      {
        name: 'West Virginia Legislature Committee Schedule',
        url: SCHEDULE_URL,
        type: 'primary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'Official committee meeting schedule'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        type: 'supplementary' as const,
        lastChecked: new Date().toISOString(),
        status: 'active' as const,
        notes: 'City council meetings from Charleston, Huntington, and other West Virginia cities'
      }
    ];
  }

  /**
   * Scrape West Virginia Legislature meetings
   */
  async scrape(): Promise<RawEvent[]> {
    try {
      console.log(`[WV] Fetching schedule from ${SCHEDULE_URL}`);
      
      const response = await fetch(SCHEDULE_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const events: RawEvent[] = [];

      // Extract date sections - dates are in <h2> tags like "Monday, January 12, 2026"
      const sections = html.split(/<h2>/gi).slice(1); // Skip first section before first h2
      
      for (const section of sections) {
        // Extract the date from the h2 content
        const dateMatch = section.match(/^([^<]+)</);
        if (!dateMatch) continue;
        
        const dateStr = dateMatch[1].trim();
        const parsedDate = parseDate(dateStr);
        
        if (!parsedDate || parsedDate < new Date()) {
          console.log(`[WV] Skipping past date: ${dateStr}`);
          continue;
        }

        console.log(`[WV] Processing date: ${dateStr} (${parsedDate.toISOString().split('T')[0]})`);

        // Parse the table rows for this date
        const tableMatch = section.match(/<table[^>]*>(.*?)<\/table>/is);
        if (!tableMatch) continue;

        const tableHtml = tableMatch[1];
        const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
        const cellRegex = /<td[^>]*>(.*?)<\/td>/gis;

        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
          const rowHtml = rowMatch[1];
          
          // Skip header rows
          if (rowHtml.includes('<h1>') || rowHtml.includes('Convene')) {
            continue;
          }

          const cells: string[] = [];
          let cellMatch;
          
          while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
            cells.push(cellMatch[1]);
          }

          if (cells.length < 3) continue;

          try {
            // Extract data from cells
            const conveneTime = cells[0]?.replace(/<[^>]+>/g, '').trim() || '';
            const adjournTime = cells[1]?.replace(/<[^>]+>/g, '').trim() || '';
            const committeeHtml = cells[2] || '';
            const location = cells[3]?.replace(/<[^>]+>/g, '').trim() || 'State Capitol';

            // Extract committee name and URL
            const linkMatch = committeeHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
            let committee: string;
            let detailsUrl: string | undefined;

            if (linkMatch) {
              committee = linkMatch[2].trim();
              let url = linkMatch[1];
              if (!url.startsWith('http')) {
                url = url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/committees/interims/${url}`;
              }
              detailsUrl = url;
            } else {
              committee = committeeHtml.replace(/<[^>]+>/g, '').trim();
            }

            if (!committee) continue;

            // Format time
            const time = conveneTime + (adjournTime ? ` - ${adjournTime}` : '');

            const event: RawEvent = {
              name: `${committee} Meeting`,
              date: parsedDate.toISOString().split('T')[0],
              time: time || null,
              location: location,
              state: this.stateCode,
              level: 'state',
              chamber: this.determineChamber(committee),
              type: 'committee-meeting',
              committeeId: null,
              committeeName: committee,
              sourceUrl: SCHEDULE_URL,
              detailsUrl: detailsUrl || SCHEDULE_URL,
              agendaUrl: null, // Could scrape from detail page if needed
              docketUrl: null,
              virtualMeetingUrl: null,
              tags: ['committee-meeting'],
              bills: []
            };

            events.push(event);
            console.log(`[WV] Added: ${committee} on ${event.date} at ${time}`);

          } catch (err) {
            console.error(`[WV] Error processing row:`, err);
          }
        }
      }

      console.log(`[WV] Found ${events.length} total events`);
      return events;

    } catch (error: any) {
      console.error('[WV] Scraper error:', error.message);
      throw error;
    }
  }

  /**
   * Determine chamber from committee name
   */
  private determineChamber(committee: string): 'upper' | 'lower' | 'joint' | null {
    const lower = committee.toLowerCase();
    if (lower.includes('senate')) return 'upper';
    if (lower.includes('house')) return 'lower';
    if (lower.includes('joint')) return 'joint';
    return null;
  }

  /**
   * Get health status
   */
  getHealth() {
    return {
      status: 'healthy' as const,
      lastRun: new Date().toISOString(),
      eventsScraped: 0,
      errorMessage: null
    };
  }
}

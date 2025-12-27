import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { enrichEventMetadata } from '../shared/tagging';
import { scrapeJuneauMeetings } from '../local/juneau.js';
import * as cheerio from 'cheerio';

/**
 * Alaska Legislature Scraper
 * Source: https://www.akleg.gov/basis/Committee/
 * 
 * Alaska uses the BASIS (Bill Actions and Status Inquiry System) for tracking
 * committee meetings. Each committee has detailed meeting schedules with:
 * - Date/time
 * - Location (usually "ADAMS 519" or other Capitol rooms)
 * - Agendas and documents
 * - Audio/video recordings
 * 
 * The scraper fetches the committee list, then scrapes each committee's detail page
 * to extract upcoming meetings. Session 34 (2025-2026) runs:
 * - 1st Regular Session: Jan 21 - May 20, 2025
 * - 1st Special Session: Aug 2 - Aug 31, 2025
 * - 2nd Regular Session: Jan 20, 2026
 */

const CAPITOL_COORDS = {
  lat: 58.3019,
  lng: -134.4197
};

const CURRENT_SESSION = '34'; // 34th Legislature (2025-2026)

interface AlaskaCommittee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

export class AlaskaScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.akleg.gov/basis';
  private readonly committeeListUrl = `${this.baseUrl}/Committee/List/${CURRENT_SESSION}`;

  constructor() {
    const config: ScraperConfig = {
      stateCode: 'AK',
      stateName: 'Alaska',
      websiteUrl: 'https://www.akleg.gov/basis/Committee/',
      reliability: 'high',
      updateFrequency: 12, // Check every 12 hours
      maxRequestsPerMinute: 30,
      requestDelay: 200
    };
    super(config);
    this.log('🏛️ AK Scraper initialized (BASIS system)');
  }

  /**
   * Return calendar sources used by this scraper
   */
  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Alaska Legislature BASIS Committee List',
        url: this.committeeListUrl,
        description: 'Main committee directory for Session 34 (2025-2026)'
      },
      {
        name: 'BASIS Committee Details',
        url: `${this.baseUrl}/Committee/Details/${CURRENT_SESSION}`,
        description: 'Individual committee meeting schedules and documents'
      },
      {
        name: 'Juneau City and Borough Meetings',
        url: 'https://www.trumba.com/calendars/city-and-borough-of-juneau-events.rss',
        description: 'Assembly, Planning Commission, and local boards from Juneau'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [this.committeeListUrl];
  }

  /**
   * Fetch list of all committees from main committee page
   */
  private async fetchCommittees(): Promise<AlaskaCommittee[]> {
    const response = await fetch(this.committeeListUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const committees: AlaskaCommittee[] = [];

    // Parse committee links - format: /basis/Committee/Details/34?code=HFIN
    $('a[href*="/basis/Committee/Details/"]').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      if (href && text) {
        const codeMatch = href.match(/code=([A-Z0-9%&]+)/);
        if (codeMatch) {
          const code = decodeURIComponent(codeMatch[1]);
          
          // Determine chamber from code prefix
          let chamber: 'House' | 'Senate' | 'Joint' = 'Joint';
          if (code.startsWith('H')) chamber = 'House';
          else if (code.startsWith('S')) chamber = 'Senate';
          
          // Extract full committee name (includes acronym in parentheses)
          committees.push({
            code,
            name: text,
            chamber
          });
        }
      }
    });

    return committees;
  }

  /**
   * Fetch meeting schedule for a specific committee
   */
  private async fetchCommitteeMeetings(committee: AlaskaCommittee): Promise<RawEvent[]> {
    const url = `${this.baseUrl}/Committee/Details/${CURRENT_SESSION}?code=${encodeURIComponent(committee.code)}`;
    
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const events: RawEvent[] = [];
      const now = new Date();

      // Meeting table structure: Date | Location | Details (Schedule/Minutes/Audio/Video/Documents)
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;

        const dateTimeStr = $(cells[0]).text().trim();
        const location = $(cells[1]).text().trim();
        const detailsCell = $(cells[2]);

        // Parse date/time - format: "05/18/2025 12:00 PM" or "05/17/2025 10:00 AM"
        const dateMatch = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/);
        if (!dateMatch) return;

        const [, month, day, year, hour, minute, period] = dateMatch;
        let hour24 = parseInt(hour, 10);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;

        const meetingDate = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          hour24,
          parseInt(minute, 10)
        );

        // Only include future/recent meetings (within last 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (meetingDate < sevenDaysAgo) return;

        // Extract document links
        const scheduleLink = detailsCell.find('a:contains("Schedule")').attr('href');
        const documentsLink = detailsCell.find('a:contains("Documents")').attr('href');
        
        // Build full URLs
        let docketUrl: string | undefined;
        if (documentsLink) {
          docketUrl = documentsLink.startsWith('http') 
            ? documentsLink 
            : `https://www.akleg.gov${documentsLink}`;
        }

        const event: RawEvent = {
          id: `ak-${meetingDate.getTime()}-${committee.code.toLowerCase()}`,
          name: `${committee.chamber} ${committee.name}`,
          date: meetingDate.toISOString(),
          time: `${hour}:${minute} ${period}`,
          location: location || 'Alaska State Capitol',
          committee: committee.name,
          type: 'committee-meeting',
          level: 'state',
          state: 'AK',
          city: 'Juneau',
          lat: CAPITOL_COORDS.lat,
          lng: CAPITOL_COORDS.lng,
          zipCode: null,
          description: `${committee.chamber} committee meeting`,
          sourceUrl: url,
          docketUrl,
          virtualMeetingUrl: undefined,
          bills: []
        };

        // Apply unified tagging
        enrichEventMetadata(event, `${committee.name} ${committee.chamber} committee meeting`);

        events.push(event);
      });

      return events;
    } catch (error) {
      console.error(`Error fetching meetings for ${committee.name}:`, error);
      return [];
    }
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    try {
      // Fetch all committees
      const committees = await this.fetchCommittees();
      console.log(`Found ${committees.length} Alaska committees`);

      // Focus on main standing committees (exclude finance subcommittees and special groups)
      const mainCommittees = committees.filter(c => {
        const name = c.name.toUpperCase();
        return !name.includes('(FIN SUB)') && 
               !name.includes('TASK FORCE') &&
               !name.includes('WORKING GROUP') &&
               !name.includes('CONFERENCE COMMITTEE');
      });

      console.log(`Scraping ${mainCommittees.length} main committees`);

      // Fetch meetings for each committee
      const allEvents: RawEvent[] = [];
      
      for (const committee of mainCommittees) {
        const events = await this.fetchCommitteeMeetings(committee);
        allEvents.push(...events);
        
        // Small delay to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`Found ${allEvents.length} Alaska state legislature meetings`);
      
      // Add Juneau city/borough meetings
      console.log('Fetching Juneau (City and Borough) local government meetings...');
      const juneauEvents = await scrapeJuneauMeetings();
      console.log(`Found ${juneauEvents.length} Juneau local meetings`);
      allEvents.push(...juneauEvents);

      console.log(`Found ${allEvents.length} total Alaska events (state + local)`);
      return allEvents;
    } catch (error) {
      console.error('Error scraping Alaska calendar:', error);
      return [];
    }
  }
}

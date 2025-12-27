import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser';
import * as cheerio from 'cheerio';

/**
 * Illinois General Assembly Scraper
 * Source: https://www.ilga.gov/
 */
export class IllinoisScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'IL',
      stateName: 'Illinois',
      websiteUrl: 'https://www.ilga.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ IL Scraper initialized');
  }

  getCalendarSources(): { name: string; url: string; description: string }[] {
    return [
      {
        name: 'Illinois General Assembly Schedules',
        url: 'https://www.ilga.gov',
        description: 'House and Senate committee schedules'
      },
      {
        name: 'Local City Meetings (Legistar API)',
        url: 'https://webapi.legistar.com',
        description: 'City council meetings from major Illinois cities'
      }
    ];
  }

  protected async getPageUrls(): Promise<string[]> {
    return [
      'https://www.ilga.gov/senate/schedules/',
      'https://www.ilga.gov/house/schedules/'
    ];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Illinois calendar scrape');
    const events: RawEvent[] = [];

    try {
      // Scrape both Senate and House calendars
      const senateEvents = await this.scrapeChamber('senate');
      const houseEvents = await this.scrapeChamber('house');
      
      events.push(...senateEvents, ...houseEvents);
      
      this.log(`✅ Scraped ${events.length} IL events`);
      return events;
    } catch (error) {
      this.log(`❌ Error scraping Illinois: ${error}`);
      throw error;
    }
  }

  private async scrapeChamber(chamber: 'senate' | 'house'): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    
    // Illinois uses an API - determine chamber ID and GA ID
    const chamberId = chamber === 'senate' ? '2' : '1';
    const gaId = '104'; // 104th General Assembly (current session)
    
    // Get hearings for next 90 days
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    
    const beginDateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const endDateStr = `${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`;
    
    const apiUrl = `https://www.ilga.gov/API/Hearings/GetHearingsListByRange?ChamberId=${chamberId}&GaId=${gaId}&BeginDate=${beginDateStr}&EndDate=${endDateStr}`;
    
    this.log(`🌐 Fetching ${chamber} hearings from API`, { url: apiUrl });
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (!response.ok) {
        this.log(`❌ API request failed`, { status: response.status });
        return events;
      }
      
      const hearings = await response.json();
      this.log(`✅ API returned ${hearings.length} hearings`);
      
      for (const hearing of hearings) {
        // Parse date/time from scheduledDateTime (e.g., "12/21/2025 10:00 AM")
        const dateTimeMatch = hearing.scheduledDateTime?.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s+[AP]M)/);
        
        if (dateTimeMatch) {
          const [, dateStr, timeStr] = dateTimeMatch;
          const location = `${hearing.room || 'Room TBD'} - ${hearing.building || 'State House'} - ${hearing.city || 'Springfield'}`;
          
          events.push({
            name: hearing.longDescription || hearing.textLine || 'Committee Hearing',
            date: this.parseDate(dateStr),
            time: timeStr,
            location: location.trim(),
            committee: `IL ${chamber === 'senate' ? 'Senate' : 'House'} - ${hearing.longDescription || 'Committee'}`,
            type: 'hearing',
            detailsUrl: `https://ilga.gov/${chamber}/hearings/details/${hearing.committeeID}/${hearing.hearingID}`
          });
        }
      }
      
    } catch (error) {
      this.log(`❌ Error fetching ${chamber} API:`, error);
    }
    
    this.log(`✅ ${chamber} calendar scraped`, { events: events.length });
    return events;
  }

  private parseDate(dateStr: string): string {
    // Handle formats like "12/15/2025" or "December 15, 2025"
    try {
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, month, day, year] = match;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
      }
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private parseTime(timeStr: string): string | undefined {
    if (!timeStr || timeStr.toLowerCase().includes('tba')) return undefined;
    return timeStr.trim();
  }
}

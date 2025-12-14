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
    const url = chamber === 'senate' 
      ? 'https://www.ilga.gov/senate/schedules/'
      : 'https://www.ilga.gov/house/schedules/';

    this.log(`🌐 Fetching ${chamber} page`, { url, attempt: 1 });
    
    const html = await this.fetchPage(url);
    this.log(`✅ Page fetched`, { url, size: `${Math.round(html.length / 1024)}KB`, status: 200 });

    const $ = parseHTML(html);
    
    // Parse Illinois hearing schedule table
    $('.schedule-table tr, table tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 3) {
        const committee = cells.eq(0).text().trim();
        const dateText = cells.eq(1).text().trim();
        const timeText = cells.eq(2).text().trim();
        const location = cells.eq(3)?.text().trim() || `Illinois State Capitol`;
        
        if (committee && dateText && dateText.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
          events.push({
            name: committee,
            date: this.parseDate(dateText),
            time: this.parseTime(timeText),
            location: location || 'Illinois State Capitol',
            committee: `IL ${chamber === 'senate' ? 'Senate' : 'House'} - ${committee}`,
            type: 'hearing',
            detailsUrl: url
          });
        }
      }
    });
    
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

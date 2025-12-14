import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser';
import * as cheerio from 'cheerio';

/**
 * Ohio General Assembly Scraper
 * Source: https://www.legislature.ohio.gov/
 */
export class OhioScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'OH',
      stateName: 'Ohio',
      websiteUrl: 'https://www.legislature.ohio.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ OH Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://www.legislature.ohio.gov/schedules/calendar'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Ohio calendar scrape');
    const events: RawEvent[] = [];

    try {
      const url = 'https://www.legislature.ohio.gov/schedules/calendar';
      this.log(`🌐 Fetching page`, { url, attempt: 1 });
      
      const html = await this.fetchPage(url);
      this.log(`✅ Page fetched`, { url, size: `${Math.round(html.length / 1024)}KB`, status: 200 });

      const $ = parseHTML(html);
      
      // Parse Ohio schedule - they use various table structures
      $('table tr, .schedule-item, .meeting-item').each((_, element) => {
        const $el = $(element);
        const text = $el.text();
        
        // Look for committee names and dates
        const committeeMatch = text.match(/(Committee|Subcommittee|Commission)[^,\n]*/i);
        const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
        
        if (committeeMatch && dateMatch) {
          const committee = committeeMatch[0].trim();
          const dateText = dateMatch[1];
          const timeText = timeMatch ? timeMatch[1] : undefined;
          const location = $el.find('.location, .room').text().trim() || 'Ohio Statehouse';
          
          events.push({
            name: committee,
            date: this.parseDate(dateText),
            time: timeText,
            location: location || 'Ohio Statehouse',
            committee: `OH Legislature - ${committee}`,
            type: 'meeting',
            detailsUrl: url
          });
        }
      });
      
      this.log(`✅ Scraped ${events.length} OH events`);
      return events;
    } catch (error) {
      this.log(`❌ Error scraping Ohio: ${error}`);
      throw error;
    }
  }

  private parseDate(dateStr: string): string {
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
}

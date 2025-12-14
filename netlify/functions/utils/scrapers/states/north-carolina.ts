import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser';
import * as cheerio from 'cheerio';

/**
 * North Carolina General Assembly Scraper
 * Source: https://www.ncleg.gov/
 */
export class NorthCarolinaScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'NC',
      stateName: 'North Carolina',
      websiteUrl: 'https://www.ncleg.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ NC Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://www.ncleg.gov/Calendars'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting North Carolina calendar scrape');
    const events: RawEvent[] = [];

    try {
      const url = 'https://www.ncleg.gov/Calendars';
      this.log(`🌐 Fetching page`, { url, attempt: 1 });
      
      const html = await this.fetchPage(url);
      this.log(`✅ Page fetched`, { url, size: `${Math.round(html.length / 1024)}KB`, status: 200 });

      const $ = parseHTML(html);
      
      // Parse NC committee schedule
      $('.committee-item, .meeting-row, table tr').each((_, element) => {
        const $el = $(element);
        const cells = $el.find('td');
        
        if (cells.length >= 3) {
          const committee = cells.eq(0).text().trim() || $el.find('.committee-name').text().trim();
          const dateText = cells.eq(1).text().trim() || $el.find('.date').text().trim();
          const timeText = cells.eq(2).text().trim() || $el.find('.time').text().trim();
          const location = cells.eq(3)?.text().trim() || $el.find('.location').text().trim();
          
          if (committee && dateText && dateText.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
            events.push({
              name: committee,
              date: this.parseDate(dateText),
              time: this.parseTime(timeText),
              location: location || 'North Carolina Legislative Building',
              committee: `NC Legislature - ${committee}`,
              type: 'meeting',
              detailsUrl: url
            });
          }
        }
      });
      
      this.log(`✅ Scraped ${events.length} NC events`);
      return events;
    } catch (error) {
      this.log(`❌ Error scraping North Carolina: ${error}`);
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

  private parseTime(timeStr: string): string | undefined {
    if (!timeStr || timeStr.toLowerCase().includes('tba')) return undefined;
    return timeStr.trim();
  }
}

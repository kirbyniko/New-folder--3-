import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser';
import * as cheerio from 'cheerio';

/**
 * Georgia General Assembly Scraper
 * Source: https://www.legis.ga.gov/
 */
export class GeorgiaScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'GA',
      stateName: 'Georgia',
      websiteUrl: 'https://www.legis.ga.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ GA Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://www.legis.ga.gov/api/meetings'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Georgia calendar scrape (API)');
    const events: RawEvent[] = [];

    try {
      const url = 'https://www.legis.ga.gov/api/meetings';
      this.log(`🌐 Fetching page`, { url, attempt: 1 });
      
      const html = await this.fetchPage(url);
      this.log(`✅ Page fetched`, { url, size: `${Math.round(html.length / 1024)}KB`, status: 200 });

      const $ = parseHTML(html);
      
      // Parse Georgia schedule
      $('.schedule-item, .meeting, table tr').each((_, element) => {
        const $el = $(element);
        const committee = $el.find('.committee, .title, td:first-child').text().trim();
        const dateText = $el.find('.date, .meeting-date, td:nth-child(2)').text().trim();
        const timeText = $el.find('.time, .meeting-time, td:nth-child(3)').text().trim();
        const location = $el.find('.location, .room, td:nth-child(4)').text().trim();
        
        if (committee && dateText && dateText.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
          events.push({
            name: committee,
            date: this.parseDate(dateText),
            time: this.parseTime(timeText),
            location: location || 'Georgia State Capitol',
            committee: `GA Legislature - ${committee}`,
            type: 'meeting',
            detailsUrl: url
          });
        }
      });
      
      this.log(`✅ Scraped ${events.length} GA events`);
      return events;
    } catch (error) {
      this.log(`❌ Error scraping Georgia: ${error}`);
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

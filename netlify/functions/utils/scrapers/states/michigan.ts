import { BaseScraper } from '../base-scraper';
import type { RawEvent, ScraperConfig } from '../base-scraper';
import { parseHTML } from '../html-parser';
import * as cheerio from 'cheerio';

/**
 * Michigan Legislature Scraper
 * Source: https://www.legislature.mi.gov/
 */
export class MichiganScraper extends BaseScraper {
  constructor() {
    const config: ScraperConfig = {
      stateCode: 'MI',
      stateName: 'Michigan',
      websiteUrl: 'https://www.legislature.mi.gov',
      reliability: 'high',
      updateFrequency: 6,
      maxRequestsPerMinute: 20,
      requestDelay: 500
    };
    super(config);
    this.log('🏛️ MI Scraper initialized');
  }

  protected async getPageUrls(): Promise<string[]> {
    return ['https://www.legislature.mi.gov/Committees/Meetings'];
  }

  async scrapeCalendar(): Promise<RawEvent[]> {
    this.log('📅 Starting Michigan calendar scrape');
    const events: RawEvent[] = [];

    try {
      const url = 'https://www.legislature.mi.gov/Committees/Meetings';
      this.log(`🌐 Fetching page`, { url, attempt: 1 });
      
      const html = await this.fetchPage(url);
      this.log(`✅ Page fetched`, { url, size: `${Math.round(html.length / 1024)}KB`, status: 200 });

      const $ = parseHTML(html);
      
      // Parse Michigan meeting schedule - find committee links with dates
      $('a[href*="/Committees/Meeting"]').each((_, link) => {
        const $link = $(link);
        const committee = $link.text().trim();
        const meetingUrl = $link.attr('href');
        
        // Get parent text to find date/time
        let parentText = $link.parent().text();
        
        // Look for date pattern: MM/DD/YYYY HH:MM AM/PM
        const dateMatch = parentText.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s+[AP]M)/i);
        
        if (dateMatch && committee) {
          const dateStr = dateMatch[1];
          const timeStr = dateMatch[2];
          
          const date = this.parseDate(dateStr);
          const time = this.parseTime(timeStr);
          
          if (date) {
            events.push({
              name: `${committee} Committee Meeting`,
              date,
              time,
              location: 'Michigan State Capitol',
              committee,
              type: 'hearing',
              detailsUrl: meetingUrl ? `https://www.legislature.mi.gov${meetingUrl}` : url
            });
          }
        }
      });
      
      this.log(`✅ Scraped ${events.length} MI events`);
      return events;
    } catch (error) {
      this.log(`❌ Error scraping Michigan: ${error}`);
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
